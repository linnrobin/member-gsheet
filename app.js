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
export const APP_VERSION = '1.0.35';
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
  // Authorize button will be set up in initAuth callback to avoid timing issues

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

  // Removed duplicate openSidePanel and closeSidePanel functions - using imports from user.js
  
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
  openChangePasswordModal,
  openSidePanel,
  closeSidePanel,
  setUserHelpers
} from './user.js?v=5';

import { validateUser } from './validation.js';

let isAuthorized = false; // Tracks authorization state
let currentUserRole = null; // Tracks current user's role

// Global functions for onclick handlers in dynamically generated HTML
window.showChangePasswordModal = function(username) {
  const users = window.allUsers || [];
  const userIndex = users.findIndex(user => user[0] === username);
  if (userIndex !== -1) {
    openChangePasswordModal(userIndex, users[userIndex]);
  }
};

window.deleteUser = async function(username) {
  const users = window.allUsers || [];
  const userIndex = users.findIndex(user => user[0] === username);
  if (userIndex !== -1) {
    const result = confirm(`Are you sure you want to delete user "${username}"?`);
    if (result) {
      try {
        await deleteUserAt(userIndex);
        showToast('User deleted successfully', 'success');
        const currentPage = new URLSearchParams(window.location.hash.substring(1)).get('page') || 'users';
        renderPage(currentPage);
      } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user', 'danger');
      }
    }
  }
};

window.openChangePasswordModalFromDetail = function(userIndex, username) {
  const users = window.allUsers || [];
  if (users[userIndex]) {
    openChangePasswordModal(userIndex, users[userIndex]);
  }
};

window.openSidePanelFromDetail = function(userIndex) {
  const users = window.allUsers || [];
  if (users[userIndex]) {
    openSidePanel('edit', users[userIndex], userIndex);
  }
};

window.deleteUserFromDetail = async function(userIndex, username, role) {
  const result = confirm(`Are you sure you want to delete user "${username}" with role "${role}"?`);
  if (result) {
    try {
      await deleteUserAt(userIndex);
      showToast('User deleted successfully', 'success');
      const currentPage = new URLSearchParams(window.location.hash.substring(1)).get('page') || 'users';
      renderPage(currentPage);
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error deleting user', 'danger');
    }
  }
};

// Make functions available globally
window.openSidePanel = openSidePanel;

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
  if (!main) {
    console.error('[renderPage] main-content element not found!');
    return;
  }

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
      setActiveNav('nav-dashboard');
      renderDashboard();
      break;
    case 'users':
      main.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h4 mb-0">Users</h2>
          <button id="add-user-btn" class="btn btn-success" title="Add New User">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-plus-fill me-1" viewBox="0 0 16 16">
              <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              <path fill-rule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5z"/>
            </svg>
            Add User
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-striped table-hover table-bordered">
            <thead class="table-dark">
              <tr>
                <th>No.</th>
                <th>Username</th>
                <th>Password</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="user-body">
              <tr><td colspan="7" class="text-center">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      `;
      setActiveNav('nav-users');
      renderUsersTable();
      // Setup Add User button after rendering
      const addUserBtn = document.getElementById('add-user-btn');
      if (addUserBtn) {
        addUserBtn.onclick = (e) => {
          e.preventDefault();
          openSidePanel('add');
        };
      }
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
      setActiveNav('nav-dashboard');
      renderDashboard();
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

async function showApp() {
  // Ensure we have a valid token before proceeding
  const token = gapi.client.getToken()?.access_token;
  if (!token) {
    console.error('[showApp] No valid access token available');
    showToast('Authentication required. Please authorize first.', 'danger');
    isAuthorized = false;
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    document.getElementById('authorize-btn').style.display = 'inline-block';
    return;
  }

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

  // Navigate to the dashboard instead of directly trying to fetch users
  renderPage('dashboard');
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${pad(d.getFullYear())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderPagination(current, total, pageSize) {
  // Remove existing pagination first
  const existingPagination = document.getElementById('pagination-controls');
  if (existingPagination) {
    existingPagination.remove();
  }

  let pagination = document.createElement('div');
  pagination.id = 'pagination-controls';
  pagination.className = 'd-flex justify-content-between align-items-center my-2';
  
  const mainContent = document.getElementById('main-content');
  if (!mainContent) {
    console.error('[renderPagination] main-content element not found');
    return;
  }
  
  mainContent.appendChild(pagination);

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
      renderUsersTable(); // Re-render users table instead of showApp with pagination
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

// Removed duplicate openSidePanel and closeSidePanel functions - using imports from user.js

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
  
  // Inject helpers into user.js to avoid circular imports
  setUserHelpers({ showToast, showAlert });
  
  // Initialize auth first, then set up event handlers
  initAuth(async () => {
    console.log('[app.js] Auth initialized. Setting up event handlers...');
    
    // Setup Add User button to use side panel
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
      addUserBtn.onclick = (e) => {
        e.preventDefault();
        openSidePanel('add');
      };
    }
    
    // Setup authorize button AFTER initAuth completes
    const authorizeBtn = document.getElementById('authorize-btn');
    if (authorizeBtn) {
      // Enable the button now that auth is initialized
      authorizeBtn.disabled = false;
      authorizeBtn.onclick = () => {
        authorize((tokenResponse) => {
          if (!tokenResponse.error) {
            isAuthorized = true;
            authorizeBtn.style.display = 'none';
            document.getElementById('login-box').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('deauthorize-btn').style.display = 'none';
          } else {
            console.error("[app.js] Authorization error:", tokenResponse.error);
            showAlert("Authorization failed: " + (tokenResponse.error.description || tokenResponse.error));
          }
        });
      };
    }

    const savedToken = getSavedToken();
    const savedUser = sessionStorage.getItem('username');
    if (savedToken && savedUser) {
      try {
        gapi.client.setToken({ access_token: savedToken });
        
        // Test token validity with a simple API call
        await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: CONFIG.USERS_SHEET_ID,
          range: 'A1:A1', // Just get first cell to test
        });
        
        // Token is valid, fetch user role from users/admins sheet
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
        
        isAuthorized = true;
        currentUserRole = (role || '').toLowerCase();
        updateNavVisibility(currentUserRole, true);
        document.getElementById('authorize-btn').style.display = 'none';
        
        // SPA: render page from hash or dashboard
        const page = window.location.hash.replace(/^#/, '') || 'dashboard';
        renderPage(page);
      } catch (error) {
        console.error('[app.js] Token validation failed:', error);
        // Token is invalid or expired, clear it and show authorization
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('username');
        gapi.client.setToken(null);
        isAuthorized = false;
        updateNavVisibility(null, false);
        document.getElementById('authorize-btn').style.display = 'inline-block';
        document.getElementById('authorize-btn').disabled = false;
        document.getElementById('login-box').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('deauthorize-btn').style.display = 'none';
      }
    } else {
      updateNavVisibility(null, false);
      document.getElementById('authorize-btn').style.display = 'inline-block';
      document.getElementById('authorize-btn').disabled = false;
      document.getElementById('login-box').style.display = 'block';
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('deauthorize-btn').style.display = 'none';
    }
  });
  
  // Setup login button after auth is initialized
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.onclick = async () => {
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

// --- Dashboard Rendering ---
async function renderDashboard() {
  const main = document.getElementById('main-content');
  if (!main) {
    console.error('[renderDashboard] main-content element not found!');
    return;
  }

  // Show loading state
  main.innerHTML = `
    <h2 class="h4 mb-3">Dashboard</h2>
    <div class="row">
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card">
          <div class="card-body text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <h5 class="card-title mt-2">Loading Stats...</h5>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    // Fetch user data
    const users = await fetchUsers();
    const totalUsers = users ? users.length : 0;
    
    // Count users by role
    let adminCount = 0;
    let userCount = 0;
    let otherCount = 0;
    
    if (users) {
      users.forEach(user => {
        const role = (user[2] || '').toLowerCase();
        if (role === 'admin') {
          adminCount++;
        } else if (role === 'user') {
          userCount++;
        } else {
          otherCount++;
        }
      });
    }

    // Render dashboard with statistics
    main.innerHTML = `
      <h2 class="h4 mb-3">Dashboard</h2>
      <div class="row">
        <!-- Total Users Card -->
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card bg-primary text-white">
            <div class="card-body text-center">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="card-title">Total Users</h5>
                  <h2 class="mb-0">${totalUsers}</h2>
                </div>
                <div class="fs-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-people" viewBox="0 0 16 16">
                    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002A.274.274 0 0 1 15 13H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Users Card -->
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card bg-danger text-white">
            <div class="card-body text-center">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="card-title">Administrators</h5>
                  <h2 class="mb-0">${adminCount}</h2>
                </div>
                <div class="fs-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-shield-check" viewBox="0 0 16 16">
                    <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
                    <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Regular Users Card -->
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card bg-success text-white">
            <div class="card-body text-center">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="card-title">Regular Users</h5>
                  <h2 class="mb-0">${userCount}</h2>
                </div>
                <div class="fs-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Welcome Section -->
      <div class="row mt-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">Welcome to the Admin Panel</h5>
            </div>
            <div class="card-body">
              <p class="card-text">
                Welcome back, <strong>${sessionStorage.getItem('username') || 'Admin'}</strong>! 
                You are logged in as <span class="badge ${currentUserRole === 'admin' ? 'bg-danger' : 'bg-primary'}">${currentUserRole || 'user'}</span>.
              </p>
              <p class="card-text">
                Use the navigation menu to manage users, view activity logs, and configure settings.
                ${currentUserRole === 'admin' ? 'As an administrator, you have full access to all features.' : 'You have standard user access.'}
              </p>
              <div class="d-flex gap-2">
                <a href="#users" class="btn btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-people me-1" viewBox="0 0 16 16">
                    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002A.274.274 0 0 1 15 13H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
                  </svg>
                  Manage Users
                </a>
                ${currentUserRole === 'admin' ? `
                <a href="#admins" class="btn btn-outline-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shield-check me-1" viewBox="0 0 16 16">
                    <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
                    <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                  Admin Panel
                </a>
                ` : ''}
                <a href="#settings" class="btn btn-outline-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear me-1" viewBox="0 0 16 16">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
                  </svg>
                  Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('[renderDashboard] Error fetching dashboard data:', error);
    main.innerHTML = `
      <h2 class="h4 mb-3">Dashboard</h2>
      <div class="alert alert-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle me-2" viewBox="0 0 16 16">
          <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
          <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
        </svg>
        Error loading dashboard data. Please try refreshing the page.
      </div>
      <div class="card">
        <div class="card-body text-center">
          <h5 class="card-title">Welcome to the Admin Panel</h5>
          <p class="card-text">Use the navigation menu to access different sections.</p>
          <a href="#users" class="btn btn-primary">Go to Users</a>
        </div>
      </div>
    `;
  }
}

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
  if ( user) {
    openChangePasswordModal(userIndex, user);
  }
}

// Removed duplicate functions - using global versions instead

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

// Debug function to check side panel elements
function debugSidePanelElements() {
  const elements = {
    'side-panel': document.getElementById('side-panel'),
    'side-panel-backdrop': document.getElementById('side-panel-backdrop'),
    'side-panel-title': document.getElementById('side-panel-title'),
    'side-user-index': document.getElementById('side-user-index'),
    'side-user-username': document.getElementById('side-user-username'),
    'side-user-password': document.getElementById('side-user-password'),
    'side-user-role': document.getElementById('side-user-role'),
    'side-form-error': document.getElementById('side-form-error'),
    'side-user-form': document.getElementById('side-user-form')
  };
  
  console.log('[debugSidePanelElements] Element status:');
  Object.entries(elements).forEach(([id, element]) => {
    if (element) {
      console.log(`✓ ${id}: found (display: ${getComputedStyle(element).display}, visibility: ${getComputedStyle(element).visibility})`);
    } else {
      console.log(`✗ ${id}: NOT FOUND`);
    }
  });
  
  return elements;
}

// Make debug function available globally for testing
window.debugSidePanelElements = debugSidePanelElements;

async function renderUsersTable() {
  // Ensure we have a valid token before making API calls
  const token = gapi.client.getToken()?.access_token;
  if (!token) {
    console.error('[renderUsersTable] No valid access token available');
    const tbody = document.getElementById('user-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Authentication required. Please re-authorize.</td></tr>';
    }
    return;
  }

  try {
    const users = await fetchUsers();
    const tbody = document.getElementById('user-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users found.</td></tr>';
      return;
    }

    users.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row[0] || ''}</td>
        <td>${'*'.repeat((row[1] || '').length)}</td>
        <td><span class="badge bg-secondary">${row[2] || ''}</span></td>
        <td>${formatDate(row[3] || '')}</td>
        <td>${formatDate(row[4] || '')}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-warning me-1" onclick="showChangePasswordModal('${row[0]}')" title="Change Password">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key" viewBox="0 0 16 16">
              <path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5z"/>
              <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-info me-1" onclick="openSidePanel('edit', ${JSON.stringify(row).replace(/"/g, '&quot;')}, ${index})" title="Edit User">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .708 0l1 1zm-1.75 2.456-1-1L4 11.146V12h.854l8.898-8.898z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-secondary me-1" onclick="alert('Detail view - Coming soon!')" title="View Details">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
              <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
              <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${row[0]}')" title="Delete User">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
              <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.962 3.5H15.5a.5.5 0 0 0 0-1h-1.004a.58.58 0 0 0-.01 0H11Zm1.538 1-.853 10.66a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.538 3.5h8.924Zm-7.538 1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5Zm2 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5Zm2 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5Z"/>
            </svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('[renderUsersTable] Error fetching users:', error);
    const tbody = document.getElementById('user-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading users. Please try again.</td></tr>';
    }
    
    // If it's an auth error, show appropriate message
    if (error.status === 401) {
      showToast('Authentication expired. Please re-authorize.', 'danger');
      // Clear invalid token and show auth button
      sessionStorage.removeItem('access_token');
      gapi.client.setToken(null);
      isAuthorized = false;
      document.getElementById('authorize-btn').style.display = 'inline-block';
    } else {
      showToast('Error loading users: ' + (error.message || 'Unknown error'), 'danger');
    }
  }
}