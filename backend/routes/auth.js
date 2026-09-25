const express = require('express');
const bcrypt = require('bcryptjs');
const { devIssueToken } = require('../middleware/auth');
const { verifyGoogleIdToken } = require('../services/googleAuth');
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
    customerTier: row.customer_tier || null,
    onboarding: row.onboarding || null,
    displayName: row.display_name || null,
    picture: row.picture || null,
    authProvider: row.google_id ? 'google' : 'password',
    needsOnboarding: !row.customer_tier
  };
}

function authPayload(user, extra = {}) {
  const meta = user.customer_tier ? TIER_META[user.customer_tier] : null;
  return {
    user: publicUser(user),
    token: devIssueToken(user.id, user.role),
    welcome: extra.welcome || meta?.welcome || null,
    classification: extra.classification || null,
    tierMeta: meta
  };
}

function buildAuthRoutes(pool, requireAuth) {
  const router = express.Router();

  router.get('/config', (_req, res) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    res.json({
      googleClientId,
      googleEnabled: Boolean(googleClientId)
    });
  });

  router.get('/tiers', (_req, res) => {
    res.json({
      tiers: Object.entries(TIER_META).map(([id, meta]) => ({
        id,
        label: meta.label,
        welcome: meta.welcome,
        aiFocus: meta.aiFocus,
        assistance: meta.assistance
      }))
    });
  });

  router.post('/signup', async (req, res) => {
    const { email, password, role: roleIn, onboarding, displayName } = req.body;
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
        `INSERT INTO users (email, password_hash, role, customer_tier, onboarding, display_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, role, customer_tier, onboarding, display_name, picture, google_id`,
        [
          String(email).toLowerCase().trim(),
          passwordHash,
          role,
          customerTier,
          onboardingPayload ? JSON.stringify(onboardingPayload) : null,
          displayName || onboarding?.displayName || null
        ]
      );
      res.json(authPayload(rows[0], { classification }));
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
      console.error(err);
      res.status(500).json({ error: 'signup failed' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase().trim()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Continue with Google instead.' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    res.json(authPayload(user));
  });

  router.post('/google', async (req, res) => {
    const verified = await verifyGoogleIdToken(req.body?.idToken);
    if (!verified.ok) return res.status(401).json({ error: verified.error });
    const { email, name, googleId, picture } = verified.profile;

    try {
      const byGoogle = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
      let user = byGoogle.rows[0];
      if (!user) {
        const byEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        user = byEmail.rows[0];
      }

      if (!user) {
        const inserted = await pool.query(
          `INSERT INTO users (email, password_hash, role, google_id, display_name, picture)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, role, customer_tier, onboarding, display_name, picture, google_id`,
          [email, null, 'individual', googleId, name || null, picture]
        );
        user = inserted.rows[0];
      } else {
        const updated = await pool.query(
          `UPDATE users
           SET google_id = $2,
               display_name = $3,
               picture = $4
           WHERE id = $1
           RETURNING id, email, role, customer_tier, onboarding, display_name, picture, google_id`,
          [
            user.id,
            user.google_id || googleId,
            user.display_name || name || null,
            user.picture || picture
          ]
        );
        user = updated.rows[0];
      }

      res.json(authPayload(user, {
        welcome: user.customer_tier
          ? TIER_META[user.customer_tier]?.welcome
          : `Welcome${name ? `, ${name.split(' ')[0]}` : ''} — a few gentle questions and we will meet you where you are.`
      }));
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
      console.error(err);
      res.status(500).json({ error: 'google sign-in failed' });
    }
  });

  if (requireAuth) {
    router.get('/me', requireAuth, async (req, res) => {
      const { rows } = await pool.query(
        `SELECT id, email, role, customer_tier, onboarding, created_at, display_name, picture, google_id FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'user not found' });
      const u = rows[0];
      res.json({
        user: { ...publicUser(u), createdAt: u.created_at },
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
      const current = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.user.id]);
      const displayName = checked.answers.displayName || current.rows[0]?.display_name || null;
      const { rows } = await pool.query(
        `UPDATE users
         SET customer_tier = $2,
             onboarding = $3,
             role = CASE WHEN role = 'individual' THEN $4 ELSE role END,
             display_name = $5
         WHERE id = $1
         RETURNING id, email, role, customer_tier, onboarding, display_name, picture, google_id`,
        [
          req.user.id,
          classification.customerTier,
          JSON.stringify(onboardingPayload),
          classification.suggestedRole,
          displayName
        ]
      );
      const u = rows[0];
      res.json({
        ...authPayload(u, { classification, welcome: classification.welcome }),
        classification
      });
    });
  }

  return router;
}

module.exports = buildAuthRoutes;
