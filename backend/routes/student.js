const express = require('express');
const { attestTrustScore } = require('../adapters/solana');
const { getFraudCleanRatio } = require('../services/fraudSignal');
const {
  validateStudentProfile,
  computeStudentStarterScore
} = require('../services/studentIdentityService');

function buildStudentRoutes(pool, requireAuth) {
  const router = express.Router();

  // Step 1: declare the lighter-weight identity -- school + optional
  // self-declared allowance, no document upload. History, not overwritten,
  // same pattern as budget_goals.
  router.post('/profile', requireAuth, async (req, res) => {
    const { schoolName, expectedGradYear, monthlyAllowance } = req.body;
    const validation = validateStudentProfile({ schoolName, expectedGradYear, monthlyAllowance });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const { rows } = await pool.query(
      `INSERT INTO student_profiles (user_id, school_name, expected_grad_year, monthly_allowance)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, schoolName, expectedGradYear, monthlyAllowance ?? null]
    );
    res.status(201).json({ profile: rows[0] });
  });

  router.get('/profile', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM student_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'no student profile yet -- POST /profile first' });
    res.json({ profile: rows[0] });
  });

  // Step 2: the lighter-weight sibling of POST /api/trust-score/compute.
  // Same fraud-signal query and the same Solana attestation step, reused
  // unchanged -- only the income input (self-declared allowance vs.
  // Gemini-OCR) and the scoring function (computeStudentStarterScore vs.
  // computeTrustScore) differ. Writes into the SAME trust_scores table, so
  // every downstream consumer (Module 3 loans, Module 6 lender view,
  // Module 13 insurance) already reads a student's score with zero changes
  // on their side -- literally "one engine, many lenses" applied to the
  // input side this time.
  router.post('/compute-score', requireAuth, async (req, res) => {
    const { rows: profileRows } = await pool.query(
      `SELECT monthly_allowance FROM student_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!profileRows[0]) return res.status(400).json({ error: 'no student profile yet -- POST /profile first' });

    const monthlyAllowance = profileRows[0].monthly_allowance !== null
      ? Number(profileRows[0].monthly_allowance)
      : null;

    const { fraudCleanRatio, txCount, flaggedCount } = await getFraudCleanRatio(pool, req.user.id);

    const { score, incomeComponent, fraudComponent, selfDeclared, startingLoanCapUsd } =
      computeStudentStarterScore({ monthlyAllowance, fraudCleanRatio });

    const attestation = await attestTrustScore(req.user.id, score);

    const evidence = {
      entryPath: 'student-starter',
      selfDeclared,
      monthlyAllowance,
      fraudCleanRatio,
      txCount,
      flaggedCount,
      startingLoanCapUsd,
      attestationHash: attestation.hash,
      attestationMocked: attestation.mocked
    };

    const { rows } = await pool.query(
      `INSERT INTO trust_scores (user_id, score, income_component, fraud_component, evidence, onchain_signature)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, score, income_component, fraud_component, evidence, onchain_signature, computed_at`,
      [req.user.id, score, incomeComponent, fraudComponent, JSON.stringify(evidence), attestation.signature]
    );

    // Read-back for this score goes through the existing
    // GET /api/trust-score/:userId -- no new read route needed, since it's
    // the same table.
    res.json({ trustScore: rows[0], startingLoanCapUsd });
  });

  return router;
}

module.exports = buildStudentRoutes;
