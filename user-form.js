import { fetchUsers, appendUser, updateUser } from './user.js';
import { validateUser } from './validation.js';

// Get query params for edit
function getQueryParams() {
  const params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
    params[key] = decodeURIComponent(value);
  });
  return params;
}

const params = getQueryParams();
const userIndex = params.index;
const formTitle = document.getElementById('form-title');
const userForm = document.getElementById('user-form');
const errorBox = document.getElementById('form-error');

async function populateForm() {
  if (userIndex !== undefined) {
    formTitle.textContent = 'Edit User';
    const users = await fetchUsers();
    const user = users[userIndex];
    if (user) {
      document.getElementById('user-index').value = userIndex;
      document.getElementById('user-username').value = user[0] || '';
      document.getElementById('user-password').value = user[1] || '';
      document.getElementById('user-role').value = user[2] || '';
    }
  } else {
    formTitle.textContent = 'Add User';
  }
}

userForm.onsubmit = async (e) => {
  e.preventDefault();
  errorBox.textContent = '';
  const index = document.getElementById('user-index').value;
  const username = document.getElementById('user-username').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const role = document.getElementById('user-role').value.trim();

  const errors = validateUser({ username, password, role });
  if (Object.keys(errors).length > 0) {
    errorBox.textContent = Object.values(errors).join(' ');
    return;
  }

  try {
    if (index === '') {
      await appendUser({ username, password, role });
      window.location.href = 'index.html';
    } else {
      const users = await fetchUsers();
      const created_at = users[parseInt(index, 10)]?.[3] || new Date().toISOString();
      await updateUser(index, { username, password, role, created_at });
      window.location.href = 'index.html';
    }
  } catch (err) {
    errorBox.textContent = 'Error saving user.';
    console.error(err);
  }
};

populateForm();
