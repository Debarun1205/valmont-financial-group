const express = require('express');
const bcrypt = require('bcryptjs');
const { devIssueToken } = require('../middleware/auth');
const { verifyGoogleIdToken } = require('../adapters/google');
const {
  validateOnboardingAnswers,
  classifyCustomerTier,
  TIER_META
} = require('../services/onboardingService');

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    customerTier: row.customer_tier,
    onboarding: row.onboarding,
    displayName: row.display_name || null,
    avatarUrl: row.avatar_url || null,
    createdAt: row.created_at
  };
}

function needsOnboarding(row) {
  return !row.customer_tier;
}

function tierPayload(row, classification) {
  const meta = row.customer_tier ? TIER_META[row.customer_tier] : null;
  return {
    user: publicUser(row),
    needsOnboarding: needsOnboarding(row),
    welcome: classification?.welcome || meta?.welcome || null,
    classification: classification || null,
    tierMeta: meta
      ? {
          id: row.customer_tier,
          label: meta.label,
          welcome: meta.welcome,
          aiFocus: meta.aiFocus,
          aiAssistance: meta.aiAssistance
        }
      : null
  };
}

function buildAuthRoutes(pool, requireAuth) {
  const router = express.Router();

  router.get('/config', (_req, res) => {
    res.json({
      googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
      googleClientId: process.env.GOOGLE_CLIENT_ID || null
    });
  });

  router.get('/tiers', (_req, res) => {
    res.json({
      tiers: Object.entries(TIER_META).map(([id, meta]) => ({
        id,
        label: meta.label,
        welcome: meta.welcome,
        aiFocus: meta.aiFocus,
        aiAssistance: meta.aiAssistance
      }))
    });
  });

  router.post('/google', async (req, res) => {
    const verified = await verifyGoogleIdToken(req.body?.idToken);
    if (!verified.ok) return res.status(401).json({ error: verified.error });
    const { googleSub, email, displayName, avatarUrl } = verified.profile;

    try {
      const existing = await pool.query(
        `SELECT * FROM users WHERE google_sub = $1 OR lower(email) = $2 LIMIT 1`,
        [googleSub, email]
      );
      let user = existing.rows[0];
      if (!user) {
        const inserted = await pool.query(
          `INSERT INTO users (email, password_hash, role, google_sub, display_name, avatar_url)
           VALUES ($1, NULL, 'individual', $2, $3, $4)
           RETURNING *`,
          [email, googleSub, displayName, avatarUrl]
        );
        user = inserted.rows[0];
      } else {
        const updated = await pool.query(
          `UPDATE users
           SET google_sub = COALESCE(google_sub, $2),
               display_name = COALESCE(display_name, $3),
               avatar_url = COALESCE(avatar_url, $4)
           WHERE id = $1
           RETURNING *`,
          [user.id, googleSub, displayName, avatarUrl]
        );
        user = updated.rows[0];
      }
      const token = devIssueToken(user.id, user.role);
      res.json({ token, ...tierPayload(user) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
      console.error(err);
      res.status(500).json({ error: 'Google sign-in failed' });
    }
  });

  router.post('/signup', async (req, res) => {
    const { email, password, role: roleIn, onboarding } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    let customerTier = null;
    let onboardingPayload = null;
    let classification = null;
    let role = roleIn || 'individual';
    let displayName = null;

    if (onboarding) {
      const checked = validateOnboardingAnswers(onboarding);
      if (!checked.ok) return res.status(400).json({ error: checked.error });
      classification = classifyCustomerTier(checked.answers);
      customerTier = classification.customerTier;
      displayName = checked.answers.displayName;
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
        `INSERT INTO users (email, password_hash, role, customer_tier, onboarding, display_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [email, passwordHash, role, customerTier, onboardingPayload ? JSON.stringify(onboardingPayload) : null, displayName]
      );
      const user = rows[0];
      const token = devIssueToken(user.id, user.role);
      res.json({ token, ...tierPayload(user, classification) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
      console.error(err);
      res.status(500).json({ error: 'signup failed' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    if (!user.password_hash) {
      return res.status(401).json({ error: 'this account uses Google sign-in — continue with Google' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = devIssueToken(user.id, user.role);
    res.json({ token, ...tierPayload(user) });
  });

  if (requireAuth) {
    router.get('/me', requireAuth, async (req, res) => {
      const { rows } = await pool.query(
        `SELECT id, email, role, customer_tier, onboarding, display_name, avatar_url, created_at FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'user not found' });
      const u = rows[0];
      res.json(tierPayload(u));
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
             role = CASE WHEN role = 'individual' THEN $4 ELSE role END,
             display_name = COALESCE($5, display_name)
         WHERE id = $1
         RETURNING *`,
        [req.user.id, classification.customerTier, JSON.stringify(onboardingPayload), classification.suggestedRole, checked.answers.displayName]
      );
      const u = rows[0];
      res.json({ token: req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined, ...tierPayload(u, classification) });
    });
  }

  return router;
}

module.exports = buildAuthRoutes;
