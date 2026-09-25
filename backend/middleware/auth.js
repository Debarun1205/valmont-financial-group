/**
 * Auth0 integration point.
 *
 * DEV_AUTH_BYPASS=true (the default in .env.example) lets the team build and
 * demo everything locally before anyone has created the Auth0 tenant — a
 * simple signed JWT stands in. Flip to false and fill in AUTH0_DOMAIN /
 * AUTH0_AUDIENCE once the tenant exists (~15 minutes of setup during the
 * hackathon) and every route below switches to real Auth0 validation with
 * NO route-level code changes required.
 */

const jwt = require('jsonwebtoken');
const DEV_SECRET = 'dev-only-secret-do-not-use-in-prod';

function devIssueToken(userId, role) {
  return jwt.sign({ sub: userId, role }, DEV_SECRET, { expiresIn: '12h' });
}

function buildAuthMiddleware() {
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    return function devAuth(req, res, next) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'missing bearer token' });
      try {
        const payload = jwt.verify(token, DEV_SECRET);
        req.user = { id: payload.sub, role: payload.role };
        next();
      } catch (err) {
        return res.status(401).json({ error: 'invalid token' });
      }
    };
  }

  // Real Auth0 path
  const { auth } = require('express-oauth2-jwt-bearer');
  const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`
  });
  return function auth0Auth(req, res, next) {
    checkJwt(req, res, (err) => {
      if (err) return res.status(401).json({ error: 'unauthorized' });
      req.user = { id: req.auth.payload.sub, role: req.auth.payload['https://financeapp/role'] || 'individual' };
      next();
    });
  };
}

module.exports = { buildAuthMiddleware, devIssueToken };
