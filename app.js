async function fetchUsers() {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.USERS_SHEET_ID,
      range: CONFIG.USERS_RANGE,
    });

    const users = res.result.values || [];
    const tbody = document.getElementById('user-body');
    tbody.innerHTML = '';

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
      return;
    }

    for (const row of users) {
      const tr = document.createElement('tr');
      for (let i = 0; i < 4; i++) {
        const td = document.createElement('td');
        td.textContent = row[i] || '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('❌ Failed to fetch users:', err);
    const msg = err?.result?.error?.message || err.message || 'Unknown error';
    document.getElementById('user-body').innerHTML =
      `<tr><td colspan="4">Error: ${msg}</td></tr>`;
  }
}

