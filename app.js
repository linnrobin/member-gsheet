import { CONFIG } from './config.js';
import { initAuth, authorize, logout } from './auth.js';
import { fetchUsers } from './user.js';

let tokenClient;
let isAuthorized = false;

window.onload = () => {
  initAuth(() => {
    document.getElementById('authorize-btn').disabled = false;
  });
};

document.getElementById('authorize-btn').onclick = () => {
  tokenClient = authorize((tokenResponse) => {
    if (!tokenResponse.error) {
      isAuthorized = true;
      document.getElementById('authorize-btn').style.display = 'none';
      document.getElementById('login-box').style.display = 'block';
    }
  });
};

document.getElementById('login-button').onclick = async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorBox = document.getElementById('error');

  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });

    const rows = res.result.values || [];
    console.log('Admin rows:', rows);

    const match = rows.find(row =>
      row[1]?.toString().trim() === username &&
      row[2]?.toString().trim() === password
    );

    if (match) {
      document.getElementById('login-box').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('logout-btn').style.display = 'inline-block';

      const users = await fetchUsers();
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
      errorBox.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    console.error('Login error:', err);
    errorBox.textContent = 'Login error: ' + (err.message || JSON.stringify(err));
  }
};

document.getElementById('logout-btn').onclick = () => {
  logout(tokenClient);
  isAuthorized = false;

  document.getElementById('app').style.display = 'none';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('authorize-btn').style.display = 'inline-block';
  document.getElementById('logout-btn').style.display = 'none';

  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
};
