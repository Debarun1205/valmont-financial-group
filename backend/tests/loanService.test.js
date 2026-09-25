const assert = require('assert');
const {
  MIN_SCORE_TO_QUALIFY,
  evaluateLoanApplication,
  buildRepaymentSchedule,
  validateFunding,
  validateRepayment
} = require('../services/loanService');

// --- evaluateLoanApplication --------------------------------------------

// Below the minimum score is rejected outright.
const lowScore = evaluateLoanApplication({
  score: MIN_SCORE_TO_QUALIFY - 5,
  expectedLossPct: 15,
  requestedAmount: 100,
  requestedTermMonths: 6
});
assert.strictEqual(lowScore.approved, false);

// A qualifying score with a reasonable amount is approved with a priced rate.
const approved = evaluateLoanApplication({
  score: 80,
  expectedLossPct: 2.4,
  requestedAmount: 1000,
  requestedTermMonths: 12
});
assert.strictEqual(approved.approved, true);
assert.ok(approved.interestRatePct > 0);

// Higher score -> lower expected loss -> strictly lower rate than a lower score, all else equal.
const highScoreQuote = evaluateLoanApplication({ score: 90, expectedLossPct: 1.2, requestedAmount: 500, requestedTermMonths: 12 });
const midScoreQuote = evaluateLoanApplication({ score: 60, expectedLossPct: 9.5, requestedAmount: 500, requestedTermMonths: 12 });
assert.ok(highScoreQuote.interestRatePct < midScoreQuote.interestRatePct,
  `expected high-score rate (${highScoreQuote.interestRatePct}) < mid-score rate (${midScoreQuote.interestRatePct})`);

// Requesting above the score tier's max amount is rejected with the cap surfaced.
const tooMuch = evaluateLoanApplication({ score: 60, expectedLossPct: 9.5, requestedAmount: 999999, requestedTermMonths: 12 });
assert.strictEqual(tooMuch.approved, false);
assert.ok(tooMuch.maxAmount > 0);

// Invalid inputs are rejected before touching the score at all.
assert.strictEqual(evaluateLoanApplication({ score: 90, expectedLossPct: 1, requestedAmount: 0, requestedTermMonths: 6 }).approved, false);
assert.strictEqual(evaluateLoanApplication({ score: 90, expectedLossPct: 1, requestedAmount: 500, requestedTermMonths: 0 }).approved, false);

// --- buildRepaymentSchedule ----------------------------------------------

const schedule = buildRepaymentSchedule({ principal: 1200, annualRatePct: 10, termMonths: 12 });
assert.strictEqual(schedule.length, 12);
const scheduleTotal = Math.round(schedule.reduce((s, i) => s + i.amountDue, 0) * 100) / 100;
const expectedTotal = Math.round((1200 + 1200 * 0.10 * 1) * 100) / 100; // 1 year at 10% flat
assert.strictEqual(scheduleTotal, expectedTotal, `schedule should sum exactly to principal+interest (got ${scheduleTotal}, expected ${expectedTotal})`);
// Every installment is (roughly) equal — no wild outliers except possible last-cent rounding.
const first = schedule[0].amountDue;
schedule.slice(0, -1).forEach(i => assert.ok(Math.abs(i.amountDue - first) < 0.01));

assert.throws(() => buildRepaymentSchedule({ principal: 0, annualRatePct: 10, termMonths: 12 }));
assert.throws(() => buildRepaymentSchedule({ principal: 100, annualRatePct: 10, termMonths: 0 }));

// --- validateFunding -------------------------------------------------------

assert.strictEqual(validateFunding({ loanStatus: 'pending' }).ok, true);
assert.strictEqual(validateFunding({ loanStatus: 'funded' }).ok, false); // can't double-fund
assert.strictEqual(validateFunding({ loanStatus: 'rejected' }).ok, false);

// --- validateRepayment ------------------------------------------------------

const nextInstallment = { installmentNumber: 1, amountDue: 105.5 };
assert.strictEqual(validateRepayment({ loanStatus: 'funded', nextInstallment, amountPaid: 105.5 }).ok, true);
assert.strictEqual(validateRepayment({ loanStatus: 'funded', nextInstallment, amountPaid: 50 }).ok, false); // partial payment rejected
assert.strictEqual(validateRepayment({ loanStatus: 'pending', nextInstallment, amountPaid: 105.5 }).ok, false); // not funded yet
assert.strictEqual(validateRepayment({ loanStatus: 'funded', nextInstallment: null, amountPaid: 105.5 }).ok, false); // already fully repaid

console.log('✅ loanService: all assertions passed');
console.log(`  sample quote (score 80, requested 1000/12mo) -> approved=${approved.approved}, rate=${approved.interestRatePct}%`);
console.log(`  sample schedule total (1200 principal, 10% APR, 12mo) -> ${scheduleTotal}`);
