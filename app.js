const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let tokenClient;
let isAuthorized = false;
let gapiInited = false;

window.onload = () => {
  gapi.load('client', async () => {
    console.log('✅ gapi client loaded');
    await gapi.client.init({
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableAuthButton();
  });
};

function maybeEnableAuthButton() {
  if (gapiInited) {
    document.getElementById('authorize-btn').disabled = false;
  }
}

document.getElementById('authorize-btn').onclick = () => {
  console.log('🔐 Authorize clicked');

  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        console.log('🎟️ Token response:', tokenResponse);

        if (tokenResponse.error) {
          alert('OAuth error: ' + tokenResponse.error);
          return;
        }

        isAuthorized = true;
        document.getElementById('authorize-btn').style.display = 'none';
        document.getElementById('login-box').style.display = 'block';
      }
    });
  }

  tokenClient.requestAccessToken({ prompt: 'consent' });
};

document.getElementById('login-button').onclick = handleLogin;

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorBox = document.getElementById('error');

  if (!isAuthorized) {
    errorBox.textContent = 'Please click "Authorize with Google" first.';
    return;
  }

  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });

    const rows = res.result.values || [];
    const match = rows.find(row =>
      row[0]?.trim() === username && row[1]?.trim() === password
    );

    if (match) {
      document.getElementById('login-box').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await fetchUsers();
    } else {
      errorBox.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    console.error('Login error:', err);
    errorBox.textContent = 'Login error: ' + (err?.message || JSON.stringify(err));
  }
}

async function fetchUsers() {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.USERS_SHEET_ID,
      range: CONFIG.USERS_RANGE,
    });

    const users = res.result.values || [];
    const tbody = document.getElementById('user-body');
    tbody.innerHTML = '';

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
      return;
    }

    for (const row of users) {
      const tr = document.createElement('tr');
      for (let i = 0; i < 4; i++) {
        const td = document.createElement('td');
        td.textContent = row[i] || '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('❌ Failed to fetch users:', err);
    const msg = err?.result?.error?.message || err.message || 'Unknown error';
    document.getElementById('user-body').innerHTML =
      `<tr><td colspan="4">Error: ${msg}</td></tr>`;
  }
}
