import { CONFIG } from './config.js';

export function initAuth(onReady) {
  console.log('[auth.js] Loading gapi...');
  gapi.load('client', async () => {
    try {
      console.log('[auth.js] Initializing gapi client...');
      await gapi.client.init({
        apiKey: '',
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
      console.log('[auth.js] GAPI client initialized.');
      onReady();
    } catch (error) {
      console.error('[auth.js] Error initializing gapi client:', error);
    }
  });
}

export function authorize(callback) {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    callback: callback,
  });

  tokenClient.requestAccessToken();
  return tokenClient;
}

export function logout(tokenClient) {
  const token = gapi.client.getToken()?.access_token;

  console.log('[auth.js] Attempting to revoke token:', token);

  if (token) {
    google.accounts.oauth2.revoke(token, () => {
      console.log('[auth.js] Token revoked successfully.');
    });
  } else {
    console.warn('[auth.js] No token available to revoke.');
  }
}
