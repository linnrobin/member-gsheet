import { validateUser } from './validation.js';
import { appendAdminActivityLog, appendUserActivityLog } from './api/activityLogApi.js';
// Toast and alert helpers will be imported from app.js for now
let showToast, showAlert;

// Helper to get current user (assumes global currentUser or similar)
function getCurrentUser() {
  return window.currentUser?.username || 'unknown';
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

// --- User Table Rendering & UI Logic ---
export async function showApp(page = 1, pageSize = 10) {
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
      changePwdBtn.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-key' viewBox='0 0 16 16'><path d='M3 8a5 5 0 1 1 9.584 2.166l2.122 2.122a1 1 0 0 1-1.415 1.415l-.707-.707-.707.707a1 1 0 0 1-1.415-1.415l.707-.707-.707-.707A5 5 0 0 1 3 8zm5-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'/></svg> <span class='visually-hidden'>Change Password</span>`;
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
      actions.append(changePwdBtn, editBtn, delBtn);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });

    // Pagination controls
    renderPagination(page, totalPages, pageSize);

    // (Add User button is now above the table in index.html)
  } catch (error) {
    console.error("[user.js] Error fetching users:", error);
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
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
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
  document.getElementById('user-index').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-role').value = '';
}

function showConfirm(message) {
  return Promise.resolve(window.confirm(message));
}

function openChangePasswordModal(index, row) {
  const newPwd = prompt('Enter new password for user: ' + (row[0] || ''));
  if (newPwd && newPwd.length >= 6) {
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
  } else if (newPwd !== null) {
    showToast('Password must be at least 6 characters.', 'danger');
  }
}
//user.js
import { CONFIG } from './config.js';

export async function fetchUsers() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    range: CONFIG.USERS_RANGE,
  });
  return res.result.values || [];
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