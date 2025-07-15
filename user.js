import { validateUser } from './validation.js';
import { appendAdminActivityLog, appendUserActivityLog } from './api/activityLogApi.js';
// Toast and alert helpers will be imported from app.js for now
let showToast, showAlert;

// Helper to get current user (assumes global currentUser or similar)
function getCurrentUser() {
  // Defensive: always return a string, never undefined/null
  if (window.currentUser && typeof window.currentUser.username === 'string' && window.currentUser.username.trim() !== '') {
    return window.currentUser.username;
  }
  // Try sessionStorage fallback
  const sessionUser = sessionStorage.getItem('username');
  if (sessionUser && sessionUser.trim() !== '') {
    return sessionUser;
  }
  return 'unknown';
}

// Helper to get current time in readable format
function getLogTime() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

// Helper to log admin activity
function logAdminAction(action, details = '') {
  appendAdminActivityLog({
    user: getCurrentUser(),
    action,
    details,
  });
}

// Helper to log user activity
function logUserAction(action, details = '') {
  appendUserActivityLog({
    user: getCurrentUser(),
    action,
    details,
  });
}

// Allow app.js to inject helpers (to avoid circular imports)
export function setUserHelpers({ showToast: st, showAlert: sa }) {
  showToast = st;
  showAlert = sa;
}

// --- Navbar Role/Visibility Logic ---
export function updateNavVisibility(currentUserRole, isAuthorized) {
  // Hide admin links if not admin or not authorized
  const adminLinks = [
    document.getElementById('nav-admins'),
    document.getElementById('nav-admin-roles'),
    document.getElementById('nav-activity-admin-log')
  ];
  const shouldShowAdmin = (isAuthorized && currentUserRole === 'admin');
  
  // Hide/show individual admin links
  adminLinks.forEach(link => {
    if (link) link.style.display = shouldShowAdmin ? '' : 'none';
  });
  
  // Hide/show the entire admin accordion if no admin links are visible
  const adminAccordion = document.querySelector('#nav-accordion-admins').closest('li.nav-item');
  if (adminAccordion) {
    adminAccordion.style.display = shouldShowAdmin ? '' : 'none';
  }
}

// --- User Table Rendering & UI Logic ---
export async function showApp(page = 1, pageSize = 10) {
  // Prevent rendering if not authorized or not logged in
  if (!window.isAuthorized || !sessionStorage.getItem('username')) {
    console.log('[showApp] Not authorized or not logged in - showing login form');
    const appDiv = document.getElementById('app');
    if (appDiv) appDiv.style.display = 'none';
    const loginBox = document.getElementById('login-box');
    if (loginBox) loginBox.style.display = 'block';
    const authBtn = document.getElementById('authorize-btn');
    if (authBtn) authBtn.style.display = 'inline-block';
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

  const mainContent = document.getElementById('main-content');
  if (!mainContent) {
    console.error('[showApp] main-content element not found in DOM!');
    return;
  }

  try {
    const users = await fetchUsers();
    const userBody = document.querySelector('#user-body');
    const thead = userBody && userBody.parentElement ? userBody.parentElement.querySelector('thead') : null;
    const tbody = userBody;
    if (!tbody) {
      console.error('[showApp] tbody (#user-body) not found in DOM. Main content HTML:', mainContent.innerHTML);
      return; // Defensive: don't proceed if tbody is missing
    }
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
      // Detail button
      const detailBtn = document.createElement('button');
      detailBtn.className = 'btn btn-sm btn-secondary me-2';
      detailBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>';
      detailBtn.title = 'View Details';
      detailBtn.setAttribute('aria-label', 'View Details');
      detailBtn.onclick = () => {
        window.location.hash = `user-detail-${startIdx + idx}`;
      };
      // Change Password button
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
            const username = row[0] || '';
            const role = row[2] || '';
            await deleteUserAt(startIdx + idx);
            showToast('User deleted successfully!', 'success');
            if (role === 'admin') {
              logAdminAction(
                `deleted admin`,
                `deleted admin '${username}' in user list at ${getLogTime()}`
              );
            } else {
              logUserAction(
                `deleted user`,
                `deleted user '${username}' in user list at ${getLogTime()}`
              );
            }
            showApp(page, pageSize);
          } catch (err) {
            showToast('Error deleting user.', 'danger');
            console.error(err);
          }
        }
      };
      actions.append(detailBtn, changePwdBtn, editBtn, delBtn);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });

    // Pagination controls
    renderPagination(page, totalPages, pageSize);

    // (Add User button is now above the table in index.html)
  } catch (error) {
    console.error("[user.js] Error fetching users:", error);
    // Show API error box instead of login form
    const apiErrorBox = document.getElementById('api-error-box');
    if (apiErrorBox) {
      apiErrorBox.textContent = "Unable to access data. Please check your API credentials or try again later.";
      apiErrorBox.style.display = 'block';
    }
    const appDiv = document.getElementById('app');
    if (appDiv) appDiv.style.display = 'none';
    const loginBox = document.getElementById('login-box');
    if (loginBox) loginBox.style.display = 'none';
    const authBtn = document.getElementById('authorize-btn');
    if (authBtn) authBtn.style.display = 'none';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    const deauthBtn = document.getElementById('deauthorize-btn');
    if (deauthBtn) deauthBtn.style.display = 'none';
  }
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
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

export function openSidePanel(mode, row = [], index = '') {
  // Create a Bootstrap modal instead of using side panel
  const modalId = 'editUserModal';
  
  // Remove existing modal if present
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editUserModalLabel">${mode === 'edit' ? 'Edit User' : 'Add User'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="userForm">
              <input type="hidden" id="userIndex" value="${mode === 'edit' ? index : ''}">
              <div class="mb-3">
                <label for="username" class="form-label">Username</label>
                <input type="text" class="form-control" id="username" value="${mode === 'edit' ? (row[0] || '') : ''}" required>
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" value="${mode === 'edit' ? (row[1] || '') : ''}" required>
              </div>
              <div class="mb-3">
                <label for="role" class="form-label">Role</label>
                <select class="form-control" id="role" required>
                  <option value="">Select Role</option>
                  <option value="user" ${mode === 'edit' && row[2] === 'user' ? 'selected' : ''}>User</option>
                  <option value="admin" ${mode === 'edit' && row[2] === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
              </div>
              <div id="formError" class="text-danger"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="saveUserBtn">${mode === 'edit' ? 'Update' : 'Add'} User</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();

  // Add form submission handler
  const saveBtn = document.getElementById('saveUserBtn');
  const formError = document.getElementById('formError');
  
  saveBtn.onclick = async () => {
    const userIndex = document.getElementById('userIndex').value;
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value.trim().toLowerCase();

    formError.textContent = '';

    if (!username || !password || !role) {
      formError.textContent = 'All fields are required.';
      return;
    }

    if (password.length < 6) {
      formError.textContent = 'Password must be at least 6 characters.';
      return;
    }

    try {
      // Simple bcrypt check - the app initialization handles the fallback
      if (!window.bcrypt) {
        formError.textContent = 'Password encryption not ready. Please wait a moment and try again.';
        return;
      }

      // Test bcrypt functionality
      try {
        const testSalt = window.bcrypt.genSaltSync(1);
        const testHash = window.bcrypt.hashSync('test', testSalt);
        if (!testHash) throw new Error('bcrypt test failed');
      } catch (testError) {
        console.error('bcrypt test failed:', testError);
        formError.textContent = 'Password encryption error. Please refresh the page and try again.';
        return;
      }

      const salt = window.bcrypt.genSaltSync(10);
      const hashedPassword = window.bcrypt.hashSync(password, salt);

      if (userIndex === '') {
        // Add new user
        await appendUser({ username, password: hashedPassword, role });
        if (showToast) showToast('User added successfully!', 'success');
      } else {
        // Update existing user
        const users = await fetchUsers();
        const created_at = users[parseInt(userIndex, 10)]?.[3] || new Date().toISOString();
        await updateUser(userIndex, { username, password: hashedPassword, role, created_at });
        if (showToast) showToast('User updated successfully!', 'success');
      }

      modal.hide();
      // Refresh the users table
      if (typeof renderUsersTable === 'function') {
        renderUsersTable();
      } else {
        // Fallback to page refresh
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      formError.textContent = 'Error saving user. Please try again.';
    }
  };

  // Clean up modal when hidden
  document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
    document.getElementById(modalId).remove();
  });
}

export function closeSidePanel() {
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
        if (role === 'admin') {
          logAdminAction(
            `created admin`,
            `created admin '${username}' in user list at ${getLogTime()}`
          );
        } else {
          logUserAction(
            `created user`,
            `created user '${username}' in user list at ${getLogTime()}`
          );
        }
      } else {
        const users = await fetchUsers();
        const created_at = users[parseInt(index, 10)]?.[3] || new Date().toISOString();
        await updateUser(index, { username, password: hashedPassword, role, created_at });
        showToast('User updated successfully!', 'success');
        if (role === 'admin') {
          logAdminAction(
            `updated admin`,
            `updated admin '${username}' in user list at ${getLogTime()}`
          );
        } else {
          logUserAction(
            `updated user`,
            `updated user '${username}' in user list at ${getLogTime()}`
          );
        }
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

export function populateForm(row, index) {
  document.getElementById('user-index').value = index;
  document.getElementById('user-username').value = row[0] || '';
  document.getElementById('user-password').value = row[1] || '';
  document.getElementById('user-role').value = row[2] || '';
}

export function clearForm() {
  const idx = document.getElementById('user-index');
  if (idx) idx.value = '';
  const uname = document.getElementById('user-username');
  if (uname) uname.value = '';
  const pwd = document.getElementById('user-password');
  if (pwd) pwd.value = '';
  const role = document.getElementById('user-role');
  if (role) role.value = '';
}

function showConfirm(message) {
  return Promise.resolve(window.confirm(message));
}

export function openChangePasswordModal(index, row) {
  // Simple bcrypt check - the app initialization handles the fallback
  if (!window.bcrypt) {
    if (showToast) {
      showToast('Password encryption not ready. Please wait a moment and try again.', 'warning');
    }
    return;
  }

  const newPwd = prompt('Enter new password for user: ' + (row[0] || ''));
  if (newPwd && newPwd.length >= 6) {
    try {
      // Test bcrypt functionality
      try {
        const testSalt = window.bcrypt.genSaltSync(1);
        const testHash = window.bcrypt.hashSync('test', testSalt);
        if (!testHash) throw new Error('bcrypt test failed');
      } catch (testError) {
        console.error('bcrypt test failed:', testError);
        if (showToast) {
          showToast('Password encryption error. Please refresh the page and try again.', 'danger');
        }
        return;
      }

      const salt = window.bcrypt.genSaltSync(10);
      const hashedPassword = window.bcrypt.hashSync(newPwd.trim(), salt);
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
        if ((user[2] || '') === 'admin') {
          logAdminAction(
            `changed password`,
            `changed password for admin '${user[0]}' in user list at ${getLogTime()}`
          );
        } else {
          logUserAction(
            `changed password`,
            `changed password for user '${user[0]}' in user list at ${getLogTime()}`
          );
        }
        showApp();
      }).catch(() => showToast('Error changing password.', 'danger'));
    });
    } catch (error) {
      console.error('Error with bcrypt:', error);
      if (showToast) {
        showToast('Error encrypting password. Please try again.', 'danger');
      }
    }
  } else if (newPwd !== null) {
    showToast('Password must be at least 6 characters.', 'danger');
  }
}
//user.js
import { CONFIG } from './config.js';

export async function fetchUsers() {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.USERS_SHEET_ID,
      range: CONFIG.USERS_RANGE,
    });
    const users = res.result.values || [];
    
    // Store globally for onclick handlers
    window.allUsers = users;
    
    return users;
  } catch (error) {
    console.error('[fetchUsers] Error fetching users:', error);
    throw error;
  }
}

export async function appendUser(user) {
  const now = new Date().toISOString();
  const values = [[
    user.username,
    user.password,
    user.role,
    now, // created_at
    now  // updated_at
  ]];
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG.USERS_SHEET_ID,
      range: CONFIG.USERS_RANGE, // Append uses this range to find the next empty row
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('[appendUser] Error appending user:', error);
    throw error;
  }
}

export async function updateUser(index, { username, password, role, created_at }) {
  const updated_at = new Date().toISOString();
  const values = [[username, password, role, created_at, updated_at]];

  // FIX: Convert index to an integer before adding (to prevent string concatenation)
  const actualIndex = parseInt(index, 10);
  const rowNum = actualIndex + 2; // Add 2 because data starts at row 2 in sheet (1-based + 1 for header)

  const range = `Sheet1!A${rowNum}:E${rowNum}`; // Specify the exact row and columns to update

  console.log(`[updateUser] Attempting to update JS Index: ${actualIndex} (Sheet Row: ${rowNum}) with data:`, values, `at range: ${range}`);

  try {
    return await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.USERS_SHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });
  } catch (error) {
    console.error('[updateUser] Error updating user:', error);
    throw error;
  }
}

export async function deleteUserAt(rowIndex) {
  // FIX: Convert rowIndex to an integer before adding (to prevent string concatenation)
  const actualRowIndex = parseInt(rowIndex, 10);

  console.log(`[deleteUserAt] Attempting to delete JS Index: ${actualRowIndex}`);

  try {
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: CONFIG.USERS_SHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // Assuming 'Sheet1' is the first sheet (sheetId 0)
              dimension: 'ROWS',
              // startIndex and endIndex are 0-based based on the sheet itself.
              // If JS array index 0 is Sheet row 2, then Sheet row 2 has 0-based API index 1.
              // So actualRowIndex + 1 accounts for the header row.
              startIndex: actualRowIndex + 1,
              endIndex: actualRowIndex + 2, // endIndex is exclusive (deletes one row)
            },
          },
        }],
      },
    });
  } catch (error) {
    console.error('[deleteUserAt] Error deleting user:', error);
    throw error;
  }
}

