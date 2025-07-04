import { CONFIG } from './config.js';
import { initAuth, authorize, logout } from './auth.js';
import { fetchUsers } from './user.js';

let tokenClient;
let isAuthorized = false;

window.onload = () => {
  console.log('[app.js] Window loaded. Initializing auth...');
  initAuth(() => {
    console.log('[app.js] initAuth callback triggered. Enabling button.');
    document.getElementById('authorize-btn').disabled = false;
  });
};

document.getElementById('authorize-btn').onclick = () => {
  console.log('[app.js] Authorize button clicked');
  tokenClient = authorize((tokenResponse) => {
    console.log('[app.js] Token response:', tokenResponse);
    if (!tokenResponse.error) {
      isAuthorized = true;
      document.getElementById('authorize-btn').style.display = 'none';
      document.getElementById('login-box').style.display = 'block';
    } else {
      console.error('[app.js] Authorization error:', tokenResponse);
    }
  });
};

document.getElementById('login-button').onclick = async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorBox = document.getElementById('error');

  console.log(`[app.js] Attempting login with username: ${username}`);

  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });

    console.log('[app.js] Admin sheet data:', res);

    const rows = res.result.values || [];

    const match = rows.find(row =>
      row[1]?.trim() === username && row[2]?.trim() === password
    );

    if (match) {
      console.log('[app.js] Login successful. Loading user data...');
      document.getElementById('login-box').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('logout-btn').style.display = 'inline-block';

      const users = await fetchUsers();
      console.log('[app.js] Fetched users:', users);

      const tbody = document.getElementById('user-body');
      tbody.innerHTML = '';

      users.forEach(row => {
        const tr = document.createElement('tr');
        for (let i = 0; i < 4; i++) {
          const td = document.createElement('td');
          td.textContent = row[i] || '';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });

    } else {
      console.warn('[app.js] Login failed: Invalid username or password.');
      errorBox.textContent = 'Invalid username or password.';
    }

  } catch (err) {
    console.error('[app.js] Login error:', err);
    errorBox.textContent = 'Login error: ' + (err.message || JSON.stringify(err));
  }
};

document.getElementById('logout-btn').onclick = () => {
  console.log('[app.js] Logout triggered');
  logout(tokenClient);
  isAuthorized = false;

  document.getElementById('app').style.display = 'none';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('authorize-btn').style.display = 'inline-block';
  document.getElementById('logout-btn').style.display = 'none';

  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
};
