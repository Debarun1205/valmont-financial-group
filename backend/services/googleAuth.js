/**
 * Verify a Google Identity Services ID token.
 * Network call is isolated so unit tests can check audience/issuer rules.
 */

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

function isValidGooglePayload(payload, clientId) {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'invalid google token' };
  if (!clientId || payload.aud !== clientId) return { ok: false, error: 'Google client mismatch' };
  if (!GOOGLE_ISSUERS.has(payload.iss)) return { ok: false, error: 'invalid Google issuer' };
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  if (!verified || !payload.email) return { ok: false, error: 'Google email is not verified' };
  if (!payload.sub) return { ok: false, error: 'invalid google token' };
  return { ok: true };
}

async function verifyGoogleIdToken(idToken, fetchImpl = fetch) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { ok: false, error: 'Google sign-in is not configured (set GOOGLE_CLIENT_ID)' };
  if (!idToken) return { ok: false, error: 'idToken required' };

  const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  let payload;
  try {
    const res = await fetchImpl(url);
    payload = await res.json();
    if (!res.ok || payload.error) return { ok: false, error: 'Google could not verify that sign-in' };
  } catch (err) {
    console.error('[googleAuth]', err.message);
    return { ok: false, error: 'Could not reach Google to verify sign-in' };
  }

  const checked = isValidGooglePayload(payload, clientId);
  if (!checked.ok) return checked;

  return {
    ok: true,
    profile: {
      email: String(payload.email).toLowerCase(),
      name: payload.name || '',
      googleId: payload.sub,
      picture: payload.picture || null
    }
  };
}

module.exports = { isValidGooglePayload, verifyGoogleIdToken };
