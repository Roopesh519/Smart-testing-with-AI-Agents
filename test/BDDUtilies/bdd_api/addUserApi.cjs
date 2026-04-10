const axios = require('axios');
const { authHeaders } = require('./authHeaders.cjs');
const { generateUserPayload } = require('../bdd_payload/index.cjs');

/**
 * Polls localStorage until the Cognito idToken appears (user is logged in).
 */
async function waitForToken(maxWait = 60000, interval = 1000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const token = await global.page.evaluate(() => {
      for (const k of Object.keys(window.localStorage)) {
        if (k.includes('idToken')) return window.localStorage.getItem(k);
      }
      return null;
    });
    if (token) return token;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Timed out waiting for auth token in localStorage');
}

/**
 * Creates a user via REST API and returns structured data for step definitions.
 */
async function createUserViaApi() {
  await waitForToken();
  const headers = await authHeaders();
  const payload = generateUserPayload();

  const response = await axios.post(
    `${process.env.API_BASE_URL}/users`,
    payload,
    { headers }
  );

  const user = response.data;

  return {
    data: { user },
    payload,
    createdUserData: { id: user.id, email: payload.email },
    viewAdminData: {
      email: payload.email,
      name: payload.name,
      role: payload.role,
      phoneNumber: `${payload.countryCode} ${payload.phoneNumber}`,
    },
  };
}

module.exports = { createUserViaApi, waitForToken };
