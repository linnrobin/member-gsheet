import { CONFIG } from '../config.js';

// Fetch all admin activity logs
export async function fetchAdminActivityLogs() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.ADMIN_ACTIVITY_LOG_SHEET_ID,
    range: CONFIG.ADMIN_ACTIVITY_LOG_RANGE,
  });
  return res.result.values || [];
}

// Append a new admin activity log entry
export async function appendAdminActivityLog(entry) {
  const now = new Date().toISOString();
  const values = [[
    entry.user || '',
    entry.action || '',
    entry.details || '',
    now
  ]];
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG.ADMIN_ACTIVITY_LOG_SHEET_ID,
      range: CONFIG.ADMIN_ACTIVITY_LOG_RANGE,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('[appendAdminActivityLog] Error appending log:', error);
    throw error;
  }
}

// Fetch all user activity logs
export async function fetchUserActivityLogs() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.USER_ACTIVITY_LOG_SHEET_ID,
    range: CONFIG.USER_ACTIVITY_LOG_RANGE,
  });
  return res.result.values || [];
}

// Append a new user activity log entry
export async function appendUserActivityLog(entry) {
  const now = new Date().toISOString();
  const values = [[
    entry.user || '',
    entry.action || '',
    entry.details || '',
    now
  ]];
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG.USER_ACTIVITY_LOG_SHEET_ID,
      range: CONFIG.USER_ACTIVITY_LOG_RANGE,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('[appendUserActivityLog] Error appending log:', error);
    throw error;
  }
}
