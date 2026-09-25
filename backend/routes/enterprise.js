const express = require('express');
const {
  validateEnterpriseProfile,
  validateEmployeeLink,
  summarizeWorkforce
} = require('../services/enterpriseAnalytics');

function requireEnterpriseRole(req, res, next) {
  if (req.user.role !== 'enterprise') return res.status(403).json({ error: "requires role 'enterprise'" });
  next();
}

function buildEnterpriseRoutes(pool, requireAuth) {
  const router = express.Router();

  // Employer side: declare the organization -- self-declared, unverified,
  // same lightweight shape as merchant_profiles/student_profiles.
  router.post('/profile', requireAuth, requireEnterpriseRole, async (req, res) => {
    const { organizationName } = req.body;
    const validation = validateEnterpriseProfile({ organizationName });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows } = await pool.query(
      `INSERT INTO enterprise_profiles (user_id, organization_name)
       VALUES ($1, $2) RETURNING *`,
      [req.user.id, organizationName]
    );
    res.status(201).json({ profile: rows[0] });
  });

  router.get('/profile', requireAuth, requireEnterpriseRole, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM enterprise_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'no enterprise profile yet -- POST /profile first' });
    res.json({ profile: rows[0] });
  });

  // Employee side: any authenticated individual can self-declare which org
  // they belong to -- no verification, same honesty as every other
  // self-declared profile in this repo. Matched against enterprise_profiles
  // by organization_name (free text for the demo).
  router.post('/employee-link', requireAuth, async (req, res) => {
    const { organizationName } = req.body;
    const validation = validateEmployeeLink({ organizationName });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows } = await pool.query(
      `INSERT INTO employee_links (employee_user_id, organization_name)
       VALUES ($1, $2) RETURNING *`,
      [req.user.id, organizationName]
    );
    res.status(201).json({ link: rows[0] });
  });

  // The rollup: the FIFTH lens on the same trust-score engine. Nothing
  // recomputed -- reads the latest trust_scores row per linked employee and
  // reuses lenderAnalytics.summarizePortfolio() for the loan side.
  router.get('/workforce', requireAuth, requireEnterpriseRole, async (req, res) => {
    const { rows: profileRows } = await pool.query(
      `SELECT organization_name FROM enterprise_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!profileRows[0]) return res.status(400).json({ error: 'no enterprise profile yet -- POST /profile first' });
    const organizationName = profileRows[0].organization_name;

    const { rows: employeeRows } = await pool.query(
      `SELECT DISTINCT employee_user_id FROM employee_links WHERE organization_name = $1`,
      [organizationName]
    );
    const employeeIds = employeeRows.map((r) => r.employee_user_id);
    const headcount = employeeIds.length;

    let employeeScores = [];
    let loans = [];
    if (headcount > 0) {
      const { rows: scoreRows } = await pool.query(
        `SELECT DISTINCT ON (user_id) user_id, score FROM trust_scores
         WHERE user_id = ANY($1) ORDER BY user_id, computed_at DESC`,
        [employeeIds]
      );
      employeeScores = scoreRows.map((r) => ({ userId: r.user_id, score: Number(r.score) }));

      const { rows: loanRows } = await pool.query(
        `SELECT principal, status, expected_loss_pct_at_request FROM loans WHERE borrower_id = ANY($1)`,
        [employeeIds]
      );
      loans = loanRows;
    }

    const rollup = summarizeWorkforce(employeeScores, loans, headcount);
    res.json({ organizationName, workforce: rollup });
  });

  return router;
}

module.exports = buildEnterpriseRoutes;
