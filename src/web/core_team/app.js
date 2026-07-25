// SCOT TOPAZ Core Team Portal Logic

// Global State
let activeSession = null; // { role: 'ADMIN' }
let localDb = null;
let saveTimeout = null;

// Default API URL (Fallback override exists in localStorage)
var DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbyn7UVwYLnlV59cFMfdl_aeNb_cpUET1WJYsWsuTJYB8b2VcyUgmJYpVW--Ydjvyyli/exec";

// Initialize App on load
window.addEventListener('DOMContentLoaded', () => {
  initLocalDb();
  checkCachedSession();
  updateConfigUi();
});

// 1. OFFLINE DATABASE ENGINE (Local Storage Fallback)
function initLocalDb() {
  const storedDb = localStorage.getItem('scot_core_db');
  const storedPins = localStorage.getItem('scot_core_pins');
  
  if (storedDb && storedPins) {
    localDb = JSON.parse(storedDb);
    return;
  }

  // Pre-seed config PINs
  const initialPins = {
    'ADMIN': '9999',
    'CORE_FINANCE': '1111',
    'CORE_SPONSOR': '2222',
    'CORE_LOGISTICS': '3333',
    'CORE_CULTURAL': '4444',
    'CORE_SPORTS': '5555'
  };

  // Generate 280 Flats with Wing stats (same as Wing Commander seed)
  const wings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
  const flats = [];
  wings.forEach(wing => {
    for (let floor = 1; floor <= 7; floor++) {
      for (let num = 1; num <= 4; num++) {
        const flatNo = `${floor}0${num}`;
        // Randomize some paid status for dashboard visualization
        const paidStatus = Math.random() > 0.45 ? 'Yes' : 'No';
        flats.push({
          wing: wing,
          flat: flatNo,
          paid: paidStatus,
          mode: paidStatus === 'Yes' ? (Math.random() > 0.5 ? 'UPI' : 'Cash') : 'Select',
          date: paidStatus === 'Yes' ? '2026-07-20' : '',
          amount: paidStatus === 'Yes' ? 3000 : ''
        });
      }
    }
  });

  // Pre-seed Sponsors
  const sponsors = [
    { id: "sp-1", company: "Topaz Developers", contact: "Rajesh Kumar", phone: "+919876543210", committed: 50000, collected: 25000, status: "PARTIALLY_PAID" },
    { id: "sp-2", company: "A1 Caterers", contact: "Amit Shah", phone: "+919812345678", committed: 20000, collected: 20000, status: "FULLY_PAID" },
    { id: "sp-3", company: "Sparkle Electricals", contact: "Vikas Patel", phone: "+919922334455", committed: 15000, collected: 0, status: "COMMITTED" }
  ];

  // Pre-seed Vendors
  const vendors = [
    { id: "vd-1", name: "DJ Melody Sounds", contact: "Karan Johar", phone: "+919765432109", category: "VENDOR", rating: 4.5 },
    { id: "vd-2", name: "Modern Tent House", contact: "Sunil Shetty", phone: "+919898765432", category: "LOGISTICS", rating: 4.2 },
    { id: "vd-3", name: "Surya Trophy Mart", contact: "Anil Kapoor", phone: "+919543210987", category: "PRIZES", rating: 4.8 }
  ];

  // Pre-seed Quotations
  const quotations = [
    { id: "qt-1", vendorName: "DJ Melody Sounds", eventName: "Independence Day Fest", amount: 12000, fileUrl: "https://example.com/quote-dj.pdf", status: "APPROVED" },
    { id: "qt-2", vendorName: "Modern Tent House", eventName: "Independence Day Fest", amount: 25000, fileUrl: "https://example.com/quote-tent.pdf", status: "SUBMITTED" },
    { id: "qt-3", vendorName: "Surya Trophy Mart", eventName: "Sports Tournament", amount: 8000, fileUrl: "https://example.com/quote-trophy.pdf", status: "APPROVED" }
  ];

  // Pre-seed Expenses
  const expenses = [
    { id: "ex-1", category: "VENDOR", description: "DJ & Music Advance", amount: 5000, receiptUrl: "https://example.com/rec-dj.png", status: "APPROVED", approvedBy: "ADMIN" },
    { id: "ex-2", category: "LOGISTICS", description: "Tents & Seating Arrangement", amount: 15000, receiptUrl: "https://example.com/rec-tent.png", status: "PENDING_APPROVAL", approvedBy: "" },
    { id: "ex-3", category: "PRIZES", description: "Medals & Trophies Purchase", amount: 8000, receiptUrl: "", status: "PENDING_APPROVAL", approvedBy: "" }
  ];

  // Pre-seed Logistics Tasks
  const tasks = [
    { id: "tk-1", eventName: "Independence Day Fest", task: "Setup Stage & Mic wiring", assignee: "Core Logistics Team", status: "PENDING" },
    { id: "tk-2", eventName: "Independence Day Fest", task: "Arrange 150 chairs in ground", assignee: "Wing Captains", status: "COMPLETED" },
    { id: "tk-3", eventName: "Sports Tournament", task: "Purchase cricket bats & footballs", assignee: "Core Sports Team", status: "PENDING" },
    { id: "tk-4", eventName: "Cultural Drawing Comp", task: "Print certificate sheets", assignee: "Core Cultural Team", status: "PENDING" }
  ];

  localDb = {
    flats: flats,
    sponsors: sponsors,
    vendors: vendors,
    quotations: quotations,
    expenses: expenses,
    tasks: tasks
  };

  localStorage.setItem('scot_core_db', JSON.stringify(localDb));
  localStorage.setItem('scot_core_pins', JSON.stringify(initialPins));
}

function getApiUrl() {
  return localStorage.getItem('scot_core_script_url') || DEFAULT_API_URL;
}

function updateConfigUi() {
  const url = getApiUrl();
  const status = document.getElementById('sync-text');
  const syncBanner = document.getElementById('sync-status');
  
  if (status) {
    if (url) {
      status.textContent = "Google Sheets Sync Enabled";
      if (syncBanner) syncBanner.classList.remove('saving');
    } else {
      status.textContent = "Running in Offline Demo Mode";
      if (syncBanner) syncBanner.classList.remove('saving');
    }
  }
}

// 2. AUTHENTICATION & SESSIONS
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

  const role = document.getElementById('login-role').value;
  const pin = document.getElementById('login-pin').value.trim();
  const apiUrl = getApiUrl();

  if (!role || !pin) {
    showAuthError("Please select a role and enter your security PIN.");
    return;
  }

  if (apiUrl) {
    try {
      showLoading(true);
      const res = await fetch(`${apiUrl}?action=auth&role=${role}&pin=${pin}`);
      const data = await res.json();
      showLoading(false);

      if (data.success) {
        proceedLogin(role);
      } else {
        showAuthError(data.error || "Invalid PIN credential.");
      }
    } catch (err) {
      showLoading(false);
      showAuthError("API connection error. Checking offline bypass...");
      // Check offline bypass
      verifyOfflineAuth(role, pin);
    }
  } else {
    verifyOfflineAuth(role, pin);
  }
}

function verifyOfflineAuth(role, pin) {
  const pins = JSON.parse(localStorage.getItem('scot_core_pins') || '{}');
  if (pins[role] === pin) {
    proceedLogin(role);
  } else {
    showAuthError("Invalid credentials. Register your role first if setting up a new PIN.");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const errorBanner = document.getElementById('auth-error');
  errorBanner.classList.add('hidden');

  const role = document.getElementById('reg-role').value;
  const pin = document.getElementById('reg-pin').value.trim();
  const apiUrl = getApiUrl();

  if (!role || !pin) {
    showAuthError("Please select a role and enter a 4-digit PIN.");
    return;
  }

  if (apiUrl) {
    try {
      showLoading(true);
      const res = await fetch(`${apiUrl}?action=register&role=${role}&pin=${pin}`);
      const data = await res.json();
      showLoading(false);

      if (data.success) {
        showToast("Role registered! You can now log in.", "success");
        switchAuthTab('login');
      } else {
        showAuthError(data.error || "Registration failed.");
      }
    } catch (err) {
      showLoading(false);
      showAuthError("API connection error. Registering offline...");
      registerOfflineRole(role, pin);
    }
  } else {
    registerOfflineRole(role, pin);
  }
}

function registerOfflineRole(role, pin) {
  const pins = JSON.parse(localStorage.getItem('scot_core_pins') || '{}');
  pins[role] = pin;
  localStorage.setItem('scot_core_pins', JSON.stringify(pins));
  showToast("Role registered successfully offline!", "success");
  switchAuthTab('login');
}

function proceedLogin(role) {
  activeSession = { role };
  sessionStorage.setItem('scot_core_session', JSON.stringify(activeSession));
  
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  
  // Format role badge
  const roleDisplayNames = {
    'ADMIN': 'SCOT Admin',
    'CORE_FINANCE': 'Finance Head',
    'CORE_SPONSOR': 'Sponsor Head',
    'CORE_LOGISTICS': 'Logistics Head',
    'CORE_CULTURAL': 'Cultural Head',
    'CORE_SPORTS': 'Sports Head'
  };
  
  document.getElementById('role-badge').textContent = roleDisplayNames[role] || 'Core Team';
  
  // Navigate to Dashboard
  navigate('#/dashboard');
  fetchData();
}

function handleLogout() {
  activeSession = null;
  sessionStorage.removeItem('scot_core_session');
  
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  
  document.getElementById('login-pin').value = '';
  document.getElementById('reg-pin').value = '';
}

function checkCachedSession() {
  const cached = sessionStorage.getItem('scot_core_session');
  if (cached) {
    const session = JSON.parse(cached);
    proceedLogin(session.role);
  }
}

function showAuthError(msg) {
  const banner = document.getElementById('auth-error');
  banner.textContent = msg;
  banner.classList.remove('hidden');
}

// 3. SYNCHRONIZATION ENGINE
async function fetchData() {
  const apiUrl = getApiUrl();
  const syncBanner = document.getElementById('sync-status');
  const syncText = document.getElementById('sync-text');
  
  if (syncBanner) syncBanner.classList.add('saving');
  if (syncText) syncText.textContent = "Syncing data...";

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}?action=getData`);
      const data = await res.json();
      
      if (data.success) {
        localDb.flats = data.flats || localDb.flats;
        localDb.sponsors = data.sponsors || localDb.sponsors;
        localDb.vendors = data.vendors || localDb.vendors;
        localDb.quotations = data.quotations || localDb.quotations;
        localDb.expenses = data.expenses || localDb.expenses;
        localDb.tasks = data.tasks || localDb.tasks;
        
        localStorage.setItem('scot_core_db', JSON.stringify(localDb));
        
        if (syncText) syncText.textContent = "Data synced with Google Sheet";
      } else {
        if (syncText) syncText.textContent = "Sync failed. Running offline.";
      }
    } catch (err) {
      if (syncText) syncText.textContent = "Offline. Local storage active.";
    }
  } else {
    if (syncText) syncText.textContent = "Offline Mode. Local storage active.";
  }
  
  setTimeout(() => {
    if (syncBanner) syncBanner.classList.remove('saving');
  }, 1000);
  
  // Re-render current page
  renderCurrentRoute();
}

function triggerSync(action, payload) {
  const apiUrl = getApiUrl();
  const syncBanner = document.getElementById('sync-status');
  const syncText = document.getElementById('sync-text');
  
  if (syncBanner) syncBanner.classList.add('saving');
  if (syncText) syncText.textContent = "Saving changes...";
  
  // Save to local storage first
  localStorage.setItem('scot_core_db', JSON.stringify(localDb));

  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    if (apiUrl) {
      try {
        const params = new URLSearchParams({ action, ...payload });
        const res = await fetch(`${apiUrl}?${params.toString()}`);
        const data = await res.json();
        
        if (data.success) {
          if (syncText) syncText.textContent = "All changes saved to Google Sheet";
        } else {
          if (syncText) syncText.textContent = "Error saving. Will retry.";
        }
      } catch (err) {
        if (syncText) syncText.textContent = "Network error. Saved locally.";
      }
    } else {
      if (syncText) syncText.textContent = "Changes saved locally";
    }
    
    setTimeout(() => {
      if (syncBanner) syncBanner.classList.remove('saving');
    }, 1000);
  }, 1000); // Debounce
}

// 4. ROUTER ENGINE
function navigate(hash) {
  window.location.hash = hash;
  renderCurrentRoute();
}

function renderCurrentRoute() {
  const hash = window.location.hash || '#/dashboard';
  const container = document.getElementById('page-content');
  
  // Update nav item active state
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
  
  if (hash === '#/dashboard') {
    document.getElementById('nav-dashboard').classList.add('active');
    renderDashboard(container);
  } else if (hash === '#/finance') {
    document.getElementById('nav-finance').classList.add('active');
    renderFinance(container);
  } else if (hash === '#/vendors') {
    document.getElementById('nav-vendors').classList.add('active');
    renderVendors(container);
  } else if (hash === '#/logistics') {
    document.getElementById('nav-logistics').classList.add('active');
    renderLogistics(container);
  } else if (hash === '#/more') {
    document.getElementById('nav-more').classList.add('active');
    renderMore(container);
  }
}

// 5. VIEW RENDERING MODULES

// --- 5.1 DASHBOARD VIEW ---
function renderDashboard(container) {
  // Flat collections ratio calculations
  const totalFlats = localDb.flats.length;
  const paidFlats = localDb.flats.filter(f => f.paid === 'Yes').length;
  const flatsCollected = localDb.flats.filter(f => f.paid === 'Yes').reduce((sum, f) => sum + (f.amount || 0), 0);
  const flatsRatioPct = totalFlats > 0 ? Math.round((paidFlats / totalFlats) * 100) : 0;
  
  // Sponsors
  const totalSponsorCollected = localDb.sponsors.reduce((sum, s) => sum + s.collected, 0);
  
  // Expenses pending
  const pendingExpenses = localDb.expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
  
  // Logistics pending tasks
  const pendingTasks = localDb.tasks.filter(t => t.status === 'PENDING').length;
  
  // Wing breakdown calculations
  const wings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
  const wingBreakdownHtml = wings.map(wing => {
    const wingFlats = localDb.flats.filter(f => f.wing === wing);
    const paidCount = wingFlats.filter(f => f.paid === 'Yes').length;
    const pct = Math.round((paidCount / 28) * 100);
    return `
      <div style="margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700;">
          <span>Wing ${wing}</span>
          <span>${paidCount}/28 Paid (${pct}%)</span>
        </div>
        <div class="progress-track" style="margin:4px 0 8px 0;">
          <div class="progress-bar" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="fab-container">
      <div class="title-wrap">
        <h2>Operations Dashboard</h2>
        <p>Annual community lifecycle overview</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="fetchData()">🔄 Sync</button>
    </div>
    
    <!-- 2x2 Grid stats -->
    <div class="metrics-grid">
      <div class="glass-card metric-card">
        <div class="metric-icon">💰</div>
        <div class="metric-info">
          <span class="metric-label">FLAT COLLECTION</span>
          <h2>₹${flatsCollected.toLocaleString('en-IN')}</h2>
          <span style="font-size:11px; font-weight:700; color:var(--success);">${flatsRatioPct}% (${paidFlats}/${totalFlats})</span>
        </div>
      </div>
      
      <div class="glass-card metric-card">
        <div class="metric-icon">🏢</div>
        <div class="metric-info">
          <span class="metric-label">SPONSORSHIPS</span>
          <h2>₹${totalSponsorCollected.toLocaleString('en-IN')}</h2>
        </div>
      </div>
      
      <div class="glass-card metric-card" onclick="navigate('#/finance')" style="cursor:pointer;">
        <div class="metric-icon">⏳</div>
        <div class="metric-info">
          <span class="metric-label">PENDING EXPENSES</span>
          <h2>${pendingExpenses} Approval${pendingExpenses !== 1 ? 's' : ''}</h2>
        </div>
      </div>
      
      <div class="glass-card metric-card" onclick="navigate('#/logistics')" style="cursor:pointer;">
        <div class="metric-icon">📋</div>
        <div class="metric-info">
          <span class="metric-label">PENDING TASKS</span>
          <h2>${pendingTasks} Checklist${pendingTasks !== 1 ? 's' : ''}</h2>
        </div>
      </div>
    </div>
    
    <!-- Wing-wise collection panel -->
    <div class="glass-card">
      <h3 style="font-family:'Fredoka',sans-serif; font-size:16px; margin-bottom:12px;">Dues Collection Progress by Wing</h3>
      ${wingBreakdownHtml}
    </div>
  `;
}

// --- 5.2 FINANCE VIEW (SPONSORS & EXPENSES) ---
let activeFinanceSubTab = 'expenses'; // 'expenses' or 'sponsors'

function renderFinance(container) {
  const activeSponsorText = activeFinanceSubTab === 'sponsors' ? 'active' : '';
  const activeExpenseText = activeFinanceSubTab === 'expenses' ? 'active' : '';

  let subContentHtml = '';
  
  if (activeFinanceSubTab === 'expenses') {
    // 1. EXPENSES VIEW
    const expItems = localDb.expenses.map(e => {
      let badgeClass = 'badge-warning';
      if (e.status === 'APPROVED') badgeClass = 'badge-success';
      if (e.status === 'DISBURSED') badgeClass = 'badge-primary';
      if (e.status === 'REJECTED') badgeClass = 'badge-danger';
      
      return `
        <div class="list-item-card" onclick="openExpenseDetailsModal('${e.id}')">
          <div class="list-item-header">
            <div>
              <span class="badge badge-primary">${e.category}</span>
              <span class="list-item-title" style="margin-left: 8px;">${e.description}</span>
            </div>
            <span class="badge ${badgeClass}">${e.status}</span>
          </div>
          <div class="list-item-body">
            <span style="font-weight:700;">₹${e.amount.toLocaleString('en-IN')}</span>
            <span style="font-size:11px; color:var(--primary); font-weight:700;">Details &amp; Approve ↗</span>
          </div>
        </div>
      `;
    }).join('');
    
    subContentHtml = `
      <div class="fab-container" style="margin-top:12px;">
        <h4 style="font-family:'Fredoka',sans-serif;">Expense Vouchers Log</h4>
        <button class="btn btn-primary btn-sm" onclick="openNewExpenseModal()">+ Add Voucher</button>
      </div>
      <div style="margin-top:12px;">
        ${expItems || '<p style="text-align:center; padding:20px; color:var(--text-muted);">No expense vouchers added yet.</p>'}
      </div>
    `;
  } else {
    // 2. SPONSORS VIEW
    const spItems = localDb.sponsors.map(s => {
      let badgeClass = 'badge-warning';
      if (s.status === 'FULLY_PAID') badgeClass = 'badge-success';
      if (s.status === 'PARTIALLY_PAID') badgeClass = 'badge-primary';
      
      const pct = s.committed > 0 ? Math.round((s.collected / s.committed) * 100) : 0;
      
      return `
        <div class="list-item-card" onclick="openSponsorCollectionModal('${s.id}')">
          <div class="list-item-header">
            <div>
              <span class="list-item-title">${s.company}</span>
              <div class="list-item-subtitle">Contact: ${s.contact} (${s.phone})</div>
            </div>
            <span class="badge ${badgeClass}">${s.status}</span>
          </div>
          <div style="margin-top:4px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700;">
              <span>Collected: ₹${s.collected.toLocaleString('en-IN')}</span>
              <span>Committed: ₹${s.committed.toLocaleString('en-IN')}</span>
            </div>
            <div class="progress-track" style="margin-top:4px;">
              <div class="progress-bar" style="width:${pct}%;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    subContentHtml = `
      <div class="fab-container" style="margin-top:12px;">
        <h4 style="font-family:'Fredoka',sans-serif;">Sponsorship Pledges</h4>
        <button class="btn btn-primary btn-sm" onclick="openNewSponsorModal()">+ Add Pledge</button>
      </div>
      <div style="margin-top:12px;">
        ${spItems || '<p style="text-align:center; padding:20px; color:var(--text-muted);">No sponsors pledges logged.</p>'}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="title-wrap" style="margin-bottom:16px;">
      <h2>Finance Operations</h2>
      <p>Manage community event budgets and sponsorship collections</p>
    </div>
    
    <!-- Sub-tab configuration selector -->
    <div class="auth-tabs">
      <button class="tab-btn ${activeExpenseText}" onclick="switchFinanceTab('expenses')">EXPENSE APPROVALS</button>
      <button class="tab-btn ${activeSponsorText}" onclick="switchFinanceTab('sponsors')">SPONSOR TRACKING</button>
    </div>
    
    ${subContentHtml}
  `;
}

function switchFinanceTab(tab) {
  activeFinanceSubTab = tab;
  renderCurrentRoute();
}

// Finance Modals & Action operations
function openExpenseDetailsModal(id) {
  const exp = localDb.expenses.find(e => e.id === id);
  if (!exp) return;
  
  const isPending = exp.status === 'PENDING_APPROVAL';
  const isApproved = exp.status === 'APPROVED';
  
  let buttonsHtml = '';
  if (isPending) {
    buttonsHtml = `
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button class="btn btn-outline" style="flex:1; border-color:var(--danger); color:var(--danger);" onclick="updateExpenseStatus('${id}', 'REJECTED')">Reject</button>
        <button class="btn btn-primary" style="flex:1;" onclick="updateExpenseStatus('${id}', 'APPROVED')">Approve</button>
      </div>
    `;
  } else if (isApproved) {
    buttonsHtml = `
      <button class="btn btn-primary btn-block" style="margin-top:20px;" onclick="updateExpenseStatus('${id}', 'DISBURSED')">Mark Cash Disbursed (Paid)</button>
    `;
  }
  
  const content = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div>
        <label class="form-label">Category</label>
        <p style="font-weight:700;">${exp.category}</p>
      </div>
      <div>
        <label class="form-label">Description</label>
        <p style="font-weight:600;">${exp.description}</p>
      </div>
      <div>
        <label class="form-label">Requested Amount</label>
        <h2 style="color:var(--primary); font-family:'Fredoka',sans-serif;">₹${exp.amount.toLocaleString('en-IN')}</h2>
      </div>
      <div>
        <label class="form-label">Receipt File Link</label>
        ${exp.receiptUrl ? `<a href="${exp.receiptUrl}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none;">View Receipt Document ↗</a>` : '<span style="color:var(--text-muted);">No receipt voucher uploaded</span>'}
      </div>
      ${buttonsHtml}
    </div>
  `;
  openModal('Expense Voucher Details', content);
}

async function updateExpenseStatus(id, newStatus) {
  const exp = localDb.expenses.find(e => e.id === id);
  if (exp) {
    exp.status = newStatus;
    if (newStatus === 'APPROVED') {
      exp.approvedBy = activeSession.role;
    }
    closeModal();
    showToast(`Expense updated successfully to ${newStatus}!`, "success");
    triggerSync("updateExpense", exp);
    renderCurrentRoute();
  }
}

function openNewExpenseModal() {
  const content = `
    <form onsubmit="saveNewExpense(event)">
      <div class="form-group">
        <label for="new-exp-cat">Category</label>
        <select id="new-exp-cat" required>
          <option value="VENDOR">Vendor/Bids</option>
          <option value="LOGISTICS">Logistics/Tents</option>
          <option value="PRIZES">Trophies & Prizes</option>
          <option value="MISCELLANEOUS">Miscellaneous</option>
        </select>
      </div>
      <div class="form-group">
        <label for="new-exp-desc">Description</label>
        <input type="text" id="new-exp-desc" placeholder="e.g. stage flowers advance decoration" required>
      </div>
      <div class="form-group">
        <label for="new-exp-amt">Amount (₹)</label>
        <input type="number" id="new-exp-amt" min="1" placeholder="e.g. 5000" required>
      </div>
      <div class="form-group">
        <label for="new-exp-url">Receipt File URL (Optional)</label>
        <input type="url" id="new-exp-url" placeholder="https://drive.google.com/...">
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Submit Voucher</button>
    </form>
  `;
  openModal('New Expense Voucher', content);
}

function saveNewExpense(e) {
  e.preventDefault();
  const category = document.getElementById('new-exp-cat').value;
  const description = document.getElementById('new-exp-desc').value;
  const amount = Number(document.getElementById('new-exp-amt').value);
  const receiptUrl = document.getElementById('new-exp-url').value;
  
  const id = "ex-" + Date.now();
  const newExp = {
    id,
    category,
    description,
    amount,
    receiptUrl,
    status: 'PENDING_APPROVAL',
    approvedBy: ''
  };
  
  localDb.expenses.push(newExp);
  closeModal();
  showToast("Expense voucher submitted for review!", "success");
  triggerSync("updateExpense", newExp);
  renderCurrentRoute();
}

function openSponsorCollectionModal(id) {
  const sp = localDb.sponsors.find(s => s.id === id);
  if (!sp) return;
  
  const maxCollection = sp.committed - sp.collected;
  const content = `
    <form onsubmit="saveSponsorCollection(event, '${id}')">
      <div style="margin-bottom:12px;">
        <label class="form-label">Sponsor Company</label>
        <p style="font-weight:700;">${sp.company}</p>
      </div>
      <div style="margin-bottom:12px;">
        <label class="form-label">Total Pledge Target</label>
        <p style="font-weight:700;">₹${sp.committed.toLocaleString('en-IN')}</p>
      </div>
      <div style="margin-bottom:12px;">
        <label class="form-label">Currently Collected</label>
        <p style="font-weight:700; color:var(--success);">₹${sp.collected.toLocaleString('en-IN')}</p>
      </div>
      <div class="form-group">
        <label for="add-col-amt">Add Collected Amount (₹)</label>
        <input type="number" id="add-col-amt" min="1" max="${maxCollection}" placeholder="e.g. 5000" required>
        <small class="helper-text">Max outstanding: ₹${maxCollection.toLocaleString('en-IN')}</small>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;" ${maxCollection <= 0 ? 'disabled' : ''}>Record Collection</button>
    </form>
  `;
  openModal('Record Sponsor Payment', content);
}

function saveSponsorCollection(e, id) {
  e.preventDefault();
  const addVal = Number(document.getElementById('add-col-amt').value);
  const sp = localDb.sponsors.find(s => s.id === id);
  
  if (sp) {
    sp.collected += addVal;
    if (sp.collected >= sp.committed) {
      sp.status = 'FULLY_PAID';
    } else {
      sp.status = 'PARTIALLY_PAID';
    }
    
    closeModal();
    showToast("Sponsorship collection logged!", "success");
    triggerSync("updateSponsor", sp);
    renderCurrentRoute();
  }
}

function openNewSponsorModal() {
  const content = `
    <form onsubmit="saveNewSponsor(event)">
      <div class="form-group">
        <label for="new-sp-comp">Company Name</label>
        <input type="text" id="new-sp-comp" placeholder="e.g. Relience Retail" required>
      </div>
      <div class="form-group">
        <label for="new-sp-cont">Contact Person</label>
        <input type="text" id="new-sp-cont" placeholder="e.g. Sunil Varma" required>
      </div>
      <div class="form-group">
        <label for="new-sp-phone">Phone Number</label>
        <input type="text" id="new-sp-phone" placeholder="e.g. +919876543210" required>
      </div>
      <div class="form-group">
        <label for="new-sp-amt">Pledge Amount committed (₹)</label>
        <input type="number" id="new-sp-amt" min="1" placeholder="e.g. 25000" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Add Pledge</button>
    </form>
  `;
  openModal('Add Sponsorship Pledge', content);
}

function saveNewSponsor(e) {
  e.preventDefault();
  const company = document.getElementById('new-sp-comp').value;
  const contact = document.getElementById('new-sp-cont').value;
  const phone = document.getElementById('new-sp-phone').value;
  const committed = Number(document.getElementById('new-sp-amt').value);
  
  const id = "sp-" + Date.now();
  const newSp = {
    id,
    company,
    contact,
    phone,
    committed,
    collected: 0,
    status: 'COMMITTED'
  };
  
  localDb.sponsors.push(newSp);
  closeModal();
  showToast("Sponsorship pledge added!", "success");
  triggerSync("updateSponsor", newSp);
  renderCurrentRoute();
}

// --- 5.3 VENDORS & QUOTATIONS VIEW ---
function renderVendors(container) {
  // Vendor items rendering
  const vendorItems = localDb.vendors.map(v => {
    // Filter quotes for this vendor
    const vQuotes = localDb.quotations.filter(q => q.vendorName === v.name);
    
    const quotesHtml = vQuotes.map(q => {
      let badgeClass = 'badge-warning';
      if (q.status === 'APPROVED') badgeClass = 'badge-success';
      if (q.status === 'REJECTED') badgeClass = 'badge-danger';
      
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.03); padding:8px 10px; border-radius:10px; margin-top:6px;">
          <div>
            <div style="font-size:11px; font-weight:700;">${q.eventName}</div>
            <div style="font-size:12px; font-weight:700; color:var(--primary); margin-top:2px;">₹${q.amount.toLocaleString('en-IN')}</div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="badge ${badgeClass}" style="font-size:9px; padding:2px 6px;">${q.status}</span>
            <button class="btn btn-outline" style="padding:4px; font-size:10px; border-radius:6px;" onclick="openQuotationActionsModal('${q.id}')">Manage</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="list-item-card">
        <div class="list-item-header">
          <div>
            <span class="list-item-title">${v.name}</span>
            <div class="list-item-subtitle">${v.phone} &middot; Contact: ${v.contact}</div>
          </div>
          <span class="badge badge-primary">${v.category}</span>
        </div>
        <div style="font-size:12px; font-weight:700; display:flex; justify-content:space-between; margin-top:2px;">
          <span>Rating: ⭐${v.rating}</span>
          <span style="color:var(--text-muted);">Quotations: ${vQuotes.length}</span>
        </div>
        
        ${vQuotes.length > 0 ? `
          <div style="margin-top:6px; border-top:1px dashed rgba(0,0,0,0.05); padding-top:6px;">
            <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Bids & Quotations</div>
            ${quotesHtml}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="fab-container">
      <div class="title-wrap">
        <h2>Vendor Directory</h2>
        <p>Maintain persistent vendor directory and quote bids</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openNewVendorModal()">+ Add Vendor</button>
    </div>
    
    <div style="margin-top:12px;">
      ${vendorItems || '<p style="text-align:center; padding:20px; color:var(--text-muted);">No vendor accounts defined.</p>'}
    </div>
  `;
}

function openNewVendorModal() {
  const content = `
    <form onsubmit="saveNewVendor(event)">
      <div class="form-group">
        <label for="new-vd-name">Company Name</label>
        <input type="text" id="new-vd-name" placeholder="e.g. Sound Box Systems" required>
      </div>
      <div class="form-group">
        <label for="new-vd-cont">Contact Person</label>
        <input type="text" id="new-vd-cont" placeholder="e.g. Mukesh" required>
      </div>
      <div class="form-group">
        <label for="new-vd-phone">Phone Number</label>
        <input type="text" id="new-vd-phone" placeholder="e.g. +919000000000" required>
      </div>
      <div class="form-group">
        <label for="new-vd-cat">Service Category</label>
        <select id="new-vd-cat" required>
          <option value="VENDOR">Vendor/Event Management</option>
          <option value="LOGISTICS">Logistics/Tents</option>
          <option value="PRIZES">Trophies & Prizes</option>
          <option value="CATERING">Catering & Food</option>
          <option value="MISCELLANEOUS">Miscellaneous</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Save Vendor</button>
    </form>
  `;
  openModal('Add New Vendor', content);
}

function saveNewVendor(e) {
  e.preventDefault();
  const name = document.getElementById('new-vd-name').value;
  const contact = document.getElementById('new-vd-cont').value;
  const phone = document.getElementById('new-vd-phone').value;
  const category = document.getElementById('new-vd-cat').value;
  
  const id = "vd-" + Date.now();
  const newVd = {
    id,
    name,
    contact,
    phone,
    category,
    rating: 4.0
  };
  
  localDb.vendors.push(newVd);
  closeModal();
  showToast("Vendor added successfully!", "success");
  triggerSync("updateVendor", newVd);
  renderCurrentRoute();
}

function openQuotationActionsModal(quoteId) {
  const quote = localDb.quotations.find(q => q.id === quoteId);
  if (!quote) return;
  
  const isPending = quote.status === 'SUBMITTED';
  const isApproved = quote.status === 'APPROVED';
  
  let buttonsHtml = '';
  if (isPending) {
    buttonsHtml = `
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button class="btn btn-outline" style="flex:1; border-color:var(--danger); color:var(--danger);" onclick="updateQuotationStatus('${quoteId}', 'REJECTED')">Reject Quote</button>
        <button class="btn btn-primary" style="flex:1;" onclick="updateQuotationStatus('${quoteId}', 'APPROVED')">Approve Quote</button>
      </div>
    `;
  } else if (isApproved) {
    buttonsHtml = `
      <button class="btn btn-outline btn-block" style="margin-top:20px; border-color:var(--danger); color:var(--danger);" onclick="updateQuotationStatus('${quoteId}', 'REJECTED')">Revoke Approval</button>
    `;
  }
  
  const content = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div>
        <label class="form-label">Vendor</label>
        <p style="font-weight:700;">${quote.vendorName}</p>
      </div>
      <div>
        <label class="form-label">Event</label>
        <p style="font-weight:600;">${quote.eventName}</p>
      </div>
      <div>
        <label class="form-label">Bid Amount</label>
        <h2 style="color:var(--primary); font-family:'Fredoka',sans-serif;">₹${quote.amount.toLocaleString('en-IN')}</h2>
      </div>
      <div>
        <label class="form-label">Quotation Document File</label>
        ${quote.fileUrl ? `<a href="${quote.fileUrl}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none;">View Bid File ↗</a>` : '<span style="color:var(--text-muted);">No quotation PDF loaded</span>'}
      </div>
      ${buttonsHtml}
    </div>
  `;
  openModal('Quotation Actions', content);
}

function updateQuotationStatus(id, newStatus) {
  const quote = localDb.quotations.find(q => q.id === id);
  if (quote) {
    quote.status = newStatus;
    
    // Auto reject other quotes for the same event if this is approved
    if (newStatus === 'APPROVED') {
      localDb.quotations.forEach(q => {
        if (q.eventName === quote.eventName && q.id !== quote.id) {
          q.status = 'REJECTED';
          triggerSync("updateQuotation", q);
        }
      });
    }
    
    closeModal();
    showToast(`Quotation status updated to ${newStatus}!`, "success");
    triggerSync("updateQuotation", quote);
    renderCurrentRoute();
  }
}

// --- 5.4 LOGISTICS CHECKLIST VIEW ---
function renderLogistics(container) {
  // Sort tasks: pending first, then by event name
  const sortedTasks = localDb.tasks.slice().sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'PENDING' ? -1 : 1;
    }
    return a.eventName.localeCompare(b.eventName);
  });
  
  const taskRows = sortedTasks.map(t => {
    const isCompleted = t.status === 'COMPLETED';
    const checkedClass = isCompleted ? 'checked' : '';
    const rowClass = isCompleted ? 'completed' : '';
    
    return `
      <div class="task-row ${rowClass}">
        <div class="task-checkbox ${checkedClass}" onclick="toggleTaskStatus('${t.id}')"></div>
        <div class="task-info">
          <div class="task-desc">${t.task}</div>
          <div class="task-meta">Event: ${t.eventName} &middot; Assignee: ${t.assignee}</div>
        </div>
        <button class="close-btn" style="font-size:14px; padding:4px;" onclick="openEditTaskModal('${t.id}')">✏️</button>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="fab-container">
      <div class="title-wrap">
        <h2>Logistics Checklists</h2>
        <p>Operational task checklists associated with events</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openNewTaskModal()">+ Add Task</button>
    </div>
    
    <div class="glass-card" style="padding:16px;">
      ${taskRows || '<p style="text-align:center; padding:20px; color:var(--text-muted);">No logistics checklist tasks mapped.</p>'}
    </div>
  `;
}

function toggleTaskStatus(id) {
  const task = localDb.tasks.find(t => t.id === id);
  if (task) {
    task.status = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    showToast(`Task status updated!`, "success");
    triggerSync("updateTask", task);
    renderCurrentRoute();
  }
}

function openNewTaskModal() {
  const content = `
    <form onsubmit="saveNewTask(event)">
      <div class="form-group">
        <label for="new-tk-event">Associate Event Name</label>
        <input type="text" id="new-tk-event" placeholder="e.g. Independence Day Fest" required>
      </div>
      <div class="form-group">
        <label for="new-tk-desc">Task Description</label>
        <input type="text" id="new-tk-desc" placeholder="e.g. Setup seating layout flags" required>
      </div>
      <div class="form-group">
        <label for="new-tk-ass">Assignee Team / Member</label>
        <input type="text" id="new-tk-ass" placeholder="e.g. Wing N Captains" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Add Task</button>
    </form>
  `;
  openModal('Add Checklist Task', content);
}

function saveNewTask(e) {
  e.preventDefault();
  const eventName = document.getElementById('new-tk-event').value;
  const taskDesc = document.getElementById('new-tk-desc').value;
  const assignee = document.getElementById('new-tk-ass').value;
  
  const id = "tk-" + Date.now();
  const newTask = {
    id,
    eventName,
    task: taskDesc,
    assignee,
    status: 'PENDING'
  };
  
  localDb.tasks.push(newTask);
  closeModal();
  showToast("Checklist task added!", "success");
  triggerSync("updateTask", newTask);
  renderCurrentRoute();
}

function openEditTaskModal(id) {
  const t = localDb.tasks.find(tk => tk.id === id);
  if (!t) return;
  
  const content = `
    <form onsubmit="saveEditedTask(event, '${id}')">
      <div class="form-group">
        <label for="edit-tk-event">Event Name</label>
        <input type="text" id="edit-tk-event" value="${t.eventName}" required>
      </div>
      <div class="form-group">
        <label for="edit-tk-desc">Task Description</label>
        <input type="text" id="edit-tk-desc" value="${t.task}" required>
      </div>
      <div class="form-group">
        <label for="edit-tk-ass">Assignee</label>
        <input type="text" id="edit-tk-ass" value="${t.assignee}" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Save Task</button>
    </form>
  `;
  openModal('Edit Checklist Task', content);
}

function saveEditedTask(e, id) {
  e.preventDefault();
  const t = localDb.tasks.find(tk => tk.id === id);
  if (t) {
    t.eventName = document.getElementById('edit-tk-event').value;
    t.task = document.getElementById('edit-tk-desc').value;
    t.assignee = document.getElementById('edit-tk-ass').value;
    
    closeModal();
    showToast("Checklist task updated!", "success");
    triggerSync("updateTask", t);
    renderCurrentRoute();
  }
}

// --- 5.5 MORE SETTINGS VIEW ---
function renderMore(container) {
  const url = getApiUrl();
  const roleDisplayNames = {
    'ADMIN': 'SCOT Admin (Full Access)',
    'CORE_FINANCE': 'Finance Head',
    'CORE_SPONSOR': 'Sponsor Head',
    'CORE_LOGISTICS': 'Logistics Head',
    'CORE_CULTURAL': 'Cultural Head',
    'CORE_SPORTS': 'Sports Head'
  };

  container.innerHTML = `
    <div class="title-wrap" style="margin-bottom:16px;">
      <h2>Configuration Settings</h2>
      <p>Configure Sheets API connections and role properties</p>
    </div>
    
    <!-- User identity details -->
    <div class="glass-card" style="display:flex; align-items:center; gap:16px;">
      <div style="font-size:36px; width:64px; height:64px; border-radius:16px; background:white; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">👑</div>
      <div>
        <h3 style="font-family:'Fredoka',sans-serif; font-size:16px;">Active Console Session</h3>
        <span class="role-badge" style="margin-top:4px;">${roleDisplayNames[activeSession.role] || 'Core Team'}</span>
      </div>
    </div>
    
    <!-- API URL config form -->
    <div class="glass-card">
      <h3 style="font-family:'Fredoka',sans-serif; font-size:16px; margin-bottom:12px;">Google Sheets Web App Connection</h3>
      <p style="font-size:12px; color:var(--text-muted); line-height:1.5; margin-bottom:14px;">
        To synchronize data with your spreadsheet, enter your deployed <strong>Google Apps Script Web App URL</strong> below. If empty, the app runs in Offline Demo Mode.
      </p>
      <form onsubmit="saveApiUrl(event)">
        <div class="form-group">
          <input type="url" id="config-api-url" placeholder="https://script.google.com/macros/s/.../exec" value="${url}">
        </div>
        <button type="submit" class="btn btn-primary btn-block">Connect Sheet</button>
      </form>
    </div>
    
    <!-- Action buttons -->
    <button class="btn btn-outline btn-block" style="border-color:var(--danger); color:var(--danger); background:white;" onclick="handleLogout()">Logout Session</button>
  `;
}

function saveApiUrl(e) {
  e.preventDefault();
  const url = document.getElementById('config-api-url').value.trim();
  
  if (url) {
    localStorage.setItem('scot_core_script_url', url);
  } else {
    localStorage.removeItem('scot_core_script_url');
  }
  
  updateConfigUi();
  showToast("Connection settings updated successfully!", "success");
  handleLogout();
}

// 6. GLOBAL TOASTS & MODAL OVERLAY LOGIC
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <span onclick="this.parentElement.remove()" style="cursor:pointer; font-weight:bold;">✕</span>
  `;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function openModal(title, contentHtml) {
  const backdrop = document.getElementById('modal-backdrop');
  const sheet = document.getElementById('bottom-sheet');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  if (modalTitle) modalTitle.textContent = title;
  if (modalBody) modalBody.innerHTML = contentHtml;
  
  if (backdrop) backdrop.classList.remove('hidden');
  if (sheet) {
    sheet.classList.remove('hidden');
    // Force browser reflow before adding show class
    sheet.offsetHeight;
    sheet.classList.add('show');
  }
}

function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  const sheet = document.getElementById('bottom-sheet');
  
  if (sheet) sheet.classList.remove('show');
  setTimeout(() => {
    if (backdrop) backdrop.classList.add('hidden');
    if (sheet) sheet.classList.add('hidden');
  }, 250); // Match transit timing
}

function showLoading(show) {
  const syncBanner = document.getElementById('sync-status');
  const syncText = document.getElementById('sync-text');
  
  if (syncBanner) {
    if (show) {
      syncBanner.classList.add('saving');
      if (syncText) syncText.textContent = "Connecting to API...";
    } else {
      syncBanner.classList.remove('saving');
      updateConfigUi();
    }
  }
}
