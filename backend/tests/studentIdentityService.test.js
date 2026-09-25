const assert = require('assert');
const {
  validateStudentProfile,
  computeStudentStarterScore,
  MAX_GRAD_YEAR_OFFSET,
  MAX_SELF_DECLARED_ALLOWANCE,
  STUDENT_STARTER_LOAN_CAP_USD
} = require('../services/studentIdentityService');
const { computeTrustScore } = require('../services/trustScoreEngine');

function run() {
  const currentYear = new Date().getFullYear();

  // --- validateStudentProfile ---
  assert.strictEqual(
    validateStudentProfile({ schoolName: 'State University', expectedGradYear: currentYear + 2, monthlyAllowance: 300 }).ok,
    true
  );
  assert.strictEqual(
    validateStudentProfile({ schoolName: '', expectedGradYear: currentYear + 2, monthlyAllowance: 300 }).ok,
    false,
    'empty schoolName should be rejected'
  );
  assert.strictEqual(
    validateStudentProfile({ schoolName: 'State University', expectedGradYear: currentYear - 1, monthlyAllowance: 300 }).ok,
    false,
    'a grad year in the past should be rejected'
  );
  assert.strictEqual(
    validateStudentProfile({ schoolName: 'State University', expectedGradYear: currentYear + MAX_GRAD_YEAR_OFFSET + 1, monthlyAllowance: 300 }).ok,
    false,
    'a grad year too far in the future should be rejected'
  );
  assert.strictEqual(
    validateStudentProfile({ schoolName: 'State University', expectedGradYear: currentYear + 1, monthlyAllowance: -50 }).ok,
    false,
    'negative allowance should be rejected'
  );
  assert.strictEqual(
    validateStudentProfile({ schoolName: 'State University', expectedGradYear: currentYear + 1, monthlyAllowance: MAX_SELF_DECLARED_ALLOWANCE + 1 }).ok,
    false,
    'allowance above the cap should be rejected'
  );
  assert.strictEqual(
    validateStudentProfile({ schoolName: 'State University', expectedGradYear: currentYear + 1 }).ok,
    true,
    'monthlyAllowance is optional'
  );

  // --- computeStudentStarterScore ---

  // No allowance declared at all -> pure fraud-component score, same floor
  // behavior as the normal computeTrustScore with monthlyIncome: null.
  const noAllowance = computeStudentStarterScore({ monthlyAllowance: null, fraudCleanRatio: 0.7 });
  assert.strictEqual(noAllowance.incomeComponent, 0);
  assert.strictEqual(noAllowance.selfDeclared, true);
  assert.strictEqual(noAllowance.startingLoanCapUsd, STUDENT_STARTER_LOAN_CAP_USD);

  // A self-declared allowance should raise the score above the no-allowance
  // baseline, but strictly less than an equal amount would if it went
  // through the normal (verified) computeTrustScore path -- that's the
  // whole point of the discount.
  const withAllowance = computeStudentStarterScore({ monthlyAllowance: 500, fraudCleanRatio: 0.7 });
  assert.ok(withAllowance.score > noAllowance.score, 'a declared allowance should raise the score above the no-allowance baseline');

  const verifiedEquivalent = computeTrustScore({ monthlyIncome: 500, fraudCleanRatio: 0.7 });
  assert.ok(
    withAllowance.incomeComponent < verifiedEquivalent.incomeComponent,
    'self-declared income component must be discounted relative to the verified path'
  );
  assert.ok(
    withAllowance.score <= verifiedEquivalent.score,
    'the starter score should never exceed what an equally-sized VERIFIED income would produce'
  );

  // Score stays within bounds for a clean-history, max-allowance student.
  const bestCase = computeStudentStarterScore({ monthlyAllowance: MAX_SELF_DECLARED_ALLOWANCE, fraudCleanRatio: 1 });
  assert.ok(bestCase.score <= 100 && bestCase.score >= 0);

  // Fraud-flagged history still pulls the starter score down, same as the
  // normal engine (reused, not forked).
  const flagged = computeStudentStarterScore({ monthlyAllowance: 500, fraudCleanRatio: 0.1 });
  assert.ok(flagged.score < withAllowance.score, 'a worse fraud-clean ratio should lower the starter score');

  console.log('✅ studentIdentityService: all assertions passed');
  console.log(`  sample: allowance $500, clean history -> score=${withAllowance.score} (verified-equivalent would be ${verifiedEquivalent.score}), loanCap=$${withAllowance.startingLoanCapUsd}`);
}

run();
