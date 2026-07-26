// SCOT TOPAZ Events Team Portal Logic

// Global State
let activeSession = null; 
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
  // Clear any old stale database keys from previous loads
  localStorage.removeItem('scot_event_db');
  localStorage.removeItem('scot_event_db_v3');
  
  const storedDb = localStorage.getItem('scot_event_db_v3');
  const storedPins = localStorage.getItem('scot_event_pins');
  
  if (storedDb && storedPins) {
    localDb = JSON.parse(storedDb);
    return;
  }

  // Pre-seed config PINs
  const initialPins = {
    'ADMIN': '9999',
    'EVENT_CHAMP_SPORTS': '4444',
    'EVENT_CHAMP_CULTURAL': '5555'
  };

  // Pre-seed Events parsed from Event Plan.xlsx
  const events = [
    { eventName: "Carrom Tournament", description: "Indoor board games tournament for all age groups", startDate: "2026-08-09", endDate: "2026-08-09", venue: "Clubhouse", status: "ACTIVE" },
    { eventName: "Table Tennis", description: "Singles and Doubles table tennis matches", startDate: "2026-08-23", endDate: "2026-08-23", venue: "Multi-court Area", status: "PLANNED" },
    { eventName: "Dahi Handi", description: "Janmashtami handi breaking celebration", startDate: "2026-09-05", endDate: "2026-09-05", venue: "Central Ground", status: "PLANNED" },
    { eventName: "Ganesh Festival", description: "Ganesh sthapana, dhol tasha, stage performances, and visarjan", startDate: "2026-09-14", endDate: "2026-09-18", venue: "Central Plaza & Stage Arena", status: "PLANNED" },
    { eventName: "Dandiya Night", description: "Navratri garba & dandiya celebrations", startDate: "2026-10-17", endDate: "2026-10-17", venue: "Central Ground", status: "PLANNED" }
  ];

  // Pre-seed Competitions associated with the calendar events
  const competitions = [
    { eventName: "Carrom Tournament", competitionName: "Carrom - Singles Below 16", category: "Individual", format: "Knockout", status: "ACTIVE" },
    { eventName: "Carrom Tournament", competitionName: "Carrom - Singles Above 16", category: "Individual", format: "Knockout", status: "ACTIVE" },
    { eventName: "Carrom Tournament", competitionName: "Carrom - Singles Senior Citizens", category: "Individual", format: "Knockout", status: "ACTIVE" },
    { eventName: "Carrom Tournament", competitionName: "Carrom - Doubles Above 16", category: "Individual", format: "Knockout", status: "ACTIVE" },
    
    { eventName: "Table Tennis", competitionName: "TT - Below 16", category: "Individual", format: "Knockout", status: "PLANNED" },
    { eventName: "Table Tennis", competitionName: "TT - Above 16", category: "Individual", format: "Knockout", status: "PLANNED" },
    { eventName: "Table Tennis", competitionName: "TT - Doubles Above 16", category: "Individual", format: "Knockout", status: "PLANNED" },

    { eventName: "Ganesh Festival", competitionName: "Wing Wise Stage Performances", category: "Wing-Based", format: "Direct", status: "PLANNED" },
    { eventName: "Ganesh Festival", competitionName: "Dumbtakshari", category: "Wing-Based", format: "RoundRobin", status: "PLANNED" },
    { eventName: "Ganesh Festival", competitionName: "Ganesh Festival - Senior Citizen event", category: "Individual", format: "Direct", status: "PLANNED" },
    { eventName: "Ganesh Festival", competitionName: "Ganesh Festival - Adults Stage Performances", category: "Individual", format: "Direct", status: "PLANNED" }
  ];

  // Pre-seed Registrations (EMPTY array as requested to remove all dummy data)
  const registrations = [];

  // Pre-seed Fixtures (EMPTY)
  const fixtures = [];

  // Pre-seed Leaderboard points
  const leaderboard = [
    { wing: "N", points: 0 },
    { wing: "O", points: 0 },
    { wing: "P", points: 0 },
    { wing: "Q", points: 0 },
    { wing: "R", points: 0 },
    { wing: "S", points: 0 },
    { wing: "T", points: 0 },
    { wing: "U", points: 0 },
    { wing: "V", points: 0 },
    { wing: "W", points: 0 }
  ];

  localDb = {
    events,
    competitions,
    registrations,
    fixtures,
    leaderboard
  };

  localStorage.setItem('scot_event_db_v3', JSON.stringify(localDb));
  localStorage.setItem('scot_event_pins', JSON.stringify(initialPins));
}

function getApiUrl() {
  return localStorage.getItem('scot_event_script_url') || DEFAULT_API_URL;
}

function updateConfigUi() {
  const url = getApiUrl();
  const status = document.getElementById('sync-text');
  const syncBanner = document.getElementById('sync-status');
  
  if (status) {
    if (url) {
      status.textContent = "Google Sheets Sync Active";
      if (syncBanner) syncBanner.classList.remove('saving');
    } else {
      status.textContent = "Running in Offline Mode";
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
        showAuthError(data.error || "Incorrect PIN credential.");
      }
    } catch (err) {
      showLoading(false);
      showAuthError("API connection error. Checking offline credentials...");
      verifyOfflineAuth(role, pin);
    }
  } else {
    verifyOfflineAuth(role, pin);
  }
}

function verifyOfflineAuth(role, pin) {
  const pins = JSON.parse(localStorage.getItem('scot_event_pins') || '{}');
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
        showToast("Champion registered! You can now log in.", "success");
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
  const pins = JSON.parse(localStorage.getItem('scot_event_pins') || '{}');
  pins[role] = pin;
  localStorage.setItem('scot_event_pins', JSON.stringify(pins));
  showToast("Champion registered successfully offline!", "success");
  switchAuthTab('login');
}

function proceedLogin(role) {
  activeSession = { role };
  sessionStorage.setItem('scot_event_session', JSON.stringify(activeSession));
  
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  
  const roleDisplayNames = {
    'ADMIN': 'SCOT Admin (Full Access)',
    'EVENT_CHAMP_SPORTS': 'Sports Champion',
    'EVENT_CHAMP_CULTURAL': 'Cultural Champion'
  };
  
  document.getElementById('role-badge').textContent = roleDisplayNames[role] || 'Event Champion';
  
  navigate('#/dashboard');
  fetchData();
}

function handleLogout() {
  activeSession = null;
  sessionStorage.removeItem('scot_event_session');
  
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  
  document.getElementById('login-pin').value = '';
  document.getElementById('reg-pin').value = '';
}

function checkCachedSession() {
  const cached = sessionStorage.getItem('scot_event_session');
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
        // Strict overwrite using live sheet data. No dummy fallback!
        localDb = {
          events: data.events || [],
          competitions: data.competitions || [],
          registrations: data.registrations || [],
          fixtures: data.fixtures || [],
          leaderboard: data.leaderboard || []
        };
        
        localStorage.setItem('scot_event_db_v3', JSON.stringify(localDb));
        
        if (syncText) syncText.textContent = "Data synced with Google Sheet";
      } else {
        if (syncText) syncText.textContent = "Sync failed. Check sheet connection.";
      }
    } catch (err) {
      if (syncText) syncText.textContent = "Offline. Using cached sheet data.";
    }
  } else {
    if (syncText) syncText.textContent = "Offline Mode. Local storage active.";
  }
  
  setTimeout(() => {
    if (syncBanner) syncBanner.classList.remove('saving');
  }, 1000);
  
  renderCurrentRoute();
}

function triggerSync(action, payload) {
  const apiUrl = getApiUrl();
  const syncBanner = document.getElementById('sync-status');
  const syncText = document.getElementById('sync-text');
  
  if (syncBanner) syncBanner.classList.add('saving');
  if (syncText) syncText.textContent = "Saving changes...";
  
  localStorage.setItem('scot_event_db_v3', JSON.stringify(localDb));

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
  }, 1000);
}

// 4. ROUTER ENGINE
function navigate(hash) {
  window.location.hash = hash;
  renderCurrentRoute();
}

function renderCurrentRoute() {
  const hash = window.location.hash || '#/dashboard';
  const container = document.getElementById('page-content');
  
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
  
  if (hash === '#/dashboard') {
    document.getElementById('nav-dashboard').classList.add('active');
    renderDashboard(container);
  } else if (hash === '#/calendar') {
    document.getElementById('nav-calendar').classList.add('active');
    renderCalendar(container);
  } else if (hash === '#/registrations') {
    document.getElementById('nav-registrations').classList.add('active');
    renderRegistrations(container);
  } else if (hash === '#/fixtures') {
    document.getElementById('nav-fixtures').classList.add('active');
    renderFixtures(container);
  } else if (hash === '#/more') {
    document.getElementById('nav-more').classList.add('active');
    renderMore(container);
  }
}

// 5. VIEW RENDERING MODULES

// --- 5.1 DASHBOARD VIEW ---
function renderDashboard(container) {
  const activeEvents = localDb.events.filter(e => e.status === 'ACTIVE').length;
  const pendingRegs = localDb.registrations.filter(r => r.status === 'PENDING').length;
  const pendingMatches = localDb.fixtures.filter(f => f.status === 'SCHEDULED').length;
  
  // Sort leaderboard points descending
  const sortedLeaderboard = localDb.leaderboard.slice().sort((a, b) => b.points - a.points);
  const maxPoints = sortedLeaderboard[0]?.points || 100;
  
  const leadRows = sortedLeaderboard.map(l => {
    const pct = Math.round((l.points / maxPoints) * 100);
    return `
      <div style="margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700;">
          <span>Wing ${l.wing}</span>
          <span>${l.points} pts</span>
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
        <h2>Events Dashboard</h2>
        <p>Active championship leaderboards & stats</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="fetchData()">🔄 Sync</button>
    </div>
    
    <div class="metrics-grid">
      <div class="glass-card metric-card">
        <div class="metric-icon">🏆</div>
        <div class="metric-info">
          <span class="metric-label">ACTIVE EVENTS</span>
          <h2>${activeEvents} Active</h2>
        </div>
      </div>
      
      <div class="glass-card metric-card" onclick="navigate('#/registrations')" style="cursor:pointer;">
        <div class="metric-icon">📋</div>
        <div class="metric-info">
          <span class="metric-label">PENDING REGS</span>
          <h2>${pendingRegs} Reviews</h2>
        </div>
      </div>
      
      <div class="glass-card metric-card" onclick="navigate('#/fixtures')" style="cursor:pointer;">
        <div class="metric-icon">⚔️</div>
        <div class="metric-info">
          <span class="metric-label">FIXTURES RUNNING</span>
          <h2>${pendingMatches} Match${pendingMatches !== 1 ? 'es' : ''}</h2>
        </div>
      </div>
    </div>
    
    <div class="glass-card">
      <h3 style="font-family:'Fredoka',sans-serif; font-size:16px; margin-bottom:12px;">Wing Championship Trophy Leaderboard</h3>
      ${leadRows}
    </div>
  `;
}

// --- 5.2 REGISTRATIONS REVIEW VIEW ---
function renderRegistrations(container) {
  const pendingRegs = localDb.registrations.filter(r => r.status === 'PENDING');
  
  const regItems = pendingRegs.map(r => `
    <div class="list-item-card">
      <div class="list-item-header">
        <div>
          <span class="list-item-title">${r.residentName}</span>
          <div class="list-item-subtitle">Flat ${r.wing}-${r.flat} &middot; Wing ${r.wing}</div>
        </div>
        <span class="badge badge-warning">${r.status}</span>
      </div>
      <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-top:2px;">
        Competition: <strong>${r.competitionName}</strong> (${r.eventName})
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn btn-outline btn-sm" style="border-color:var(--danger); color:var(--danger);" onclick="updateRegStatus('${r.id}', 'REJECTED')">Reject</button>
        <button class="btn btn-primary btn-sm" onclick="updateRegStatus('${r.id}', 'APPROVED')">Approve</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="title-wrap" style="margin-bottom:16px;">
      <h2>Participant Registrations</h2>
      <p>Review and verify resident participation entries</p>
    </div>
    
    <div style="margin-top:12px;">
      ${regItems || '<p style="text-align:center; padding:20px; color:var(--text-muted);">No pending registration requests.</p>'}
    </div>
  `;
}

function updateRegStatus(id, newStatus) {
  const reg = localDb.registrations.find(r => r.id === id);
  if (reg) {
    reg.status = newStatus;
    showToast(`Registration request ${newStatus.toLowerCase()}!`, "success");
    triggerSync("updateRegistration", reg);
    renderCurrentRoute();
  }
}

// --- 5.3 FIXTURES & BRACKETS RECORD VIEW ---
let activeFixturesFilter = ''; // Filter by competition name

function renderFixtures(container) {
  // Get all competitions that have generated fixtures
  const compNames = Array.from(new Set(localDb.fixtures.map(f => f.competitionName)));
  if (!activeFixturesFilter && compNames.length > 0) {
    activeFixturesFilter = compNames[0];
  }
  
  const chipsHtml = compNames.map(name => `
    <button class="chip ${activeFixturesFilter === name ? 'active' : ''}" onclick="filterFixtures('${name}')">${name}</button>
  `).join('');
  
  const filteredFixtures = localDb.fixtures.filter(f => f.competitionName === activeFixturesFilter);
  
  // Group fixtures by Round
  const rounds = Array.from(new Set(filteredFixtures.map(f => f.round))).sort((a,b) => a - b);
  
  let fixturesHtml = '';
  
  if (compNames.length === 0) {
    fixturesHtml = `<p style="text-align:center; padding:20px; color:var(--text-muted);">No match fixtures scheduled yet. Setup competitions below and click 'Generate Brackets' to schedule.</p>`;
  } else {
    fixturesHtml = rounds.map(rNum => {
      const roundMatches = filteredFixtures.filter(f => f.round === rNum);
      const roundMatchesHtml = roundMatches.map(m => {
        const isCompleted = m.status === 'COMPLETED';
        const p1Winner = isCompleted && m.winner === m.participant1 ? 'winner' : '';
        const p2Winner = isCompleted && m.winner === m.participant2 ? 'winner' : '';
        
        return `
          <div class="match-box">
            <div class="match-header">
              <span>Match ID: ${m.id}</span>
              <span>Round ${m.round} &middot; ${m.status}</span>
            </div>
            <div class="match-team-row">
              <span class="match-team-name ${p1Winner}">${m.participant1}</span>
              <span class="match-team-score ${p1Winner}">${m.score1 !== "" ? m.score1 : '-'}</span>
            </div>
            <div class="match-team-row">
              <span class="match-team-name ${p2Winner}">${m.participant2}</span>
              <span class="match-team-score ${p2Winner}">${m.score2 !== "" ? m.score2 : '-'}</span>
            </div>
            ${!isCompleted ? `
              <button class="match-action-btn" onclick="openRecordScoreModal('${m.id}')">Record Score</button>
            ` : ''}
          </div>
        `;
      }).join('');
      
      return `
        <div style="margin-top:16px;">
          <h4 style="font-family:'Fredoka',sans-serif; margin-bottom:8px; border-bottom: 1px dashed rgba(0,0,0,0.06); padding-bottom:4px;">Round ${rNum}</h4>
          ${roundMatchesHtml}
        </div>
      `;
    }).join('');
  }

  // Generate active competitions list with generate/view options
  const activeCompsHtml = localDb.competitions.map(c => {
    const hasFixtures = localDb.fixtures.some(f => f.competitionName === c.competitionName);
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed rgba(0,0,0,0.06);">
        <div>
          <span style="font-weight:700; font-size:13px; color:var(--text-main);">${c.competitionName}</span>
          <div style="font-size:10px; color:var(--text-muted);">${c.eventName} &middot; Mode: <strong>${c.format}</strong></div>
        </div>
        <div>
          ${!hasFixtures ? `
            <button class="btn btn-primary btn-sm" style="padding:4px 8px; font-size:11px;" onclick="generateTournamentFixtures('${c.competitionName}')">Generate Brackets</button>
          ` : `
            <span style="font-size:11px; color:var(--success); font-weight:700; cursor:pointer;" onclick="filterFixtures('${c.competitionName}')">✓ Active (View)</span>
          `}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Active Tournaments Setup Panel -->
    <div class="glass-card" style="padding:16px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.04); padding-bottom:8px;">
        <h3 style="font-family:'Fredoka',sans-serif; font-size:15px; color:var(--primary);">Tournament Formats</h3>
        <button class="btn btn-primary btn-sm" style="padding:6px 10px; font-size:12px;" onclick="openNewCompetitionModal()">+ Setup Comp</button>
      </div>
      <div style="max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
        ${activeCompsHtml || '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">No active competitions setup.</p>'}
      </div>
    </div>
    
    <!-- Match List Section -->
    <div class="fab-container" style="margin-top:20px; margin-bottom:10px;">
      <div class="title-wrap">
        <h3 style="font-family:'Fredoka',sans-serif; font-size:16px;">Match Fixtures & Brackets</h3>
        <p>Record game results and tournament placements</p>
      </div>
    </div>

    <div class="filter-chips-row">
      ${chipsHtml}
    </div>
    
    <div class="glass-card" style="padding:16px;">
      ${fixturesHtml}
    </div>
  `;
}

function filterFixtures(name) {
  activeFixturesFilter = name;
  renderCurrentRoute();
}

function openRecordScoreModal(matchId) {
  const match = localDb.fixtures.find(f => f.id === matchId);
  if (!match) return;
  const content = `
    <form onsubmit="saveMatchScore(event, '${matchId}')">
      <div style="margin-bottom:12px;">
        <label class="form-label">Competition</label>
        <p style="font-weight:700;">${match.competitionName} &middot; Round ${match.round}</p>
      </div>
      <div class="form-group">
        <label for="score-p1">Score for: ${match.participant1}</label>
        <input type="number" id="score-p1" min="0" placeholder="0" required>
      </div>
      <div class="form-group">
        <label for="score-p2">Score for: ${match.participant2}</label>
        <input type="number" id="score-p2" min="0" placeholder="0" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Submit Scores</button>
    </form>
  `;
  openModal('Record Score', content);
}

async function saveMatchScore(e, matchId) {
  e.preventDefault();
  const s1 = Number(document.getElementById('score-p1').value);
  const s2 = Number(document.getElementById('score-p2').value);
  
  const match = localDb.fixtures.find(f => f.id === matchId);
  if (match) {
    match.score1 = s1;
    match.score2 = s2;
    match.winner = s1 > s2 ? match.participant1 : match.participant2;
    match.status = 'COMPLETED';
    
    closeModal();
    showToast(`Scores recorded! Winner: ${match.winner}`, "success");
    triggerSync("updateFixture", match);
    
    // Auto advance in Knockout Bracket if applicable
    handleKnockoutAdvancement(match);
    
    renderCurrentRoute();
  }
}

// Automatic bracket progression rules
function handleKnockoutAdvancement(completedMatch) {
  const compName = completedMatch.competitionName;
  const comp = localDb.competitions.find(c => c.competitionName === compName);
  
  if (!comp || comp.format !== 'Knockout') return;
  
  // Find all matches in this round for this competition
  const roundMatches = localDb.fixtures.filter(f => f.competitionName === compName && f.round === completedMatch.round);
  const allCompleted = roundMatches.every(f => f.status === 'COMPLETED');
  
  if (!allCompleted) return; // Wait for all matches in current round to finish
  
  // Advance winners to the next round
  const winners = roundMatches.map(f => f.winner);
  
  if (winners.length <= 1) {
    // Competition completed! Award points to winner's wing
    awardLeaderboardPoints(winners[0], compName);
    return;
  }
  
  // Generate next round matches
  const nextRoundNum = completedMatch.round + 1;
  const nextRoundMatches = [];
  
  for (let i = 0; i < winners.length; i += 2) {
    const p1 = winners[i];
    const p2 = winners[i+1] || "BYE"; // Fallback bye if odd (should not happen in later rounds)
    const id = `fx-${compName.substring(0,3).toLowerCase()}-r${nextRoundNum}-m${(i/2)+1}`;
    
    const newMatch = {
      id,
      competitionName: compName,
      round: nextRoundNum,
      participant1: p1,
      participant2: p2,
      score1: "",
      score2: "",
      winner: p2 === "BYE" ? p1 : "",
      status: p2 === "BYE" ? "COMPLETED" : "SCHEDULED"
    };
    
    nextRoundMatches.push(newMatch);
    localDb.fixtures.push(newMatch);
  }
  
  // Sync bulk fixtures list
  const apiUrl = getApiUrl();
  if (apiUrl) {
    const payload = {
      competitionName: compName,
      matches: JSON.stringify(nextRoundMatches)
    };
    triggerSync("bulkCreateFixtures", payload);
  } else {
    localStorage.setItem('scot_event_db', JSON.stringify(localDb));
  }
  
  showToast(`Round ${nextRoundNum} fixtures generated!`, "success");
}

function awardLeaderboardPoints(winnerName, compName) {
  // Find winner's wing from registrations mapping
  const reg = localDb.registrations.find(r => r.residentName === winnerName && r.competitionName === compName);
  if (reg && reg.wing) {
    const wingPoints = localDb.leaderboard.find(l => l.wing === reg.wing);
    if (wingPoints) {
      wingPoints.points += 10; // 10 points for first place winner
      showToast(`🏆 10 points awarded to Wing ${reg.wing} for ${compName}!`, "success");
      triggerSync("saveLeaderboard", wingPoints);
    }
  }
}

// --- 5.4 CALENDAR VIEW (READ ONLY) ---
function renderCalendar(container) {
  const calendarEvents = [
    { date: "9th Aug 2026", day: "Sunday", time: "9:30 AM", event: "Carrom Tournament", type: "Sports", wingWise: "No", mode: "Individual", categories: "Singles Below 16, Singles Above 16, Singles Senior Citizens, Doubles Above 16", points: "Winner: 30 pts, Runner: 20 pts", manager: "Sports Committee" },
    { date: "23rd Aug 2026", day: "Sunday", time: "9:30 AM", event: "Table Tennis", type: "Sports", wingWise: "No", mode: "Individual", categories: "Below 16, Above 16, Doubles Above 16", points: "Winner: 30 pts, Runner: 20 pts", manager: "Sports Committee" },
    { date: "5th Sep 2026", day: "Saturday", time: "7:00 PM", event: "Dahi Handi", type: "Cultural", wingWise: "N/A", mode: "N/A", categories: "General Celebration", points: "N/A", manager: "Cultural Committee" },
    { date: "14th Sep 2026", day: "Monday", time: "1:00 PM", event: "Ganesh Sthapana & Dhol Tasha", type: "Cultural", wingWise: "N/A", mode: "N/A", categories: "Festival Inauguration", points: "N/A", manager: "Cultural Committee" },
    { date: "14th Sep 2026", day: "Monday", time: "7:30 PM", event: "Wing Wise Performances", type: "Cultural", wingWise: "Yes", mode: "Group", categories: "Inter-wing Showcase", points: "1st: 100 pts, 2nd: 70 pts, 3rd: 50 pts", manager: "Cultural Committee" },
    { date: "15th Sep 2026", day: "Tuesday", time: "11:00 AM", event: "Senior Citizen Event", type: "Cultural", wingWise: "No", mode: "Individual", categories: "Senior Citizens", points: "Winner: 30 pts, Runner: 20 pts", manager: "Senior Citizen Group" },
    { date: "15th Sep 2026", day: "Tuesday", time: "7:30 PM", event: "Dumbtakshari", type: "Cultural", wingWise: "Yes", mode: "Group", categories: "Multiple Groups", points: "Winner: 50 pts, Runner: 30 pts", manager: "Cultural Committee" },
    { date: "16th Sep 2026", day: "Wednesday", time: "5:00 PM", event: "Kids Event", type: "Cultural", wingWise: "No", mode: "Individual", categories: "Below 10 years", points: "N/A", manager: "Youth Club" },
    { date: "16th Sep 2026", day: "Wednesday", time: "7:30 PM", event: "Kids Stage Performances", type: "Cultural", wingWise: "No", mode: "Both", categories: "Below 16 years", points: "N/A", manager: "Cultural Committee" },
    { date: "17th Sep 2026", day: "Thursday", time: "7:30 PM", event: "Adults Stage Performances", type: "Cultural", wingWise: "No", mode: "Both", categories: "Above 16 years", points: "Winner: 50 pts, Runner: 30 pts", manager: "Cultural Committee" },
    { date: "18th Sep 2026", day: "Friday", time: "3:00 PM", event: "Ganesh Visarjan & Dhol Tasha", type: "Cultural", wingWise: "N/A", mode: "N/A", categories: "Visarjan Procession", points: "N/A", manager: "Cultural Committee" },
    { date: "18th Sep 2026", day: "Friday", time: "7:30 PM", event: "Gala Dinner", type: "Cultural", wingWise: "N/A", mode: "N/A", categories: "Community Feast", points: "N/A", manager: "Logistics Team" },
    { date: "17th Oct 2026", day: "Saturday", time: "7:00 PM", event: "Dandiya Night", type: "Cultural", wingWise: "N/A", mode: "N/A", categories: "Garba & Dandiya Raas", points: "N/A", manager: "Cultural Committee" }
  ];

  const calendarItems = calendarEvents.map(e => {
    const isSports = e.type === 'Sports';
    const typeBadge = isSports ? 'badge-primary' : 'badge-success';
    
    return `
      <div class="list-item-card" style="border-left: 5px solid ${isSports ? 'var(--primary)' : 'var(--success)'};">
        <div class="list-item-header">
          <div>
            <span class="list-item-title" style="font-size: 16px;">${e.event}</span>
            <div class="list-item-subtitle">${e.date} (${e.day}) at ${e.time}</div>
          </div>
          <span class="badge ${typeBadge}">${e.type}</span>
        </div>
        <div style="font-size: 12px; line-height: 1.6; color: var(--text-main); margin-top: 8px;">
          <div>📍 Mode: <strong>${e.mode}</strong> &middot; Wing-Wise: <strong>${e.wingWise}</strong></div>
          <div>👥 Categories: <span style="color: var(--text-muted);">${e.categories}</span></div>
          <div>🏆 Points: <span class="num-mono" style="color: var(--accent-orange);">${e.points}</span></div>
          <div>👤 Manager: <strong>${e.manager}</strong></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="title-wrap" style="margin-bottom:16px;">
      <h2>6-Month Event Calendar</h2>
      <p>View-only schedule of society activities & championship points</p>
    </div>
    <div style="margin-top:12px;">
      ${calendarItems}
    </div>
  `;
}

function openNewCompetitionModal() {
  const content = `
    <form onsubmit="saveNewCompetition(event)">
      <div class="form-group">
        <label for="new-cp-event">Associate Event</label>
        <select id="new-cp-event" required>
          ${localDb.events.map(e => `<option value="${e.eventName}">${e.eventName}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="new-cp-name">Competition Name</label>
        <input type="text" id="new-cp-name" placeholder="e.g. Singles Badminton Championship" required>
      </div>
      <div class="form-group">
        <label for="new-cp-cat">Category Type</label>
        <select id="new-cp-cat" required>
          <option value="Individual">Individual Participant</option>
          <option value="Wing-Based">Wing Composite Team</option>
        </select>
      </div>
      <div class="form-group">
        <label for="new-cp-fmt">Tournament Structure</label>
        <select id="new-cp-fmt" required>
          <option value="Knockout">Single Elimination Knockout</option>
          <option value="RoundRobin">Round Robin Circle Method</option>
          <option value="Direct">Direct Placements/Judged</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Add Competition</button>
    </form>
  `;
  openModal('New Competition Config', content);
}

function saveNewCompetition(e) {
  e.preventDefault();
  const eventName = document.getElementById('new-cp-event').value;
  const compName = document.getElementById('new-cp-name').value;
  const category = document.getElementById('new-cp-cat').value;
  const format = document.getElementById('new-cp-fmt').value;
  
  const newComp = {
    eventName,
    competitionName: compName,
    category,
    format,
    status: 'PLANNED'
  };
  
  localDb.competitions.push(newComp);
  closeModal();
  showToast("Competition format registered successfully!", "success");
  triggerSync("updateCompetition", newComp);
  renderCurrentRoute();
}

// 5.4.1 FIXTURES CALCULATOR BRACKETS ALGORITHM
function generateTournamentFixtures(compName) {
  const comp = localDb.competitions.find(c => c.competitionName === compName);
  if (!comp) return;

  // Find all approved participants for this competition
  const participants = localDb.registrations
    .filter(r => r.competitionName === compName && r.status === 'APPROVED')
    .map(r => r.residentName);

  if (participants.length < 2) {
    showToast("Requires at least 2 approved participants to generate brackets.", "error");
    return;
  }

  const generatedMatches = [];
  
  if (comp.format === 'Knockout') {
    // --- 1. KNOCKOUT FORMATION ---
    const N = participants.length;
    // Find next power of two
    let power = 1;
    while (power < N) power *= 2;
    
    // Number of Byes to inject
    const B = power - N;
    
    // Mix participants and byes
    const pool = participants.slice();
    // Round 1 matches count
    const numMatchesR1 = (N - B) / 2;
    
    let matchIdx = 1;
    // Schedule matches
    for (let i = 0; i < numMatchesR1; i++) {
      const p1 = pool.shift();
      const p2 = pool.shift();
      const id = `fx-${compName.substring(0,3).toLowerCase()}-r1-m${matchIdx++}`;
      
      generatedMatches.push({
        id,
        competitionName: compName,
        round: 1,
        participant1: p1,
        participant2: p2,
        score1: "",
        score2: "",
        winner: "",
        status: "SCHEDULED"
      });
    }
    
    // Remaining advanced automatically (Byes)
    while (pool.length > 0) {
      const pBye = pool.shift();
      const id = `fx-${compName.substring(0,3).toLowerCase()}-r1-m${matchIdx++}`;
      generatedMatches.push({
        id,
        competitionName: compName,
        round: 1,
        participant1: pBye,
        participant2: "BYE",
        score1: "",
        score2: "",
        winner: pBye,
        status: "COMPLETED"
      });
    }
    
    showToast(`Knockout bracket created! ${numMatchesR1} matches and ${B} byes injected.`, "success");

  } else if (comp.format === 'RoundRobin') {
    // --- 2. ROUND ROBIN CIRCLE METHOD ---
    let pool = participants.slice();
    if (pool.length % 2 !== 0) {
      pool.push("BYE"); // Dummy BYE
    }
    
    const P = pool.length;
    const rounds = P - 1;
    const matchesPerRound = P / 2;
    
    let matchIdx = 1;
    for (let r = 1; r <= rounds; r++) {
      for (let m = 0; m < matchesPerRound; m++) {
        const p1 = pool[m];
        const p2 = pool[P - 1 - m];
        
        if (p1 !== 'BYE' && p2 !== 'BYE') {
          generatedMatches.push({
            id: `fx-${compName.substring(0,3).toLowerCase()}-r${r}-m${matchIdx++}`,
            competitionName: compName,
            round: r,
            participant1: p1,
            participant2: p2,
            score1: "",
            score2: "",
            winner: "",
            status: "SCHEDULED"
          });
        }
      }
      
      // Rotate pool circle except index 0
      const last = pool.pop();
      pool.splice(1, 0, last);
    }
    
    showToast(`Round Robin circle schedule generated! ${rounds} rounds created.`, "success");
    
  } else {
    // Direct Judged events (direct placement entry, no bracket fixtures)
    showToast("Direct placement ranking events don't require brackets. Enter results under placement panel.", "warning");
    return;
  }

  // Push matches list to localDb
  localDb.fixtures = localDb.fixtures.concat(generatedMatches);
  
  // Sync to Google Sheet
  const apiUrl = getApiUrl();
  if (apiUrl) {
    const payload = {
      competitionName: compName,
      matches: JSON.stringify(generatedMatches)
    };
    triggerSync("bulkCreateFixtures", payload);
  } else {
    localStorage.setItem('scot_event_db', JSON.stringify(localDb));
  }
  
  renderCurrentRoute();
}

// --- 5.5 MORE CONFIGURATION VIEW ---
function renderMore(container) {
  const url = getApiUrl();
  const isAdmin = activeSession.role === 'ADMIN';
  
  const roleDisplayNames = {
    'ADMIN': 'SCOT Admin (Full Access)',
    'EVENT_CHAMP_SPORTS': 'Sports Event Champion',
    'EVENT_CHAMP_CULTURAL': 'Cultural Event Champion'
  };

  container.innerHTML = `
    <div class="title-wrap" style="margin-bottom:16px;">
      <h2>Configuration Settings</h2>
      <p>Configure API coordinates and session settings</p>
    </div>
    
    <!-- Active Coordinator Profile Details -->
    <div class="glass-card" style="display:flex; align-items:center; gap:16px;">
      <div style="font-size:36px; width:64px; height:64px; border-radius:16px; background:white; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.02);">📋</div>
      <div>
        <h3 style="font-family:'Fredoka',sans-serif; font-size:16px;">Active Champions Session</h3>
        <span class="role-badge" style="margin-top:4px;">${roleDisplayNames[activeSession.role] || 'Coordinator'}</span>
      </div>
    </div>
    
    <!-- API URL linkage setting config (Admin-Only access restriction) -->
    ${isAdmin ? `
      <div class="glass-card">
        <h3 style="font-family:'Fredoka',sans-serif; font-size:16px; margin-bottom:12px;">Google Sheets Web App Connection</h3>
        <p style="font-size:12px; color:var(--text-muted); line-height:1.5; margin-bottom:14px;">
          <strong>Security Notice</strong>: Access to configure the Google Sheets script URL linkage is restricted to the **ADMIN** role only.
        </p>
        <form onsubmit="saveApiUrl(event)">
          <div class="form-group">
            <input type="url" id="config-api-url" placeholder="https://script.google.com/macros/s/.../exec" value="${url}">
          </div>
          <button type="submit" class="btn btn-primary btn-block">Connect Sheet</button>
        </form>
      </div>
    ` : `
      <div class="glass-card" style="border:1px dashed rgba(0,0,0,0.08);">
        <h3 style="font-family:'Fredoka',sans-serif; font-size:14px; color:var(--text-muted);">Sheet Sync Active</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">
          The console is connected to the master Google Sheets spreadsheet. If configuration adjustments are needed, please contact a SCOT Admin.
        </p>
      </div>
    `}
    
    <!-- Log Out button -->
    <button class="btn btn-outline btn-block" style="border-color:var(--danger); color:var(--danger); background:white;" onclick="handleLogout()">Logout Session</button>
  `;
}

function saveApiUrl(e) {
  e.preventDefault();
  const url = document.getElementById('config-api-url').value.trim();
  
  if (url) {
    localStorage.setItem('scot_event_script_url', url);
  } else {
    localStorage.removeItem('scot_event_script_url');
  }
  
  updateConfigUi();
  showToast("API linkage settings updated!", "success");
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
    sheet.offsetHeight; // Force reflow
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
  }, 250);
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
