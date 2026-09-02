import React, { createContext, useContext, useState, useEffect } from 'react';

const StoreContext = createContext();

// =========================================================================
// 📊 GOOGLE SHEETS LIVE DATABASE CONNECTION (OPTIONAL)
// =========================================================================
// To connect to a live Google Sheet, paste your Web App URL (from Apps Script) below.
// Example: "https://script.google.com/macros/s/AKfycb.../exec"
//
// Leave it as an empty string ("") to continue using browser Local Storage.
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwSLPw4RriyysFhmShOttUHvfEqSeDVUEo1ORJ0chvqiyhrZisYHyZInoJL_E5MaDk7/exec";
const STORE_KEY = 'scot_prototype_react_v12';

// =========================================================================
// 🏠 WING COMMANDER FLAT DUES API (READ-ONLY — No writes allowed)
// =========================================================================
const WING_COMMANDER_API_URL = "https://script.google.com/macros/s/AKfycbyn7UVwYLnlV59cFMfdl_aeNb_cpUET1WJYsWsuTJYB8b2VcyUgmJYpVW--Ydjvyyli/exec";

// Clean up old local storage versions to free up quota
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('scot_prototype_') && key !== STORE_KEY) {
      localStorage.removeItem(key);
    }
  }
} catch (e) {
  console.warn("Failed to clear old local storage keys:", e);
}

const getInitialState = () => {
  return {
    currentUser: null,
    paidFlats: [],
    users: [
      { id: 'user-admin', name: 'SCOT Admin', phone: '9876543210', pin: '3690', wing: '', wingId: '', flat: '', role: 'admin', isChampion: true, status: 'APPROVED', contributionStatus: 'PAID', registeredAt: '2026-07-30' }
    ],
    wings: [
      { id: 'wing-n', name: 'Wing N', letter: 'N', totalFlats: 28, color: '#EF4444' },
      { id: 'wing-o', name: 'Wing O', letter: 'O', totalFlats: 28, color: '#F97316' },
      { id: 'wing-p', name: 'Wing P', letter: 'P', totalFlats: 28, color: '#F59E0B' },
      { id: 'wing-q', name: 'Wing Q', letter: 'Q', totalFlats: 28, color: '#84CC16' },
      { id: 'wing-r', name: 'Wing R', letter: 'R', totalFlats: 28, color: '#10B981' },
      { id: 'wing-s', name: 'Wing S', letter: 'S', totalFlats: 28, color: '#06B6D4' },
      { id: 'wing-t', name: 'Wing T', letter: 'T', totalFlats: 28, color: '#3B82F6' },
      { id: 'wing-u', name: 'Wing U', letter: 'U', totalFlats: 28, color: '#6366F1' },
      { id: 'wing-v', name: 'Wing V', letter: 'V', totalFlats: 28, color: '#8B5CF6' },
      { id: 'wing-w', name: 'Wing W', letter: 'W', totalFlats: 28, color: '#14B8A6' }
    ],
    events: [
      {
        id: 'evt-carrom-2026',
        name: 'Carrom Tournament',
        type: 'TOURNAMENT',
        startDate: '2026-08-09',
        endDate: '2026-08-09',
        venue: 'Clubhouse Ground Floor',
        time: '09:00 AM onwards',
        status: 'OPEN',
        category: 'Sports',
        description: 'Annual Inter-Wing Carrom Singles Tournament. Matches will be knockout style, 3 boards per match. Winner gains 100 points for their wing.',
        registrationDeadline: '2026-08-07',
        nominationsRequired: true,
        assignedManagerIds: [],
        subEvents: [
          { id: 'sub-c-1', name: 'Carrom Men Singles (Above 16)', category: 'Above 16', points: 'Winner: 100 pts / Runner: 70 pts', winnerPoints: '100', runnerUpPoints: '70', assignedManagerIds: [] },
          { id: 'sub-c-2', name: 'Carrom Women Singles (Above 16)', category: 'Above 16', points: 'Winner: 100 pts / Runner: 70 pts', winnerPoints: '100', runnerUpPoints: '70', assignedManagerIds: [] },
          { id: 'sub-c-3', name: 'Carrom Boys Singles (Below 16)', category: 'Below 16', points: 'Winner: 60 pts / Runner: 40 pts', winnerPoints: '60', runnerUpPoints: '40', assignedManagerIds: [] },
          { id: 'sub-c-4', name: 'Carrom Girls Singles (Below 16)', category: 'Below 16', points: 'Winner: 60 pts / Runner: 40 pts', winnerPoints: '60', runnerUpPoints: '40', assignedManagerIds: [] },
          { id: 'sub-c-5', name: 'Carrom Open Doubles', category: 'Doubles', points: 'Winner: 100 pts / Runner: 70 pts', winnerPoints: '100', runnerUpPoints: '70', assignedManagerIds: [] },
          { id: 'sub-c-6', name: 'Carrom Kids (Below 10)', category: 'Below 10', points: 'Winner: 40 pts / Runner: 20 pts', winnerPoints: '40', runnerUpPoints: '20', assignedManagerIds: [] }
        ]
      },
      {
        id: 'evt-tt-2026',
        name: 'Table Tennis Tournament',
        type: 'TOURNAMENT',
        startDate: '2026-08-23',
        endDate: '2026-08-23',
        venue: 'Clubhouse 1st Floor',
        time: '10:00 AM onwards',
        status: 'OPEN',
        category: 'Sports',
        description: 'Annual Inter-Wing Table Tennis Singles Tournament. Best of 3 sets, 11 points per set. Winner earns 100 points for their wing.',
        registrationDeadline: '2026-08-21',
        nominationsRequired: true,
        assignedManagerIds: [],
        subEvents: [
          { id: 'sub-t-1', name: 'TT Singles Above 16', category: 'Above 16', points: 'Winner: 100 pts / Runner: 70 pts', assignedManagerIds: [] },
          { id: 'sub-t-2', name: 'TT Singles Kids (Below 16)', category: 'Below 16', points: 'Winner: 60 pts / Runner: 40 pts', assignedManagerIds: [] }
        ]
      },
      {
        id: 'evt-dahi-2026',
        name: 'Dahi Handi Celebration',
        type: 'STANDALONE',
        startDate: '2026-09-05',
        endDate: '2026-09-05',
        venue: 'Main Gate Circle',
        time: '04:00 PM onwards',
        status: 'PLANNED',
        category: 'Cultural',
        description: 'Grand Dahi Handi breaking competition. Wing-wise pyramid construction speed challenge. Special guest drum beats!',
        registrationDeadline: '2026-09-02',
        nominationsRequired: true,
        assignedManagerIds: [],
        subEvents: []
      },
      {
        id: 'evt-ganesh-2026',
        name: 'Ganesh Utsav 2026',
        type: 'UMBRELLA',
        startDate: '2026-09-14',
        endDate: '2026-09-18',
        venue: 'Main Society Mandap',
        time: 'Various Schedules',
        status: 'PLANNED',
        category: 'Cultural',
        description: '5-Day Grand Ganesh Utsav Celebrations featuring Dhol Tasha, Wing-wise Cultural Performances, Dumbtakshari, Senior & Kids Stage Events, Visarjan Procession & Gala Dinner.',
        registrationDeadline: '2026-09-10',
        nominationsRequired: true,
        assignedManagerIds: [],
        subEvents: [
          { id: 'sub-g-1', name: 'Ganesh Sthapana & Dhol Tasha', startDate: '2026-09-14', time: '01:00 PM', category: 'General', assignedManagerIds: [] },
          { id: 'sub-g-2', name: 'Wing Wise Performances', startDate: '2026-09-14', time: '07:30 PM', points: 'Winner: 100 pts / Runner: 70 pts / 3rd: 50 pts', assignedManagerIds: [] },
          { id: 'sub-g-3', name: 'Senior Citizen Event', startDate: '2026-09-15', time: '11:00 AM', category: 'Senior Citizens', points: 'Winner: 30 pts / Runner: 20 pts', assignedManagerIds: [] },
          { id: 'sub-g-4', name: 'Dumbtakshari', startDate: '2026-09-15', time: '07:30 PM', points: 'Winner: 50 pts / Runner: 30 pts', assignedManagerIds: [] },
          { id: 'sub-g-5', name: 'Kids Event (Below 10)', startDate: '2026-09-16', time: '05:00 PM', category: 'Below 10', assignedManagerIds: [] },
          { id: 'sub-g-6', name: 'Kids Stage Performances', startDate: '2026-09-16', time: '07:30 PM', category: 'Below 16', assignedManagerIds: [] },
          { id: 'sub-g-7', name: 'Adults Stage Performances', startDate: '2026-09-17', time: '07:30 PM', category: 'Above 16', points: 'Winner: 50 pts / Runner: 30 pts', assignedManagerIds: [] },
          { id: 'sub-g-8', name: 'Ganesh Visarjan & Dhol Tasha', startDate: '2026-09-18', time: '03:00 PM', assignedManagerIds: [] },
          { id: 'sub-g-9', name: 'Gala Dinner', startDate: '2026-09-18', time: '07:30 PM', assignedManagerIds: [] }
        ]
      },
      {
        id: 'evt-dandiya-2026',
        name: 'Dandiya Night',
        type: 'STANDALONE',
        startDate: '2026-10-17',
        endDate: '2026-10-17',
        venue: 'Main Ground',
        time: '07:00 PM onwards',
        status: 'PLANNED',
        category: 'Cultural',
        description: 'Grand Navratri Dandiya Raas Night with DJ music, traditional attire contest, food stalls, and prizes.',
        registrationDeadline: '2026-10-15',
        nominationsRequired: false,
        assignedManagerIds: [],
        subEvents: []
      },
      {
        id: 'evt-chess-2026',
        name: 'Chess Championship',
        type: 'STANDALONE',
        startDate: '2026-07-15',
        endDate: '2026-07-15',
        venue: 'Clubhouse Lobby',
        time: '10:00 AM onwards',
        status: 'COMPLETED',
        category: 'Sports',
        description: 'Annual Inter-Wing Chess Championship. Fast-paced mind sport battles to crown the Topaz Park Chess Master.',
        registrationDeadline: '2026-07-12',
        subEvents: []
      }
    ],
    announcements: [
      { id: 'ann-1', title: 'Topaz Park Season 2026-27 Announced!', date: '2026-07-28', scope: 'Global', scopeType: 'global', content: 'Welcome to Topaz Park SCOT Season 2026-27! Check out the event calendar for Carrom, Table Tennis, and Ganesh Festival.' },
      { id: 'ann-2', title: 'Carrom Tournament Registrations Open', date: '2026-07-29', scope: 'Event', scopeType: 'event', content: 'Registrations are officially open for the Carrom Tournament taking place on Sunday 9th August at the Clubhouse.' }
    ],
    leaderboard: [
      { wingId: 'wing-n', name: 'Wing N', letter: 'N', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-o', name: 'Wing O', letter: 'O', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-p', name: 'Wing P', letter: 'P', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-q', name: 'Wing Q', letter: 'Q', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-r', name: 'Wing R', letter: 'R', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-s', name: 'Wing S', letter: 'S', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-t', name: 'Wing T', letter: 'T', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-u', name: 'Wing U', letter: 'U', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-v', name: 'Wing V', letter: 'V', points: 0, wins: 0, events: 0, breakdown: {} },
      { wingId: 'wing-w', name: 'Wing W', letter: 'W', points: 0, wins: 0, events: 0, breakdown: {} }
    ],
    registrations: [],
    supportMessages: [],
    votes: [],
    competitions: [
      {
        id: 'comp-carrom-singles',
        eventId: 'evt-carrom-2026',
        name: 'Carrom Singles Above 16',
        type: 'knockout',
        fixtures: [
          { id: 'fix-1', round: 'Quarter Finals', playerA: 'Player Wing N', playerB: 'Player Wing P', scoreA: '', scoreB: '', winnerId: null },
          { id: 'fix-2', round: 'Quarter Finals', playerA: 'Player Wing O', playerB: 'Player Wing Q', scoreA: '3', scoreB: '1', winnerId: 'Player Wing O' },
          { id: 'fix-3', round: 'Quarter Finals', playerA: 'Player Wing R', playerB: 'Player Wing S', scoreA: '0', scoreB: '3', winnerId: 'Player Wing S' },
          { id: 'fix-4', round: 'Quarter Finals', playerA: 'Player Wing T', playerB: 'Player Wing V', scoreA: '3', scoreB: '2', winnerId: 'Player Wing T' }
        ]
      },
      {
        id: 'comp-tt-singles',
        eventId: 'evt-tt-2026',
        name: 'Table Tennis Above 16 Singles',
        type: 'league',
        teams: [
          { id: 'team-n', name: 'Wing N Player', wins: 0, points: 0 },
          { id: 'team-p', name: 'Wing P Player', wins: 0, points: 0 },
          { id: 'team-o', name: 'Wing O Player', wins: 0, points: 0 }
        ],
        fixtures: [
          { id: 'fix-tt-1', playerA: 'Wing N Player', playerB: 'Wing P Player', scoreA: '', scoreB: '', winnerId: null },
          { id: 'fix-tt-2', playerA: 'Wing P Player', playerB: 'Wing O Player', scoreA: '', scoreB: '', winnerId: null },
          { id: 'fix-tt-3', playerA: 'Wing N Player', playerB: 'Wing O Player', scoreA: '', scoreB: '', winnerId: null }
        ]
      }
    ],
    gallery: [
      {
        id: 'alb-ganesh-2025',
        title: 'Ganesh Utsav Memories',
        coverImage: './images/ganesh_cover.jpg',
        photoCount: 5,
        photos: [
          'https://picsum.photos/seed/ganesh1/1024/768',
          'https://picsum.photos/seed/ganesh2/1024/768',
          'https://picsum.photos/seed/ganesh3/1024/768',
          'https://picsum.photos/seed/ganesh4/1024/768',
          'https://picsum.photos/seed/ganesh5/1024/768'
        ]
      },
      {
        id: 'alb-carrom-2025',
        title: 'Carrom Tournament 2025',
        coverImage: './images/carrom_cover.jpg',
        photoCount: 7,
        photos: [
          'https://picsum.photos/seed/carrom1/1024/768',
          'https://picsum.photos/seed/carrom2/1024/768',
          'https://picsum.photos/seed/carrom3/1024/768',
          'https://picsum.photos/seed/carrom4/1024/768',
          'https://picsum.photos/seed/carrom5/1024/768',
          'https://picsum.photos/seed/carrom6/1024/768',
          'https://picsum.photos/seed/carrom7/1024/768'
        ]
      }
    ],
    tasks: [
      { id: 'task-1', title: 'Set up Badminton Nets', status: 'DONE', assignee: 'Sports Committee' },
      { id: 'task-2', title: 'Collect गणेश मूर्ति Deposit', status: 'IN_PROGRESS', assignee: 'Committee' }
    ]
  };
};

// Completely purge Local Storage on app load to ensure NO browser cached state persists
try {
  localStorage.clear();
} catch (e) {
  console.warn("Failed to clear local storage:", e);
}

export const StoreProvider = ({ children }) => {
  // Always initialize state fresh from getInitialState() — NO LOCAL STORAGE READ
  const [state, setStoreState] = useState(() => getInitialState());

  // Real-time Fetch & Synchronization from Google Sheets Live Database
  const fetchLiveData = () => {
    if (!GOOGLE_SHEETS_API_URL) return;

    fetch(`${GOOGLE_SHEETS_API_URL}?action=readAll`)
      .then(res => res.json())
      .then(data => {
        setStoreState(prev => {
          const fetchedUsers = (data.users || []).filter(Boolean);
          const hasAdmin = fetchedUsers.some(u => String(u.phone) === '9876543210' || String(u.role || '').toLowerCase() === 'admin');
          
          let mergedUsers = [...fetchedUsers];
          if (!hasAdmin) {
            const defaultAdmin = prev.users.find(u => String(u.phone) === '9876543210') || { id: 'user-admin', name: 'SCOT Admin', phone: '9876543210', pin: '3690', wing: '', wingId: '', flat: '', role: 'admin', isChampion: true, status: 'APPROVED', contributionStatus: 'PAID', registeredAt: '2026-07-30' };
            mergedUsers.unshift(defaultAdmin);
          }

          // Preserve any local pending signup requests in memory so registrations are never lost before Google Sheets syncs
          const localPendingUsers = (prev.users || []).filter(u => u.status === 'PENDING_APPROVAL');
          localPendingUsers.forEach(pu => {
            if (!mergedUsers.some(u => String(u.phone) === String(pu.phone) || String(u.id) === String(pu.id))) {
              mergedUsers.push(pu);
            }
          });

          // Deduplicate users by phone or ID
          const uniqueUsersMap = {};
          mergedUsers.forEach(u => {
            const key = String(u.phone || u.id);
            if (key) uniqueUsersMap[key] = u;
          });
          const finalUsers = Object.values(uniqueUsersMap).map(u => {
            const isShifted = u.role && (typeof u.role === 'number' || !isNaN(u.role)) || (u.flat && String(u.flat).startsWith('wing-'));
            if (isShifted) {
              const rawVal = String(u[""] || '').toUpperCase();
              let parsedStatus = 'PENDING_APPROVAL';
              if (rawVal.includes('APPROVED')) {
                parsedStatus = 'APPROVED';
              } else if (rawVal.includes('PENDING_APPROVAL')) {
                parsedStatus = 'PENDING_APPROVAL';
              } else {
                parsedStatus = (u.status === 'APPROVED' || u.contributionStatus === 'APPROVED') ? 'APPROVED' : 'PENDING_APPROVAL';
              }

              const cleanUser = {
                id: u.id,
                name: u.name,
                phone: u.phone,
                pin: u.pin,
                wing: u.wing,
                wingId: u.flat,
                flat: String(u.role),
                role: String(u.status || 'resident'),
                isChampion: u.profilePhoto === true || String(u.profilePhoto).toUpperCase() === 'TRUE',
                status: parsedStatus,
                contributionStatus: parsedStatus === 'APPROVED' ? 'PAID' : 'UNPAID',
                registeredAt: '2026-08-15',
                profilePhoto: '',
                fcmToken: ''
              };

              postToSheet('updateRow', 'Users', [
                cleanUser.id,
                cleanUser.name,
                cleanUser.phone,
                cleanUser.pin,
                cleanUser.wing,
                cleanUser.wingId,
                cleanUser.flat,
                cleanUser.role,
                cleanUser.isChampion,
                cleanUser.status,
                cleanUser.contributionStatus,
                cleanUser.registeredAt,
                cleanUser.profilePhoto,
                cleanUser.fcmToken
              ], 0, cleanUser.id);

              return cleanUser;
            }

            const validRoles = ['admin', 'scot_member', 'champion', 'wing_captain'];
            let parsedRole = String(u.role || '').toLowerCase();
            if (!validRoles.includes(parsedRole)) {
              parsedRole = 'scot_member';
            }

            const isAdmin = String(u.phone) === '9876543210' || parsedRole === 'admin';

            return {
              ...u,
              wing: isAdmin ? '' : (u.wing || ''),
              wingId: isAdmin ? '' : (u.wingId || (u.wing ? 'wing-' + String(u.wing).split(' ')[1].toLowerCase() : '')),
              flat: isAdmin ? '' : String(u.flat || ''),
              role: parsedRole,
              isChampion: true,
              status: u.status || 'PENDING_APPROVAL',
              contributionStatus: u.contributionStatus || (u.status === 'APPROVED' ? 'PAID' : 'UNPAID'),
              registeredAt: u.registeredAt || '2026-08-15',
              profilePhoto: typeof u.profilePhoto === 'string' ? u.profilePhoto : '',
              fcmToken: u.fcmToken || ''
            };
          });

          // Flush out any legacy non-organizer regular users from local memory and Google Sheet
          const usersToPurge = (data.users || []).filter(u => {
            if (!u) return false;
            const r = String(u.role || '').toLowerCase();
            if (String(u.phone) === '9876543210' || r === 'admin') return false;
            return r === 'resident' || (!['admin', 'scot_member', 'champion', 'wing_captain'].includes(r));
          });
          usersToPurge.forEach(u => {
            postToSheet('deleteRow', 'Users', null, 0, u.id);
          });

          // Map registrations with default values
          const rawRegs = (data.registrations || prev.registrations || []).filter(Boolean);
          const finalRegs = rawRegs.map(r => {
            let parsedMembers = [];
            try {
              if (r.groupMembers) {
                parsedMembers = typeof r.groupMembers === 'string' ? JSON.parse(r.groupMembers) : r.groupMembers;
              }
            } catch (e) {
              console.error("Failed to parse group members", e);
            }
            return {
              ...r,
              votingStatus: r.votingStatus || 'NOT_STARTED',
              mediaTrack: r.mediaTrack || '',
              groupMembers: Array.isArray(parsedMembers) ? parsedMembers : []
            };
          });

          // Map live events from Google Sheets if available
          let fetchedEvents = prev.events;
          if (data.events && Array.isArray(data.events) && data.events.length > 0) {
            fetchedEvents = data.events.map(e => {
              let parsedSubEvents = [];
              let parsedManagers = [];
              try {
                if (e.subEvents) parsedSubEvents = typeof e.subEvents === 'string' ? JSON.parse(e.subEvents) : e.subEvents;
                if (e.assignedManagerIds) parsedManagers = typeof e.assignedManagerIds === 'string' ? JSON.parse(e.assignedManagerIds) : e.assignedManagerIds;
              } catch (err) {}
              return {
                ...e,
                subEvents: Array.isArray(parsedSubEvents) ? parsedSubEvents : [],
                assignedManagerIds: Array.isArray(parsedManagers) ? parsedManagers : [],
                nominationsRequired: e.nominationsRequired === true || String(e.nominationsRequired).toUpperCase() === 'TRUE'
              };
            });
          }

          return {
            ...prev,
            events: fetchedEvents,
            users: finalUsers,
            registrations: finalRegs,
            announcements: (data.announcements || prev.announcements || []).filter(Boolean),
            supportMessages: (data.supportMessages || prev.supportMessages || []).filter(Boolean),
            votes: (data.votes || prev.votes || []).filter(Boolean)
          };
        });
      })
      .catch(err => console.error("Error loading Google Sheet database:", err));
  };

  // Run live sync immediately on load and every 15 seconds for real-time multi-device sync
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Write changes to Local Storage
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to write to Local Storage:", e);
    }
  }, [state]);

  // Helper to send HTTP requests to Google Sheets
  const postToSheet = async (action, sheetName, data, keyIndex = 0, keyValue = '') => {
    if (!GOOGLE_SHEETS_API_URL) return;
    try {
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sheetName, data, keyIndex, keyValue })
      });
    } catch (e) {
      console.error("Failed to sync change to Google Sheet:", e);
    }
  };

  // =========================================================================
  // 🏠 WING COMMANDER FLAT DUES — READ-ONLY FETCH (No writes ever)
  // =========================================================================
  useEffect(() => {
    if (!WING_COMMANDER_API_URL) return;
    fetch(`${WING_COMMANDER_API_URL}?action=getAdminData`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.allFlats) {
          setStoreState(prev => ({
            ...prev,
            paidFlats: data.allFlats.filter(Boolean)
          }));
        }
      })
      .catch(err => console.warn("Failed to load Wing Commander flat dues data (read-only):", err));
  }, []);

  // Validate a participant's flat contribution against the Wing Commander database
  const validateFlatDues = (wingLetter, flatNo) => {
    const wl = String(wingLetter || '').trim().toUpperCase();
    const fn = String(flatNo || '').trim().toUpperCase();
    if (!wl || !fn) return { valid: false, reason: 'Wing letter and flat number are required.' };

    const match = state.paidFlats.find(f => {
      const fw = String(f.wing || '').trim().toUpperCase();
      const ff = String(f.flat || '').trim().toUpperCase();
      return fw === wl && ff === fn;
    });

    if (!match) return { valid: false, reason: `No record found for Wing ${wl}, Flat ${fn}.` };
    if (String(match.paid || '').toLowerCase() === 'yes') {
      return { valid: true, reason: `Flat ${wl}-${fn} dues verified (Paid).`, mode: match.mode || '', amount: match.amount || '' };
    }
    return { valid: false, reason: `Flat ${wl}-${fn} dues are UNPAID.` };
  };

  const login = (phone, pin) => {
    const user = state.users.find(u => String(u.phone) === String(phone) && String(u.pin) === String(pin));
    if (!user) return { success: false, error: 'Invalid Phone Number or PIN!' };
    if (user.status === 'PENDING_APPROVAL') {
      return { success: false, error: 'Sign in blocked: Account is pending Admin approval of flat contribution.' };
    }
    setStoreState(prev => ({ ...prev, currentUser: user }));
    return { success: true, user };
  };

  const logout = () => {
    setStoreState(prev => ({ ...prev, currentUser: null }));
  };

  const register = (name, wingId, flat, phone, pin, roleInput = 'scot_member', fcmToken = '') => {
    const wingObj = state.wings.find(w => w.id === wingId);
    let assignedRole = 'scot_member';
    if (typeof roleInput === 'string' && (roleInput === 'admin' || roleInput === 'scot_member' || roleInput === 'champion' || roleInput === 'wing_captain')) {
      assignedRole = roleInput;
    } else if (typeof roleInput === 'boolean') {
      assignedRole = roleInput ? 'scot_member' : 'wing_captain';
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      phone,
      pin,
      wing: wingObj ? wingObj.name : 'Wing N',
      wingId,
      flat,
      role: assignedRole,
      isChampion: true,
      status: 'PENDING_APPROVAL',
      contributionStatus: 'UNPAID',
      registeredAt: new Date().toISOString().split('T')[0],
      fcmToken
    };
    setStoreState(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));

    postToSheet('writeRow', 'Users', [
      newUser.id,
      newUser.name,
      newUser.phone,
      newUser.pin,
      newUser.wing,
      newUser.wingId,
      newUser.flat,
      newUser.role,
      newUser.isChampion ? 'TRUE' : 'FALSE',
      newUser.status,
      newUser.contributionStatus,
      newUser.registeredAt,
      newUser.profilePhoto || '',
      newUser.fcmToken || ''
    ]);

    return newUser;
  };

  const approveUser = (id) => {
    setStoreState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, status: 'APPROVED', contributionStatus: 'PAID' } : u)
    }));

    const updatedData = Array(14).fill(null);
    updatedData[9] = 'APPROVED';
    updatedData[10] = 'PAID';
    postToSheet('updateRow', 'Users', updatedData, 0, id);
  };

  const rejectUser = (id) => {
    setStoreState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id)
    }));
    postToSheet('deleteRow', 'Users', null, 0, id);
  };

  const registerForEvent = (eventId, subEventId, name, gender, ageCategory, groupMembers = []) => {
    if (!state.currentUser) return { success: false, error: 'Auth required' };
    const registeredByUserId = state.currentUser.id;

    const isAlready = state.registrations.some(
      r => r.eventId === eventId && r.subEventId === subEventId && String(r.name || '').toLowerCase() === String(name || '').toLowerCase()
    );
    if (isAlready) return { success: false, error: `"${name}" is already registered for this event category!` };

    // Find the event/sub-event configuration to enforce limits
    const event = state.events.find(e => e.id === eventId);
    let subEvent = null;
    if (event && subEventId) {
      subEvent = event.subEvents?.find(s => s.id === subEventId);
    }
    
    // Check group config rules if it's a group sub-event
    const targetConfig = subEvent || event;
    const isGroup = targetConfig?.regType === 'GROUP_REQUIRED' || targetConfig?.regType === 'GROUP_OPTIONAL' || targetConfig?.regType === 'GROUP';
    const requireMembers = targetConfig?.regType === 'GROUP_REQUIRED' || targetConfig?.requireMembers;

    if (isGroup) {
      // Validate wing quota limits
      const userWing = state.currentUser.wing || 'Main';
      const existingWingGroupsCount = state.registrations.filter(r => {
        if (r.eventId !== eventId || r.subEventId !== subEventId) return false;
        // Check if creator is from the same wing
        const creator = state.users.find(u => u.id === r.registeredByUserId);
        return creator && creator.wing === userWing;
      }).length;

      const maxGroupsPerWing = targetConfig?.maxGroupsPerWing || 2;
      if (existingWingGroupsCount >= maxGroupsPerWing) {
        return { success: false, error: `Registration Limit Exceeded: Wing ${userWing} already has ${existingWingGroupsCount} group(s) registered for this category.` };
      }

      // Validate roster sizes
      const minGroupSize = targetConfig?.minGroupSize || 2;
      const maxGroupSize = targetConfig?.maxGroupSize || 5;

      if (requireMembers) {
        if (!groupMembers || groupMembers.length < minGroupSize || groupMembers.length > maxGroupSize) {
          return { success: false, error: `Invalid Group Size: Roster must contain between ${minGroupSize} and ${maxGroupSize} participants.` };
        }
      } else if (groupMembers && groupMembers.length > 0) {
        if (groupMembers.length > maxGroupSize) {
          return { success: false, error: `Invalid Group Size: Optional roster cannot exceed ${maxGroupSize} participants.` };
        }
      }
    }

    const newReg = {
      id: `reg-${Date.now()}`,
      eventId,
      subEventId: subEventId || '',
      registeredByUserId,
      name,
      gender,
      ageCategory,
      status: 'PENDING',
      registeredAt: new Date().toISOString(),
      votingStatus: 'NOT_STARTED',
      mediaTrack: '',
      groupMembers: groupMembers || []
    };

    setStoreState(prev => ({
      ...prev,
      registrations: [...prev.registrations, newReg]
    }));

    postToSheet('writeRow', 'Registrations', [
      newReg.id, 
      newReg.eventId, 
      newReg.subEventId, 
      newReg.registeredByUserId, 
      newReg.name, 
      newReg.gender, 
      newReg.ageCategory, 
      newReg.status, 
      newReg.registeredAt, 
      newReg.votingStatus, 
      newReg.mediaTrack,
      JSON.stringify(newReg.groupMembers)
    ]);

    return { success: true };
  };

  const withdrawRegistration = (regId) => {
    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.filter(r => r.id !== regId)
    }));
    postToSheet('deleteRow', 'Registrations', null, 0, regId);
  };

  const approveEventRegistration = (regId) => {
    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.map(r => r.id === regId ? { ...r, status: 'APPROVED' } : r)
    }));

    const updatedData = Array(12).fill(null);
    updatedData[7] = 'APPROVED';
    postToSheet('updateRow', 'Registrations', updatedData, 0, regId);
  };

  const rejectEventRegistration = (regId) => {
    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.map(r => r.id === regId ? { ...r, status: 'REJECTED' } : r)
    }));

    const updatedData = Array(12).fill(null);
    updatedData[7] = 'REJECTED';
    postToSheet('updateRow', 'Registrations', updatedData, 0, regId);
  };

  const postAnnouncement = (title, scope, content, image = '') => {
    const newAnn = {
      id: `ann-${Date.now()}`,
      title,
      scope,
      scopeType: scope.includes('Wing') ? 'wing' : (scope.includes('Event') ? 'event' : 'global'),
      content,
      date: new Date().toISOString().split('T')[0],
      image
    };
    setStoreState(prev => ({
      ...prev,
      announcements: [newAnn, ...prev.announcements]
    }));

    postToSheet('writeRow', 'Announcements', [
      newAnn.id, newAnn.title, newAnn.scope, newAnn.scopeType, newAnn.content, newAnn.date, newAnn.image
    ]);

    // Send Firebase push notifications to all users via Apps Script
    postToSheet('sendPush', null, [title, content]);
  };

  const editAnnouncement = (id, title, scope, content, image = null) => {
    const scopeType = scope.includes('Wing') ? 'wing' : (scope.includes('Event') ? 'event' : 'global');
    setStoreState(prev => ({
      ...prev,
      announcements: prev.announcements.map(a => a.id === id ? { 
        ...a, 
        title, 
        scope, 
        scopeType,
        content,
        image: image !== null ? image : a.image
      } : a)
    }));

    // Columns: id(0), title(1), scope(2), scopeType(3), content(4), date(5), image(6)
    const updatedData = [id, title, scope, scopeType, content, null];
    if (image !== null) {
      updatedData.push(image);
    }
    postToSheet('updateRow', 'Announcements', updatedData, 0, id);
  };

  const deleteAnnouncement = (id) => {
    setStoreState(prev => ({
      ...prev,
      announcements: prev.announcements.filter(a => a.id !== id)
    }));
    postToSheet('deleteRow', 'Announcements', null, 0, id);
  };

  const recordFixtureScore = (compId, fixtureId, scoreA, scoreB, winnerId) => {
    setStoreState(prev => ({
      ...prev,
      competitions: prev.competitions.map(c => {
        if (c.id !== compId) return c;
        return {
          ...c,
          fixtures: c.fixtures.map(f => {
            if (f.id !== fixtureId) return f;
            return { ...f, scoreA, scoreB, winnerId };
          })
        };
      })
    }));

    postToSheet('upsertRow', 'Scores', [fixtureId, compId, scoreA, scoreB, winnerId || ''], 0, fixtureId);
  };

  const resetStore = () => {
    localStorage.removeItem(STORE_KEY);
    setStoreState(getInitialState());
  };

  const addPhotoToAlbum = (albumId, photoBase64) => {
    setStoreState(prev => ({
      ...prev,
      gallery: prev.gallery.map(alb => {
        if (alb.id !== albumId) return alb;
        return {
          ...alb,
          photoCount: alb.photoCount + 1,
          photos: [...alb.photos, photoBase64]
        };
      })
    }));
  };

  const updateAlbumCover = (albumId, photoBase64) => {
    setStoreState(prev => ({
      ...prev,
      gallery: prev.gallery.map(alb => {
        if (alb.id !== albumId) return alb;
        return {
          ...alb,
          coverImage: photoBase64
        };
      })
    }));
  };

  const createNewAlbum = (title, coverBase64) => {
    const newAlb = {
      id: `alb-${Date.now()}`,
      title,
      coverImage: coverBase64,
      photoCount: 0,
      photos: []
    };
    setStoreState(prev => ({
      ...prev,
      gallery: [...prev.gallery, newAlb]
    }));
  };

  const updateProfile = (name, phone, profilePhoto) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setStoreState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === userId) {
          return { ...u, name, phone, profilePhoto };
        }
        return u;
      });
      const updatedCurrentUser = { ...prev.currentUser, name, phone, profilePhoto };
      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrentUser
      };
    });

    const updatedData = Array(13).fill(null);
    updatedData[1] = name;
    updatedData[2] = phone;
    if (profilePhoto) updatedData[12] = profilePhoto;
    postToSheet('updateRow', 'Users', updatedData, 0, userId);
  };

  const updateUserFcmToken = (userId, token) => {
    setStoreState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === userId) {
          return { ...u, fcmToken: token };
        }
        return u;
      });
      const updatedCurrentUser = prev.currentUser?.id === userId 
        ? { ...prev.currentUser, fcmToken: token } 
        : prev.currentUser;
      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrentUser
      };
    });

    const updatedData = Array(14).fill(null);
    updatedData[13] = token;
    postToSheet('updateRow', 'Users', updatedData, 0, userId);
  };

  const sendSupportMessage = (message, senderDetail) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      message,
      senderDetail: senderDetail || 'Anonymous Resident',
      timestamp: new Date().toLocaleString()
    };
    setStoreState(prev => ({
      ...prev,
      supportMessages: [newMsg, ...(prev.supportMessages || [])]
    }));

    postToSheet('writeRow', 'SupportMessages', [
      newMsg.id, newMsg.message, newMsg.timestamp, newMsg.senderDetail
    ]);
  };

  const deleteSupportMessage = (msgId) => {
    setStoreState(prev => ({
      ...prev,
      supportMessages: (prev.supportMessages || []).filter(m => m.id !== msgId)
    }));

    postToSheet('deleteRow', 'SupportMessages', null, 0, msgId);
  };

  const castParticipantVote = (eventId, subEventId, registrationId, rating) => {
    if (!state.currentUser) return { success: false, error: 'Auth required' };
    const userId = state.currentUser.id;

    const targetReg = state.registrations.find(r => r.id === registrationId);
    if (!targetReg || targetReg.votingStatus !== 'OPEN') {
      return { success: false, error: 'Voting is not open for this performance!' };
    }

    const timestamp = new Date().toISOString();
    const existingIndex = state.votes.findIndex(
      v => v.registrationId === registrationId && v.userId === userId
    );

    let updatedVotes = [...state.votes];
    let targetVoteId;

    if (existingIndex > -1) {
      targetVoteId = updatedVotes[existingIndex].id;
      updatedVotes[existingIndex] = {
        ...updatedVotes[existingIndex],
        rating,
        timestamp
      };
    } else {
      targetVoteId = `vt-${Date.now()}`;
      updatedVotes.push({
        id: targetVoteId,
        eventId,
        subEventId: subEventId || '',
        registrationId,
        userId,
        rating,
        timestamp
      });
    }

    setStoreState(prev => ({
      ...prev,
      votes: updatedVotes
    }));

    postToSheet('upsertRow', 'Votes', [
      targetVoteId,
      eventId,
      subEventId || '',
      registrationId,
      userId,
      rating,
      timestamp
    ], 0, targetVoteId);

    return { success: true };
  };

  const toggleParticipantVoting = (registrationId, status) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      return { success: false, error: 'Admin permission required' };
    }

    const targetReg = state.registrations.find(r => r.id === registrationId);
    if (!targetReg) return { success: false, error: 'Registration not found' };

    const { eventId, subEventId } = targetReg;

    setStoreState(prev => {
      const updatedRegs = prev.registrations.map(r => {
        if (status === 'OPEN' && r.subEventId === subEventId && r.id !== registrationId && r.votingStatus === 'OPEN') {
          const updatedRow = [
            r.id, r.eventId, r.subEventId, r.registeredByUserId, r.name, r.gender, r.ageCategory, r.status, r.registeredAt, 'CLOSED', r.mediaTrack || '',
            JSON.stringify(r.groupMembers || [])
          ];
          postToSheet('updateRow', 'Registrations', updatedRow, 0, r.id);
          return { ...r, votingStatus: 'CLOSED' };
        }
        
        if (r.id === registrationId) {
          return { ...r, votingStatus: status };
        }
        return r;
      });

      return {
        ...prev,
        registrations: updatedRegs
      };
    });

    const updatedTargetRow = [
      targetReg.id,
      targetReg.eventId,
      targetReg.subEventId,
      targetReg.registeredByUserId,
      targetReg.name,
      targetReg.gender,
      targetReg.ageCategory,
      targetReg.status,
      targetReg.registeredAt,
      status,
      targetReg.mediaTrack || '',
      JSON.stringify(targetReg.groupMembers || [])
    ];
    postToSheet('updateRow', 'Registrations', updatedTargetRow, 0, registrationId);

    return { success: true };
  };

  const uploadRegistrationMedia = (registrationId, mediaDataUrl) => {
    const targetReg = state.registrations.find(r => r.id === registrationId);
    if (!targetReg) return { success: false, error: 'Registration not found' };

    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.map(r => 
        r.id === registrationId ? { ...r, mediaTrack: mediaDataUrl } : r
      )
    }));

    const updatedRow = [
      targetReg.id,
      targetReg.eventId,
      targetReg.subEventId,
      targetReg.registeredByUserId,
      targetReg.name,
      targetReg.gender,
      targetReg.ageCategory,
      targetReg.status,
      targetReg.registeredAt,
      targetReg.votingStatus || 'NOT_STARTED',
      mediaDataUrl || '',
      JSON.stringify(targetReg.groupMembers || [])
    ];
    postToSheet('updateRow', 'Registrations', updatedRow, 0, registrationId);

    return { success: true };
  };

  const publishParticipantResults = (eventId, subEventId) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      return { success: false, error: 'Admin permission required' };
    }

    const event = state.events.find(e => e.id === eventId);
    const subEvent = event?.subEvents?.find(s => s.id === subEventId);
    const subName = subEvent ? subEvent.name : (event ? event.name : 'Sub Event');

    const approvedRegs = state.registrations.filter(
      r => r.eventId === eventId && r.subEventId === subEventId && r.status === 'APPROVED'
    );

    if (approvedRegs.length === 0) {
      return { success: false, error: 'No participants registered for this category!' };
    }

    const standings = approvedRegs.map(reg => {
      const regVotes = state.votes.filter(v => v.registrationId === reg.id);
      const totalVotes = regVotes.length;
      const averageRating = totalVotes > 0 
        ? (regVotes.reduce((sum, v) => sum + v.rating, 0) / totalVotes).toFixed(1)
        : '0.0';
      
      const wingLetter = reg.name.match(/\(([^)]+)\)/)?.[1] || '';
      return { name: reg.name, wing: wingLetter, avg: parseFloat(averageRating), count: totalVotes };
    });

    standings.sort((a, b) => b.avg - a.avg || b.count - a.count);

    const standingsSummary = standings.map(
      (s, idx) => `${idx + 1}. ${s.name} ${s.wing ? `(${s.wing})` : ''} — ⭐ ${s.avg} / 5.0 (${s.count} votes)`
    ).join('\n');

    const title = `Live Voting Results Bulletin: ${subName}`;
    const content = `Official live audience voting results are in for ${subName}!\n\nFinal Standings:\n${standingsSummary}\n\nThank you to everyone who voted!`;

    postAnnouncement(title, `Event: ${eventId}`, content);

    return { success: true };
  };

  // Event Management with Real-Time Google Sheets Database Sync
  const saveEvent = (finalEvent) => {
    setStoreState(prev => {
      const exists = prev.events.some(e => e.id === finalEvent.id);
      const nextEvents = exists 
        ? prev.events.map(e => e.id === finalEvent.id ? finalEvent : e)
        : [...prev.events, finalEvent];
      return { ...prev, events: nextEvents };
    });

    const rowData = [
      finalEvent.id,
      finalEvent.name,
      finalEvent.type,
      finalEvent.startDate,
      finalEvent.endDate || finalEvent.startDate,
      finalEvent.venue,
      finalEvent.time,
      finalEvent.status || 'OPEN',
      finalEvent.category || 'Sports',
      finalEvent.description || '',
      finalEvent.registrationDeadline || finalEvent.startDate,
      JSON.stringify(finalEvent.subEvents || []),
      JSON.stringify(finalEvent.assignedManagerIds || []),
      finalEvent.nominationsRequired ? 'TRUE' : 'FALSE',
      finalEvent.winnerPoints || '',
      finalEvent.runnerUpPoints || '',
      finalEvent.points || '',
      finalEvent.rules || ''
    ];

    postToSheet('upsertRow', 'Events', rowData, 0, finalEvent.id);
  };

  const deleteEvent = (eventId) => {
    setStoreState(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== eventId)
    }));

    postToSheet('deleteRow', 'Events', null, 0, eventId);
  };

  // Permission Helper Functions
  const canEditEvent = (user, event) => {
    if (!user || !event) return false;
    if (user.role === 'admin') return true;
    
    const mainManagers = event.assignedManagerIds || [];
    if (mainManagers.includes(user.id)) return true;

    const subEvents = event.subEvents || [];
    return subEvents.some(sub => (sub.assignedManagerIds || []).includes(user.id));
  };

  const canEditSubEvent = (user, event, subEvent) => {
    if (!user || !event) return false;
    if (user.role === 'admin') return true;

    const mainManagers = event.assignedManagerIds || [];
    if (mainManagers.includes(user.id)) return true;

    const subManagers = subEvent?.assignedManagerIds || [];
    return subManagers.includes(user.id);
  };

  const canSubmitNominations = (user, event) => {
    if (!user || !event) return false;
    if (event.nominationsRequired === false) return false;
    return user.role === 'admin' || user.role === 'champion' || user.role === 'scot_member' || user.role === 'wing_captain';
  };

  return (
    <StoreContext.Provider value={{
      state,
      login,
      logout,
      register,
      approveUser,
      registerForEvent,
      withdrawRegistration,
      approveEventRegistration,
      postAnnouncement,
      recordFixtureScore,
      resetStore,
      setStoreState,
      addPhotoToAlbum,
      updateAlbumCover,
      createNewAlbum,
      updateProfile,
      rejectUser,
      rejectEventRegistration,
      deleteAnnouncement,
      editAnnouncement,
      updateUserFcmToken,
      sendSupportMessage,
      deleteSupportMessage,
      castParticipantVote,
      toggleParticipantVoting,
      uploadRegistrationMedia,
      publishParticipantResults,
      validateFlatDues,
      canEditEvent,
      canEditSubEvent,
      canSubmitNominations,
      saveEvent,
      deleteEvent
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
