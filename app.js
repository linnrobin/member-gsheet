//app.js
import { CONFIG } from './config.js';
import {
  initAuth,
  authorize,
  logoutUser,
  deauthorizeGoogle,
  saveToken,
  getSavedToken,
} from './auth.js';
import {
  fetchUsers,
  appendUser,
  updateUser,
  deleteUserAt
} from './user.js';

let isAuthorized = false; // Tracks authorization state

// --- Bootstrap Modal Integration (Updated) ---
const bsModalElement = document.getElementById('bs-modal');
// Initialize Bootstrap Modal instance once
const bsModal = new bootstrap.Modal(bsModalElement, {
  backdrop: 'static', // Prevent closing by clicking outside
  keyboard: false     // Prevent closing with Esc key
});
const bsModalMessage = document.getElementById('bs-modal-message');
const bsModalFooter = document.getElementById('bs-modal-footer');

// Helper to show a simple alert-like Bootstrap modal
function showAlert(message) {
  return new Promise(resolve => {
    bsModalMessage.textContent = message;
    bsModalFooter.innerHTML = `
      <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
    `;
    bsModal.show();

    // Event listener for when the modal is hidden
    bsModalElement.addEventListener('hidden.bs.modal', function handler() {
      bsModalElement.removeEventListener('hidden.bs.modal', handler); // Remove self
      resolve();
    });
  });
}

// Helper to show a confirm-like Bootstrap modal
function showConfirm(message) {
  return new Promise(resolve => {
    bsModalMessage.textContent = message;
    bsModalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
      <button type="button" class="btn btn-primary" id="modal-yes-btn">Yes</button>
    `;
    bsModal.show();

    const yesBtn = document.getElementById('modal-yes-btn');

    const yesHandler = () => {
      bsModal.hide(); // Hide the modal
      resolve(true); // User confirmed 'Yes'
    };

    const hideHandler = () => { // Handles both 'No' button and 'Close' (x) button
      yesBtn.removeEventListener('click', yesHandler);
      bsModalElement.removeEventListener('hidden.bs.modal', hideHandler);
      resolve(false); // User cancelled 'No' or closed
    };

    yesBtn.addEventListener('click', yesHandler);
    bsModalElement.addEventListener('hidden.bs.modal', hideHandler); // Listen for any way modal is hidden
  });
}
// --- End Bootstrap Modal Integration ---

function showApp() {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline-block';
  document.getElementById('deauthorize-btn').style.display = 'inline-block';
  document.getElementById('authorize-btn').style.display = 'none';

  fetchUsers().then(users => {
    console.log('[app.js] Fetched users:', users);
    const tbody = document.getElementById('user-body');
    tbody.replaceChildren();

    if (!users || users.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '6');
      td.className = 'text-center text-muted';
      td.textContent = 'No users found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

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
        editBtn.className = 'btn btn-sm btn-info me-2'; // Bootstrap class
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => populateForm(row, index);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger'; // Bootstrap class
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
    document.getElementById('authorize-btn').style.display = 'inline-block';
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
      document.getElementById('login-box').style.display = 'block';
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
      const currentGoogleToken = gapi.client.getToken()?.access_token;
      if (!currentGoogleToken) {
        await showAlert("Google authorization token missing. Please re-authorize.");
        document.getElementById('authorize-btn').style.display = 'inline-block';
        return;
      }

      saveToken(currentGoogleToken);
      sessionStorage.setItem('username', username);
      showApp();
    } else {
      errorBox.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    console.error("[app.js] Login error:", err);
    errorBox.textContent = 'Login error: ' + (err.result?.error?.message || err.message || JSON.stringify(err));
    await showAlert('Login failed: ' + (err.result?.error?.message || err.message || "An unknown error occurred."));
  }
};

document.getElementById('logout-btn').onclick = () => {
  logoutUser();
  isAuthorized = false;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('authorize-btn').style.display = 'inline-block';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('deauthorize-btn').style.display = 'none';
  clearForm();
};

document.getElementById('deauthorize-btn').onclick = async () => {
  const confirmed = await showConfirm('Are you sure you want to deauthorize this app from your Google account? You will need to re-authorize next time.');
  if (confirmed) {
    deauthorizeGoogle();
    isAuthorized = false;
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('authorize-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('deauthorize-btn').style.display = 'none';
    clearForm();
  }
};