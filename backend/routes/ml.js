const express = require('express');
const {
  validateTrainRequest,
  runTrainingJob,
  listTrainingRuns,
  listModelCatalog,
  collectTrainingFeatures
} = require('../services/mlTrainingService');

function buildMlRoutes(pool, requireAuth) {
  const router = express.Router();

  router.get('/models', requireAuth, (_req, res) => {
    res.json({ models: listModelCatalog() });
  });

  router.get('/features', requireAuth, async (_req, res) => {
    try {
      const features = await collectTrainingFeatures(pool);
      res.json({ features });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to collect features' });
    }
  });

  router.get('/runs', requireAuth, async (req, res) => {
    try {
      const runs = await listTrainingRuns(pool, req.user.id);
      res.json({ runs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to list runs' });
    }
  });

  router.post('/train', requireAuth, async (req, res) => {
    const checked = validateTrainRequest(req.body || {});
    if (!checked.ok) return res.status(400).json({ error: checked.error });
    try {
      const run = await runTrainingJob(pool, {
        modelKey: checked.modelKey,
        epochs: checked.epochs,
        userId: req.user.id
      });
      res.json({ run, note: 'Hackathon-honest training: calibration metrics from live Postgres features, not a GPU job.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'training failed' });
    }
  });

  return router;
}

module.exports = buildMlRoutes;
