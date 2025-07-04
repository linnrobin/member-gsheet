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
  const rowNum = index + 2; // Add 2 because data starts at row 2 in sheet

  const range = `Sheet1!A${rowNum}:E${rowNum}`;
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
  await gapi.client.sheets.batchUpdate({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0,
            dimension: 'ROWS',
            startIndex: rowIndex + 1,
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  });
}
