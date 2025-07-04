const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let tokenClient;
let gapiInited = false;

document.getElementById('login-button').onclick = handleLogin;
document.getElementById('authorize-btn').onclick = handleAuthClick;

window.onload = () => {
  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: CONFIG.API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
  });
};

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorBox = document.getElementById('error');

  if (!username || !password) {
    errorBox.textContent = 'Please enter both fields.';
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
    } else {
      errorBox.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    console.error('Login error:', err);
    document.getElementById('error').textContent =
      'Login error: ' + (err.message || JSON.stringify(err));
  }
}

function handleAuthClick() {
  if (!gapiInited) {
    alert("Google API not ready");
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: SCOPES,
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        alert('OAuth Error: ' + tokenResponse.error);
        return;
      }
      await fetchUsers();
    }
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
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
    document.getElementById('user-body').innerHTML =
      `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
  }
}
