const assert = require('assert');
const { validateBudgetGoal, computeBudgetNudge, DEFAULT_TARGET_SAVINGS_PCT } = require('../services/budgetService');

function run() {
  // --- validateBudgetGoal ---
  assert.strictEqual(validateBudgetGoal({ targetSavingsPct: 20 }).ok, true);
  assert.strictEqual(validateBudgetGoal({ targetSavingsPct: 0 }).ok, false, 'below min should be rejected');
  assert.strictEqual(validateBudgetGoal({ targetSavingsPct: 95 }).ok, false, 'above max should be rejected');
  assert.strictEqual(validateBudgetGoal({ targetSavingsPct: 'twenty' }).ok, false, 'non-numeric should be rejected');
  assert.strictEqual(validateBudgetGoal({}).ok, false, 'missing value should be rejected');

  // --- computeBudgetNudge ---

  // No verified income yet -> distinct status, no crash on missing income
  const noIncome = computeBudgetNudge({ monthlyIncome: null, monthlySpend: 500, savingsVaultBalance: 0, targetSavingsPct: 20 });
  assert.strictEqual(noIncome.status, 'no-income-data');
  assert.strictEqual(noIncome.projectedSavingsPct, null);

  // Comfortably ahead of goal -> on-track
  const onTrack = computeBudgetNudge({ monthlyIncome: 2000, monthlySpend: 1200, savingsVaultBalance: 0, targetSavingsPct: 20 });
  assert.strictEqual(onTrack.status, 'on-track');
  assert.strictEqual(onTrack.projectedSavingsPct, 40); // (2000-1200)/2000 = 40%

  // Just under goal but within the watch zone -> watch, not over-budget
  const watch = computeBudgetNudge({ monthlyIncome: 2000, monthlySpend: 1700, savingsVaultBalance: 0, targetSavingsPct: 20 });
  assert.strictEqual(watch.status, 'watch');
  assert.strictEqual(watch.projectedSavingsPct, 15); // (2000-1700)/2000 = 15%, 5 points under a 20% goal

  // Far under goal (even negative projected savings) -> over-budget
  const overBudget = computeBudgetNudge({ monthlyIncome: 2000, monthlySpend: 2400, savingsVaultBalance: 0, targetSavingsPct: 20 });
  assert.strictEqual(overBudget.status, 'over-budget');
  assert.strictEqual(overBudget.projectedSavingsPct, -20); // spending more than income

  // Default target is used when the caller doesn't pass one
  const defaulted = computeBudgetNudge({ monthlyIncome: 1000, monthlySpend: 799, savingsVaultBalance: 0 });
  assert.strictEqual(defaulted.targetSavingsPct, DEFAULT_TARGET_SAVINGS_PCT);

  // A savings-vault cushion should be mentioned when the user isn't on-track
  const withCushion = computeBudgetNudge({ monthlyIncome: 2000, monthlySpend: 1900, savingsVaultBalance: 300, targetSavingsPct: 20 });
  assert.notStrictEqual(withCushion.status, 'on-track');
  assert.match(withCushion.message, /savings vault/);

  // A negative/garbage monthlySpend should never produce a negative spend
  // in the math (guarded with Math.max(0, ...) in the implementation)
  const negativeSpendGuard = computeBudgetNudge({ monthlyIncome: 1000, monthlySpend: -50, savingsVaultBalance: 0, targetSavingsPct: 20 });
  assert.strictEqual(negativeSpendGuard.projectedSavingsPct, 100);

  console.log('✅ budgetService: all assertions passed');
  console.log(`  sample: income $2000, spend $1200, goal 20% -> status=${onTrack.status}, projected=${onTrack.projectedSavingsPct}%`);
}

run();
