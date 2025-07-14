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
let currentUserRole = null; // Tracks current user's role

// --- Navigation & Routing ---
const NAV_ROUTES = {
  dashboard: 'Dashboard',
  users: 'Users',
  admins: 'Admins',
  roles: 'User Levels',
  rbac: 'Admin Role Permission',
  activity: 'Activity Log',
  settings: 'Settings',
};

function setActiveNav(id) {
  document.querySelectorAll('#main-nav .nav-link').forEach(link => {
    link.classList.remove('active');
    // Also remove aria-current for accessibility
    link.removeAttribute('aria-current');
  });
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    el.setAttribute('aria-current', 'page');
  }
}

function renderPage(page) {
  const main = document.getElementById('main-content');
  if (!main) return;
  // RBAC: Only allow admins to access Admins section
  if (page === 'admins' && currentUserRole !== 'admin') {
    showToast('Access denied: Admins only', 'danger');
    return renderPage('dashboard');
  }
  switch (page) {
    case 'dashboard':
      main.innerHTML = `<h2 class="h4 mb-3">Dashboard</h2><div class="card p-4">Welcome to the admin dashboard.</div>`;
      setActiveNav('nav-dashboard');
      break;
    case 'users':
      main.innerHTML = `<h2 class="h4 mb-3">User List</h2><div id="user-table-container"></div>`;
      setActiveNav('nav-users');
      showApp();
      break;
    case 'admins':
      renderAdminsPage();
      break;
    case 'roles':
      main.innerHTML = `<h2 class="h4 mb-3">User Levels</h2><div class="card p-4"><form id="role-form" class="mb-3"><div class="input-group"><input type="text" id="new-role" class="form-control" placeholder="Add new role" /><button class="btn btn-primary" type="submit">Add</button></div></form><ul id="role-list" class="list-group"></ul></div>`;
      setActiveNav('nav-roles');
      renderRolesPage();
      break;
// --- Admins Page Logic ---
function renderAdminsPage() {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `<h2 class="h4 mb-3">Admins</h2><div id="admin-table-container"></div>`;
  setActiveNav('nav-admins');
  showAdmins();
}

async function showAdmins() {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });
    const admins = res.result.values || [];
    const container = document.getElementById('admin-table-container');
    if (!container) return;
    let html = `<div class="table-responsive"><table class="table table-striped table-hover table-bordered"><thead class="table-dark"><tr><th>Username</th><th>Password</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
    if (admins.length === 0) {
      html += `<tr><td colspan="4" class="text-center">No admins found.</td></tr>`;
    } else {
      admins.forEach((row, idx) => {
        html += `<tr><td>${row[1] || ''}</td><td>••••••••</td><td>${row[3] || ''}</td><td>` +
          `<button class='btn btn-sm btn-info me-2' onclick='window.editAdmin(${idx})'>Edit</button>` +
          `<button class='btn btn-sm btn-danger' onclick='window.deleteAdmin(${idx})'>Delete</button>` +
          `</td></tr>`;
      });
    }
    html += `</tbody></table></div>`;
    html += `<button class="btn btn-success" id="add-admin-btn">Add Admin</button>`;
    container.innerHTML = html;
    document.getElementById('add-admin-btn').onclick = openAddAdminModal;
    window.editAdmin = openEditAdminModal;
    window.deleteAdmin = openDeleteAdminModal;
  } catch (err) {
    document.getElementById('admin-table-container').innerHTML = `<div class='text-danger'>Error loading admins.</div>`;
    console.error(err);
  }
}

function openAddAdminModal() {
  openAdminModal('add');
}
function openEditAdminModal(idx) {
  openAdminModal('edit', idx);
}
function openDeleteAdminModal(idx) {
  if (confirm('Delete this admin?')) {
    deleteAdmin(idx);
  }
}

function openAdminModal(mode, idx) {
  // Simple prompt for demo; replace with modal for production
  let username = '';
  let password = '';
  let role = '';
  if (mode === 'edit') {
    // Fetch current admin data
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    }).then(res => {
      const admins = res.result.values || [];
      const admin = admins[idx];
      if (!admin) return;
      username = admin[1] || '';
      password = '';
      role = admin[3] || '';
      promptAndSaveAdmin(mode, idx, username, password, role);
    });
  } else {
    promptAndSaveAdmin(mode, idx, username, password, role);
  }
}

function promptAndSaveAdmin(mode, idx, username, password, role) {
  username = prompt('Admin username:', username) || '';
  if (!username) return;
  password = prompt('Admin password (leave blank to keep unchanged):', password) || '';
  role = prompt('Admin role:', role) || '';
  if (!role) return;
  // Hash password if provided
  let hashedPassword = '';
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(password.trim(), salt);
  }
  saveAdmin(mode, idx, username.trim().toLowerCase(), hashedPassword, role.trim().toLowerCase());
}

async function saveAdmin(mode, idx, username, password, role) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });
    let admins = res.result.values || [];
    if (mode === 'add') {
      const now = new Date().toISOString();
      admins.push(['', username, password, role, now, now]);
    } else if (mode === 'edit') {
      if (admins[idx]) {
        if (password) admins[idx][2] = password;
        admins[idx][1] = username;
        admins[idx][3] = role;
        admins[idx][4] = admins[idx][4] || new Date().toISOString();
        admins[idx][5] = new Date().toISOString();
      }
    }
    // Write back to sheet
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
      valueInputOption: 'RAW',
      resource: { values: admins },
    });
    showToast('Admin saved!', 'success');
    showAdmins();
  } catch (err) {
    showToast('Error saving admin.', 'danger');
    console.error(err);
  }
}

async function deleteAdmin(idx) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
    });
    let admins = res.result.values || [];
    admins.splice(idx, 1);
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
      valueInputOption: 'RAW',
      resource: { values: admins },
    });
    showToast('Admin deleted!', 'success');
    showAdmins();
  } catch (err) {
    showToast('Error deleting admin.', 'danger');
    console.error(err);
  }
}
    case 'rbac':
      main.innerHTML = `<h2 class="h4 mb-3">Admin Role Permission</h2><div class="card p-4"><div id="rbac-content">(Coming soon) Configure role-based access control.</div></div>`;
      setActiveNav('nav-admin-roles');
      renderRBACPage();
      break;
    case 'activity':
      main.innerHTML = `<h2 class="h4 mb-3">Activity Log</h2><div class="card p-4"><ul id="activity-log-list" class="list-group"></ul></div>`;
      setActiveNav('nav-activity-log');
      renderActivityLogPage();
      break;
    case 'settings':
      main.innerHTML = `<h2 class="h4 mb-3">Settings</h2><div class="card p-4"><form id="change-password-form"><div class="mb-3"><label for="current-password" class="form-label">Current Password</label><input type="password" id="current-password" class="form-control" required></div><div class="mb-3"><label for="new-password" class="form-label">New Password</label><input type="password" id="new-password" class="form-control" required></div><button type="submit" class="btn btn-primary">Change Password</button><div id="settings-form-error" class="text-danger mt-2"></div></form></div>`;
      setActiveNav('nav-settings');
      renderSettingsPage();
      break;
// --- Roles Page Logic (in-memory for demo) ---
let roles = ['admin', 'user'];
function renderRolesPage() {
  const roleList = document.getElementById('role-list');
  if (!roleList) return;
  roleList.innerHTML = '';
  roles.forEach((role, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.textContent = role;
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      roles.splice(idx, 1);
      renderRolesPage();
    };
    li.appendChild(delBtn);
    roleList.appendChild(li);
  });
  const form = document.getElementById('role-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('new-role');
      const val = input.value.trim().toLowerCase();
      if (val && !roles.includes(val)) {
        roles.push(val);
        input.value = '';
        renderRolesPage();
      }
    };
  }
}

// --- RBAC Page Logic (placeholder) ---
function renderRBACPage() {
  // Placeholder for future RBAC logic
}

// --- Activity Log Page Logic (in-memory for demo) ---
let activityLog = [
  { action: 'User login', date: new Date().toLocaleString() },
  { action: 'User added', date: new Date().toLocaleString() },
];
function renderActivityLogPage() {
  const list = document.getElementById('activity-log-list');
  if (!list) return;
  list.innerHTML = '';
  activityLog.forEach(item => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = `${item.date}: ${item.action}`;
    list.appendChild(li);
  });
}

// --- Settings Page Logic (Change Password) ---
function renderSettingsPage() {
  const form = document.getElementById('change-password-form');
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const currentPwd = document.getElementById('current-password').value.trim();
    const newPwd = document.getElementById('new-password').value.trim();
    const errorBox = document.getElementById('settings-form-error');
    errorBox.textContent = '';
    if (!currentPwd || !newPwd) {
      errorBox.textContent = 'Both fields are required.';
      return;
    }
    if (newPwd.length < 6) {
      errorBox.textContent = 'New password must be at least 6 characters.';
      return;
    }
    // For demo: just show toast. In production, verify currentPwd and update in Google Sheet.
    showToast('Password changed!', 'success');
    form.reset();
  };
}
    default:
      main.innerHTML = `<h2 class="h4 mb-3">Dashboard</h2><div class="card p-4">Welcome to the admin dashboard.</div>`;
      setActiveNav('nav-dashboard');
  }
}

function setupNavigation() {
  // SPA-style navigation: update hash and listen for hashchange
  const navMap = {
    'nav-dashboard': 'dashboard',
    'nav-users': 'users',
    'nav-admins': 'admins',
    'nav-roles': 'roles',
    'nav-admin-roles': 'rbac',
    'nav-activity-log': 'activity',
    'nav-settings': 'settings',
  };
  Object.keys(navMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.onclick = (e) => {
        e.preventDefault();
        window.location.hash = navMap[id];
      };
    }
  });
  // On hash change, render the correct page
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace(/^#/, '') || 'dashboard';
    renderPage(page);
  });
}


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

async function showApp(page = 1, pageSize = 10) {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline-block';
  document.getElementById('deauthorize-btn').style.display = 'inline-block';
  document.getElementById('authorize-btn').style.display = 'none';

  try {
    const users = await fetchUsers();
    const thead = document.querySelector('#user-body').parentElement.querySelector('thead');
    const tbody = document.getElementById('user-body');
    tbody.replaceChildren();

    if (!users || users.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '100');
      td.className = 'text-center text-muted';
      td.textContent = 'No users found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    // Fetch headers from Google Sheet (first row)
    const headers = ["No."].concat(["Username", "Password", "Role", "Created At", "Updated At"]);
    // Render table header dynamically
    if (thead) {
      thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '<th>Actions</th></tr>';
    }

    // Pagination logic
    const totalEntries = users.length;
    const totalPages = Math.ceil(totalEntries / pageSize);
    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalEntries);

    // Render paginated rows
    users.slice(startIdx, endIdx).forEach((row, idx) => {
      const tr = document.createElement('tr');
      // Row number
      const tdNum = document.createElement('td');
      tdNum.textContent = startIdx + idx + 1;
      tr.appendChild(tdNum);
      // User columns
      for (let i = 0; i < headers.length - 1; i++) {
        const td = document.createElement('td');
        // Format created_at and updated_at
        if ((headers[i + 1] === 'Created At' || headers[i + 1] === 'Updated At') && row[i]) {
          td.textContent = formatDate(row[i]);
        } else {
          td.textContent = row[i] || '';
        }
        tr.appendChild(td);
      }
      // Actions
      const actions = document.createElement('td');
      // Change Password button
      const changePwdBtn = document.createElement('button');
      changePwdBtn.className = 'btn btn-sm btn-warning me-2';
      changePwdBtn.textContent = 'Change Password';
      changePwdBtn.onclick = () => openChangePasswordModal(startIdx + idx, row);
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-info me-2';
      editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .708 0l1 1zm-1.75 2.456-1-1L4 11.146V12h.854l8.898-8.898z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>';
      editBtn.onclick = () => openSidePanel('edit', row, startIdx + idx);
      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger';
      delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16"><path d="M6.5 1.5v-1h3v1H14a.5.5 0 0 1 0 1h-1v11A2.5 2.5 0 0 1 10.5 16h-5A2.5 2.5 0 0 1 3 13.5v-11H2a.5.5 0 0 1 0-1h3.5zm-3 2v10A1.5 1.5 0 0 0 5.5 15h5A1.5 1.5 0 0 0 12 13.5v-10h-8z"/><path d="M8 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm-2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5z"/></svg>';
      delBtn.onclick = async () => {
        const confirmed = await showConfirm('Delete user?');
        if (confirmed) {
          try {
            await deleteUserAt(startIdx + idx);
            showToast('User deleted successfully!', 'success');
            showApp(page, pageSize);
          } catch (err) {
            showToast('Error deleting user.', 'danger');
            console.error(err);
          }
        }
      };
      actions.append(changePwdBtn, editBtn, delBtn);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
// --- Change Password Modal Logic ---
function openChangePasswordModal(index, row) {
  // Simple prompt for now; replace with modal for production
  const newPwd = prompt('Enter new password for user: ' + (row[0] || ''));
  if (newPwd && newPwd.length >= 6) {
    // Hash password before saving
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPwd.trim(), salt);
    fetchUsers().then(users => {
      const user = users[index];
      if (!user) return;
      const updated = {
        username: user[0],
        password: hashedPassword,
        role: user[2],
        created_at: user[3] || new Date().toISOString(),
      };
      updateUser(index, updated).then(() => {
        showToast('Password changed!', 'success');
        showApp();
      }).catch(() => showToast('Error changing password.', 'danger'));
    });
  } else if (newPwd !== null) {
    showToast('Password must be at least 6 characters.', 'danger');
  }
}

    // Pagination controls
    renderPagination(page, totalPages, pageSize);

    // Add button for new user (navigates to user-form.html)
    const addBtnRow = document.createElement('tr');
    const addBtnCell = document.createElement('td');
    addBtnCell.colSpan = headers.length + 1;
    addBtnCell.className = 'text-end';
    addBtnCell.innerHTML = '<a href="user-form.html" id="add-user-btn" class="btn btn-success"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-plus" viewBox="0 0 16 16"><path d="M8 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm4-3a.5.5 0 0 1 .5.5V6h1.5a.5.5 0 0 1 0 1H12.5v1.5a.5.5 0 0 1-1 0V7H10a.5.5 0 0 1 0-1h1.5V4.5a.5.5 0 0 1 .5-.5z"/><path d="M2 13s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2zm13-1c0-1-3-3-6-3s-6 2-6 3h12z"/></svg> Add User</a>';
    addBtnRow.appendChild(addBtnCell);
    tbody.appendChild(addBtnRow);
  } catch (error) {
    console.error("[app.js] Error fetching users:", error);
    showAlert("Error loading users: " + (error.message || JSON.stringify(error)));
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    document.getElementById('authorize-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('deauthorize-btn').style.display = 'none';
  }
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderPagination(current, total, pageSize) {
  let pagination = document.getElementById('pagination-controls');
  if (!pagination) {
    pagination = document.createElement('div');
    pagination.id = 'pagination-controls';
    pagination.className = 'd-flex justify-content-between align-items-center my-2';
    document.getElementById('app').appendChild(pagination);
  }
  pagination.innerHTML = '';
  // Entries info
  const info = document.createElement('span');
  info.textContent = `Page ${current} of ${total}`;
  pagination.appendChild(info);
  // Page buttons
  const nav = document.createElement('nav');
  const ul = document.createElement('ul');
  ul.className = 'pagination mb-0';
  for (let i = 1; i <= total; i++) {
    const li = document.createElement('li');
    li.className = 'page-item' + (i === current ? ' active' : '');
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = i;
    a.onclick = (e) => {
      e.preventDefault();
      showApp(i, pageSize);
    };
    li.appendChild(a);
    ul.appendChild(li);
  }
  nav.appendChild(ul);
  pagination.appendChild(nav);
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
    let username = sideUserUsername.value.trim().toLowerCase();
    let password = sideUserPassword.value.trim();
    let role = sideUserRole.value.trim().toLowerCase();
    const errors = validateUser({ username, password, role });
    if (Object.keys(errors).length > 0) {
      sideFormError.textContent = Object.values(errors).join(' ');
      return;
    }
    try {
      // Hash password before saving
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      if (index === '') {
        await appendUser({ username, password: hashedPassword, role });
        showToast('User added successfully!', 'success');
      } else {
        const users = await fetchUsers();
        const created_at = users[parseInt(index, 10)]?.[3] || new Date().toISOString();
        await updateUser(index, { username, password: hashedPassword, role, created_at });
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
  setupNavigation();
  initAuth(async () => {
    const savedToken = getSavedToken();
    const savedUser = sessionStorage.getItem('username');
    if (savedToken && savedUser) {
      gapi.client.setToken({ access_token: savedToken });
      isAuthorized = true;
      // Fetch user role from users/admins sheet
      let role = null;
      try {
        // Try users sheet first
        const usersRes = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: CONFIG.USERS_SHEET_ID,
          range: CONFIG.USERS_RANGE,
        });
        const users = usersRes.result.values || [];
        const userRow = users.find(row => row[0] && row[0].toLowerCase() === savedUser.toLowerCase());
        if (userRow) role = userRow[2];
        // If not found, try admins sheet
        if (!role) {
          const adminsRes = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.ADMINS_SHEET_ID,
            range: CONFIG.ADMINS_RANGE,
          });
          const admins = adminsRes.result.values || [];
          const adminRow = admins.find(row => row[1] && row[1].toLowerCase() === savedUser.toLowerCase());
          if (adminRow) role = adminRow[3];
        }
      } catch (e) {
        console.error('Error fetching user role:', e);
      }
      currentUserRole = (role || '').toLowerCase();
      document.getElementById('authorize-btn').style.display = 'none';
      // SPA: render page from hash or dashboard
      const page = window.location.hash.replace(/^#/, '') || 'dashboard';
      renderPage(page);
    } else {
      document.getElementById('authorize-btn').style.display = 'inline-block';
      document.getElementById('authorize-btn').disabled = false;
      document.getElementById('login-box').style.display = 'block';
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('deauthorize-btn').style.display = 'none';
    }
  });
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