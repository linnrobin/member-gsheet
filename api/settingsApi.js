import { CONFIG } from '../config.js';

// Fetch all settings from the Google Sheet
export async function fetchSettings() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SETTINGS_SHEET_ID,
    range: CONFIG.SETTINGS_RANGE,
  });
  return res.result.values || [];
}

// Update a setting by key (searches for key in column A, updates column B)
export async function updateSetting(key, value) {
  // Fetch all settings to find the row index for the key
  const settings = await fetchSettings();
  const rowIndex = settings.findIndex(row => row[0] === key);
  if (rowIndex === -1) {
    throw new Error(`Setting key '${key}' not found.`);
  }
  // Sheet row number: header is row 1, data starts at row 2
  const sheetRow = rowIndex + 2;
  const range = `Sheet1!B${sheetRow}:B${sheetRow}`;
  try {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SETTINGS_SHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: { values: [[value]] },
    });
  } catch (error) {
    console.error('[updateSetting] Error updating setting:', error);
    throw error;
  }
}
