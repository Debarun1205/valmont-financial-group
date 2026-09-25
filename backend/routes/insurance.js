const express = require('express');
const { scoreToInsurancePremiumMultiplier } = require('../services/trustScoreEngine');
const { quotePolicy, validateClaim } = require('../services/insuranceService');

function buildInsuranceRoutes(pool, requireAuth) {
  const router = express.Router();

  // Quote-and-purchase in one step (kept simple for the hackathon demo —
  // no separate "accept quote" flow). Reuses the latest trust_scores row,
  // same "reuse, don't recompute" rule as Module 3 (loans).
  router.post('/purchase', requireAuth, async (req, res) => {
    const { policyType, coverageAmount } = req.body;

    const { rows: scoreRows } = await pool.query(
      `SELECT score FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!scoreRows[0]) {
      return res.status(400).json({ error: 'no trust score on file yet — call POST /api/trust-score/compute first' });
    }
    const score = Number(scoreRows[0].score);
    const premiumMultiplier = scoreToInsurancePremiumMultiplier(score);

    const quote = quotePolicy({ policyType, coverageAmount, premiumMultiplier });
    if (!quote.ok) return res.status(400).json({ error: quote.error, maxCoverage: quote.maxCoverage });

    const { rows } = await pool.query(
      `INSERT INTO insurance_policies (user_id, policy_type, coverage_amount, monthly_premium, trust_score_at_quote, premium_multiplier_at_quote)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, policyType, coverageAmount, quote.monthlyPremium, score, premiumMultiplier]
    );
    res.status(201).json({ policy: rows[0] });
  });

  // Quote only, no purchase — useful for the frontend to preview a price
  // before committing (and for the pitch demo to show "same score, third lens").
  router.post('/quote', requireAuth, async (req, res) => {
    const { policyType, coverageAmount } = req.body;
    const { rows: scoreRows } = await pool.query(
      `SELECT score FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!scoreRows[0]) {
      return res.status(400).json({ error: 'no trust score on file yet — call POST /api/trust-score/compute first' });
    }
    const score = Number(scoreRows[0].score);
    const premiumMultiplier = scoreToInsurancePremiumMultiplier(score);
    const quote = quotePolicy({ policyType, coverageAmount, premiumMultiplier });
    if (!quote.ok) return res.status(400).json({ error: quote.error, maxCoverage: quote.maxCoverage });
    res.json({ score, premiumMultiplier, ...quote });
  });

  router.get('/mine', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM insurance_policies WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ policies: rows });
  });

  router.post('/:policyId/claim', requireAuth, async (req, res) => {
    const { claimAmount } = req.body;
    const { rows: policyRows } = await pool.query(
      `SELECT * FROM insurance_policies WHERE id = $1 AND user_id = $2`,
      [req.params.policyId, req.user.id]
    );
    const policy = policyRows[0];
    if (!policy) return res.status(404).json({ error: 'policy not found' });

    const validation = validateClaim({
      policyStatus: policy.status,
      coverageAmount: Number(policy.coverage_amount),
      claimAmount
    });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows } = await pool.query(
      `INSERT INTO insurance_claims (policy_id, claim_amount) VALUES ($1, $2) RETURNING *`,
      [policy.id, claimAmount]
    );
    res.status(201).json({ claim: rows[0] });
  });

  return router;
}

module.exports = buildInsuranceRoutes;
