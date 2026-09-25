/**
 * Merchant view — Checkpoint 13 (Tier 2, fourth item, after gold, budgeting
 * nudge, and student starter-identity).
 *
 * Deliberately does NOT compute a new score. This is the same "one engine,
 * many lenses" principle as lenderAnalytics.js and insuranceService.js: the
 * only new logic here is validating a self-declared business profile and
 * combining the existing trust_scores row with the existing revenue-trend
 * query (services/spendingAnalytics.js) into a merchant-facing summary via
 * trustScoreEngine.scoreToMerchantHealthRating().
 *
 * Kept as pure functions where possible so the interesting bits are unit
 * testable without a DB, same pattern as every earlier module.
 */

const { scoreToMerchantHealthRating } = require('./trustScoreEngine');

const VALID_CATEGORIES = ['retail', 'food', 'services', 'other'];

/**
 * @param {Object} input
 * @param {string} input.businessName
 * @param {string} input.category
 * @returns {{ok:boolean, error?:string}}
 */
function validateMerchantProfile({ businessName, category }) {
  if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
    return { ok: false, error: 'businessName is required' };
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return { ok: false, error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }
  return { ok: true };
}

/**
 * Combines the latest trust score with a trailing-revenue figure into a
 * merchant-facing business-health summary. No new scoring math — just the
 * merchant lens on top of scoreToMerchantHealthRating().
 *
 * @param {Object} input
 * @param {number} input.score - latest trust_scores.score for this user
 * @param {number} input.monthlyRevenue - trailing-30-day inbound wallet total
 * @returns {{score:number, monthlyRevenue:number, rating:string, ratingLabel:string, recommendedCreditLineUsd:number}}
 */
function computeBusinessHealth({ score, monthlyRevenue }) {
  const { rating, ratingLabel, recommendedCreditLineUsd } = scoreToMerchantHealthRating(score, monthlyRevenue);
  return {
    score,
    monthlyRevenue: Math.round((monthlyRevenue || 0) * 100) / 100,
    rating,
    ratingLabel,
    recommendedCreditLineUsd
  };
}

module.exports = { validateMerchantProfile, computeBusinessHealth, VALID_CATEGORIES };
