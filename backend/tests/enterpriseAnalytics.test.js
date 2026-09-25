const assert = require('assert');
const {
  validateEnterpriseProfile,
  validateEmployeeLink,
  summarizeWorkforce
} = require('../services/enterpriseAnalytics');

function run() {
  // --- validateEnterpriseProfile / validateEmployeeLink ---
  assert.strictEqual(validateEnterpriseProfile({ organizationName: 'Acme Corp' }).ok, true);
  assert.strictEqual(
    validateEnterpriseProfile({ organizationName: '' }).ok,
    false,
    'empty organizationName should be rejected'
  );
  assert.strictEqual(validateEmployeeLink({ organizationName: 'Acme Corp' }).ok, true);
  assert.strictEqual(
    validateEmployeeLink({ organizationName: '   ' }).ok,
    false,
    'whitespace-only organizationName should be rejected'
  );

  // --- summarizeWorkforce: no employees yet ---
  const empty = summarizeWorkforce([], [], 0);
  assert.strictEqual(empty.headcount, 0);
  assert.strictEqual(empty.scoredCount, 0);
  assert.strictEqual(empty.avgTrustScore, 0);
  assert.strictEqual(empty.loanPortfolio.loanCount, 0);

  // --- summarizeWorkforce: headcount can exceed scoredCount (some employees have no score yet) ---
  const partial = summarizeWorkforce([{ userId: 'u1', score: 80 }], [], 3);
  assert.strictEqual(partial.headcount, 3);
  assert.strictEqual(partial.scoredCount, 1);
  assert.strictEqual(partial.avgTrustScore, 80);

  // --- rating distribution matches scoreToMerchantHealthRating bands ---
  const scores = [
    { userId: 'u1', score: 90 }, // excellent
    { userId: 'u2', score: 65 }, // good
    { userId: 'u3', score: 45 }, // fair
    { userId: 'u4', score: 10 } // poor
  ];
  const distSummary = summarizeWorkforce(scores, [], 4);
  assert.deepStrictEqual(distSummary.ratingDistribution, { excellent: 1, good: 1, fair: 1, poor: 1 });
  assert.strictEqual(distSummary.avgTrustScore, 52.5);

  // --- loan side reuses lenderAnalytics.summarizePortfolio unchanged ---
  const loans = [
    { principal: 1000, status: 'funded', expected_loss_pct_at_request: 5 },
    { principal: 500, status: 'repaid', expected_loss_pct_at_request: 3 },
    { principal: 200, status: 'rejected', expected_loss_pct_at_request: 10 }
  ];
  const withLoans = summarizeWorkforce(scores, loans, 4);
  assert.strictEqual(withLoans.loanPortfolio.loanCount, 3);
  assert.strictEqual(withLoans.loanPortfolio.totalFunded, 1500);
  assert.strictEqual(withLoans.loanPortfolio.totalOutstanding, 1000);

  console.log('✅ enterpriseAnalytics: all assertions passed');
  console.log(
    `  sample: headcount=4, avgTrustScore=${distSummary.avgTrustScore}, distribution=${JSON.stringify(distSummary.ratingDistribution)}`
  );
}

run();
