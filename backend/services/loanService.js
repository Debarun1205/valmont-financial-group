/**
 * Loan Marketplace service — Module 3 core logic.
 *
 * Eligibility and pricing are derived from the existing trust score
 * (services/trustScoreEngine.js) — this module does NOT recompute risk, it
 * only prices and schedules against a score that's already been computed
 * and attested (per docs/dev-context-handoff.md Checkpoint 3 plan: "reuse,
 * don't recompute"). Kept as pure functions over plain values, no DB/network
 * calls, so it's unit-testable the same way as Modules 1 and 2.
 */

const MIN_SCORE_TO_QUALIFY = 40;
const BASE_ANNUAL_RATE_PCT = 6; // floor rate for a top-tier score
const MAX_PRINCIPAL_BY_TIER = { low: 500, mid: 2500, high: 10000 };

/**
 * Decides whether a requested loan qualifies, and if so at what price.
 * Rate = base rate + a risk spread derived from expectedLossPct (the same
 * "expected loss" number Module 6 shows lenders — one engine, many lenses).
 *
 * @param {Object} input
 * @param {number} input.score - latest trust_scores.score for the borrower (0-100)
 * @param {number} input.expectedLossPct - from trustScoreEngine.scoreToExpectedLoss(score)
 * @param {number} input.requestedAmount
 * @param {number} input.requestedTermMonths
 * @returns {{approved:boolean, reason?:string, interestRatePct?:number, maxAmount?:number}}
 */
function evaluateLoanApplication({ score, expectedLossPct, requestedAmount, requestedTermMonths }) {
  if (!requestedAmount || requestedAmount <= 0) {
    return { approved: false, reason: 'requestedAmount must be positive' };
  }
  if (!requestedTermMonths || requestedTermMonths <= 0 || !Number.isInteger(requestedTermMonths)) {
    return { approved: false, reason: 'requestedTermMonths must be a positive integer' };
  }
  if (score < MIN_SCORE_TO_QUALIFY) {
    return { approved: false, reason: `trust score ${score} is below the minimum of ${MIN_SCORE_TO_QUALIFY} to qualify` };
  }

  const tier = score >= 75 ? 'high' : score >= 55 ? 'mid' : 'low';
  const maxAmount = MAX_PRINCIPAL_BY_TIER[tier];
  if (requestedAmount > maxAmount) {
    return { approved: false, reason: `requested amount exceeds the max of ${maxAmount} for this score tier`, maxAmount };
  }

  // Risk spread: expectedLossPct ranges ~0.5-20 (see trustScoreEngine); scale
  // it down so the spread stays in a sane single-digit-to-teens APR range.
  const riskSpreadPct = expectedLossPct * 0.6;
  const interestRatePct = Math.round((BASE_ANNUAL_RATE_PCT + riskSpreadPct) * 10) / 10;

  return { approved: true, interestRatePct, maxAmount };
}

/**
 * Builds a flat-interest, equal-installment repayment schedule.
 * Kept deliberately simple (flat interest, not amortized/compounding) —
 * appropriate for a 36-hour build; swap for an amortization formula later
 * if a judge or a real lender partner asks for it.
 *
 * @param {Object} input
 * @param {number} input.principal
 * @param {number} input.annualRatePct
 * @param {number} input.termMonths
 * @returns {Array<{installmentNumber:number, amountDue:number}>}
 */
function buildRepaymentSchedule({ principal, annualRatePct, termMonths }) {
  if (principal <= 0) throw new Error('principal must be positive');
  if (termMonths <= 0 || !Number.isInteger(termMonths)) throw new Error('termMonths must be a positive integer');

  const totalInterest = principal * (annualRatePct / 100) * (termMonths / 12);
  const totalRepayable = principal + totalInterest;
  const flatInstallment = Math.round((totalRepayable / termMonths) * 100) / 100;

  const schedule = [];
  let runningTotal = 0;
  for (let i = 1; i <= termMonths; i++) {
    // Last installment absorbs any rounding remainder so the schedule sums
    // exactly to totalRepayable — avoids a stray cent of drift.
    const isLast = i === termMonths;
    const amountDue = isLast ? Math.round((totalRepayable - runningTotal) * 100) / 100 : flatInstallment;
    runningTotal += amountDue;
    schedule.push({ installmentNumber: i, amountDue });
  }
  return schedule;
}

/**
 * A loan can only be funded once, and only while pending.
 */
function validateFunding({ loanStatus }) {
  if (loanStatus !== 'pending') return { ok: false, error: `loan is '${loanStatus}', not 'pending' — cannot fund` };
  return { ok: true };
}

/**
 * A repayment must cover the next unpaid installment exactly, and the loan
 * must currently be funded (not pending/rejected/already repaid).
 */
function validateRepayment({ loanStatus, nextInstallment, amountPaid }) {
  if (loanStatus !== 'funded') return { ok: false, error: `loan is '${loanStatus}', not 'funded' — no repayment expected` };
  if (!nextInstallment) return { ok: false, error: 'loan has no outstanding installments' };
  if (!amountPaid || amountPaid <= 0) return { ok: false, error: 'amountPaid must be positive' };
  if (Math.round(amountPaid * 100) !== Math.round(nextInstallment.amountDue * 100)) {
    return { ok: false, error: `amountPaid must equal the next installment due (${nextInstallment.amountDue})` };
  }
  return { ok: true };
}

module.exports = {
  MIN_SCORE_TO_QUALIFY,
  evaluateLoanApplication,
  buildRepaymentSchedule,
  validateFunding,
  validateRepayment
};
