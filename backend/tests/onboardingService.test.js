const assert = require('assert');
const {
  validateOnboardingAnswers,
  classifyCustomerTier
} = require('../services/onboardingService');

const student = classifyCustomerTier({
  monthlyIncome: 400,
  dailyLearningMinutes: 60,
  investmentCapital: 50,
  background: 'student'
});
assert.strictEqual(student.customerTier, 'students');

const bank = classifyCustomerTier({
  monthlyIncome: 8000,
  dailyLearningMinutes: 20,
  investmentCapital: 100000,
  background: 'bank risk desk'
});
assert.strictEqual(bank.customerTier, 'banks');

const hacker = classifyCustomerTier({
  monthlyIncome: 3000,
  dailyLearningMinutes: 90,
  investmentCapital: 2000,
  background: 'security engineer / hacker'
});
assert.strictEqual(hacker.customerTier, 'hackers');

const bigMerchant = classifyCustomerTier({
  monthlyIncome: 12000,
  dailyLearningMinutes: 15,
  investmentCapital: 40000,
  background: 'big merchant retail chain'
});
assert.strictEqual(bigMerchant.customerTier, 'big_merchants');

const bad = validateOnboardingAnswers({ monthlyIncome: -1, dailyLearningMinutes: 10, investmentCapital: 0, background: 'x' });
assert.strictEqual(bad.ok, false);

const ok = validateOnboardingAnswers({ monthlyIncome: 1000, dailyLearningMinutes: 20, investmentCapital: 100, background: 'career professional' });
assert.strictEqual(ok.ok, true);

console.log('onboardingService.test.js — all assertions passed');
