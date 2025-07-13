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
import { validateUser } from './validation.js';

let isAuthorized = false; // Tracks authorization state


// --- Bootstrap Toast Notification Integration ---
const toastElement = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');
let toastInstance = null;
if (toastElement) {
  toastInstance = bootstrap.Toast.getOrCreateInstance(toastElement);
}

// Helper to show a toast notification
function showAlert(message) {
  return new Promise(resolve => {
    toastMessage.textContent = message;
    toastElement.classList.remove('text-bg-danger', 'text-bg-success', 'text-bg-primary');
    toastElement.classList.add('text-bg-primary');
    toastInstance.show();
    toastElement.addEventListener('hidden.bs.toast', function handler() {
      toastElement.removeEventListener('hidden.bs.toast', handler);
      resolve();
    });
  });
}

// Helper to show a toast notification with different color (for error/success)
function showToast(message, type = 'primary') {
  toastMessage.textContent = message;
  toastElement.classList.remove('text-bg-danger', 'text-bg-success', 'text-bg-primary');
  toastElement.classList.add(`text-bg-${type}`);
  toastInstance.show();
}

// Helper to show a confirm-like dialog (still uses modal for now)
function showConfirm(message) {
  // For simplicity, still use window.confirm for now
  return Promise.resolve(window.confirm(message));
}
// --- End Bootstrap Toast Notification Integration ---

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
        editBtn.className = 'btn btn-sm btn-info me-2';
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .708 0l1 1zm-1.75 2.456-1-1L4 11.146V12h.854l8.898-8.898z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>';
        editBtn.onclick = () => openSidePanel('edit', row, index);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16"><path d="M6.5 1.5v-1h3v1H14a.5.5 0 0 1 0 1h-1v11A2.5 2.5 0 0 1 10.5 16h-5A2.5 2.5 0 0 1 3 13.5v-11H2a.5.5 0 0 1 0-1h3.5zm-3 2v10A1.5 1.5 0 0 0 5.5 15h5A1.5 1.5 0 0 0 12 13.5v-10h-8z"/><path d="M8 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm-2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5z"/></svg>';
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
    // Add button for new user
    const addBtnRow = document.createElement('tr');
    const addBtnCell = document.createElement('td');
    addBtnCell.colSpan = 6;
    addBtnCell.className = 'text-end';
    addBtnCell.innerHTML = '<button id="add-user-btn" class="btn btn-success"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-plus" viewBox="0 0 16 16"><path d="M8 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm4-3a.5.5 0 0 1 .5.5V6h1.5a.5.5 0 0 1 0 1H12.5v1.5a.5.5 0 0 1-1 0V7H10a.5.5 0 0 1 0-1h1.5V4.5a.5.5 0 0 1 .5-.5z"/><path d="M2 13s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2zm13-1c0-1-3-3-6-3s-6 2-6 3h12z"/></svg> Add User</button>';
    addBtnRow.appendChild(addBtnCell);
    tbody.appendChild(addBtnRow);
    // Add event listener for add user
    setTimeout(() => {
      const addUserBtn = document.getElementById('add-user-btn');
      if (addUserBtn) addUserBtn.onclick = () => openSidePanel('add');
    }, 0);
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

// --- Side Panel Logic ---
const sidePanel = document.getElementById('side-panel');
const sidePanelBackdrop = document.getElementById('side-panel-backdrop');
const sidePanelClose = document.getElementById('side-panel-close');
const sideUserForm = document.getElementById('side-user-form');
const sideUserIndex = document.getElementById('side-user-index');
const sideUserUsername = document.getElementById('side-user-username');
const sideUserPassword = document.getElementById('side-user-password');
const sideUserRole = document.getElementById('side-user-role');
const sideFormError = document.getElementById('side-form-error');

function openSidePanel(mode, row = [], index = '') {
  sidePanel.classList.add('open');
  sidePanelBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (mode === 'edit') {
    document.getElementById('side-panel-title').textContent = 'Edit User';
    sideUserIndex.value = index;
    sideUserUsername.value = row[0] || '';
    sideUserPassword.value = row[1] || '';
    sideUserRole.value = row[2] || '';
  } else {
    document.getElementById('side-panel-title').textContent = 'Add User';
    sideUserIndex.value = '';
    sideUserUsername.value = '';
    sideUserPassword.value = '';
    sideUserRole.value = '';
  }
  sideFormError.textContent = '';
  setTimeout(() => sideUserUsername.focus(), 100);
}

function closeSidePanel() {
  sidePanel.classList.remove('open');
  sidePanelBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

if (sidePanelClose) sidePanelClose.onclick = closeSidePanel;
if (sidePanelBackdrop) sidePanelBackdrop.onclick = closeSidePanel;
if (document.getElementById('side-cancel-user-btn')) document.getElementById('side-cancel-user-btn').onclick = closeSidePanel;

if (sideUserForm) {
  sideUserForm.onsubmit = async (e) => {
    e.preventDefault();
    sideFormError.textContent = '';
    const index = sideUserIndex.value;
    const username = sideUserUsername.value.trim();
    const password = sideUserPassword.value.trim();
    const role = sideUserRole.value.trim();
    const errors = validateUser({ username, password, role });
    if (Object.keys(errors).length > 0) {
      sideFormError.textContent = Object.values(errors).join(' ');
      return;
    }
    try {
      if (index === '') {
        await appendUser({ username, password, role });
        showToast('User added successfully!', 'success');
      } else {
        const users = await fetchUsers();
        const created_at = users[parseInt(index, 10)]?.[3] || new Date().toISOString();
        await updateUser(index, { username, password, role, created_at });
        showToast('User updated successfully!', 'success');
      }
      closeSidePanel();
      showApp();
    } catch (err) {
      sideFormError.textContent = 'Error saving user.';
      showToast('Error saving user.', 'danger');
      console.error(err);
    }

  };
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