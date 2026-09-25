/**
 * Student Starter-Identity — Checkpoint 12 (Tier 2, third item, after gold
 * and the budgeting nudge).
 *
 * Most students have no income document to feed Module 1's normal
 * verify-income -> compute flow. This is a lighter-weight ENTRY PATH into
 * the same engine, not a second scoring model: computeStudentStarterScore()
 * below calls trustScoreEngine.computeTrustScore() directly and only
 * discounts the income side of it, because a self-declared allowance
 * carries less evidence than a Gemini-OCR-verified document. Same "one
 * engine, many lenses" thesis as scoreToExpectedLoss /
 * scoreToInsurancePremiumMultiplier in trustScoreEngine.js — this is a
 * lens on the INPUT side instead of the output side.
 *
 * Kept as pure functions over plain values, no DB/network calls, so it's
 * unit-testable the same way as every earlier module.
 */

const { computeTrustScore } = require('./trustScoreEngine');

const MAX_GRAD_YEAR_OFFSET = 8; // generous upper bound for the hackathon demo
const MAX_SELF_DECLARED_ALLOWANCE = 2000; // sanity cap -- no verification exists for this path
const SELF_DECLARED_INCOME_DISCOUNT = 0.5; // a self-declared allowance counts for half of what a Gemini-OCR-verified income document would in the normal Module 1 path
const STUDENT_STARTER_LOAN_CAP_USD = 300; // hard ceiling for any loan sourced through this entry path, regardless of score -- real underwriting waits on a verified income document. Enforcement lives wherever a future checkpoint wires this into loanService; this module only computes and exposes the number.

/**
 * Validates a student profile before it's written to the DB.
 * @param {Object} input
 * @param {string} input.schoolName
 * @param {number} input.expectedGradYear
 * @param {number|null|undefined} input.monthlyAllowance - optional, self-declared
 * @returns {{ok:boolean, error?:string}}
 */
function validateStudentProfile({ schoolName, expectedGradYear, monthlyAllowance }) {
  if (!schoolName || typeof schoolName !== 'string' || !schoolName.trim()) {
    return { ok: false, error: 'schoolName is required' };
  }

  const currentYear = new Date().getFullYear();
  if (
    !Number.isInteger(expectedGradYear) ||
    expectedGradYear < currentYear ||
    expectedGradYear > currentYear + MAX_GRAD_YEAR_OFFSET
  ) {
    return { ok: false, error: `expectedGradYear must be an integer between ${currentYear} and ${currentYear + MAX_GRAD_YEAR_OFFSET}` };
  }

  if (monthlyAllowance !== undefined && monthlyAllowance !== null) {
    if (typeof monthlyAllowance !== 'number' || Number.isNaN(monthlyAllowance) || monthlyAllowance < 0) {
      return { ok: false, error: 'monthlyAllowance must be a non-negative number' };
    }
    if (monthlyAllowance > MAX_SELF_DECLARED_ALLOWANCE) {
      return { ok: false, error: `monthlyAllowance must not exceed ${MAX_SELF_DECLARED_ALLOWANCE}` };
    }
  }

  return { ok: true };
}

/**
 * Computes a starter trust score for the student entry path. Reuses
 * trustScoreEngine.computeTrustScore() unchanged for the underlying math
 * (do not fork it) and only discounts the resulting income component,
 * since the input is a self-declared allowance rather than a document
 * Gemini has extracted and stored an evidence trail for.
 *
 * @param {Object} input
 * @param {number|null} input.monthlyAllowance - self-declared, from student_profiles
 * @param {number} input.fraudCleanRatio - 0..1, from the same TimescaleDB windowed query used everywhere else (services/fraudSignal.js)
 * @returns {{score:number, incomeComponent:number, fraudComponent:number, selfDeclared:true, startingLoanCapUsd:number}}
 */
function computeStudentStarterScore({ monthlyAllowance, fraudCleanRatio }) {
  const base = computeTrustScore({ monthlyIncome: monthlyAllowance, fraudCleanRatio });

  const discountedIncomeComponent = Math.round(base.incomeComponent * SELF_DECLARED_INCOME_DISCOUNT * 10) / 10;
  const score = Math.max(0, Math.min(100, Math.round(discountedIncomeComponent + base.fraudComponent)));

  return {
    score,
    incomeComponent: discountedIncomeComponent,
    fraudComponent: base.fraudComponent,
    selfDeclared: true,
    startingLoanCapUsd: STUDENT_STARTER_LOAN_CAP_USD
  };
}

module.exports = {
  validateStudentProfile,
  computeStudentStarterScore,
  MAX_GRAD_YEAR_OFFSET,
  MAX_SELF_DECLARED_ALLOWANCE,
  SELF_DECLARED_INCOME_DISCOUNT,
  STUDENT_STARTER_LOAN_CAP_USD
};
