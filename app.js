//app.js
import { CONFIG } from './config.js';
import {
  initAuth,
  authorize,
  logoutUser,       // NEW: For logging out of the app
  deauthorizeGoogle,  // NEW: For revoking Google access
  saveToken,
  getSavedToken,
  // clearToken // No longer directly exported, used internally by logoutUser/deauthorizeGoogle
} from './auth.js';
import {
  fetchUsers,
  appendUser,
  updateUser,
  deleteUserAt
} from './user.js';

let isAuthorized = false; // Tracks authorization state

// --- Custom Modal Functions ---
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalOkBtn = document.getElementById('modal-ok-btn');
const modalYesBtn = document.getElementById('modal-yes-btn');
const modalNoBtn = document.getElementById('modal-no-btn');
const modalCloseButton = document.querySelector('.close-button');

function showAlert(message) {
  return new Promise(resolve => {
    modalMessage.textContent = message;
    modalOkBtn.style.display = 'inline-block';
    modalYesBtn.style.display = 'none';
    modalNoBtn.style.display = 'none';
    customModal.style.display = 'flex';

    const handler = () => {
      customModal.style.display = 'none';
      modalOkBtn.removeEventListener('click', handler);
      modalCloseButton.removeEventListener('click', handler);
      resolve();
    };

    modalOkBtn.addEventListener('click', handler);
    modalCloseButton.addEventListener('click', handler);
  });
}

function showConfirm(message) {
  return new Promise(resolve => {
    modalMessage.textContent = message;
    modalOkBtn.style.display = 'none';
    modalYesBtn.style.display = 'inline-block';
    modalNoBtn.style.display = 'inline-block';
    customModal.style.display = 'flex';

    const yesHandler = () => {
      customModal.style.display = 'none';
      modalYesBtn.removeEventListener('click', yesHandler);
      modalNoBtn.removeEventListener('click', noHandler);
      modalCloseButton.removeEventListener('click', noHandler);
      resolve(true);
    };

    const noHandler = () => {
      customModal.style.display = 'none';
      modalYesBtn.removeEventListener('click', yesHandler);
      modalNoBtn.removeEventListener('click', noHandler);
      modalCloseButton.removeEventListener('click', noHandler);
      resolve(false);
    };

    modalYesBtn.addEventListener('click', yesHandler);
    modalNoBtn.addEventListener('click', noHandler);
    modalCloseButton.addEventListener('click', noHandler);
  });
}
// --- End Custom Modal Functions ---

function showApp() {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline-block';
  document.getElementById('deauthorize-btn').style.display = 'inline-block'; // Show deauthorize button
  document.getElementById('authorize-btn').style.display = 'none';

  fetchUsers().then(users => {
    console.log('[app.js] Fetched users:', users);
    const tbody = document.getElementById('user-body');
    tbody.replaceChildren();

    users
      .filter(row => row.length >= 3 && row[0])
      .forEach((row, index) => {
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
          const confirmed = await showConfirm('Delete user?');
          if (confirmed) {
            await deleteUserAt(index);
            showApp();
          }
        };

        actions.append(editBtn, delBtn);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
  }).catch(error => {
    console.error("[app.js] Error fetching users:", error);
    showAlert("Error loading users: " + (error.message || JSON.stringify(error)));
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    document.getElementById('authorize-btn').style.display = 'inline-block'; // Show auth button on error
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('deauthorize-btn').style.display = 'none';
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
      console.log('[app.js] Found saved session. Setting token for gapi.client.');
      gapi.client.setToken({ access_token: savedToken });
      isAuthorized = true;
      document.getElementById('authorize-btn').style.display = 'none';
      showApp();
    } else {
      document.getElementById('authorize-btn').style.display = 'inline-block';
      document.getElementById('authorize-btn').disabled = false;
      document.getElementById('login-box').style.display = 'block';
      // Hide other buttons if not authorized
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('deauthorize-btn').style.display = 'none';
    }
  });

  document.getElementById('save-user-btn').onclick = async () => {
    const index = document.getElementById('user-index').value;
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value.trim();
    const role = document.getElementById('user-role').value.trim();

    if (!username || !password || !role) {
      await showAlert('All fields are required: Username, Password, Role.');
      return;
    }

    if (index === '') {
      await appendUser({ username, password, role });
      await showAlert('User added successfully!');
    } else {
      const users = await fetchUsers();
      const created_at = users[parseInt(index, 10)]?.[3] || new Date().toISOString();
      await updateUser(index, { username, password, role, created_at });
      await showAlert('User updated successfully!');
    }

    clearForm();
    showApp();
  };

  document.getElementById('clear-user-btn').onclick = clearForm;
};

document.getElementById('authorize-btn').onclick = () => {
  authorize((tokenResponse) => {
    if (!tokenResponse.error) {
      isAuthorized = true;
      document.getElementById('authorize-btn').style.display = 'none';
      document.getElementById('login-box').style.display = 'block'; // Show login box after successful auth
      // Keep logout/deauthorize hidden until actual app login
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('deauthorize-btn').style.display = 'none';
    } else {
      console.error("[app.js] Authorization error:", tokenResponse.error);
      showAlert("Authorization failed: " + tokenResponse.error.description || tokenResponse.error);
    }
  });
};

document.getElementById('login-button').onclick = async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorBox = document.getElementById('error');
  errorBox.textContent = '';

  if (!username || !password) {
    await showAlert('Please enter both username and password.');
    return;
  }

  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });

    const rows = res.result.values || [];
    const match = rows.find(row =>
      row[1]?.trim() === username && row[2]?.trim() === password
    );

    if (match) {
      // Upon successful app login, make sure a Google token is present
      // and then save it along with the username.
      const currentGoogleToken = gapi.client.getToken()?.access_token;
      if (!currentGoogleToken) {
        // This scenario should ideally not happen if authorize was successful.
        // But as a fallback, you might want to force re-authorization here.
        await showAlert("Google authorization token missing. Please re-authorize.");
        document.getElementById('authorize-btn').style.display = 'inline-block';
        return;
      }

      saveToken(currentGoogleToken); // Save the token that gapi.client currently holds
      sessionStorage.setItem('username', username);
      showApp(); // Show the main app UI
    } else {
      errorBox.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    console.error("[app.js] Login error:", err);
    errorBox.textContent = 'Login error: ' + (err.result?.error?.message || err.message || JSON.stringify(err));
    await showAlert('Login failed: ' + (err.result?.error?.message || err.message || "An unknown error occurred."));
  }
};

// NEW: Handler for "Logout" button (clears local session)
document.getElementById('logout-btn').onclick = () => {
  logoutUser(); // Clear local session data
  isAuthorized = false;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('authorize-btn').style.display = 'inline-block';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('deauthorize-btn').style.display = 'none';
  clearForm();
};

// NEW: Handler for "Deauthorize Google" button (revokes Google access)
document.getElementById('deauthorize-btn').onclick = async () => {
  const confirmed = await showConfirm('Are you sure you want to deauthorize this app from your Google account? You will need to re-authorize next time.');
  if (confirmed) {
    deauthorizeGoogle(); // Revoke Google token and clear local session
    isAuthorized = false;
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('authorize-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('deauthorize-btn').style.display = 'none';
    clearForm();
  }
};