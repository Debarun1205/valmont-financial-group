const express = require('express');
const bcrypt = require('bcryptjs');
const { devIssueToken } = require('../middleware/auth');
const {
  validateOnboardingAnswers,
  classifyCustomerTier,
  TIER_META
} = require('../services/onboardingService');

function buildAuthRoutes(pool, requireAuth) {
  const router = express.Router();

  router.get('/tiers', (_req, res) => {
    res.json({
      tiers: Object.entries(TIER_META).map(([id, meta]) => ({
        id,
        label: meta.label,
        welcome: meta.welcome,
        aiFocus: meta.aiFocus
      }))
    });
  });

  router.post('/signup', async (req, res) => {
    const { email, password, role: roleIn, onboarding } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    let customerTier = null;
    let onboardingPayload = null;
    let classification = null;
    let role = roleIn || 'individual';

    if (onboarding) {
      const checked = validateOnboardingAnswers(onboarding);
      if (!checked.ok) return res.status(400).json({ error: checked.error });
      classification = classifyCustomerTier(checked.answers);
      customerTier = classification.customerTier;
      onboardingPayload = {
        ...checked.answers,
        classifiedAt: new Date().toISOString(),
        reason: classification.reason
      };
      if (!roleIn) role = classification.suggestedRole;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, role, customer_tier, onboarding)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, role, customer_tier, onboarding`,
        [email, passwordHash, role, customerTier, onboardingPayload ? JSON.stringify(onboardingPayload) : null]
      );
      const user = rows[0];
      const token = devIssueToken(user.id, user.role);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          customerTier: user.customer_tier,
          onboarding: user.onboarding
        },
        token,
        classification
      });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
      console.error(err);
      res.status(500).json({ error: 'signup failed' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = devIssueToken(user.id, user.role);
    const meta = user.customer_tier ? TIER_META[user.customer_tier] : null;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        customerTier: user.customer_tier,
        onboarding: user.onboarding
      },
      token,
      welcome: meta?.welcome || null
    });
  });

  if (requireAuth) {
    router.get('/me', requireAuth, async (req, res) => {
      const { rows } = await pool.query(
        `SELECT id, email, role, customer_tier, onboarding, created_at FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'user not found' });
      const u = rows[0];
      res.json({
        user: {
          id: u.id,
          email: u.email,
          role: u.role,
          customerTier: u.customer_tier,
          onboarding: u.onboarding,
          createdAt: u.created_at
        },
        tierMeta: u.customer_tier ? TIER_META[u.customer_tier] : null
      });
    });

    router.post('/onboarding', requireAuth, async (req, res) => {
      const checked = validateOnboardingAnswers(req.body || {});
      if (!checked.ok) return res.status(400).json({ error: checked.error });
      const classification = classifyCustomerTier(checked.answers);
      const onboardingPayload = {
        ...checked.answers,
        classifiedAt: new Date().toISOString(),
        reason: classification.reason
      };
      const { rows } = await pool.query(
        `UPDATE users
         SET customer_tier = $2,
             onboarding = $3,
             role = CASE WHEN role = 'individual' THEN $4 ELSE role END
         WHERE id = $1
         RETURNING id, email, role, customer_tier, onboarding`,
        [req.user.id, classification.customerTier, JSON.stringify(onboardingPayload), classification.suggestedRole]
      );
      const u = rows[0];
      res.json({
        user: {
          id: u.id,
          email: u.email,
          role: u.role,
          customerTier: u.customer_tier,
          onboarding: u.onboarding
        },
        classification
      });
    });
  }

  return router;
}

module.exports = buildAuthRoutes;
