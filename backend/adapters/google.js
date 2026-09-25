/**
 * Verifies a Google Identity Services ID token.
 * Uses Google's tokeninfo endpoint so we do not add a heavy SDK.
 * If GOOGLE_CLIENT_ID is blank, verification is rejected (no silent mock login).
 */

async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: 'Google sign-in is not configured (missing GOOGLE_CLIENT_ID)' };
  }
  if (!idToken || typeof idToken !== 'string') {
    return { ok: false, error: 'idToken required' };
  }

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    const payload = await res.json();
    if (!res.ok || payload.error_description || payload.error) {
      return { ok: false, error: payload.error_description || payload.error || 'invalid Google token' };
    }
    if (payload.aud !== clientId) {
      return { ok: false, error: 'Google token audience mismatch' };
    }
    const verified = payload.email_verified === true || payload.email_verified === 'true';
    if (!verified || !payload.email) {
      return { ok: false, error: 'Google email is not verified' };
    }
    return {
      ok: true,
      profile: {
        googleSub: payload.sub,
        email: String(payload.email).toLowerCase(),
        displayName: payload.name || payload.given_name || null,
        avatarUrl: payload.picture || null
      }
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Google verification failed' };
  }
}

module.exports = { verifyGoogleIdToken };
