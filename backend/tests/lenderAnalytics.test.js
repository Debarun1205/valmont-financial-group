const assert = require('assert');
const { summarizePortfolio } = require('../services/lenderAnalytics');

function run() {
  const loans = [
    { principal: 1000, status: 'funded', expected_loss_pct_at_request: 5 },
    { principal: 2000, status: 'repaid', expected_loss_pct_at_request: 3 },
    { principal: 500, status: 'pending', expected_loss_pct_at_request: 10 }, // excluded from funded totals
    { principal: 300, status: 'rejected', expected_loss_pct_at_request: 15 } // excluded
  ];

  const summary = summarizePortfolio(loans);
  assert.strictEqual(summary.totalFunded, 3000, 'only funded+repaid count toward totalFunded');
  assert.strictEqual(summary.totalOutstanding, 1000, 'only currently-funded (not repaid) counts as outstanding');
  // weighted avg = (1000*5 + 2000*3) / 3000 = 11000/3000 = 3.666... -> 3.7
  assert.strictEqual(summary.weightedAvgExpectedLossPct, 3.7);
  assert.strictEqual(summary.loanCount, 4);
  assert.deepStrictEqual(summary.countByStatus, { funded: 1, repaid: 1, pending: 1, rejected: 1 });

  const empty = summarizePortfolio([]);
  assert.strictEqual(empty.totalFunded, 0, 'empty portfolio should not divide by zero');
  assert.strictEqual(empty.weightedAvgExpectedLossPct, 0);

  console.log('✅ lenderAnalytics: all assertions passed');
  console.log('  sample summary ->', summary);
}

run();
