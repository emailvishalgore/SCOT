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
    events: [],
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

const getInitialCachedState = () => {
  const base = getInitialState();
  try {
    const cachedEvents = localStorage.getItem('scot_events_cache');
    if (cachedEvents) {
      const parsed = JSON.parse(cachedEvents);
      if (Array.isArray(parsed) && parsed.length > 0) {
        base.events = parsed;
      }
    }
    const cachedRegs = localStorage.getItem('scot_regs_cache');
    if (cachedRegs) {
      const parsed = JSON.parse(cachedRegs);
      if (Array.isArray(parsed)) {
        base.registrations = parsed;
      }
    }
    const cachedUsers = localStorage.getItem('scot_users_cache');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        base.users = parsed;
      }
    }
    const cachedAuthUser = localStorage.getItem('scot_auth_user');
    if (cachedAuthUser) {
      const parsed = JSON.parse(cachedAuthUser);
      if (parsed && parsed.id) {
        // Match with latest cached users if possible
        const matched = (base.users || []).find(u => String(u.id) === String(parsed.id) || String(u.phone) === String(parsed.phone));
        base.currentUser = matched || parsed;
      }
    }
  } catch (e) {
    console.warn("Failed reading cached state:", e);
  }
  return base;
};

export const StoreProvider = ({ children }) => {
  // Initialize state with cache for instant 0ms load
  const [state, setStoreState] = useState(() => getInitialCachedState());

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

          // Map locally approved users by multiple robust keys so Google Sheets polling lag never reverts an approved user
          const localApprovedUserMap = {};
          (prev.users || []).forEach(u => {
            if (u.status === 'APPROVED') {
              const kPhone = String(u.phone || '').replace(/\D/g, '');
              const kId = String(u.id || '').trim();
              const kName = String(u.name || '').trim().toLowerCase();
              if (kPhone) localApprovedUserMap[kPhone] = u;
              if (kId) localApprovedUserMap[kId] = u;
              if (kName) localApprovedUserMap['name_' + kName] = u;
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

              const kPhone = String(u.phone || '').replace(/\D/g, '');
              const kId = String(u.id || '').trim();
              const kName = String(u.name || '').trim().toLowerCase();
              const prevUser = (kPhone && localApprovedUserMap[kPhone]) ||
                               (kId && localApprovedUserMap[kId]) ||
                               (kName && localApprovedUserMap['name_' + kName]);

              const isChamp = u.profilePhoto === true || String(u.profilePhoto).toUpperCase() === 'TRUE' || (prevUser && prevUser.isChampion);
              const validRoles = ['admin', 'scot_member', 'champion', 'wing_captain'];
              let cleanRole = (prevUser && prevUser.role && validRoles.includes(prevUser.role)) ? prevUser.role : (isChamp ? 'wing_captain' : 'scot_member');

              const cleanUser = {
                id: u.id,
                name: u.name,
                phone: u.phone,
                pin: u.pin,
                wing: u.wing,
                wingId: u.flat,
                flat: String(u.role),
                role: cleanRole,
                isChampion: isChamp,
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

            const cPhone = String(u.phone || '').replace(/\D/g, '');
            const cId = String(u.id || '').trim();
            const cName = String(u.name || '').trim().toLowerCase();

            const prevApproved = (cPhone && localApprovedUserMap[cPhone]) || 
                               (cId && localApprovedUserMap[cId]) || 
                               (cName && localApprovedUserMap['name_' + cName]);

            const validRoles = ['admin', 'scot_member', 'champion', 'wing_captain'];
            let parsedRole = String(u.role || '').toLowerCase();
            if (!validRoles.includes(parsedRole)) {
              parsedRole = 'scot_member';
            }

            if (prevApproved && prevApproved.role) {
              parsedRole = prevApproved.role;
            }

            const isAdmin = String(u.phone) === '9876543210' || parsedRole === 'admin';
            const sheetStatus = String(u.status || '').toUpperCase();
            const isApprovedInSheet = sheetStatus.includes('APPROVED');
            const finalStatus = (prevApproved || isApprovedInSheet) ? 'APPROVED' : (u.status || 'PENDING_APPROVAL');

            return {
              ...u,
              wing: isAdmin ? '' : (u.wing || ''),
              wingId: isAdmin ? '' : (u.wingId || (u.wing ? 'wing-' + String(u.wing).split(' ')[1].toLowerCase() : '')),
              flat: isAdmin ? '' : String(u.flat || ''),
              role: parsedRole,
              isChampion: true,
              status: finalStatus,
              contributionStatus: finalStatus === 'APPROVED' ? 'PAID' : 'UNPAID',
              registeredAt: u.registeredAt || '2026-08-15',
              profilePhoto: typeof u.profilePhoto === 'string' ? u.profilePhoto : '',
              fcmToken: u.fcmToken || ''
            };
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

          // Map live events from Google Sheets — Sheet is the AUTHORITATIVE source
          let fetchedEvents = prev.events; // fallback only if data.events is undefined/null (API not updated)
          if (data.events && Array.isArray(data.events)) {
            // Google Sheets returned events data — this is the single source of truth
            const sheetEventsMap = {};
            data.events.forEach(e => {
              if (!e || !e.id) return;
              let parsedSubEvents = [];
              let parsedManagers = [];
              try {
                if (e.subEvents) {
                  if (typeof e.subEvents === 'string') {
                    const cleanSubStr = e.subEvents.trim().replace(/&quot;/g, '"').replace(/\\"/g, '"');
                    parsedSubEvents = JSON.parse(cleanSubStr);
                  } else {
                    parsedSubEvents = e.subEvents;
                  }
                }
                if (e.assignedManagerIds) {
                  if (typeof e.assignedManagerIds === 'string') {
                    const cleanMgrStr = e.assignedManagerIds.trim().replace(/&quot;/g, '"').replace(/\\"/g, '"');
                    parsedManagers = JSON.parse(cleanMgrStr);
                  } else {
                    parsedManagers = e.assignedManagerIds;
                  }
                }
              } catch (err) {
                console.warn("Failed to parse subEvents/managers for event:", e.id, err);
              }

              sheetEventsMap[e.id] = {
                ...e,
                subEvents: Array.isArray(parsedSubEvents) ? parsedSubEvents : [],
                assignedManagerIds: Array.isArray(parsedManagers) ? parsedManagers : [],
                nominationsRequired: e.nominationsRequired === true || String(e.nominationsRequired).toUpperCase() === 'TRUE'
              };
            });

            // Start with all sheet events as the base (authoritative)
            const mergedEventsList = Object.values(sheetEventsMap);
            const sheetIds = new Set(Object.keys(sheetEventsMap));

            // Add any locally-created events that haven't synced to the sheet yet
            // (events created in this session that may not have reached Google Sheets)
            prev.events.forEach(pe => {
              if (!sheetIds.has(pe.id) && pe.id.startsWith('evt-') && pe._localOnly) {
                mergedEventsList.push(pe);
              }
            });

            fetchedEvents = mergedEventsList;
          }

          try {
            if (fetchedEvents && fetchedEvents.length > 0) {
              localStorage.setItem('scot_events_cache', JSON.stringify(fetchedEvents));
            }
            if (finalRegs && finalRegs.length > 0) {
              localStorage.setItem('scot_regs_cache', JSON.stringify(finalRegs));
            }
            if (finalUsers && finalUsers.length > 0) {
              localStorage.setItem('scot_users_cache', JSON.stringify(finalUsers));
            }
          } catch (e) {
            console.warn("Failed caching live data:", e);
          }

          // Keep current user session updated with live role/status changes from Google Sheets
          let updatedCurrentUser = prev.currentUser;
          if (prev.currentUser) {
            const matchedLiveUser = finalUsers.find(
              u => String(u.id) === String(prev.currentUser.id) || String(u.phone) === String(prev.currentUser.phone)
            );
            if (matchedLiveUser) {
              updatedCurrentUser = matchedLiveUser;
              try {
                localStorage.setItem('scot_auth_user', JSON.stringify(matchedLiveUser));
              } catch (e) {}
            }
          }

          return {
            ...prev,
            currentUser: updatedCurrentUser,
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

  // Run live sync immediately on load and every 5 seconds for fast real-time multi-device sync
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
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
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, sheetName, data, keyIndex, keyValue }),
        redirect: 'follow'
      });
      if (!response.ok) {
        console.error(`Google Sheet sync failed [${action}/${sheetName}]: HTTP ${response.status}`);
      }
    } catch (e) {
      // If CORS blocks the response, fall back to no-cors mode (fire-and-forget)
      try {
        await fetch(GOOGLE_SHEETS_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action, sheetName, data, keyIndex, keyValue })
        });
      } catch (e2) {
        console.error("Failed to sync change to Google Sheet:", e2);
      }
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
    try {
      localStorage.setItem('scot_auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn("Failed caching auth user:", e);
    }
    setStoreState(prev => ({ ...prev, currentUser: user }));
    return { success: true, user };
  };

  const logout = () => {
    try {
      localStorage.removeItem('scot_auth_user');
    } catch (e) {
      console.warn("Failed clearing auth user:", e);
    }
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
    let targetUser = state.users.find(u => u.id === id);
    if (!targetUser) return;

    const approvedUser = { ...targetUser, status: 'APPROVED', contributionStatus: 'PAID' };

    setStoreState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? approvedUser : u)
    }));

    const fullRowData = [
      approvedUser.id,
      approvedUser.name,
      approvedUser.phone,
      approvedUser.pin,
      approvedUser.wing || '',
      approvedUser.wingId || '',
      approvedUser.flat || '',
      approvedUser.role || 'scot_member',
      approvedUser.isChampion ? 'TRUE' : 'FALSE',
      'APPROVED',
      'PAID',
      approvedUser.registeredAt || '2026-08-15',
      approvedUser.profilePhoto || '',
      approvedUser.fcmToken || ''
    ];
    postToSheet('updateRow', 'Users', fullRowData, 0, id);
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

    // Helper to extract flat numbers from a text string (e.g. "Flat 402" or "(Wing N, Flat 402)")
    const extractFlats = (text) => {
      const matches = String(text || '').match(/Flat\s*[:#-]?\s*(\d{3})/gi) || [];
      return matches.map(m => m.replace(/\D/g, '')).filter(Boolean);
    };

    // Helper to extract individual player names from string
    const extractNames = (text) => {
      const clean = String(text || '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/•.*$/g, '');
      return clean.split(/&|,|and/i).map(s => s.trim().toLowerCase()).filter(Boolean);
    };

    const newFlats = extractFlats(name);
    (groupMembers || []).forEach(m => {
      extractFlats(m).forEach(f => {
        if (!newFlats.includes(f)) newFlats.push(f);
      });
    });

    const newNames = extractNames(name);
    (groupMembers || []).forEach(m => {
      extractNames(m).forEach(n => {
        if (!newNames.includes(n)) newNames.push(n);
      });
    });

    // 🚫 SMART DUPLICATE PREVENTION
    const categoryRegs = (state.registrations || []).filter(
      r => r.eventId === eventId && r.subEventId === subEventId && r.status !== 'REJECTED'
    );

    for (const r of categoryRegs) {
      // 1. Exact string match
      if (String(r.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase()) {
        return { success: false, error: `Duplicate Entry: "${name}" is already registered for this event category!` };
      }

      // 2. Flat & Name match (cross-partner / duplicate checks)
      const existingFlats = extractFlats(r.name);
      (r.groupMembers || []).forEach(m => {
        extractFlats(m).forEach(f => {
          if (!existingFlats.includes(f)) existingFlats.push(f);
        });
      });

      const existingNames = extractNames(r.name);
      (r.groupMembers || []).forEach(m => {
        extractNames(m).forEach(n => {
          if (!existingNames.includes(n)) existingNames.push(n);
        });
      });

      for (const nf of newFlats) {
        if (existingFlats.includes(nf)) {
          const sharedName = newNames.some(nn => existingNames.some(en => en.includes(nn) || nn.includes(en)));
          if (sharedName) {
            return { 
              success: false, 
              error: `Duplicate Entry: Flat ${nf} is already registered in this category (${r.name})!` 
            };
          }
        }
      }
    }

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

    // ⚡ AUTOMATED FLAT DUES VERIFICATION & AUTO-APPROVAL
    const userWingLetter = state.currentUser.wing ? String(state.currentUser.wing).replace(/Wing\s*/i, '').trim() : 'N';
    let isAutoApproved = false;
    let autoApproveReason = '';

    if (newFlats.length > 0 && state.paidFlats && state.paidFlats.length > 0) {
      const results = newFlats.map(fn => validateFlatDues(userWingLetter, fn));
      const allPaid = results.every(res => res.valid);
      if (allPaid) {
        isAutoApproved = true;
        autoApproveReason = `Flat dues verified for Wing ${userWingLetter} (${newFlats.join(', ')})`;
      } else {
        const unpaidReasons = results.filter(r => !r.valid).map(r => r.reason).join('; ');
        autoApproveReason = unpaidReasons;
      }
    }

    const initialStatus = isAutoApproved ? 'APPROVED' : 'PENDING';

    const newReg = {
      id: `reg-${Date.now()}`,
      eventId,
      subEventId: subEventId || '',
      registeredByUserId,
      name,
      gender,
      ageCategory,
      status: initialStatus,
      registeredAt: new Date().toISOString(),
      votingStatus: 'NOT_STARTED',
      mediaTrack: '',
      groupMembers: groupMembers || []
    };

    setStoreState(prev => {
      const nextRegs = [...prev.registrations, newReg];
      try {
        localStorage.setItem('scot_regs_cache', JSON.stringify(nextRegs));
      } catch (e) {
        console.warn("Failed caching new registration:", e);
      }
      return { ...prev, registrations: nextRegs };
    });

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

    return { 
      success: true, 
      autoApproved: isAutoApproved, 
      status: initialStatus,
      reason: autoApproveReason, 
      registration: newReg 
    };
  };

  const withdrawRegistration = (regId) => {
    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.filter(r => r.id !== regId)
    }));
    postToSheet('deleteRow', 'Registrations', null, 0, regId);
  };

  const approveEventRegistration = (regId) => {
    let targetReg = state.registrations.find(r => r.id === regId);
    if (!targetReg) return;

    const approvedReg = { ...targetReg, status: 'APPROVED' };

    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.map(r => r.id === regId ? approvedReg : r)
    }));

    const fullRowData = [
      approvedReg.id,
      approvedReg.eventId,
      approvedReg.subEventId || '',
      approvedReg.registeredByUserId || '',
      approvedReg.name,
      approvedReg.gender || 'Male',
      approvedReg.ageCategory || 'Above 16',
      'APPROVED',
      approvedReg.registeredAt || '2026-08-15',
      approvedReg.votingStatus || 'NOT_STARTED',
      approvedReg.mediaTrack || '',
      JSON.stringify(approvedReg.groupMembers || [])
    ];
    postToSheet('updateRow', 'Registrations', fullRowData, 0, regId);
  };

  const rejectEventRegistration = (regId) => {
    let targetReg = state.registrations.find(r => r.id === regId);
    if (!targetReg) return;

    const rejectedReg = { ...targetReg, status: 'REJECTED' };

    setStoreState(prev => ({
      ...prev,
      registrations: prev.registrations.map(r => r.id === regId ? rejectedReg : r)
    }));

    const fullRowData = [
      rejectedReg.id,
      rejectedReg.eventId,
      rejectedReg.subEventId || '',
      rejectedReg.registeredByUserId || '',
      rejectedReg.name,
      rejectedReg.gender || 'Male',
      rejectedReg.ageCategory || 'Above 16',
      'REJECTED',
      rejectedReg.registeredAt || '2026-08-15',
      rejectedReg.votingStatus || 'NOT_STARTED',
      rejectedReg.mediaTrack || '',
      JSON.stringify(rejectedReg.groupMembers || [])
    ];
    postToSheet('updateRow', 'Registrations', fullRowData, 0, regId);
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
    let updatedUserObj = null;

    setStoreState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === userId) {
          updatedUserObj = { ...u, name, phone, profilePhoto: profilePhoto || u.profilePhoto };
          return updatedUserObj;
        }
        return u;
      });
      const updatedCurrentUser = { ...prev.currentUser, name, phone, profilePhoto: profilePhoto || prev.currentUser.profilePhoto };
      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrentUser
      };
    });

    if (!updatedUserObj) {
      updatedUserObj = { ...state.currentUser, name, phone, profilePhoto };
    }

    const fullRowData = [
      updatedUserObj.id,
      updatedUserObj.name,
      updatedUserObj.phone,
      updatedUserObj.pin,
      updatedUserObj.wing || '',
      updatedUserObj.wingId || '',
      updatedUserObj.flat || '',
      updatedUserObj.role || 'scot_member',
      updatedUserObj.isChampion ? 'TRUE' : 'FALSE',
      updatedUserObj.status || 'APPROVED',
      updatedUserObj.contributionStatus || 'PAID',
      updatedUserObj.registeredAt || '2026-08-15',
      updatedUserObj.profilePhoto || '',
      updatedUserObj.fcmToken || ''
    ];
    postToSheet('updateRow', 'Users', fullRowData, 0, userId);
  };

  const updateUserFcmToken = (userId, token) => {
    let targetUser = state.users.find(u => u.id === userId);
    if (!targetUser) return;

    const updatedUser = { ...targetUser, fcmToken: token };

    setStoreState(prev => {
      const updatedUsers = prev.users.map(u => u.id === userId ? updatedUser : u);
      const updatedCurrentUser = prev.currentUser?.id === userId 
        ? { ...prev.currentUser, fcmToken: token } 
        : prev.currentUser;
      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrentUser
      };
    });

    const fullRowData = [
      updatedUser.id,
      updatedUser.name,
      updatedUser.phone,
      updatedUser.pin,
      updatedUser.wing || '',
      updatedUser.wingId || '',
      updatedUser.flat || '',
      updatedUser.role || 'scot_member',
      updatedUser.isChampion ? 'TRUE' : 'FALSE',
      updatedUser.status || 'APPROVED',
      updatedUser.contributionStatus || 'PAID',
      updatedUser.registeredAt || '2026-08-15',
      updatedUser.profilePhoto || '',
      token || ''
    ];
    postToSheet('updateRow', 'Users', fullRowData, 0, userId);
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
      // Mark as _localOnly if it's a brand new event (not yet in sheet)
      const eventToSave = exists ? finalEvent : { ...finalEvent, _localOnly: true };
      const nextEvents = exists 
        ? prev.events.map(e => e.id === finalEvent.id ? finalEvent : e)
        : [...prev.events, eventToSave];
      try {
        localStorage.setItem('scot_events_cache', JSON.stringify(nextEvents));
      } catch (e) {
        console.warn("Failed to cache events:", e);
      }
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
    setStoreState(prev => {
      const nextEvents = prev.events.filter(e => e.id !== eventId);
      try {
        localStorage.setItem('scot_events_cache', JSON.stringify(nextEvents));
      } catch (e) {
        console.warn("Failed to cache events:", e);
      }
      return { ...prev, events: nextEvents };
    });

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
