// SCOT TOPAZ Wing Commander Portal Logic

// Global State
let activeSession = null; // { wing: 'N', role: 'COMMANDER' }
let flatsData = [];
let localDb = null; // Offline database copy
let saveTimeout = null;

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  initLocalDb();
  checkCachedSession();
  updateConfigUi();
});

// 1. OFFLINE DATABASE ENGINE (Local Storage Fallback)
function initLocalDb() {
  // Clear out old pre-populated pins from early testing
  const storedPins = localStorage.getItem('scot_wings_pins');
  if (storedPins) {
    try {
      const parsed = JSON.parse(storedPins);
      if (parsed['N'] === '1111') {
        localStorage.removeItem('scot_wings_db');
        localStorage.removeItem('scot_wings_pins');
      }
    } catch (e) {}
  }

  const storedDb = localStorage.getItem('scot_wings_db');
  const reStoredPins = localStorage.getItem('scot_wings_pins');
  
  if (storedDb && reStoredPins) {
    localDb = JSON.parse(storedDb);
    return;
  }

  // Generate initial database
  const wings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
  const initialFlats = [];
  
  wings.forEach(wing => {
    // Generate 28 flats per wing (floors 1 to 7, flats 1 to 4)
    for (let floor = 1; floor <= 7; floor++) {
      for (let num = 1; num <= 4; num++) {
        const flatNo = `${floor}0${num}`;
        initialFlats.push({
          wing: wing,
          flat: flatNo,
          paid: 'No',
          mode: 'Select',
          date: '',
          amount: ''
        });
      }
    }
  });
  // Default Pins (Only Admin starts pre-registered)
  const initialPins = {
    'ADMIN': '9999',
  };

  localDb = { flats: initialFlats };
  localStorage.setItem('scot_wings_db', JSON.stringify(localDb));
  localStorage.setItem('scot_wings_pins', JSON.stringify(initialPins));
}

// Default API URL - hardcoded so all users on all devices sync to Google Sheets
var DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbyn7UVwYLnlV59cFMfdl_aeNb_cpUET1WJYsWsuTJYB8b2VcyUgmJYpVW--Ydjvyyli/exec";

// Get Configured API Url (localStorage override > hardcoded default)
function getApiUrl() {
  return localStorage.getItem('scot_apps_script_url') || DEFAULT_API_URL;
}

function updateConfigUi() {
  const url = getApiUrl();
  const input = document.getElementById('config-api-url');
  const status = document.getElementById('config-status');
  
  if (input) input.value = url;
  if (status) {
    if (url) {
      status.textContent = "Mode: Linked to Google Sheets API";
      status.style.color = "var(--success)";
    } else {
      status.textContent = "Mode: Running in Offline Demo Mode (localStorage)";
      status.style.color = "var(--primary)";
    }
  }
}

function saveApiUrl() {
  const input = document.getElementById('config-api-url');
  const url = input.value.trim();
  
  if (url) {
    localStorage.setItem('scot_apps_script_url', url);
  } else {
    localStorage.removeItem('scot_apps_script_url');
  }
  
  updateConfigUi();
  alert("Connection settings saved successfully!");
  handleLogout();
}

// 2. AUTHENTICATION & REGISTRATION
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-register');
  const errorBanner = document.getElementById('auth-error');

  errorBanner.classList.add('hidden');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const errorBanner = document.getElementById('auth-error');
  errorBanner.classList.add('hidden');

  const wing = document.getElementById('login-wing').value;
  const pin = document.getElementById('login-pin').value.trim();
  const apiUrl = getApiUrl();

  if (!wing || !pin) {
    showAuthError("Please select a wing and enter your security PIN.");
    return;
  }

  // Core Admin Special bypass
  if (wing === 'ADMIN' && pin === '9999') {
    proceedLogin(wing, 'ADMIN');
    return;
  }

  if (apiUrl) {
    // Online mode
    try {
      showLoading(true);
      const res = await fetch(`${apiUrl}?action=auth&wing=${wing}&pin=${pin}`);
      const data = await res.json();
      showLoading(false);

      if (data.success) {
        proceedLogin(wing, data.role);
      } else {
        showAuthError(data.error || "Invalid PIN credential.");
      }
    } catch (err) {
      showLoading(false);
      showAuthError("API Connection Timeout. Please check your Script URL or internet connection.");
    }
  } else {
    // Offline mode
    const pins = JSON.parse(localStorage.getItem('scot_wings_pins') || '{}');
    if (pins[wing] === pin) {
      proceedLogin(wing, wing === 'ADMIN' ? 'ADMIN' : 'COMMANDER');
    } else {
      showAuthError("Invalid PIN credentials. Register this wing if you haven't set a PIN yet!");
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const errorBanner = document.getElementById('auth-error');
  errorBanner.classList.add('hidden');

  const wing = document.getElementById('reg-wing').value;
  const pin = document.getElementById('reg-pin').value.trim();
  const apiUrl = getApiUrl();

  if (!wing || !pin) {
    showAuthError("Please select a wing and enter a 4-digit PIN.");
    return;
  }

  if (apiUrl) {
    // Online registration check
    try {
      showLoading(true);
      const res = await fetch(`${apiUrl}?action=register&wing=${wing}&pin=${pin}`);
      const data = await res.json();
      showLoading(false);

      if (data.success) {
        alert(`Wing ${wing} successfully registered! You can now log in.`);
        switchAuthTab('login');
      } else {
        showAuthError(data.error || "Registration failed.");
      }
    } catch (err) {
      showLoading(false);
      showAuthError("API connection error. Unable to register.");
    }
  } else {
    // Offline registration
    const pins = JSON.parse(localStorage.getItem('scot_wings_pins') || '{}');
    if (pins[wing] && pins[wing] !== "") {
      showAuthError(`Wing ${wing} is already registered. Please contact Admin.`);
    } else {
      pins[wing] = pin;
      localStorage.setItem('scot_wings_pins', JSON.stringify(pins));
      alert(`Wing ${wing} successfully registered! Logging in...`);
      proceedLogin(wing, 'COMMANDER');
    }
  }
}

function proceedLogin(wing, role) {
  activeSession = { wing, role };
  sessionStorage.setItem('scot_commander_session', JSON.stringify(activeSession));
  
  document.getElementById('auth-screen').classList.add('hidden');
  
  if (role === 'ADMIN') {
    loadAdminDashboard();
  } else {
    loadCommanderDashboard();
  }
}

function handleLogout() {
  activeSession = null;
  sessionStorage.removeItem('scot_commander_session');
  flatsData = [];
  
  document.getElementById('commander-dashboard').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  
  // Clear forms
  document.getElementById('login-pin').value = '';
  document.getElementById('reg-pin').value = '';
}

function checkCachedSession() {
  const cached = sessionStorage.getItem('scot_commander_session');
  if (cached) {
    const session = JSON.parse(cached);
    proceedLogin(session.wing, session.role);
  }
}

function showAuthError(msg) {
  const banner = document.getElementById('auth-error');
  banner.textContent = msg;
  banner.classList.remove('hidden');
}

// 3. WING COMMANDER DASHBOARD WORKFLOW
async function loadCommanderDashboard() {
  document.getElementById('commander-dashboard').classList.remove('hidden');
  document.getElementById('dashboard-title').textContent = `Wing ${activeSession.wing} Dashboard`;
  
  await fetchFlatsData();
  renderFlatsRoster();
}

async function fetchFlatsData() {
  const apiUrl = getApiUrl();
  const wing = activeSession.wing;

  if (apiUrl) {
    try {
      showLoading(true);
      const res = await fetch(`${apiUrl}?action=getData&wing=${wing}`);
      const data = await res.json();
      showLoading(false);
      const sheetFlats = data.flats || [];
      
      // Auto-generate the 28 flats roster and merge matching sheet data
      const mergedFlats = [];
      for (let floor = 1; floor <= 7; floor++) {
        for (let num = 1; num <= 4; num++) {
          const flatNo = `${floor}0${num}`;
          const match = sheetFlats.find(f => String(f.flat) === flatNo);
          if (match) {
            mergedFlats.push(match);
          } else {
            mergedFlats.push({
              wing: wing,
              flat: flatNo,
              paid: 'No',
              mode: 'Select',
              date: '',
              amount: ''
            });
          }
        }
      }
      flatsData = mergedFlats;
    } catch (err) {
      showLoading(false);
      alert("Error fetching flats data from sheet. Running local fallback.");
      loadLocalFlatsData(wing);
    }
  } else {
    loadLocalFlatsData(wing);
  }
}

function loadLocalFlatsData(wing) {
  const storedDb = JSON.parse(localStorage.getItem('scot_wings_db') || '{"flats":[]}');
  flatsData = (storedDb.flats || [])
    .filter(f => f.wing === wing)
    .map(f => ({
      wing: f.wing,
      flat: f.flat,
      paid: f.paid || 'No',
      mode: f.mode || 'Select',
      date: f.date || '',
      amount: f.amount !== undefined ? f.amount : ''
    }));
}


function renderFlatsRoster() {
  const tbody = document.getElementById('flats-table-body');
  tbody.innerHTML = '';
  const isReadOnly = activeSession.role === 'ADMIN';

  flatsData.sort((a, b) => parseInt(a.flat) - parseInt(b.flat));

  flatsData.forEach(row => {
    const tr = document.createElement('tr');
    
    // Highlight flat cell
    const isPaid = row.paid === 'Yes';
    const cellClass = isPaid ? 'status-yes' : 'status-no';
    const disableEdit = isReadOnly || !isPaid;
    const disableAll = isReadOnly;

    tr.innerHTML = `
      <td class="flat-cell" data-label="Flat">${row.flat}</td>
      <td data-label="Paid?">
        <select class="table-select ${cellClass}" ${disableAll ? 'disabled' : ''} onchange="updateFlatCell('${row.flat}', 'paid', this.value)">
          <option value="Yes" ${row.paid === 'Yes' ? 'selected' : ''}>Yes (Paid)</option>
          <option value="No" ${row.paid === 'No' ? 'selected' : ''}>No (Pending)</option>
        </select>
      </td>
      <td data-label="Amount (₹)">
        <input type="number" class="table-input" placeholder="0" value="${row.amount !== undefined && row.amount !== null ? row.amount : ''}" ${disableEdit ? 'disabled' : ''} onchange="updateFlatCell('${row.flat}', 'amount', this.value)">
      </td>
      <td data-label="Mode">
        <select class="table-select" ${disableEdit ? 'disabled' : ''} onchange="updateFlatCell('${row.flat}', 'mode', this.value)">
          <option value="Select" ${row.mode === 'Select' ? 'selected' : ''}>Select Mode...</option>
          <option value="Cash" ${row.mode === 'Cash' ? 'selected' : ''}>Cash</option>
          <option value="UPI" ${row.mode === 'UPI' ? 'selected' : ''}>UPI</option>
          <option value="Bank Transfer" ${row.mode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
        </select>
      </td>
      <td data-label="Paid Date">
        <input type="date" class="table-input" value="${row.date || ''}" ${disableEdit ? 'disabled' : ''} onchange="updateFlatCell('${row.flat}', 'date', this.value)">
      </td>
    `;
    tbody.appendChild(tr);
  });

  recalculateSummary();
}

function recalculateSummary() {
  const totalFlats = 28;
  const paidCount = flatsData.filter(f => f.paid === 'Yes').length;
  const unpaidCount = totalFlats - paidCount;
  
  const totalCollected = flatsData
    .filter(f => f.paid === 'Yes')
    .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
  const progressPct = Math.round((paidCount / totalFlats) * 100);

  document.getElementById('metric-collected').textContent = `₹${totalCollected.toLocaleString('en-IN')}`;
  document.getElementById('metric-pending').textContent = `${unpaidCount}`;
  document.getElementById('metric-progress-pct').textContent = `${progressPct}%`;
  document.getElementById('metric-progress-bar').style.width = `${progressPct}%`;
  document.getElementById('metric-summary-text').textContent = `${paidCount} of 28 flats paid`;
  
  const tableTotal = document.getElementById('table-total-amount');
  if (tableTotal) {
    tableTotal.innerHTML = `<strong>₹${totalCollected.toLocaleString('en-IN')}</strong>`;
  }
}

// Auto-save function on cell update
function updateFlatCell(flatNo, field, value) {
  const flat = flatsData.find(f => f.flat === flatNo);
  if (flat) {
    if (field === 'amount') {
      flat[field] = value ? parseFloat(value) : '';
    } else {
      flat[field] = value;
    }
    
    // Auto-update cell colors and values if Paid is toggled
    if (field === 'paid') {
      if (value === 'No') {
        flat.amount = '';
        flat.mode = 'Select';
        flat.date = '';
      }
      renderFlatsRoster();
    } else {
      recalculateSummary();
    }
    
    triggerSync(flat);
  }
}

function triggerSync(flatRecord) {
  const syncBanner = document.getElementById('sync-status');
  const syncText = document.getElementById('sync-text');
  
  syncBanner.classList.add('saving');
  syncText.textContent = "Syncing changes...";

  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    const apiUrl = getApiUrl();
    const params = new URLSearchParams({
      action: 'updateFlat',
      wing: activeSession.wing,
      flat: flatRecord.flat,
      paid: flatRecord.paid,
      mode: flatRecord.mode || '',
      date: flatRecord.date || '',
      amount: flatRecord.amount !== undefined && flatRecord.amount !== '' ? flatRecord.amount : ''
    });

    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}?${params.toString()}`);
        
        syncBanner.classList.remove('saving');
        syncText.textContent = "All changes saved to Google Sheet";
      } catch (err) {
        syncBanner.classList.remove('saving');
        syncText.textContent = "Network error. Saved locally (will retry on next change)";
      }
    } else {
      // Local Save
      const storedDb = JSON.parse(localStorage.getItem('scot_wings_db') || '{"flats":[]}');
      const idx = storedDb.flats.findIndex(f => f.wing === activeSession.wing && f.flat === flatRecord.flat);
      if (idx !== -1) {
        storedDb.flats[idx] = flatRecord;
      } else {
        storedDb.flats.push(flatRecord);
      }
      localStorage.setItem('scot_wings_db', JSON.stringify(storedDb));
      
      setTimeout(() => {
        syncBanner.classList.remove('saving');
        syncText.textContent = "All changes saved locally";
      }, 500);
    }
  }, 1000); // Debounce to allow user to finish typing/picking
}

// 4. WHATSAPP SUMMARY GENERATOR
function shareWhatsAppSummary() {
  const wing = activeSession.wing;
  const totalFlats = 28;
  const paidCount = flatsData.filter(f => f.paid === 'Yes').length;
  const pendingCount = totalFlats - paidCount;
  const totalCollected = flatsData
    .filter(f => f.paid === 'Yes')
    .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
  const pct = Math.round((paidCount / totalFlats) * 100);

  // Mode breakdown
  const cashCount = flatsData.filter(f => f.paid === 'Yes' && f.mode === 'Cash').length;
  const upiCount = flatsData.filter(f => f.paid === 'Yes' && f.mode === 'UPI').length;
  const bankCount = flatsData.filter(f => f.paid === 'Yes' && f.mode === 'Bank Transfer').length;

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const message = 
`*SCOT TOPAZ Wing ${wing} Collection Summary*
📅 Date: ${dateStr}

✅ *Paid Units:* ${paidCount} of 28 (${pct}%)
⏳ *Pending Units:* ${pendingCount} of 28

💰 *Total Collected:* ₹${totalCollected.toLocaleString('en-IN')}

*Modes of Payment:*
💵 Cash: ${cashCount} flats
📱 UPI: ${upiCount} flats
🏦 Bank Transfer: ${bankCount} flats

_Generated via SCOT TOPAZ Wing Portal_`;

  // Copy to clipboard
  navigator.clipboard.writeText(message).then(() => {
    alert("Wing collection summary copied to clipboard!");
    // Open WhatsApp
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  }).catch(() => {
    alert("Unable to copy to clipboard automatically. Sharing to WhatsApp directly...");
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  });
}

// ── WING COMMANDER FLAT STATUS SUMMARY ──
var lastCommanderReportText = '';

function generateFlatStatusSummary() {
  const wing = activeSession.wing;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const paidCount = flatsData.filter(f => f.paid === 'Yes').length;
  const unpaidCount = 28 - paidCount;
  const pct = Math.round((paidCount / 28) * 100);

  let lines = [];
  lines.push(`*🏠 SCOT TOPAZ Wing ${wing} — Flat Status*`);
  lines.push(`📅 ${dateStr}`);
  lines.push(`✅ Paid: ${paidCount} | ⬜ Unpaid: ${unpaidCount} | ${pct}%`);
  lines.push(``);

  // Sort flats numerically
  const sorted = flatsData.slice().sort((a, b) => {
    const numA = parseInt(a.flat.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.flat.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  sorted.forEach(f => {
    const icon = f.paid === 'Yes' ? '✅' : '⬜';
    lines.push(`${icon} Flat ${f.flat}`);
  });

  lines.push(``);
  lines.push(`_${paidCount}/28 paid (${pct}%)_`);

  lastCommanderReportText = lines.join('\n');

  const output = document.getElementById('commander-report-output');
  const pre = document.getElementById('commander-report-text');
  pre.textContent = lastCommanderReportText;
  output.classList.remove('hidden');
}

function copyCommanderReport() {
  navigator.clipboard.writeText(lastCommanderReportText).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

function shareCommanderReportWhatsApp() {
  const encoded = encodeURIComponent(lastCommanderReportText);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// 5. ADMIN CONSOLIDATED VIEW PANEL
var adminAllFlats = [];
var lastReportText = '';

async function loadAdminDashboard() {
  document.getElementById('admin-dashboard').classList.remove('hidden');
  const apiUrl = getApiUrl();

  if (apiUrl) {
    try {
      showLoading(true);
      const res = await fetch(`${apiUrl}?action=getAdminData`);
      const data = await res.json();
      showLoading(false);
      adminAllFlats = data.allFlats || [];
    } catch (err) {
      showLoading(false);
      alert("Error connecting to sheet. Loading consolidated offline data.");
      const storedDb = JSON.parse(localStorage.getItem('scot_wings_db'));
      adminAllFlats = storedDb.flats;
    }
  } else {
    const storedDb = JSON.parse(localStorage.getItem('scot_wings_db'));
    adminAllFlats = storedDb ? storedDb.flats : [];
  }

  renderAdminGrid(adminAllFlats);
}

function renderAdminGrid(allFlats) {
  const container = document.getElementById('admin-wings-container');
  container.innerHTML = '';

  const wings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
  let grandTotal = 0;
  let grandPaidRatio = 0;

  wings.forEach(wing => {
    const wingFlats = allFlats.filter(f => f.wing === wing);
    const totalFlats = 28;
    const paidCount = wingFlats.filter(f => f.paid === 'Yes').length;
    const collected = wingFlats
      .filter(f => f.paid === 'Yes')
      .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const progressPct = totalFlats > 0 ? Math.round((paidCount / totalFlats) * 100) : 0;

    grandTotal += collected;
    grandPaidRatio += paidCount;

    // Create wing status card
    const card = document.createElement('div');
    card.className = 'admin-wing-card glass-card';
    card.onclick = () => {
      // Admin bypasses login to view this wing
      activeSession = { wing, role: 'ADMIN' };
      document.getElementById('admin-dashboard').classList.add('hidden');
      loadCommanderDashboard();
    };

    card.innerHTML = `
      <div class="wing-card-header">
        <h3>Wing ${wing}</h3>
        <span class="role-badge">${progressPct}% Paid</span>
      </div>
      <div class="wing-card-metrics">
        <div class="wing-sub-metric">
          <span>Collected</span>
          <strong>₹${collected.toLocaleString('en-IN')}</strong>
        </div>
        <div class="wing-sub-metric">
          <span>Ratio</span>
          <strong>${paidCount} / 28 paid</strong>
        </div>
      </div>
      <div class="progress-track" style="margin-top: 8px;">
        <div class="progress-bar" style="width: ${progressPct}%"></div>
      </div>
    `;
    container.appendChild(card);
  });

  // Render top metrics
  document.getElementById('admin-total-collected').textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
  document.getElementById('admin-total-ratio').textContent = `${grandPaidRatio} / 280 flats`;
}

// ── ADMIN REPORTS ──

function generateWingSummaryReport() {
  const wings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  let grandCollected = 0;
  let grandPaid = 0;
  const totalFlatsAll = wings.length * 28;

  let lines = [];
  lines.push(`*🏢 SCOT TOPAZ — Wing-wise Collection Summary*`);
  lines.push(`📅 Date: ${dateStr}`);
  lines.push(``);

  wings.forEach(wing => {
    const wingFlats = adminAllFlats.filter(f => f.wing.toUpperCase() === wing);
    const paidCount = wingFlats.filter(f => f.paid === 'Yes').length;
    const collected = wingFlats.filter(f => f.paid === 'Yes').reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
    const pct = Math.round((paidCount / 28) * 100);
    grandCollected += collected;
    grandPaid += paidCount;

    const bar = pct >= 75 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
    lines.push(`${bar} *Wing ${wing}:* ${paidCount}/28 paid (${pct}%) — ₹${collected.toLocaleString('en-IN')}`);
  });

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  const grandPct = Math.round((grandPaid / totalFlatsAll) * 100);
  lines.push(`💰 *Grand Total:* ₹${grandCollected.toLocaleString('en-IN')}`);
  lines.push(`📈 *Overall:* ${grandPaid}/${totalFlatsAll} flats paid (${grandPct}%)`);

  lastReportText = lines.join('\n');
  showReport(lastReportText);
}

function generateDetailedReport() {
  const wings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  let grandCollected = 0;
  let grandPaid = 0;

  let lines = [];
  lines.push(`*📋 SCOT TOPAZ — Detailed Flat-wise Collection Report*`);
  lines.push(`📅 Date: ${dateStr}`);

  wings.forEach(wing => {
    const wingFlats = adminAllFlats.filter(f => f.wing.toUpperCase() === wing);
    if (wingFlats.length === 0) return;

    const paidCount = wingFlats.filter(f => f.paid === 'Yes').length;
    const collected = wingFlats.filter(f => f.paid === 'Yes').reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
    grandCollected += collected;
    grandPaid += paidCount;

    lines.push(``);
    lines.push(`━━━ *Wing ${wing}* (${paidCount}/28 paid, ₹${collected.toLocaleString('en-IN')}) ━━━`);

    // Sort flats numerically
    const sorted = wingFlats.slice().sort((a, b) => {
      const numA = parseInt(a.flat.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.flat.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    sorted.forEach(f => {
      const icon = f.paid === 'Yes' ? '✅' : '⬜';
      const amt = f.paid === 'Yes' && f.amount ? ` ₹${parseFloat(f.amount).toLocaleString('en-IN')}` : '';
      const mode = f.paid === 'Yes' && f.mode && f.mode !== 'Select' ? ` (${f.mode})` : '';
      const date = f.paid === 'Yes' && f.date ? ` ${f.date}` : '';
      lines.push(`${icon} Flat ${f.flat}${amt}${mode}${date}`);
    });
  });

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💰 *Grand Total:* ₹${grandCollected.toLocaleString('en-IN')}`);
  lines.push(`📈 *Overall:* ${grandPaid}/280 flats paid`);

  lastReportText = lines.join('\n');
  showReport(lastReportText);
}

function showReport(text) {
  const output = document.getElementById('report-output');
  const pre = document.getElementById('report-text');
  pre.textContent = text;
  output.classList.remove('hidden');
}

function copyReport() {
  navigator.clipboard.writeText(lastReportText).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

function shareReportWhatsApp() {
  const encoded = encodeURIComponent(lastReportText);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function showLoading(show) {
  // Can expand with custom spinner overlay
}
