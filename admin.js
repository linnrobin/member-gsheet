// admin.js
// Admin UI logic split from app.js
import { CONFIG } from './config.js';

export function renderAdminsPage() {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `<h2 class="h4 mb-3">Admins</h2><div id="admin-table-container"></div>`;
  setActiveNav('nav-admins');
  showAdmins();
}

export async function showAdmins() {
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
  // ...existing logic from app.js...
}

function deleteAdmin(idx) {
  // ...existing logic from app.js...
}
