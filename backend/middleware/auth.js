/**
 * Session JWTs issued after email or Google sign-in.
 * Set JWT_SECRET on Render. DEV_AUTH_BYPASS is kept for compatibility
 * (the app no longer requires Auth0 for a working login).
 */

const jwt = require('jsonwebtoken');
const DEV_SECRET = 'dev-only-secret-do-not-use-in-prod';

function jwtSecret() {
  return process.env.JWT_SECRET || DEV_SECRET;
}

function devIssueToken(userId, role) {
  return jwt.sign({ sub: userId, role }, jwtSecret(), { expiresIn: '12h' });
}

function buildAuthMiddleware() {
  return function appAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing bearer token' });
    try {
      const payload = jwt.verify(token, jwtSecret());
      req.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'invalid token' });
    }
  };
}

module.exports = { buildAuthMiddleware, devIssueToken, jwtSecret };
