const express = require('express');
const { generateInvestmentAdvice } = require('../adapters/gemini');
const { validateRiskProfile, validateAllocation, computeGoalFraming } = require('../services/advisoryService');
const { loadUserTierContext } = require('../services/onboardingService');

function buildAdvisoryRoutes(pool, requireAuth) {
  const router = express.Router();

  router.post('/recommend', requireAuth, async (req, res) => {
    const { riskTolerance, goal, horizonMonths } = req.body;

    const validation = validateRiskProfile({ riskTolerance, goal, horizonMonths });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows: incomeRows } = await pool.query(
      `SELECT extracted_monthly_income FROM income_documents
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const monthlyIncome = incomeRows[0]?.extracted_monthly_income ?? null;
    const tierContext = await loadUserTierContext(pool, req.user.id);
    const incomeForAdvice = monthlyIncome ?? tierContext.monthlyIncome ?? null;

    const advice = await generateInvestmentAdvice({
      riskTolerance,
      monthlyIncome: incomeForAdvice,
      goal,
      horizonMonths,
      investmentCapital: tierContext.investmentCapital,
      tierContext
    });

    const allocationCheck = validateAllocation(advice.allocation);
    if (!allocationCheck.ok) {
      console.error('[advisory] rejected malformed allocation:', allocationCheck.error, advice.allocation);
      return res.status(502).json({ error: 'advisory engine returned an invalid allocation, please retry' });
    }

    const goalFraming = computeGoalFraming({
      allocation: advice.allocation,
      monthlyIncome: incomeForAdvice,
      goal,
      horizonMonths
    });

    const { rows } = await pool.query(
      `INSERT INTO investment_advice (user_id, risk_tolerance, goal, horizon_months, allocation, explanation, mocked, goal_framing)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, riskTolerance, goal, horizonMonths, JSON.stringify(advice.allocation), advice.explanation, advice.mocked, JSON.stringify(goalFraming)]
    );

    res.status(201).json({ advice: rows[0], tierContext });
  });

  router.get('/history', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, risk_tolerance, goal, horizon_months, allocation, explanation, mocked, goal_framing, created_at
       FROM investment_advice WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ history: rows });
  });

  return router;
}

module.exports = buildAdvisoryRoutes;
