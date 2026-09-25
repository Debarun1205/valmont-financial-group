const express = require('express');
const { validateMerchantProfile, computeBusinessHealth } = require('../services/merchantAnalytics');
const { getMonthlyRevenue, getWeeklyRevenueTrend } = require('../services/spendingAnalytics');

function buildMerchantRoutes(pool, requireAuth) {
  const router = express.Router();

  // Step 1: declare the business -- name + category, no verification, same
  // lightweight self-declared shape as the student starter-identity path
  // (Checkpoint 12). History, not overwritten, same pattern used everywhere
  // else in this repo (budget_goals, student_profiles, ...).
  router.post('/profile', requireAuth, async (req, res) => {
    const { businessName, category } = req.body;
    const validation = validateMerchantProfile({ businessName, category });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows } = await pool.query(
      `INSERT INTO merchant_profiles (user_id, business_name, category)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, businessName, category]
    );
    res.status(201).json({ profile: rows[0] });
  });

  router.get('/profile', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM merchant_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'no merchant profile yet -- POST /profile first' });
    res.json({ profile: rows[0] });
  });

  // Step 2: the "business-health" lens on the SAME trust score used
  // everywhere else -- nothing recomputed, only relabeled (per the "one
  // engine, many lenses" thesis in trustScoreEngine.js). Requires a trust
  // score already on file (any entry path: normal income-doc flow or the
  // student starter path both write into the same trust_scores table).
  router.get('/health', requireAuth, async (req, res) => {
    const { rows: profileRows } = await pool.query(
      `SELECT id FROM merchant_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!profileRows[0]) return res.status(400).json({ error: 'no merchant profile yet -- POST /profile first' });

    const { rows: scoreRows } = await pool.query(
      `SELECT score, computed_at FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!scoreRows[0]) {
      return res.status(400).json({ error: 'no trust score on file yet -- call POST /api/trust-score/compute first' });
    }

    const score = Number(scoreRows[0].score);
    const monthlyRevenue = await getMonthlyRevenue(pool, req.user.id);
    const health = computeBusinessHealth({ score, monthlyRevenue });

    res.json({ businessHealth: health, scoreComputedAt: scoreRows[0].computed_at });
  });

  // Revenue trend for a simple chart on the merchant dashboard -- direct
  // mirror of GET /api/budget/spend-trend, inbound side instead of outbound.
  router.get('/revenue-trend', requireAuth, async (req, res) => {
    const weeks = req.query.weeks ? Number(req.query.weeks) : 4;
    const trend = await getWeeklyRevenueTrend(pool, req.user.id, weeks);
    res.json({ weeklyRevenueTrend: trend });
  });

  return router;
}

module.exports = buildMerchantRoutes;
