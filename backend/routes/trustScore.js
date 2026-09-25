const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const { extractIncomeFromDocument } = require('../adapters/gemini');
const { attestTrustScore } = require('../adapters/solana');
const { getFraudCleanRatio } = require('../services/fraudSignal');
const { computeTrustScore } = require('../services/trustScoreEngine');

function buildTrustScoreRoutes(pool, requireAuth) {
  const router = express.Router();

  // Step 1 of Module 1's journey: upload an income document (ledger photo,
  // pay slip, receipts). Gemini extracts an income estimate; stored with the
  // full raw extraction so a lender can later see the evidence trail.
  router.post('/verify-income', requireAuth, upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'document file required (field name: document)' });

    const base64 = req.file.buffer.toString('base64');
    const extraction = await extractIncomeFromDocument(base64, req.file.mimetype);

    const { rows } = await pool.query(
      `INSERT INTO income_documents (user_id, extracted_monthly_income, currency, raw_extraction)
       VALUES ($1, $2, $3, $4) RETURNING id, extracted_monthly_income, currency, created_at`,
      [req.user.id, extraction.monthlyIncome, extraction.currency, JSON.stringify(extraction.raw)]
    );

    res.json({ incomeDocument: rows[0], extraction });
  });

  // Step 2: compute (or recompute) the trust score from the latest income
  // document + the TimescaleDB fraud-signal query, then attest it on Solana.
  router.post('/compute', requireAuth, async (req, res) => {
    const userId = req.user.id;

    const { rows: incomeRows } = await pool.query(
      `SELECT extracted_monthly_income FROM income_documents
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const monthlyIncome = incomeRows[0]?.extracted_monthly_income ?? null;

    const { fraudCleanRatio, txCount, flaggedCount } = await getFraudCleanRatio(pool, userId);

    const { score, incomeComponent, fraudComponent } = computeTrustScore({ monthlyIncome, fraudCleanRatio });

    const attestation = await attestTrustScore(userId, score);

    const evidence = {
      monthlyIncome,
      fraudCleanRatio,
      txCount,
      flaggedCount,
      attestationHash: attestation.hash,
      attestationMocked: attestation.mocked
    };

    const { rows } = await pool.query(
      `INSERT INTO trust_scores (user_id, score, income_component, fraud_component, evidence, onchain_signature)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, score, income_component, fraud_component, evidence, onchain_signature, computed_at`,
      [userId, score, incomeComponent, fraudComponent, JSON.stringify(evidence), attestation.signature]
    );

    res.json({ trustScore: rows[0] });
  });

  // Step 3: read the latest score + evidence trail. Module 6 (lender view)
  // will call this same endpoint with a lender-role token in a later checkpoint.
  router.get('/:userId', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT score, income_component, fraud_component, evidence, onchain_signature, computed_at
       FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [req.params.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'no trust score computed yet' });
    res.json({ trustScore: rows[0] });
  });

  return router;
}

module.exports = buildTrustScoreRoutes;
