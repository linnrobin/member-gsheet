// validation.js
export function validateUser({ username, password, role }) {
  const errors = {};
  if (!username || username.length < 3) {
    errors.username = 'Username must be at least 3 characters.';
  }
  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  if (!role) {
    errors.role = 'Role is required.';
  }
  return errors;
}
