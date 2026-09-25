const assert = require('assert');
const { quotePolicy, validateClaim } = require('../services/insuranceService');
const { scoreToInsurancePremiumMultiplier } = require('../services/trustScoreEngine');

function run() {
  // Multiplier is monotonic: a high score should never cost more than a low score.
  const highScoreMultiplier = scoreToInsurancePremiumMultiplier(90);
  const lowScoreMultiplier = scoreToInsurancePremiumMultiplier(20);
  assert.ok(highScoreMultiplier < lowScoreMultiplier, 'higher trust score should yield a lower premium multiplier');
  assert.ok(highScoreMultiplier >= 0.6, 'multiplier should not go below the floor');

  const goodQuote = quotePolicy({ policyType: 'device', coverageAmount: 400, premiumMultiplier: highScoreMultiplier });
  assert.strictEqual(goodQuote.ok, true);
  assert.ok(goodQuote.monthlyPremium > 0);

  const cheaperForBetterScore = quotePolicy({ policyType: 'device', coverageAmount: 400, premiumMultiplier: highScoreMultiplier });
  const pricierForWorseScore = quotePolicy({ policyType: 'device', coverageAmount: 400, premiumMultiplier: lowScoreMultiplier });
  assert.ok(cheaperForBetterScore.monthlyPremium < pricierForWorseScore.monthlyPremium, 'better score should quote a cheaper premium for the same coverage');

  const badType = quotePolicy({ policyType: 'car', coverageAmount: 400, premiumMultiplier: 1 });
  assert.strictEqual(badType.ok, false);

  const overCap = quotePolicy({ policyType: 'device', coverageAmount: 5000, premiumMultiplier: 1 });
  assert.strictEqual(overCap.ok, false);
  assert.match(overCap.error, /exceeds the max/);

  const zeroCoverage = quotePolicy({ policyType: 'health', coverageAmount: 0, premiumMultiplier: 1 });
  assert.strictEqual(zeroCoverage.ok, false);

  // Claims
  const okClaim = validateClaim({ policyStatus: 'active', coverageAmount: 1000, claimAmount: 500 });
  assert.strictEqual(okClaim.ok, true);

  const inactiveClaim = validateClaim({ policyStatus: 'lapsed', coverageAmount: 1000, claimAmount: 500 });
  assert.strictEqual(inactiveClaim.ok, false);
  assert.match(inactiveClaim.error, /not active/);

  const overCoverageClaim = validateClaim({ policyStatus: 'active', coverageAmount: 1000, claimAmount: 5000 });
  assert.strictEqual(overCoverageClaim.ok, false);
  assert.match(overCoverageClaim.error, /exceeds/);

  const negativeClaim = validateClaim({ policyStatus: 'active', coverageAmount: 1000, claimAmount: -5 });
  assert.strictEqual(negativeClaim.ok, false);

  console.log('✅ insuranceService: all assertions passed');
  console.log(`  sample: score 90 -> multiplier ${highScoreMultiplier}x | score 20 -> multiplier ${lowScoreMultiplier}x`);
  console.log(`  sample quote (device, $400 coverage, best-score multiplier) -> $${goodQuote.monthlyPremium}/mo`);
}

run();
