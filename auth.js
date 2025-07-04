import { CONFIG } from './config.js';

let tokenClient;
let gapiInited = false;
let gisInited = false;

window.initGapi = () => {
  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: '',
      discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    });
    gapiInited = true;
  });
};

export function initAuth(onReady) {
  window.onload = () => {
    google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      callback: '', // defined later
    });
    onReady();
  };
}

export function authorize(callback) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    callback: (response) => callback(response)
  });
  tokenClient.requestAccessToken();
  return tokenClient;
}

export function logout(tokenClient) {
  if (tokenClient) {
    google.accounts.oauth2.revoke(tokenClient.credentials.access_token, () => {
      console.log("Logged out");
    });
  }
}
