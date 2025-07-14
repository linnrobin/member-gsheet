// --- Settings Page Logic ---
function renderSettingsPage() {
  const form = document.getElementById('change-password-form');
  const errorBox = document.getElementById('settings-form-error');
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    errorBox.textContent = '';
    const currentPwd = document.getElementById('current-password').value.trim();
    const newPwd = document.getElementById('new-password').value.trim();
    if (!currentPwd || !newPwd) {
      errorBox.textContent = 'Please fill in both fields.';
      return;
    }
    if (newPwd.length < 6) {
      errorBox.textContent = 'New password must be at least 6 characters.';
      return;
    }
    // You can add logic here to verify current password and update it in your backend
    // For now, just show a success toast
    showToast('Password change feature coming soon!', 'primary');
    form.reset();
  };
}
//app.js
// Versioning
export const APP_VERSION = '1.0.3';
import { renderAdminsPage, showAdmins } from './admin.js';

// Ensure all DOM event assignments happen after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // --- All DOM event assignments below ---
  if (document.getElementById('logout-btn')) {
    document.getElementById('logout-btn').onclick = () => {
      logoutUser();
      isAuthorized = false;
      const appDiv = document.getElementById('app');
      if (appDiv) appDiv.style.display = 'none';
      const loginBox = document.getElementById('login-box');
      if (loginBox) loginBox.style.display = 'block';
      const authBtn = document.getElementById('authorize-btn');
      if (authBtn) authBtn.style.display = 'inline-block';
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) logoutBtn.style.display = 'none';
      const deauthBtn = document.getElementById('deauthorize-btn');
      if (deauthBtn) deauthBtn.style.display = 'none';
      clearForm();
    };
  }
  if (document.getElementById('deauthorize-btn')) {
    document.getElementById('deauthorize-btn').onclick = async () => {
      const confirmed = await showConfirm('Are you sure you want to deauthorize this app from your Google account? You will need to re-authorize next time.');
      if (confirmed) {
        deauthorizeGoogle();
        isAuthorized = false;
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.style.display = 'none';
        const loginBox = document.getElementById('login-box');
        if (loginBox) loginBox.style.display = 'block';
        const authBtn = document.getElementById('authorize-btn');
        if (authBtn) authBtn.style.display = 'inline-block';
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        const deauthBtn = document.getElementById('deauthorize-btn');
        if (deauthBtn) deauthBtn.style.display = 'none';
        clearForm();
      }
    };
  }
  if (document.getElementById('login-button')) {
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
  }
  if (document.getElementById('authorize-btn')) {
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
  }

  // Hamburger menu toggle for mobile
  const hamburger = document.getElementById('hamburger-btn');
  const sidePanel = document.getElementById('main-nav');
  const sidePanelBackdrop = document.querySelector('.side-panel-backdrop') || (() => {
    // Create if not present
    const el = document.createElement('div');
    el.className = 'side-panel-backdrop';
    document.body.appendChild(el);
    return el;
  })();

  function openSidePanel() {
    sidePanel.classList.add('open');
    sidePanelBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSidePanel() {
    sidePanel.classList.remove('open');
    sidePanelBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (hamburger) {
    hamburger.addEventListener('click', openSidePanel);
  }
  if (sidePanelBackdrop) {
    sidePanelBackdrop.addEventListener('click', closeSidePanel);
  }
  // Close nav on nav-link click (mobile only)
  document.querySelectorAll('#main-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidePanel();
    });
  });
  // Hide nav by default on mobile
  if (window.innerWidth <= 768) {
    sidePanel.classList.remove('open');
    sidePanelBackdrop.classList.remove('open');
  }
  // Responsive: close nav if resizing to mobile
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      sidePanel.classList.remove('open');
      sidePanelBackdrop.classList.remove('open');
    } else {
      sidePanel.classList.add('open');
      sidePanelBackdrop.classList.remove('open');
    }
  });
});
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
  deleteUserAt,
  updateNavVisibility,
  openChangePasswordModal
} from './user.js?v=2';

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
  // Update nav visibility on every page render
  updateNavVisibility(currentUserRole, isAuthorized);
  const main = document.getElementById('main-content');
  if (!main) return;

  // Guard: Only allow access if authorized and logged in
  const username = sessionStorage.getItem('username');
  if (!isAuthorized || !username) {
    updateNavVisibility(currentUserRole, false);
    const appEl = document.getElementById('app');
    if (appEl) appEl.style.display = 'none';
    // Do NOT hide the navbar, keep it visible for all states
    const loginBox = document.getElementById('login-box');
    if (loginBox) loginBox.style.display = 'block';
    const authBtn = document.getElementById('authorize-btn');
    if (authBtn) authBtn.style.display = 'inline-block';
    main.innerHTML = '';
    window.location.hash = '';
    return;
  } else {
    updateNavVisibility(currentUserRole, true);
    const appEl = document.getElementById('app');
    if (appEl) appEl.style.display = 'block';
    const navEl = document.getElementById('main-nav');
    if (navEl) navEl.style.display = '';
    const loginBox = document.getElementById('login-box');
    if (loginBox) loginBox.style.display = 'none';
    const authBtn = document.getElementById('authorize-btn');
    if (authBtn) authBtn.style.display = 'none';
  }

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
      main.innerHTML = '';
      setActiveNav('nav-users');
      showApp();
      break;
    case 'admins':
      setActiveNav('nav-admins');
      renderAdminsPage();
      break;
    case 'roles':
      main.innerHTML = `<h2 class="h4 mb-3">User Levels</h2><div class="card p-4"><form id="role-form" class="mb-3"><div class="input-group"><input type="text" id="new-role" class="form-control" placeholder="Add new role" /><button class="btn btn-primary" type="submit"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/></svg> Add</button></div></form><ul id="role-list" class="list-group"></ul></div>`;
      setActiveNav('nav-roles');
      renderRolesPage();
      break;
    case 'rbac':
      main.innerHTML = `<h2 class="h4 mb-3">Admin Role Permission</h2><div class="card p-4"><div id="rbac-content">(Coming soon) Configure role-based access control.</div></div>`;
      setActiveNav('nav-admin-roles');
      renderRBACPage();
      break;
    case 'activity-admin':
      main.innerHTML = `<h2 class="h4 mb-3">Admin Activity Log</h2><div class="card p-4"><ul id="activity-log-list-admin" class="list-group"></ul></div>`;
      setActiveNav('nav-activity-admin-log');
      renderActivityLogPage('admin');
      break;
    case 'activity-user':
      main.innerHTML = `<h2 class="h4 mb-3">User Activity Log</h2><div class="card p-4"><ul id="activity-log-list-user" class="list-group"></ul></div>`;
      setActiveNav('nav-activity-user-log');
      renderActivityLogPage('user');
      break;
    case 'settings':
      main.innerHTML = `<h2 class="h4 mb-3">Settings</h2><div class="card p-4"><form id="change-password-form"><div class="mb-3"><label for="current-password" class="form-label">Current Password</label><input type="password" id="current-password" class="form-control" required></div><div class="mb-3"><label for="new-password" class="form-label">New Password</label><input type="password" id="new-password" class="form-control" required></div><button type="submit" class="btn btn-primary"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key" viewBox="0 0 16 16"><path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5z"/><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg> <span class="visually-hidden">Change Password</span></button><div id="settings-form-error" class="text-danger mt-2"></div></form></div>`;
      setActiveNav('nav-settings');
      renderSettingsPage();
      break;
    default:
      // Check if it's a user detail page (user-detail-{index})
      if (page.startsWith('user-detail-')) {
        const userIndex = page.replace('user-detail-', '');
        renderUserDetailPage(userIndex);
        setActiveNav('nav-users');
        break;
      }
      main.innerHTML = `<h2 class="h4 mb-3">Dashboard</h2><div class="card p-4">Welcome to the admin dashboard.</div>`;
      setActiveNav('nav-dashboard');
  }
}

function setupNavigation() {
  // SPA-style navigation: update hash and listen for hashchange
  const navMap = {
    'nav-dashboard': 'dashboard',
    'nav-users': 'users',
    'nav-roles': 'roles',
    'nav-admins': 'admins',
    'nav-admin-roles': 'rbac',
    'nav-activity-admin-log': 'activity-admin',
    'nav-activity-user-log': 'activity-user',
    'nav-settings': 'settings',
  };
  // All nav links (accordion or not)
  [
    'nav-dashboard',
    'nav-users',
    'nav-roles',
    'nav-admins',
    'nav-admin-roles',
    'nav-activity-admin-log',
    'nav-activity-user-log',
    'nav-settings',
  ].forEach(id => {
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
  const loginBox = document.getElementById('login-box');
  if (loginBox) loginBox.style.display = 'none';
  const appDiv = document.getElementById('app');
  if (appDiv) appDiv.style.display = 'block';
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.style.display = 'inline-block';
  const deauthBtn = document.getElementById('deauthorize-btn');
  if (deauthBtn) deauthBtn.style.display = 'inline-block';
  const authBtn = document.getElementById('authorize-btn');
  if (authBtn) authBtn.style.display = 'none';

  try {
    const users = await fetchUsers();
    const userBody = document.querySelector('#user-body');
    const thead = userBody && userBody.parentElement ? userBody.parentElement.querySelector('thead') : null;
    const tbody = userBody;
    if (!tbody) return; // Defensive: don't proceed if tbody is missing
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
      // Change Password button (key icon, accessible label)
      const changePwdBtn = document.createElement('button');
      changePwdBtn.className = 'btn btn-sm btn-warning me-2';
      changePwdBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key" viewBox="0 0 16 16"><path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5z"/><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg> <span class='visually-hidden'>Change Password</span>`;
      changePwdBtn.title = 'Change Password';
      changePwdBtn.setAttribute('aria-label', 'Change Password');
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
    // Pagination controls
    renderPagination(page, totalPages, pageSize);

    // (Add User button is now above the table in index.html)
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
  if (isNaN(d.getTime())) return '';
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${pad(d.getFullYear())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      const salt = window.bcrypt.genSaltSync(10);
      const hashedPassword = window.bcrypt.hashSync(password, salt);
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
  const userIndex = document.getElementById('user-index');
  const userUsername = document.getElementById('user-username');
  const userPassword = document.getElementById('user-password');
  const userRole = document.getElementById('user-role');
  
  if (userIndex) userIndex.value = index;
  if (userUsername) userUsername.value = row[0] || '';
  if (userPassword) userPassword.value = row[1] || '';
  if (userRole) userRole.value = row[2] || '';
}

function clearForm() {
  const userIndex = document.getElementById('user-index');
  const userUsername = document.getElementById('user-username');
  const userPassword = document.getElementById('user-password');
  const userRole = document.getElementById('user-role');
  
  if (userIndex) userIndex.value = '';
  if (userUsername) userUsername.value = '';
  if (userPassword) userPassword.value = '';
  if (userRole) userRole.value = '';
}


window.onload = () => {
  console.log('[app.js] Window loaded. Initializing auth...');
  setupNavigation();
  // Initialize navigation visibility for non-logged-in state
  updateNavVisibility(null, false);
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
      updateNavVisibility(currentUserRole, true);
      document.getElementById('authorize-btn').style.display = 'none';
      // SPA: render page from hash or dashboard
      const page = window.location.hash.replace(/^#/, '') || 'dashboard';
      renderPage(page);
    } else {
      updateNavVisibility(null, false);
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
      updateNavVisibility(currentUserRole, true);
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
      // Fetch user role after login
      let role = null;
      try {
        // Try users sheet first
        const usersRes = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: CONFIG.USERS_SHEET_ID,
          range: CONFIG.USERS_RANGE,
        });
        const users = usersRes.result.values || [];
        const userRow = users.find(row => row[0] && row[0].toLowerCase() === username.toLowerCase());
        if (userRow) role = userRow[2];
        // If not found, try admins sheet
        if (!role) {
          const adminsRes = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.ADMINS_SHEET_ID,
            range: CONFIG.ADMINS_RANGE,
          });
          const admins = adminsRes.result.values || [];
          const adminRow = admins.find(row => row[1] && row[1].toLowerCase() === username.toLowerCase());
          if (adminRow) role = adminRow[3];
        }
      } catch (e) {
        console.error('Error fetching user role after login:', e);
      }
      currentUserRole = (role || '').toLowerCase();
      updateNavVisibility(currentUserRole, true);
      showApp();
    } else {
      errorBox.textContent = 'Invalid username or password.';
      updateNavVisibility(null, false);
    }
  } catch (err) {
    console.error("[app.js] Login error:", err);
    errorBox.textContent = 'Login error: ' + (err.result?.error?.message || err.message || JSON.stringify(err));
    await showAlert('Login failed: ' + (err.result?.error?.message || err.message || "An unknown error occurred."));
    updateNavVisibility(null, false);
  }
};

document.getElementById('logout-btn').onclick = () => {
  logoutUser();
  isAuthorized = false;
  currentUserRole = null;
  updateNavVisibility(null, false);
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
    currentUserRole = null;
    updateNavVisibility(null, false);
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('authorize-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('deauthorize-btn').style.display = 'none';
    clearForm();
  }
};

// --- Roles Page Logic (in-memory for demo) ---
function renderRolesPage() {
  // Placeholder: You can implement your roles UI logic here
  // For now, just show a message
  const roleList = document.getElementById('role-list');
  if (roleList) {
    roleList.innerHTML = '<li class="list-group-item">admin</li><li class="list-group-item">user</li>';
  }
}

function renderRBACPage() {
  // Placeholder: You can implement your RBAC UI logic here
  // For now, just show a message
  const rbacContent = document.getElementById('rbac-content');
  if (rbacContent) {
    rbacContent.textContent = '(Coming soon) Configure role-based access control.';
  }
}

function renderActivityLogPage(type = 'user') {
  // Fetch and render the correct log type
  if (type === 'admin') {
    import('./api/activityLogApi.js').then(({ fetchAdminActivityLogs }) => {
      fetchAdminActivityLogs().then(logs => {
        const list = document.getElementById('activity-log-list-admin');
        if (!list) return;
        list.innerHTML = '';
        (logs || []).forEach(row => {
          const [user, action, details, date] = row;
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.textContent = `${date || ''}: ${user || ''} - ${action || ''} - ${details || ''}`;
          list.appendChild(li);
        });
      });
    });
  } else {
    import('./api/activityLogApi.js').then(({ fetchUserActivityLogs }) => {
      fetchUserActivityLogs().then(logs => {
        const list = document.getElementById('activity-log-list-user');
        if (!list) return;
        list.innerHTML = '';
        (logs || []).forEach(row => {
          const [user, action, details, date] = row;
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.textContent = `${date || ''}: ${user || ''} - ${action || ''} - ${details || ''}`;
          list.appendChild(li);
        });
      });
    });
  }
}

// --- User Detail Page Logic ---
async function renderUserDetailPage(userIndex) {
  const main = document.getElementById('main-content');
  if (!main) return;

  try {
    const users = await fetchUsers();
    const user = users[parseInt(userIndex, 10)];
    
    if (!user) {
      main.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h4 mb-0">User Not Found</h2>
          <a href="#users" class="btn btn-secondary">← Back to Users</a>
        </div>
        <div class="alert alert-warning">The requested user could not be found.</div>
      `;
      return;
    }

    const username = user[0] || 'N/A';
    const role = user[2] || 'N/A';
    const createdAt = user[3] ? formatDate(user[3]) : 'N/A';
    const updatedAt = user[4] ? formatDate(user[4]) : 'N/A';

    main.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h4 mb-0">User Details: ${username}</h2>
        <a href="#users" class="btn btn-secondary">← Back to Users</a>
      </div>
      
      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">User Information</h5>
            </div>
            <div class="card-body">
              <table class="table table-borderless">
                <tr>
                  <th width="150">Username:</th>
                  <td>${username}</td>
                </tr>
                <tr>
                  <th>Role:</th>
                  <td>
                    <span class="badge ${role === 'admin' ? 'bg-danger' : 'bg-primary'}">${role}</span>
                  </td>
                </tr>
                <tr>
                  <th>Privileges:</th>
                  <td>${role === 'admin' ? 'Administrative access' : 'Standard user access'}</td>
                </tr>
                <tr>
                  <th>Created:</th>
                  <td>${createdAt}</td>
                </tr>
                <tr>
                  <th>Last Updated:</th>
                  <td>${updatedAt}</td>
                </tr>
                <tr>
                  <th>User Index:</th>
                  <td>${userIndex}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">Actions</h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <button class="btn btn-warning" onclick="openChangePasswordModalFromDetail(${userIndex}, '${username}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key" viewBox="0 0 16 16"><path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5z"/><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
                  Change Password
                </button>
                <button class="btn btn-info" onclick="openSidePanelFromDetail(${userIndex})">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .708 0l1 1zm-1.75 2.456-1-1L4 11.146V12h.854l8.898-8.898z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                  Edit User
                </button>
                <button class="btn btn-danger" onclick="deleteUserFromDetail(${userIndex}, '${username}', '${role}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16"><path d="M6.5 1.5v-1h3v1H14a.5.5 0 0 1 0 1h-1v11A2.5 2.5 0 0 1 10.5 16h-5A2.5 2.5 0 0 1 3 13.5v-11H2a.5.5 0 0 1 0-1h3.5zm-3 2v10A1.5 1.5 0 0 0 5.5 15h5A1.5 1.5 0 0 0 12 13.5v-10h-8z"/><path d="M8 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm-2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5z"/></svg>
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Log the detail view action
    if (role === 'admin') {
      logAdminAction(
        `viewed admin details`,
        `viewed details page for admin '${username}' at ${getLogTime()}`
      );
    } else {
      logUserAction(
        `viewed user details`,
        `viewed details page for user '${username}' at ${getLogTime()}`
      );
    }

  } catch (error) {
    console.error('[renderUserDetailPage] Error:', error);
    main.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h4 mb-0">Error</h2>
        <a href="#users" class="btn btn-secondary">← Back to Users</a>
      </div>
      <div class="alert alert-danger">Failed to load user details. Please try again.</div>
    `;
  }
}

// Helper functions for user detail page actions
async function openChangePasswordModalFromDetail(userIndex, username) {
  const users = await fetchUsers();
  const user = users[parseInt(userIndex, 10)];
  if (user) {
    openChangePasswordModal(userIndex, user);
  }
}

async function openSidePanelFromDetail(userIndex) {
  const users = await fetchUsers();
  const user = users[parseInt(userIndex, 10)];
  if (user) {
    openSidePanel('edit', user, userIndex);
  }
}

async function deleteUserFromDetail(userIndex, username, role) {
  const confirmed = await showConfirm(`Delete user "${username}"?`);
  if (confirmed) {
    try {
      await deleteUserAt(userIndex);
      showToast('User deleted successfully!', 'success');
      if (role === 'admin') {
        logAdminAction(
          `deleted admin`,
          `deleted admin '${username}' from detail page at ${getLogTime()}`
        );
      } else {
        logUserAction(
          `deleted user`,
          `deleted user '${username}' from detail page at ${getLogTime()}`
        );
      }
      // Redirect back to users list
      window.location.hash = 'users';
    } catch (err) {
      showToast('Error deleting user.', 'danger');
      console.error(err);
    }
  }
}

function getLogTime() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

function logAdminAction(action, details = '') {
  import('./api/activityLogApi.js').then(({ appendAdminActivityLog }) => {
    appendAdminActivityLog({
      user: sessionStorage.getItem('username') || 'unknown',
      action,
      details,
    });
  });
}

function logUserAction(action, details = '') {
  import('./api/activityLogApi.js').then(({ appendUserActivityLog }) => {
    appendUserActivityLog({
      user: sessionStorage.getItem('username') || 'unknown',
      action,
      details,
    });
  });
}