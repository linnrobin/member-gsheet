import { CONFIG } from './config.js';

export async function fetchUsers() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.USERS_SHEET_ID,
    range: CONFIG.USERS_RANGE,
  });
  return res.result.values || [];
}
