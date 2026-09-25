/**
 * Investment Advisory service — Module 4 core logic.
 *
 * Kept thin deliberately: the actual recommendation generation lives in
 * Gemini (adapters/gemini.js) since that's the genuinely AI-driven part.
 * What belongs here is the stuff that should NOT depend on an LLM call:
 * input validation and a sanity check on whatever Gemini (or the mock
 * fallback) returns, so a malformed AI response can never reach the user
 * as a broken allocation.
 */

const VALID_RISK_TOLERANCES = ['low', 'medium', 'high'];

/**
 * @returns {{ok:boolean, error?:string}}
 */
function validateRiskProfile({ riskTolerance, goal, horizonMonths }) {
  if (!VALID_RISK_TOLERANCES.includes(riskTolerance)) {
    return { ok: false, error: `riskTolerance must be one of ${VALID_RISK_TOLERANCES.join(', ')}` };
  }
  if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
    return { ok: false, error: 'goal is required' };
  }
  if (!horizonMonths || horizonMonths <= 0 || !Number.isInteger(horizonMonths)) {
    return { ok: false, error: 'horizonMonths must be a positive integer' };
  }
  return { ok: true };
}

/**
 * Sanity-checks an allocation object (from Gemini or the mock fallback)
 * sums to ~100 and has no negative buckets. Protects the demo from a
 * malformed or hallucinated AI response reaching the UI.
 *
 * Checkpoint 15 (Tier 3, first item): extended from four buckets to six —
 * added retirementPct and reitsPct, the two remaining Module 12 asset
 * classes the doc calls out ("fixed income, retirement, goal-based framing,
 * REITs" — fixed income already shipped in Checkpoint 4). Same function,
 * same validation shape, just two more buckets. Nothing here was forked.
 * @returns {{ok:boolean, error?:string}}
 */
function validateAllocation(allocation) {
  const values = [
    allocation.moneyMarketPct,
    allocation.stocksPct,
    allocation.mutualFundsPct,
    allocation.fixedIncomePct,
    allocation.retirementPct,
    allocation.reitsPct
  ];
  if (values.some((v) => typeof v !== 'number' || Number.isNaN(v) || v < 0)) {
    return { ok: false, error: 'allocation contains a missing/negative bucket' };
  }
  const total = values.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 2) { // small tolerance for LLM rounding
    return { ok: false, error: `allocation sums to ${total}, expected ~100` };
  }
  return { ok: true };
}

/**
 * Checkpoint 15 — "goal-based framing": a small, deterministic (NOT an LLM
 * call — same "keep it explainable" choice as fraudSignal.js/budgetService.js)
 * projection that reframes the allocation against the user's stated goal and
 * horizon, instead of leaving the percentages to speak for themselves.
 *
 * Uses a fixed, documented illustrative savings rate (15% of monthly income)
 * and a fixed illustrative per-bucket annual return assumption to produce a
 * rough "if you keep this up, here's roughly where you'd land" number. This
 * is explicitly an educational estimate, not a projection anyone should
 * trade on — mirrors the "advisory-only, no guarantee" framing already
 * required in the Gemini prompt.
 *
 * @param {Object} input
 * @param {Object} input.allocation - the six-bucket allocation (validated already)
 * @param {number|null} input.monthlyIncome
 * @param {string} input.goal
 * @param {number} input.horizonMonths
 * @returns {{ok:boolean, note?:string, monthlyContribution?:number, assumedAnnualReturnPct?:number, projectedTotal?:number, explanation?:string}}
 */
const ASSUMED_CONTRIBUTION_PCT = 0.15; // illustrative, documented assumption
const ASSUMED_ANNUAL_RETURN_BY_BUCKET = {
  moneyMarketPct: 0.01,
  stocksPct: 0.07,
  mutualFundsPct: 0.05,
  fixedIncomePct: 0.03,
  retirementPct: 0.05,
  reitsPct: 0.06
};

function computeGoalFraming({ allocation, monthlyIncome, goal, horizonMonths }) {
  if (typeof monthlyIncome !== 'number' || !(monthlyIncome > 0)) {
    return { ok: false, note: 'no verified income on file yet — goal framing needs a monthly income to estimate a contribution' };
  }
  if (!horizonMonths || horizonMonths <= 0) {
    return { ok: false, note: 'horizonMonths must be positive' };
  }

  const monthlyContribution = Math.round(monthlyIncome * ASSUMED_CONTRIBUTION_PCT);

  const weightedAnnualReturnPct = Object.entries(ASSUMED_ANNUAL_RETURN_BY_BUCKET)
    .reduce((sum, [bucket, rate]) => sum + (allocation[bucket] || 0) * rate, 0) / 100;
  const monthlyRate = weightedAnnualReturnPct / 12;

  // Future value of a monthly contribution stream (ordinary annuity).
  const projectedTotal = monthlyRate === 0
    ? monthlyContribution * horizonMonths
    : monthlyContribution * ((Math.pow(1 + monthlyRate, horizonMonths) - 1) / monthlyRate);

  return {
    ok: true,
    monthlyContribution,
    assumedAnnualReturnPct: Math.round(weightedAnnualReturnPct * 1000) / 10, // e.g. 4.8
    projectedTotal: Math.round(projectedTotal),
    explanation: `Saving about ${monthlyContribution}/month at this allocation, over ${horizonMonths} months toward "${goal}", could grow to roughly ${Math.round(projectedTotal)} at an illustrative blended return. Educational estimate only — not a guarantee.`
  };
}

module.exports = { VALID_RISK_TOLERANCES, validateRiskProfile, validateAllocation, computeGoalFraming };
