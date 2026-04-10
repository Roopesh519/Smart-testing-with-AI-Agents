require('dotenv').config();

/**
 * Reads the Cognito idToken stored in browser localStorage by AWS Amplify
 * and returns HTTP headers for authenticated API calls.
 */
const authHeaders = async () => {
  const token = await global.page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.includes('idToken')) {
        return window.localStorage.getItem(key);
      }
    }
    return null;
  });

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

module.exports = { authHeaders };
