const express = require('express');
const { scoreToExpectedLoss } = require('../services/trustScoreEngine');
const {
  evaluateLoanApplication,
  buildRepaymentSchedule,
  validateFunding,
  validateRepayment
} = require('../services/loanService');

function buildLoanRoutes(pool, requireAuth) {
  const router = express.Router();

  function requireRole(role) {
    return (req, res, next) => {
      if (req.user.role !== role) return res.status(403).json({ error: `requires role '${role}'` });
      next();
    };
  }

  // Individual requests a loan. Eligibility/pricing reuse the latest
  // trust_scores row — this route never recomputes the score itself (that's
  // still POST /api/trust-score/compute), per the Checkpoint 3 plan.
  router.post('/request', requireAuth, async (req, res) => {
    const { amount, termMonths } = req.body;

    const { rows: scoreRows } = await pool.query(
      `SELECT score FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!scoreRows[0]) {
      return res.status(400).json({ error: 'no trust score on file yet — call POST /api/trust-score/compute first' });
    }
    const score = Number(scoreRows[0].score);
    const expectedLossPct = scoreToExpectedLoss(score);

    const evaluation = evaluateLoanApplication({
      score,
      expectedLossPct,
      requestedAmount: amount,
      requestedTermMonths: termMonths
    });
    if (!evaluation.approved) {
      return res.status(400).json({ error: evaluation.reason, maxAmount: evaluation.maxAmount });
    }

    const { rows } = await pool.query(
      `INSERT INTO loans (borrower_id, principal, term_months, interest_rate_pct, trust_score_at_request, expected_loss_pct_at_request)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, amount, termMonths, evaluation.interestRatePct, score, expectedLossPct]
    );
    const loan = rows[0];

    const schedule = buildRepaymentSchedule({ principal: amount, annualRatePct: evaluation.interestRatePct, termMonths });
    for (const installment of schedule) {
      await pool.query(
        `INSERT INTO loan_installments (loan_id, installment_number, amount_due) VALUES ($1, $2, $3)`,
        [loan.id, installment.installmentNumber, installment.amountDue]
      );
    }

    res.status(201).json({ loan, schedule });
  });

  // Borrower's own loans.
  router.get('/mine', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM loans WHERE borrower_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ loans: rows });
  });

  // Lender-facing marketplace: pending loans across all borrowers, with the
  // same score/evidence a lender would see in Module 6's dashboard later —
  // this route is effectively a preview of that "expected loss" lens.
  router.get('/marketplace', requireAuth, requireRole('lender'), async (req, res) => {
    const { rows } = await pool.query(
      `SELECT l.id, l.principal, l.term_months, l.interest_rate_pct, l.trust_score_at_request,
              l.expected_loss_pct_at_request, l.created_at, u.email AS borrower_email
       FROM loans l JOIN users u ON u.id = l.borrower_id
       WHERE l.status = 'pending' ORDER BY l.created_at ASC`
    );
    res.json({ pendingLoans: rows });
  });

  // Lender funds a pending loan: marks it funded, credits the borrower's
  // wallet via a channel='loan' transaction (deliberately not channel='wallet'
  // — see schema.sql comment — so loan disbursement/repayment activity feeds
  // the fraud-signal query as its own behavior stream without touching the
  // spendable wallet balance calculation in walletService.computeBalance,
  // which only reads channel='wallet' rows).
  router.post('/:loanId/fund', requireAuth, requireRole('lender'), async (req, res) => {
    const { rows: loanRows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.loanId]);
    const loan = loanRows[0];
    if (!loan) return res.status(404).json({ error: 'loan not found' });

    const validation = validateFunding({ loanStatus: loan.status });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: updated } = await client.query(
        `UPDATE loans SET status = 'funded', lender_id = $1, funded_at = now() WHERE id = $2 RETURNING *`,
        [req.user.id, loan.id]
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, counterparty) VALUES ($1, $2, 'in', 'loan', $3)`,
        [loan.borrower_id, loan.principal, `loan:${loan.id}:disbursement`]
      );
      await client.query('COMMIT');
      res.json({ loan: updated[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[loans] funding failed:', err.message);
      res.status(500).json({ error: 'funding failed' });
    } finally {
      client.release();
    }
  });

  // Borrower repays exactly the next outstanding installment. Amount comes
  // off a channel='loan' transaction (see note above) rather than the
  // channel='wallet' ledger — a deliberate hackathon simplification so this
  // checkpoint doesn't have to relitigate cross-channel balance transfers.
  router.post('/:loanId/repay', requireAuth, async (req, res) => {
    const { amount } = req.body;
    const { rows: loanRows } = await pool.query('SELECT * FROM loans WHERE id = $1 AND borrower_id = $2', [req.params.loanId, req.user.id]);
    const loan = loanRows[0];
    if (!loan) return res.status(404).json({ error: 'loan not found' });

    const { rows: nextRows } = await pool.query(
      `SELECT * FROM loan_installments WHERE loan_id = $1 AND paid = FALSE ORDER BY installment_number ASC LIMIT 1`,
      [loan.id]
    );
    const nextInstallment = nextRows[0]
      ? { installmentNumber: nextRows[0].installment_number, amountDue: Number(nextRows[0].amount_due) }
      : null;

    const validation = validateRepayment({ loanStatus: loan.status, nextInstallment, amountPaid: amount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE loan_installments SET paid = TRUE, paid_at = now() WHERE id = $1`, [nextRows[0].id]);
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, counterparty) VALUES ($1, $2, 'out', 'loan', $3)`,
        [req.user.id, amount, `loan:${loan.id}:installment:${nextInstallment.installmentNumber}`]
      );

      const { rows: remaining } = await client.query(
        `SELECT count(*) FROM loan_installments WHERE loan_id = $1 AND paid = FALSE`,
        [loan.id]
      );
      let loanNowRepaid = false;
      if (Number(remaining[0].count) === 0) {
        await client.query(`UPDATE loans SET status = 'repaid' WHERE id = $1`, [loan.id]);
        loanNowRepaid = true;
      }
      await client.query('COMMIT');
      res.json({ ok: true, installmentPaid: nextInstallment.installmentNumber, loanFullyRepaid: loanNowRepaid });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[loans] repayment failed:', err.message);
      res.status(500).json({ error: 'repayment failed' });
    } finally {
      client.release();
    }
  });

  // Full detail view (loan + schedule) — either the borrower or the funding lender.
  router.get('/:loanId', requireAuth, async (req, res) => {
    const { rows: loanRows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.loanId]);
    const loan = loanRows[0];
    if (!loan) return res.status(404).json({ error: 'loan not found' });
    if (loan.borrower_id !== req.user.id && loan.lender_id !== req.user.id) {
      return res.status(403).json({ error: 'not a party to this loan' });
    }
    const { rows: schedule } = await pool.query(
      `SELECT installment_number, amount_due, paid, paid_at FROM loan_installments WHERE loan_id = $1 ORDER BY installment_number ASC`,
      [loan.id]
    );
    res.json({ loan, schedule });
  });

  return router;
}

module.exports = buildLoanRoutes;
