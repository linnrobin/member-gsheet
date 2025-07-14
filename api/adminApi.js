import { CONFIG } from '../config.js';

// Fetch all admins from the Google Sheet
export async function fetchAdmins() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.ADMINS_SHEET_ID,
    range: CONFIG.ADMINS_RANGE,
  });
  return res.result.values || [];
}

// Append a new admin to the sheet
export async function appendAdmin(admin) {
  const now = new Date().toISOString();
  const values = [[
    admin.username,
    admin.password,
    admin.role,
    now, // created_at
    now  // updated_at
  ]];
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range: CONFIG.ADMINS_RANGE,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('[appendAdmin] Error appending admin:', error);
    throw error;
  }
}

// Update an existing admin by index
export async function updateAdmin(index, { username, password, role, created_at }) {
  const updated_at = new Date().toISOString();
  const values = [[username, password, role, created_at, updated_at]];
  const actualIndex = parseInt(index, 10);
  const rowNum = actualIndex + 2; // Data starts at row 2 (1-based + 1 for header)
  const range = `Sheet1!A${rowNum}:E${rowNum}`;
  try {
    return await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('[updateAdmin] Error updating admin:', error);
    throw error;
  }
}

// Delete an admin by index
export async function deleteAdminAt(rowIndex) {
  const actualRowIndex = parseInt(rowIndex, 10);
  try {
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: CONFIG.ADMINS_SHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // Assuming 'Sheet1' is the first sheet (sheetId 0)
              dimension: 'ROWS',
              startIndex: actualRowIndex + 1,
              endIndex: actualRowIndex + 2,
            },
          },
        }],
      },
    });
  } catch (error) {
    console.error('[deleteAdminAt] Error deleting admin:', error);
    throw error;
  }
}
