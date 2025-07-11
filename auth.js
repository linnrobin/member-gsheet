//auth.js
import { CONFIG } from './config.js';

let gapiInited = false;
let gisInited = false;
let tokenClient;
let authCompletionCallback = null;

/**
 * Initializes the Google API client and sets up the GIS token client.
 */
export function initAuth(onReady) {
  gapi.load('client', async () => {
    console.log('[auth.js] gapi loaded. Initializing client...');
    try {
      await gapi.client.init({
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
      gapiInited = true;
      console.log('[auth.js] gapi client initialized.');

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('[auth.js] Token response error:', tokenResponse.error);
            if (authCompletionCallback) {
              authCompletionCallback(tokenResponse);
            }
          } else {
            console.log('[auth.js] Access token received:', tokenResponse.access_token);
            saveToken(tokenResponse.access_token);
            gapi.client.setToken(tokenResponse);

            if (authCompletionCallback) {
              authCompletionCallback(tokenResponse);
            }
          }
          authCompletionCallback = null;
        },
      });
      gisInited = true;
      console.log('[auth.js] Google Identity Services initialized.');

      maybeEnableButton(onReady);
    } catch (err) {
      console.error('[auth.js] Error during gapi or GIS init:', err);
    }
  });
}

/**
 * Calls the token client to start OAuth flow.
 * @param {function} callback - A callback function from app.js to handle the token response.
 */
export function authorize(callback) {
  if (!tokenClient) {
    console.error('[auth.js] tokenClient not initialized. Call initAuth first.');
    return;
  }
  authCompletionCallback = callback;
  tokenClient.requestAccessToken();
}

/**
 * Clears local session data (token and username) without revoking Google access.
 * This is for "logging out the current user" from the app itself.
 */
export function logoutUser() {
  clearToken(); // Clears local storage (access_token, username)
  gapi.client.setToken(null); // Clears the token from gapi.client
  console.log('[auth.js] Local session cleared. Google authorization remains.');
}

/**
 * Revokes the Google access token and clears local session data.
 * This is for "deauthorizing completely from Google".
 */
export function deauthorizeGoogle() {
  const token = gapi.client.getToken()?.access_token;
  console.log('[auth.js] Attempting to revoke token:', token);

  if (token) {
    // Revoke the token with Google
    google.accounts.oauth2.revoke(token, () => {
      console.log('[auth.js] Token revoked from Google.');
      logoutUser(); // Call logoutUser to clear local session after revocation
    });
  } else {
    console.warn('[auth.js] No Google token to revoke. Clearing local session only.');
    logoutUser(); // Still clear local session if no token to revoke
  }
}

/**
 * Stores the token in sessionStorage.
 */
export function saveToken(token) {
  sessionStorage.setItem('access_token', token);
}

/**
 * Retrieves token from sessionStorage.
 */
export function getSavedToken() {
  return sessionStorage.getItem('access_token');
}

/**
 * Clears token and username from sessionStorage. (Internal helper)
 */
function clearToken() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('username');
  console.log('[auth.js] Local token and username cleared.');
}

function maybeEnableButton(callback) {
  if (gapiInited && gisInited && callback) callback();
}