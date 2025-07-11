//auth.js
import { CONFIG } from './config.js';

let gapiInited = false;
let gisInited = false;
let tokenClient; // Declare globally, but initialize once.

/**
 * Initializes the Google API client and sets up GIS token client.
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

      // Initialize tokenClient ONLY ONCE here.
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        // The callback here is the main one that handles the token response.
        // It will be triggered when tokenClient.requestAccessToken() is called.
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('[auth.js] Token response error:', tokenResponse.error);
            // Optionally, pass the error back to app.js if needed
            // callback(tokenResponse); // Pass the error back
          } else {
            console.log('[auth.js] Access token received:', tokenResponse.access_token);
            saveToken(tokenResponse.access_token);
            // After receiving a token, set it for gapi.client
            gapi.client.setToken(tokenResponse);

            // This next line is crucial: After successful authorization and setting the token,
            // you'll likely want to proceed with your application's flow (e.g., show login/app)
            // You can pass a specific success callback from authorize() in app.js
            // or rely on the fact that now the token is set and app.js can proceed.
            // For now, let's assume authorize() will pass its own callback to handle this.
          }
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
 * Initiates the OAuth flow.
 * @param {function} customCallback - A callback to execute after token acquisition (success or error).
 * This is useful for app.js to react immediately to the auth result.
 */
export function authorize(customCallback) {
  // If tokenClient is not initialized, something went wrong with initAuth
  if (!tokenClient) {
    console.error('[auth.js] tokenClient not initialized. Call initAuth first.');
    return;
  }

  // Set the callback specifically for this authorization request.
  // The tokenClient.callback set in initTokenClient is the general handler,
  // but for specific actions like authorize, you might want an immediate response in app.js.
  // However, `initTokenClient` doesn't allow changing the `callback` directly after init.
  // The best way is for `app.js` to listen to the overall state (token in gapi.client).
  // Or, `tokenClient.callback` should be the one that app.js passes.

  // Let's simplify this. The `tokenClient.callback` set in `initAuth` should be sufficient.
  // app.js will then check `getSavedToken()` or `gapi.client.getToken()` after this
  // to determine if authorization was successful.

  // If you *really* need a specific callback per authorize call, you'd need to store it
  // and trigger it from the main tokenClient callback. But often, just calling
  // requestAccessToken and then checking the token state is enough.
  
  // For simplicity, let's keep the `tokenClient.callback` in `initAuth` as the main handler.
  // The `app.js` will rely on `gapi.client.getToken()` and `getSavedToken()`.

  tokenClient.requestAccessToken();

  // You might want to pass the tokenResponse (or just success/failure)
  // from the tokenClient.callback in initAuth up to app.js,
  // but for now, app.js checks for the token itself.
  // The original authorize function was doing: `callback(response);`
  // This implies app.js was getting the tokenResponse directly.
  // Let's revert the callback logic to how you had it, but ensure `tokenClient` is initialized once.

  // Re-evaluating based on your original authorize function's intent:
  // It appears authorize() was meant to *return* the tokenResponse to app.js directly.
  // This suggests the callback for `initTokenClient` in `initAuth` should indeed be `''`
  // or a very generic one, and the specific callback for the auth flow is set dynamically.

  // Let's stick closer to your original intent, but simplify the init.
  // The current structure where `authorize` re-initializes `tokenClient` with a new callback
  // is a common pattern when you want a per-request callback. It's not necessarily "wrong,"
  // just slightly less efficient if `initTokenClient` is heavy (which it's not super heavy).

  // Okay, thinking about it, the way `google.accounts.oauth2.initTokenClient` works,
  // the `callback` is *the* callback for that instance. If you want different behavior
  // for different requests, you *do* need to re-initialize or have a very smart single callback.
  // Your current approach of re-initializing `tokenClient` in `authorize`
  // to pass a specific callback from `app.js` is a valid pattern for that.
  // My prior advice to initialize it only once was for a simpler use case where one
  // global callback suffices. Given your `app.js` expects a `tokenResponse` back,
  // the current structure (re-initializing `tokenClient` in `authorize`) is how it works.

  // So, let's just make sure `tokenClient` is properly nullified or managed.
  // The `let tokenClient;` in `auth.js` is global.
  // When `authorize` is called, it assigns a *new* instance to this global `tokenClient`.
  // This means the `tokenClient` created in `initAuth` is effectively orphaned.

  // A cleaner approach: `initAuth` creates the `tokenClient` once, and its callback
  // handles the saving of the token. `authorize` just requests the token, and the `app.js`
  // checks `gapi.client.getToken()` after the auth flow is completed.

  // Let's try to refine your original logic to avoid re-initializing the *same* variable.

  // Simpler approach:
  // 1. `initAuth` creates `tokenClient` with a fixed callback that saves the token.
  // 2. `authorize` just calls `tokenClient.requestAccessToken()`.
  // 3. `app.js` waits for the `authorize` function to complete, then checks if a token is present.

  // Revised `auth.js` with a single `tokenClient` instance and a clear callback chain:

  // (Keeping your original structure as it's common for per-request callbacks with this API,
  // but explicitly setting `tokenClient` to null after use or having it managed by app.js if needed).
  // No, the global `tokenClient` in `auth.js` IS the instance.
  // It's not a new instance each time, it's overwriting the global one.

  // The problem statement was "help me fix this structure".
  // The structure with `tokenClient` being global and overwritten in `authorize` is a bit iffy.
  // A better structure:
  // The `tokenClient` should be initialized *once* in `initAuth`.
  // The `authorize` function should then simply use this initialized `tokenClient` to request.
  // If `authorize` needs to pass a *specific* callback for a *specific* authorization attempt,
  // that implies a more complex callback management within `auth.js` or `app.js` reacting to
  // the presence of a token *after* the async auth flow completes.

  // Let's assume the simpler flow: `initAuth` sets up `tokenClient` once, its internal callback
  // handles saving the token, and `app.js` just needs to know when the flow is complete to check.

```javascript
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
        discoveryDocs: ['[https://sheets.googleapis.com/$discovery/rest?version=v4](https://sheets.googleapis.com/$discovery/rest?version=v4)'],
      });
      gapiInited = true;
      console.log('[auth.js] gapi client initialized.');

      // Initialize tokenClient ONCE here with a generic callback
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: '[https://www.googleapis.com/auth/spreadsheets](https://www.googleapis.com/auth/spreadsheets)',
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
            // Set the token for gapi.client to use in subsequent requests
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
 * @param {function} callback - A callback function from app.js to handle the token response.
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