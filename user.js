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
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    range: CONFIG.USERS_RANGE, // Append uses this range to find the next empty row
    valueInputOption: 'RAW',
    resource: { values },
  });
}

export async function updateUser(index, { username, password, role, created_at }) {
  const updated_at = new Date().toISOString();
  const values = [[username, password, role, created_at, updated_at]];

  // FIX: Convert index to an integer before adding (to prevent string concatenation)
  const actualIndex = parseInt(index, 10);
  const rowNum = actualIndex + 2; // Add 2 because data starts at row 2 in sheet (1-based + 1 for header)

  const range = `Sheet1!A${rowNum}:E${rowNum}`; // Specify the exact row and columns to update

  console.log(`[updateUser] Attempting to update JS Index: ${actualIndex} (Sheet Row: ${rowNum}) with data:`, values, `at range: ${range}`);

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
  // FIX: Convert rowIndex to an integer before adding (to prevent string concatenation)
  const actualRowIndex = parseInt(rowIndex, 10);

  console.log(`[deleteUserAt] Attempting to delete JS Index: ${actualRowIndex}`);

  // FIX: Corrected path from sheets.batchUpdate to sheets.spreadsheets.batchUpdate
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
}