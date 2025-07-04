import { CONFIG } from './config.js';

let gapiInited = false;
let gisInited = false;
let tokenClient;

/**
 * Initializes the Google API client and sets up auth callback.
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
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        callback: '', // Filled during authorize()
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
 */
export function authorize(callback) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    callback: (response) => {
      if (response.access_token) {
        saveToken(response.access_token);
      }
      callback(response);
    },
  });

  tokenClient.requestAccessToken();
  return tokenClient;
}

/**
 * Logs the user out and revokes the access token.
 */
export function logout(tokenClient) {
  const token = gapi.client.getToken()?.access_token;
  console.log('[auth.js] Attempting to revoke token:', token);

  if (token) {
    google.accounts.oauth2.revoke(token, () => {
      console.log('[auth.js] Token revoked.');
    });
  } else {
    console.warn('[auth.js] No token to revoke.');
  }

  clearToken();
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
 * Clears token and username from sessionStorage.
 */
export function clearToken() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('username');
}

function maybeEnableButton(callback) {
  if (gapiInited && gisInited && callback) callback();
}
