// api/userApi.js
// This is a mock API router for user CRUD. Replace with real backend as needed.
import { fetchUsers, appendUser, updateUser, deleteUserAt } from '../user.js';

export async function handleUserApiRequest(method, body, index) {
  switch (method) {
    case 'GET':
      return await fetchUsers();
    case 'POST':
      return await appendUser(body);
    case 'PUT':
      return await updateUser(index, body);
    case 'DELETE':
      return await deleteUserAt(index);
    default:
      throw new Error('Unsupported method');
  }
}
