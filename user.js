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
    now,
    now
  ]];
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    range: CONFIG.USERS_RANGE,
    valueInputOption: 'RAW',
    resource: { values },
  });
}

export async function updateUser(index, { username, password, role, created_at }) {
  const updated_at = new Date().toISOString();
  const values = [[username, password, role, created_at, updated_at]];

  // FIX: Convert index to an integer before adding
  const actualIndex = parseInt(index, 10); // Use parseInt with radix 10
  const rowNum = actualIndex + 2; // Add 2 because data starts at row 2 in sheet (header + 1-based index)

  const range = `Sheet1!A${rowNum}:E${rowNum}`;

  console.log(`[updateUser] Attempting to update JS Index: ${actualIndex} (Sheet Row: ${rowNum}) with data:`, values, `at range: ${range}`); // Added for debugging

  return await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    range,
    valueInputOption: 'RAW',
    resource: {
      values,
    },
  });
}

export async function deleteUserAt(rowIndex) {
  // FIX: Convert rowIndex to an integer before adding
  const actualRowIndex = parseInt(rowIndex, 10); // Use parseInt with radix 10

  console.log(`[deleteUserAt] Attempting to delete JS Index: ${actualRowIndex}`); // Added for debugging

  await gapi.client.sheets.batchUpdate({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0, // Assuming 'Sheet1' is the first sheet (sheetId 0)
            dimension: 'ROWS',
            // Corrected: Convert to number and then add offsets
            startIndex: actualRowIndex + 1, // 0-based index for API, accounts for header row
            endIndex: actualRowIndex + 2,   // 1 row past the one to delete
          },
        },
      }],
    },
  });
}