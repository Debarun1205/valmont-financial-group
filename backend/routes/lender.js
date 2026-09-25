const express = require('express');
const { scoreToExpectedLoss } = require('../services/trustScoreEngine');
const { summarizePortfolio } = require('../services/lenderAnalytics');

function requireLenderRole(req, res, next) {
  if (req.user.role !== 'lender') return res.status(403).json({ error: "requires role 'lender'" });
  next();
}

function buildLenderRoutes(pool, requireAuth) {
  const router = express.Router();

  // The individual/lender "two lenses, one engine" endpoint: looks up any
  // user's latest trust score and shows it as expected-loss, plus the same
  // evidence trail Module 1 stored — nothing recomputed here.
  router.get('/risk/:userId', requireAuth, requireLenderRole, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT score, evidence, computed_at FROM trust_scores
       WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [req.params.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'no trust score on file for this user yet' });

    const score = Number(rows[0].score);
    res.json({
      userId: req.params.userId,
      trustScore: score,
      expectedLossPct: scoreToExpectedLoss(score),
      evidence: rows[0].evidence,
      scoreComputedAt: rows[0].computed_at
    });
  });

  // Portfolio view across everything this lender has funded. Runs as a
  // Postgres aggregate query today — see services/lenderAnalytics.js header
  // comment for the honest note on Snowflake not being wired yet.
  router.get('/portfolio', requireAuth, requireLenderRole, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT principal, status, expected_loss_pct_at_request FROM loans WHERE lender_id = $1`,
      [req.user.id]
    );
    const summary = summarizePortfolio(rows);
    res.json({ portfolio: summary });
  });

  return router;
}

module.exports = buildLenderRoutes;
