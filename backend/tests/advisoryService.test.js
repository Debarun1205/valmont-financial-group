const assert = require('assert');
const { validateRiskProfile, validateAllocation, computeGoalFraming } = require('../services/advisoryService');

function run() {
  assert.strictEqual(validateRiskProfile({ riskTolerance: 'medium', goal: 'wedding', horizonMonths: 12 }).ok, true);
  assert.strictEqual(validateRiskProfile({ riskTolerance: 'aggressive', goal: 'wedding', horizonMonths: 12 }).ok, false, 'invalid tolerance rejected');
  assert.strictEqual(validateRiskProfile({ riskTolerance: 'low', goal: '', horizonMonths: 12 }).ok, false, 'empty goal rejected');
  assert.strictEqual(validateRiskProfile({ riskTolerance: 'low', goal: 'x', horizonMonths: -3 }).ok, false, 'negative horizon rejected');

  // Checkpoint 15: allocation grew from 4 to 6 buckets (added retirementPct, reitsPct).
  const goodAllocation = { moneyMarketPct: 22, stocksPct: 22, mutualFundsPct: 18, fixedIncomePct: 15, retirementPct: 15, reitsPct: 8 };
  assert.strictEqual(validateAllocation(goodAllocation).ok, true);

  const badSum = { moneyMarketPct: 30, stocksPct: 25, mutualFundsPct: 25, fixedIncomePct: 30, retirementPct: 0, reitsPct: 0 }; // sums to 110
  assert.strictEqual(validateAllocation(badSum).ok, false, 'bad sum rejected');

  const negative = { moneyMarketPct: -10, stocksPct: 40, mutualFundsPct: 40, fixedIncomePct: 15, retirementPct: 10, reitsPct: 5 };
  assert.strictEqual(validateAllocation(negative).ok, false, 'negative bucket rejected');

  const missingBucket = { moneyMarketPct: 30, stocksPct: 25, mutualFundsPct: 25, fixedIncomePct: 20 }; // no retirementPct/reitsPct
  assert.strictEqual(validateAllocation(missingBucket).ok, false, 'missing new buckets rejected — an old 4-bucket allocation must not silently pass');

  const withinTolerance = { moneyMarketPct: 22, stocksPct: 22, mutualFundsPct: 18, fixedIncomePct: 15, retirementPct: 15, reitsPct: 9 }; // sums to 101
  assert.strictEqual(validateAllocation(withinTolerance).ok, true, 'small LLM rounding drift tolerated');

  // --- computeGoalFraming (Checkpoint 15, Tier 3) ---
  const noIncome = computeGoalFraming({ allocation: goodAllocation, monthlyIncome: null, goal: 'wedding', horizonMonths: 12 });
  assert.strictEqual(noIncome.ok, false, 'no income on file is guarded, not a crash');

  const badHorizon = computeGoalFraming({ allocation: goodAllocation, monthlyIncome: 1000, goal: 'wedding', horizonMonths: 0 });
  assert.strictEqual(badHorizon.ok, false, 'zero/negative horizon rejected');

  const framed = computeGoalFraming({ allocation: goodAllocation, monthlyIncome: 1000, goal: 'wedding', horizonMonths: 12 });
  assert.strictEqual(framed.ok, true);
  assert.strictEqual(framed.monthlyContribution, 150, 'contribution is the documented 15% of monthly income');
  assert.ok(framed.projectedTotal > 0, 'projects a positive total');
  assert.ok(framed.explanation.includes('wedding'), 'explanation names the goal');

  // Same income/horizon, all-money-market (lowest assumed return) vs. the
  // growth-tilted allocation above — growth-tilted must project higher,
  // proving the projection actually reads the allocation rather than
  // returning a flat number.
  const conservative = { moneyMarketPct: 100, stocksPct: 0, mutualFundsPct: 0, fixedIncomePct: 0, retirementPct: 0, reitsPct: 0 };
  const framedConservative = computeGoalFraming({ allocation: conservative, monthlyIncome: 1000, goal: 'wedding', horizonMonths: 12 });
  assert.ok(framed.projectedTotal > framedConservative.projectedTotal, 'growth-tilted allocation projects higher than all-money-market at equal contribution');

  // Longer horizon at the same allocation/income must project a higher total.
  const framedLonger = computeGoalFraming({ allocation: goodAllocation, monthlyIncome: 1000, goal: 'wedding', horizonMonths: 24 });
  assert.ok(framedLonger.projectedTotal > framed.projectedTotal, 'longer horizon projects a higher total');

  // Higher income scales the monthly contribution proportionally.
  const framedRicher = computeGoalFraming({ allocation: goodAllocation, monthlyIncome: 2000, goal: 'wedding', horizonMonths: 12 });
  assert.strictEqual(framedRicher.monthlyContribution, 300, 'contribution scales with income');

  console.log('✅ advisoryService: all assertions passed');
}

run();
