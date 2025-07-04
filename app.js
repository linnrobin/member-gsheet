// app.js
const CLIENT_ID = CONFIG.CLIENT_ID;
const API_KEY = CONFIG.API_KEY;
const SHEET_ID = CONFIG.SHEET_ID;
const SHEET_RANGE = CONFIG.RANGE;
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let tokenClient;
let gapiInited = false;

document.getElementById('authorize-btn').onclick = handleAuthClick;

window.onload = () => {
  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          alert('OAuth error: ' + tokenResponse.error);
          return;
        }
        await fetchUsers();
      },
    });
  });
};

function handleAuthClick() {
  if (!gapiInited) {
    alert("GAPI not loaded yet.");
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function fetchUsers() {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
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
