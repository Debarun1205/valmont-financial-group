/**
 * Insurance service — Module 13 core logic.
 *
 * "Third lens" on the trust-score engine per the documentation's "one
 * engine, many lenses" thesis: this module does NOT recompute risk, it only
 * prices and validates against trustScoreEngine.scoreToInsurancePremiumMultiplier(),
 * the same way Module 3 (loans) reuses scoreToExpectedLoss(). Kept as pure
 * functions over plain values, no DB/network calls, so it's unit-testable
 * the same way as every earlier module.
 */

const BASE_MONTHLY_PREMIUM_BY_TYPE = {
  health: 12,
  device: 3,
  'income-protection': 8
};

const MAX_COVERAGE_BY_TYPE = {
  health: 5000,
  device: 800,
  'income-protection': 3000
};

const VALID_POLICY_TYPES = Object.keys(BASE_MONTHLY_PREMIUM_BY_TYPE);

/**
 * Prices a policy quote from the trust score's insurance lens.
 * @param {Object} input
 * @param {string} input.policyType - one of VALID_POLICY_TYPES
 * @param {number} input.coverageAmount
 * @param {number} input.premiumMultiplier - from trustScoreEngine.scoreToInsurancePremiumMultiplier(score)
 * @returns {{ok:boolean, error?:string, monthlyPremium?:number}}
 */
function quotePolicy({ policyType, coverageAmount, premiumMultiplier }) {
  if (!VALID_POLICY_TYPES.includes(policyType)) {
    return { ok: false, error: `policyType must be one of ${VALID_POLICY_TYPES.join(', ')}` };
  }
  if (!coverageAmount || coverageAmount <= 0) {
    return { ok: false, error: 'coverageAmount must be positive' };
  }
  const maxCoverage = MAX_COVERAGE_BY_TYPE[policyType];
  if (coverageAmount > maxCoverage) {
    return { ok: false, error: `coverageAmount exceeds the max of ${maxCoverage} for ${policyType}`, maxCoverage };
  }
  if (!premiumMultiplier || premiumMultiplier <= 0) {
    return { ok: false, error: 'premiumMultiplier must be positive' };
  }

  // Base premium scales with how much of the type's max coverage is being
  // bought, then the trust-score lens multiplies it up/down.
  const coverageRatio = coverageAmount / maxCoverage;
  const monthlyPremium = Math.round(BASE_MONTHLY_PREMIUM_BY_TYPE[policyType] * coverageRatio * premiumMultiplier * 100) / 100;

  return { ok: true, monthlyPremium, maxCoverage };
}

/**
 * Validates a claim against its policy before it's written to the DB.
 * @returns {{ok:boolean, error?:string}}
 */
function validateClaim({ policyStatus, coverageAmount, claimAmount }) {
  if (policyStatus !== 'active') {
    return { ok: false, error: `policy is '${policyStatus}', not active — cannot file a claim` };
  }
  if (!claimAmount || claimAmount <= 0) {
    return { ok: false, error: 'claimAmount must be positive' };
  }
  if (claimAmount > coverageAmount) {
    return { ok: false, error: `claimAmount exceeds the policy's coverageAmount of ${coverageAmount}` };
  }
  return { ok: true };
}

module.exports = {
  VALID_POLICY_TYPES,
  BASE_MONTHLY_PREMIUM_BY_TYPE,
  MAX_COVERAGE_BY_TYPE,
  quotePolicy,
  validateClaim
};
