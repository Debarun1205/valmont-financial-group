const assert = require('assert');
const { isValidGooglePayload } = require('../services/googleAuth');

const clientId = 'test-client.apps.googleusercontent.com';
const base = {
  aud: clientId,
  iss: 'https://accounts.google.com',
  email: 'ada@example.com',
  email_verified: 'true',
  sub: 'google-sub-1'
};

assert.strictEqual(isValidGooglePayload(base, clientId).ok, true);
assert.strictEqual(isValidGooglePayload({ ...base, aud: 'other' }, clientId).ok, false);
assert.strictEqual(isValidGooglePayload({ ...base, iss: 'evil.example' }, clientId).ok, false);
assert.strictEqual(isValidGooglePayload({ ...base, email_verified: 'false' }, clientId).ok, false);

console.log('googleAuth.test.js — all assertions passed');
