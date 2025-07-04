import { CONFIG } from './config.js';
import { initAuth, authorize, logout, saveToken, getSavedToken, clearToken } from './auth.js';
import { fetchUsers, appendUser, updateUser, deleteUserAt } from './user.js';

let tokenClient;
let isAuthorized = false;

function showApp() {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline-block';

  fetchUsers().then(users => {
    console.log('[app.js] Fetched users:', users);
    const tbody = document.getElementById('user-body');
    tbody.innerHTML = '';

    users.forEach((row, index) => {
      const tr = document.createElement('tr');
      for (let i = 0; i < 5; i++) {
        const td = document.createElement('td');
        td.textContent = row[i] || '';
        tr.appendChild(td);
      }

      const actions = document.createElement('td');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => populateForm(row, index);

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = async () => {
        if (confirm('Delete user?')) {
          await deleteUserAt(index);
          showApp();
        }
      };

      actions.append(editBtn, delBtn);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
  });
}

function populateForm(row, index) {
  document.getElementById('user-index').value = index;
  document.getElementById('user-username').value = row[0] || '';
  document.getElementById('user-password').value = row[1] || '';
  document.getElementById('user-role').value = row[2] || '';
}

function clearForm() {
  document.getElementById('user-index').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-role').value = '';
}

window.onload = () => {
  console.log('[app.js] Window loaded. Initializing auth...');
  initAuth(() => {
    const savedToken = getSavedToken();
    const savedUser = sessionStorage.getItem('username');

    if (savedToken && savedUser) {
      console.log('[app.js] Found saved session.');
      gapi.client.setToken({ access_token: savedToken });
      isAuthorized = true;
      document.getElementById('authorize-btn').style.display = 'none';
      showApp();
    } else {
      document.getElementById('authorize-btn').style.display = 'inline-block';
      document.getElementById('authorize-btn').disabled = false;
    }
  });

  document.getElementById('save-user-btn').onclick = async () => {
    const index = document.getElementById('user-index').value;
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value.trim();
    const role = document.getElementById('user-role').value.trim();

    if (!username || !password || !role) {
      alert('All fields required.');
      return;
    }

    if (index === '') {
      await appendUser({ username, password, role });
    } else {
      const users = await fetchUsers();
      const created_at = users[index]?.[3] || new Date().toISOString();
      await updateUser(index, { username, password, role, created_at });
    }

    clearForm();
    showApp();
  };

  document.getElementById('clear-user-btn').onclick = clearForm;
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
    const match = rows.find(row => row[1]?.trim() === username && row[2]?.trim() === password);

    if (match) {
      saveToken(gapi.client.getToken().access_token);
      sessionStorage.setItem('username', username);
      showApp();
    } else {
      errorBox.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    errorBox.textContent = 'Login error: ' + (err.message || JSON.stringify(err));
  }
};

document.getElementById('logout-btn').onclick = () => {
  logout(tokenClient);
  isAuthorized = false;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('authorize-btn').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none';
  clearForm();
};
