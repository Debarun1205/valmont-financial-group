const assert = require('assert');
const { computeTrustScore, scoreToExpectedLoss } = require('../services/trustScoreEngine');

function run() {
  // A brand-new user: no income doc yet, neutral-default fraud ratio (0.7)
  const t1 = computeTrustScore({ monthlyIncome: null, fraudCleanRatio: 0.7 });
  assert.strictEqual(t1.incomeComponent, 0, 'no income => 0 income component');
  assert.ok(t1.score > 0 && t1.score <= 50, `score should be fraud-only range, got ${t1.score}`);

  // A verified income at baseline, perfectly clean history
  const t2 = computeTrustScore({ monthlyIncome: 1000, fraudCleanRatio: 1 });
  assert.ok(t2.score > t1.score, 'verified income + clean history should score higher than no income');
  assert.ok(t2.score <= 100, 'score must be capped at 100');

  // Fraud-flagged history should pull the score down even with strong income
  const t3 = computeTrustScore({ monthlyIncome: 5000, fraudCleanRatio: 0.2 });
  assert.ok(t3.fraudComponent < 20, `heavily flagged history should tank fraud component, got ${t3.fraudComponent}`);

  // Bad input guarded
  assert.throws(() => computeTrustScore({ monthlyIncome: 1000, fraudCleanRatio: 1.5 }), /between 0 and 1/);

  // Score <-> expected-loss mapping is monotonic (Module 6's lender lens)
  const lossHigh = scoreToExpectedLoss(20);
  const lossLow = scoreToExpectedLoss(90);
  assert.ok(lossHigh > lossLow, 'lower trust score should map to higher expected loss');

  console.log('✅ trustScoreEngine: all assertions passed');
  console.log('  sample: no-history user       ->', t1);
  console.log('  sample: verified+clean user   ->', t2);
  console.log('  sample: flagged-history user  ->', t3);
  console.log('  sample: expected-loss(20) =', lossHigh, '| expected-loss(90) =', lossLow);
}

run();
