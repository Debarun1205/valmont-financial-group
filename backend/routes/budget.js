const express = require('express');
const { validateBudgetGoal, computeBudgetNudge, DEFAULT_TARGET_SAVINGS_PCT } = require('../services/budgetService');
const { getMonthlySpend, getWeeklySpendTrend } = require('../services/spendingAnalytics');

function buildBudgetRoutes(pool, requireAuth) {
  const router = express.Router();

  // Set (or update) the user's savings goal. History, not overwritten —
  // GET /goal and GET /nudge both just read the latest row.
  router.post('/goal', requireAuth, async (req, res) => {
    const { targetSavingsPct } = req.body;
    const validation = validateBudgetGoal({ targetSavingsPct });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows } = await pool.query(
      `INSERT INTO budget_goals (user_id, target_savings_pct) VALUES ($1, $2) RETURNING *`,
      [req.user.id, targetSavingsPct]
    );
    res.status(201).json({ goal: rows[0] });
  });

  router.get('/goal', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM budget_goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ goal: rows[0] || null, defaultTargetSavingsPct: DEFAULT_TARGET_SAVINGS_PCT });
  });

  // The nudge itself: pulls monthlyIncome from Module 1's income_documents
  // (reused, not re-asked — same pattern as routes/advisory.js), the
  // latest goal (falls back to the service's default if none set yet),
  // savingsVaultBalance from Module 2's wallets, and monthlySpend from the
  // genuine TimescaleDB windowed query in services/spendingAnalytics.js.
  router.get('/nudge', requireAuth, async (req, res) => {
    const { rows: incomeRows } = await pool.query(
      `SELECT extracted_monthly_income FROM income_documents
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const monthlyIncome = incomeRows[0]?.extracted_monthly_income ?? null;

    const { rows: goalRows } = await pool.query(
      `SELECT target_savings_pct FROM budget_goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const targetSavingsPct = goalRows[0] ? Number(goalRows[0].target_savings_pct) : DEFAULT_TARGET_SAVINGS_PCT;

    const { rows: walletRows } = await pool.query(
      `SELECT savings_vault_balance FROM wallets WHERE user_id = $1`,
      [req.user.id]
    );
    const savingsVaultBalance = walletRows[0] ? Number(walletRows[0].savings_vault_balance) : 0;

    const monthlySpend = await getMonthlySpend(pool, req.user.id);

    const nudge = computeBudgetNudge({ monthlyIncome, monthlySpend, savingsVaultBalance, targetSavingsPct });
    res.json({ ...nudge, monthlyIncome, monthlySpend, savingsVaultBalance });
  });

  // Weekly spend trend for a chart — a second, independent read of the same
  // windowed query pattern (nice to have for the demo, not required by the
  // nudge itself).
  router.get('/spend-trend', requireAuth, async (req, res) => {
    const weeks = req.query.weeks ? Number(req.query.weeks) : 4;
    const trend = await getWeeklySpendTrend(pool, req.user.id, weeks);
    res.json({ weeks, trend });
  });

  return router;
}

module.exports = buildBudgetRoutes;
