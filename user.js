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

export async function updateUser(rowIndex, user) {
  const now = new Date().toISOString();
  const values = [[
    user.username,
    user.password,
    user.role,
    user.created_at || now,
    now
  ]];
  const range = `Sheet1!A${rowIndex + 2}:E${rowIndex + 2}`;
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    range,
    valueInputOption: 'RAW',
    resource: { values },
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
