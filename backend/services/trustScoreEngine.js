/**
 * Trust Score Engine — Module 1 core logic.
 *
 * This is the ONE engine referenced throughout the product documentation as
 * "one engine, many lenses": the same computeTrustScore() output is what gets
 * shown to the individual as a "trust score" (Module 1), to a bank as
 * "expected loss" (Module 6), and later to an insurer (Module 13) or a
 * merchant (Module 17). Do not fork this logic per-audience — only the
 * presentation layer differs.
 *
 * Kept as a pure function (no DB/network calls) so it's trivially unit
 * testable and so every consumer (routes, batch jobs, future modules) calls
 * the same math.
 */

/**
 * @param {Object} input
 * @param {number|null} input.monthlyIncome - extracted via Gemini OCR, Module 1
 * @param {number} input.fraudCleanRatio - 0..1, from the TimescaleDB windowed query
 *   in services/fraudSignal.js. 1 = perfectly clean transaction history.
 * @param {number} [input.incomeBaseline=1000] - normalization baseline for the
 *   income component; tune per-market during the hackathon (currency, region).
 * @returns {{score:number, incomeComponent:number, fraudComponent:number}}
 */
function computeTrustScore({ monthlyIncome, fraudCleanRatio, incomeBaseline = 1000 }) {
  if (fraudCleanRatio < 0 || fraudCleanRatio > 1) {
    throw new Error('fraudCleanRatio must be between 0 and 1');
  }

  // Income component: 0-50 points, saturating logarithmically so a first
  // income document (even a small one) moves the score meaningfully instead
  // of a linear scale that punishes low-income users disproportionately —
  // this matters for the "underserved" framing in the pitch.
  let incomeComponent = 0;
  if (monthlyIncome && monthlyIncome > 0) {
    const ratio = monthlyIncome / incomeBaseline;
    incomeComponent = Math.min(50, 50 * (Math.log(1 + ratio) / Math.log(1 + 3))); // caps near ratio=3x baseline
  }

  // Fraud/behavioral component: 0-50 points, directly proportional to the
  // clean-transaction ratio computed by the TimescaleDB query.
  const fraudComponent = fraudCleanRatio * 50;

  const score = Math.round(incomeComponent + fraudComponent);

  return {
    score: Math.max(0, Math.min(100, score)),
    incomeComponent: Math.round(incomeComponent * 10) / 10,
    fraudComponent: Math.round(fraudComponent * 10) / 10
  };
}

/**
 * Convenience mapper for Module 6 (lender view): same score, different label,
 * expressed as an expected-loss percentage. This is the literal implementation
 * of "one engine, two lenses" from the documentation.
 */
function scoreToExpectedLoss(score) {
  // Simple monotonic mapping for the demo: higher trust score -> lower expected loss.
  // Replace with a calibrated model once real repayment outcome data exists.
  const expectedLossPct = Math.max(0.5, 20 - (score / 100) * 19.5);
  return Math.round(expectedLossPct * 10) / 10;
}

/**
 * Checkpoint 6 (Module 13 — Insurance) addition: the THIRD lens on the same
 * engine. A lender reads scoreToExpectedLoss() as "chance of default"; an
 * insurer reads this as "chance of a claim" — same score, same monotonic
 * shape, different label and different consumer. Do not fork
 * computeTrustScore() for this — only this mapping function is new.
 *
 * Returns a premium MULTIPLIER (1.0 = baseline risk). Higher score -> lower
 * multiplier -> cheaper premium for a given base rate/coverage amount.
 */
function scoreToInsurancePremiumMultiplier(score) {
  // Same shape as scoreToExpectedLoss (monotonic, bounded), re-scaled onto a
  // 0.6x (best score) .. 2.0x (worst score) premium-multiplier range instead
  // of a loss percentage. Replace with an actuarially calibrated model once
  // real claims data exists.
  const multiplier = Math.max(0.6, 2.0 - (score / 100) * 1.4);
  return Math.round(multiplier * 100) / 100;
}

/**
 * Checkpoint 13 (Module 17 — Merchant view) addition: the FOURTH lens on the
 * same engine. Lender reads the score as "chance of default"; insurer reads
 * it as "chance of a claim"; a merchant reads the same score as its own
 * "business health rating" plus a recommended working-capital credit line.
 * Same monotonic shape as the other two mappers — do not fork
 * computeTrustScore() for this, only this mapping function is new.
 *
 * @param {number} score - 0..100, same trust_scores.score every other lens reads
 * @param {number} [monthlyRevenue=0] - trailing-30-day inbound wallet total (services/spendingAnalytics.js), used only to scale the credit-line dollar amount, not the rating itself
 * @returns {{rating:string, ratingLabel:string, recommendedCreditLineUsd:number}}
 */
function scoreToMerchantHealthRating(score, monthlyRevenue = 0) {
  let rating, ratingLabel;
  if (score >= 80) { rating = 'excellent'; ratingLabel = 'Excellent'; }
  else if (score >= 60) { rating = 'good'; ratingLabel = 'Good'; }
  else if (score >= 40) { rating = 'fair'; ratingLabel = 'Fair'; }
  else { rating = 'poor'; ratingLabel = 'Poor'; }

  // Recommended credit line: a fraction of trailing monthly revenue,
  // scaled by score (0..100 -> 0.25x..2x revenue). Simple, explainable,
  // monotonic — same "replace with a calibrated model once real repayment
  // data exists" caveat as scoreToExpectedLoss/scoreToInsurancePremiumMultiplier.
  const revenueMultiplier = 0.25 + (score / 100) * 1.75;
  const recommendedCreditLineUsd = Math.round(Math.max(0, monthlyRevenue) * revenueMultiplier * 100) / 100;

  return { rating, ratingLabel, recommendedCreditLineUsd };
}

module.exports = {
  computeTrustScore,
  scoreToExpectedLoss,
  scoreToInsurancePremiumMultiplier,
  scoreToMerchantHealthRating
};
