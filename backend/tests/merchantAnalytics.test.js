const assert = require('assert');
const { validateMerchantProfile, computeBusinessHealth } = require('../services/merchantAnalytics');
const { scoreToMerchantHealthRating } = require('../services/trustScoreEngine');

function run() {
  // --- validateMerchantProfile ---
  assert.strictEqual(
    validateMerchantProfile({ businessName: 'Corner Store', category: 'retail' }).ok,
    true
  );
  assert.strictEqual(
    validateMerchantProfile({ businessName: '', category: 'retail' }).ok,
    false,
    'empty businessName should be rejected'
  );
  assert.strictEqual(
    validateMerchantProfile({ businessName: 'Corner Store', category: 'not-a-real-category' }).ok,
    false,
    'invalid category should be rejected'
  );
  assert.strictEqual(
    validateMerchantProfile({ businessName: 'Corner Store' }).ok,
    false,
    'category is required'
  );

  // --- scoreToMerchantHealthRating: monotonic rating bands + credit line ---
  assert.strictEqual(scoreToMerchantHealthRating(10).rating, 'poor');
  assert.strictEqual(scoreToMerchantHealthRating(45).rating, 'fair');
  assert.strictEqual(scoreToMerchantHealthRating(65).rating, 'good');
  assert.strictEqual(scoreToMerchantHealthRating(90).rating, 'excellent');

  const lowScoreLine = scoreToMerchantHealthRating(10, 1000).recommendedCreditLineUsd;
  const highScoreLine = scoreToMerchantHealthRating(90, 1000).recommendedCreditLineUsd;
  assert.ok(highScoreLine > lowScoreLine, 'a higher score should recommend a larger credit line for the same revenue');

  const zeroRevenue = scoreToMerchantHealthRating(90, 0).recommendedCreditLineUsd;
  assert.strictEqual(zeroRevenue, 0, 'no revenue should mean no credit line, regardless of score');

  // --- computeBusinessHealth: combines score + revenue, no new scoring math ---
  const health = computeBusinessHealth({ score: 75, monthlyRevenue: 2000 });
  assert.strictEqual(health.rating, 'good');
  assert.strictEqual(health.score, 75);
  assert.ok(health.recommendedCreditLineUsd > 0);

  const noRevenueHealth = computeBusinessHealth({ score: 75, monthlyRevenue: 0 });
  assert.strictEqual(noRevenueHealth.recommendedCreditLineUsd, 0);

  console.log('✅ merchantAnalytics: all assertions passed');
  console.log(`  sample: score=75, monthlyRevenue=$2000 -> rating=${health.ratingLabel}, recommendedCreditLine=$${health.recommendedCreditLineUsd}`);
}

run();
