const express = require('express');
const { APPLICATIONS, runDsApplication } = require('../services/dsApplicationsService');

function buildDsRoutes(pool, requireAuth) {
  const router = express.Router();

  router.get('/applications', requireAuth, (_req, res) => {
    res.json({ applications: APPLICATIONS });
  });

  router.get('/applications/:id/run', requireAuth, async (req, res) => {
    try {
      const out = await runDsApplication(pool, req.user.id, req.params.id);
      if (!out.ok) return res.status(400).json({ error: out.error });
      await pool.query(
        `INSERT INTO ds_application_runs (user_id, application_id, result)
         VALUES ($1, $2, $3)`,
        [req.user.id, req.params.id, JSON.stringify(out.result)]
      );
      res.json(out);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'DS application failed' });
    }
  });

  router.get('/runs', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, application_id, result, created_at
       FROM ds_application_runs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ runs: rows });
  });

  return router;
}

module.exports = buildDsRoutes;
