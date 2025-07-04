import { CONFIG } from './config.js';

export function initAuth(onReady) {
  gapi.load('client', async () => {
    await gapi.client.init({
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
    });
    onReady();
  });
}

export function authorize(callback) {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    callback
  });
  tokenClient.requestAccessToken({ prompt: 'consent' });
  return tokenClient;
}

export function logout(tokenClient) {
  const token = tokenClient?.credentials?.access_token;
  if (token) {
    google.accounts.oauth2.revoke(token, () => {
      console.log('Logged out');
    });
  }
}
