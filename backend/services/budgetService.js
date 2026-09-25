/**
 * Budgeting Nudge — Checkpoint 11 (Tier 2, second item after gold in
 * Checkpoint 10).
 *
 * This is deliberately a rules-based nudge, not an AI call — same "kept
 * explainable" scoping choice as services/fraudSignal.js's rules-based
 * fraud signal. It compares a user's actual trailing-30-day wallet spend
 * (queried with a TimescaleDB windowed query — see
 * services/spendingAnalytics.js) against their verified income and their
 * own stated savings goal, and returns one of three plain-language statuses.
 * Kept as pure functions over plain values, no DB/network calls, so it's
 * unit-testable the same way as every earlier module.
 */

const MIN_TARGET_SAVINGS_PCT = 1;
const MAX_TARGET_SAVINGS_PCT = 90;
const DEFAULT_TARGET_SAVINGS_PCT = 20;

const WATCH_ZONE_PCT = 10; // how many points below target still counts as "watch" rather than "over-budget"

/**
 * Validates a user-set savings goal before it's written to the DB.
 * @param {Object} input
 * @param {number} input.targetSavingsPct - percent of monthly income the user wants to save
 * @returns {{ok:boolean, error?:string}}
 */
function validateBudgetGoal({ targetSavingsPct }) {
  if (targetSavingsPct === undefined || targetSavingsPct === null || typeof targetSavingsPct !== 'number' || Number.isNaN(targetSavingsPct)) {
    return { ok: false, error: 'targetSavingsPct must be a number' };
  }
  if (targetSavingsPct < MIN_TARGET_SAVINGS_PCT || targetSavingsPct > MAX_TARGET_SAVINGS_PCT) {
    return { ok: false, error: `targetSavingsPct must be between ${MIN_TARGET_SAVINGS_PCT} and ${MAX_TARGET_SAVINGS_PCT}` };
  }
  return { ok: true };
}

/**
 * Computes a plain-language budgeting nudge.
 * @param {Object} input
 * @param {number|null} input.monthlyIncome - from income_documents (Module 1); null if not yet verified
 * @param {number} input.monthlySpend - trailing-30-day sum of channel='wallet' outbound transactions
 * @param {number} input.savingsVaultBalance - from wallets (Module 2)
 * @param {number} [input.targetSavingsPct=DEFAULT_TARGET_SAVINGS_PCT]
 * @returns {{status:string, message:string, projectedSavingsPct:number|null, targetSavingsPct:number}}
 */
function computeBudgetNudge({ monthlyIncome, monthlySpend, savingsVaultBalance, targetSavingsPct }) {
  const target = targetSavingsPct ?? DEFAULT_TARGET_SAVINGS_PCT;
  const spend = Math.max(0, Number(monthlySpend) || 0);

  if (!monthlyIncome || monthlyIncome <= 0) {
    return {
      status: 'no-income-data',
      message: 'Verify your income to unlock personalized budgeting nudges.',
      projectedSavingsPct: null,
      targetSavingsPct: target
    };
  }

  const projectedSavings = monthlyIncome - spend;
  const projectedSavingsPct = Math.round((projectedSavings / monthlyIncome) * 1000) / 10; // one decimal place

  let status;
  let message;
  if (projectedSavingsPct >= target) {
    status = 'on-track';
    message = `Nice — at this pace you're on track to save about ${projectedSavingsPct}% of your income this month, above your ${target}% goal.`;
  } else if (projectedSavingsPct >= target - WATCH_ZONE_PCT) {
    status = 'watch';
    message = `You're a bit behind your ${target}% savings goal this month (projected ${projectedSavingsPct}%). Small cuts now would get you back on track.`;
  } else {
    status = 'over-budget';
    message = `Spending is well ahead of your ${target}% savings goal this month (projected ${projectedSavingsPct}%). Consider pausing non-essential spend.`;
  }

  if (savingsVaultBalance > 0 && status !== 'on-track') {
    message += ` You do have $${Math.round(savingsVaultBalance * 100) / 100} in your savings vault as a cushion.`;
  }

  return { status, message, projectedSavingsPct, targetSavingsPct: target };
}

module.exports = {
  validateBudgetGoal,
  computeBudgetNudge,
  DEFAULT_TARGET_SAVINGS_PCT,
  MIN_TARGET_SAVINGS_PCT,
  MAX_TARGET_SAVINGS_PCT
};
