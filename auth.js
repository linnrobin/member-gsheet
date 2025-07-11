//auth.js
import { CONFIG } from './config.js';

let gapiInited = false;
let gisInited = false;
// tokenClient will be initialized once inside initAuth
let tokenClient;
// This variable will hold the callback function provided by app.js for specific auth results
let authCompletionCallback = null;

/**
 * Initializes the Google API client and sets up the GIS token client.
 */
export function initAuth(onReady) {
  gapi.load('client', async () => {
    console.log('[auth.js] gapi loaded. Initializing client...');
    try {
      await gapi.client.init({
        // CORRECTED LINE: Removed markdown link syntax from the URL string
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
      gapiInited = true;
      console.log('[auth.js] gapi client initialized.');

      // Initialize tokenClient ONCE here with a generic callback
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        // CORRECTED LINE: Removed markdown link syntax from the URL string
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        // This callback will be triggered when tokenClient.requestAccessToken() is called
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('[auth.js] Token response error:', tokenResponse.error);
            // If there's an error, still call the app-specific callback if it exists
            if (authCompletionCallback) {
              authCompletionCallback(tokenResponse);
            }
          } else {
            console.log('[auth.js] Access token received:', tokenResponse.access_token);
            saveToken(tokenResponse.access_token);
            // After receiving a token, set it for gapi.client
            gapi.client.setToken(tokenResponse);

            // Call the app-specific callback that was set by authorize()
            if (authCompletionCallback) {
              authCompletionCallback(tokenResponse);
            }
          }
          // Reset the callback after it's used
          authCompletionCallback = null;
        },
      });
      gisInited = true;
      console.log('[auth.js] Google Identity Services initialized.');

      maybeEnableButton(onReady); // Call onReady once both are initialized
    } catch (err) {
      console.error('[auth.js] Error during gapi or GIS init:', err);
    }
  });
}

/**
 * Calls the token client to start OAuth flow.
 * @param {function} customCallback - A callback to execute after token acquisition (success or error).
 * This is useful for app.js to react immediately to the auth result.
 */
export function authorize(callback) {
  if (!tokenClient) {
    console.error('[auth.js] tokenClient not initialized. Call initAuth first.');
    // You might want to handle this error more gracefully, e.g., by alerting the user
    // or attempting to re-initialize.
    return;
  }

  // Store the app-specific callback to be called after the auth flow completes
  authCompletionCallback = callback;

  // Request the access token using the pre-initialized tokenClient
  tokenClient.requestAccessToken();
  // We don't return tokenClient here as it's a global managed instance.
  // The result will be delivered via the stored authCompletionCallback.
}

/**
 * Logs the user out and revokes the access token.
 */
export function logout(client) { // Renamed parameter to 'client' to avoid confusion with global tokenClient
  const token = gapi.client.getToken()?.access_token;
  console.log('[auth.js] Attempting to revoke token:', token);

  if (token) {
    // Revoke the token with Google
    google.accounts.oauth2.revoke(token, () => {
      console.log('[auth.js] Token revoked from Google.');
      clearToken(); // Clear local storage after successful revocation
      gapi.client.setToken(null); // Clear the token from gapi.client
    });
  } else {
    console.warn('[auth.js] No token to revoke. Clearing local storage only.');
    clearToken(); // Still clear local storage if no token to revoke
    gapi.client.setToken(null); // Clear the token from gapi.client
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
 * Clears token and username from sessionStorage.
 */
export function clearToken() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('username'); // Assuming username is also stored here
  console.log('[auth.js] Local token and username cleared.');
}

function maybeEnableButton(callback) {
  if (gapiInited && gisInited && callback) callback();
}