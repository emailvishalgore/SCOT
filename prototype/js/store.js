const STORE_KEY = 'scot_prototype_v4';

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return getDefaultState();
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function getState() { return state; }

export function setState(updater) {
  state = { ...state, ...updater(state) };
  saveState();
}

export function resetState() {
  localStorage.removeItem(STORE_KEY);
  state = getDefaultState();
  saveState();
}

export const store = { getState, setState, resetState };

function getDefaultState() {
  return {
    currentUser: null,
    // Real registered user accounts with 4-digit PINs and approval statuses
    users: [
      { id: 'user-admin', name: 'Amit Joshi (Admin)', phone: '9999999999', pin: '1234', wing: 'Wing P', wingId: 'wing-p', flat: 'P-101', role: 'admin', isChampion: true, status: 'APPROVED', contributionStatus: 'PAID', registeredAt: '2026-07-30' },
      { id: 'user-champ', name: 'Priya Desai (Champion)', phone: '9876543211', pin: '1234', wing: 'Wing O', wingId: 'wing-o', flat: 'O-201', role: 'champion', isChampion: true, status: 'APPROVED', contributionStatus: 'PAID', registeredAt: '2026-07-30' },
      { id: 'user-res', name: 'Rahul Sharma (Resident)', phone: '9876543210', pin: '1234', wing: 'Wing N', wingId: 'wing-n', flat: 'N-402', role: 'resident', isChampion: false, status: 'APPROVED', contributionStatus: 'PAID', registeredAt: '2026-07-30' }
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
      { id: 'wing-w', name: 'Wing W', letter: 'W', totalFlats: 28, color: '#EC4899' }
    ],
    events: [
      {
        id: 'evt-carrom-2026',
        name: 'Carrom Tournament',
        type: 'UMBRELLA',
        startDate: '2026-08-09',
        endDate: '2026-08-09',
        venue: 'Clubhouse',
        time: '09:30 AM onwards',
        status: 'ACTIVE',
        category: 'Sports',
        description: 'Annual Topaz Park Inter-Wing Carrom Championship. Featuring individual singles and doubles categories across all age groups.',
        subEvents: [
          { id: 'sub-carrom-1', name: 'Singles Below 16', category: 'Below 16', points: 'Winner: 30 pts / Runner: 20 pts' },
          { id: 'sub-carrom-2', name: 'Singles Above 16', category: 'Above 16', points: 'Winner: 30 pts / Runner: 20 pts' },
          { id: 'sub-carrom-3', name: 'Singles Senior Citizens', category: 'Senior Citizens', points: 'Winner: 30 pts / Runner: 20 pts' },
          { id: 'sub-carrom-4', name: 'Doubles Above 16', category: 'Above 16', points: 'Winner: 30 pts / Runner: 20 pts' }
        ]
      },
      {
        id: 'evt-tt-2026',
        name: 'Table Tennis Tournament',
        type: 'UMBRELLA',
        startDate: '2026-08-23',
        endDate: '2026-08-23',
        venue: 'Clubhouse',
        time: '09:30 AM onwards',
        status: 'ACTIVE',
        category: 'Sports',
        description: 'Inter-Wing Table Tennis Tournament. Fast-paced ping pong competition with age-grouped singles and doubles.',
        subEvents: [
          { id: 'sub-tt-1', name: 'Below 16 Singles', category: 'Below 16', points: 'Winner: 30 pts / Runner: 20 pts' },
          { id: 'sub-tt-2', name: 'Above 16 Singles', category: 'Above 16', points: 'Winner: 30 pts / Runner: 20 pts' },
          { id: 'sub-tt-3', name: 'Doubles Above 16', category: 'Above 16', points: 'Winner: 30 pts / Runner: 20 pts' }
        ]
      },
      {
        id: 'evt-dahi-handi-2026',
        name: 'Dahi Handi',
        type: 'STANDALONE',
        startDate: '2026-09-05',
        endDate: '2026-09-05',
        venue: 'Main Ground',
        time: '07:00 PM',
        status: 'PLANNED',
        category: 'Cultural',
        description: 'Traditional Gokulashtami Dahi Handi celebration at the society main ground with music and festivities.',
        subEvents: []
      },
      {
        id: 'evt-ganesh-2026',
        name: 'Ganesh Utsav 2026',
        type: 'UMBRELLA',
        startDate: '2026-09-14',
        endDate: '2026-09-18',
        venue: 'Society Premises & Clubhouse',
        time: 'Various Schedules',
        status: 'PLANNED',
        category: 'Cultural',
        description: '5-Day Grand Ganesh Utsav Celebrations featuring Dhol Tasha, Wing-wise Cultural Performances, Dumbtakshari, Senior & Kids Stage Events, Visarjan Procession & Gala Dinner.',
        subEvents: [
          { id: 'sub-g-1', name: 'Ganesh Sthapana & Dhol Tasha', startDate: '2026-09-14', time: '01:00 PM', category: 'General' },
          { id: 'sub-g-2', name: 'Wing Wise Performances', startDate: '2026-09-14', time: '07:30 PM', points: 'Winner: 100 pts / Runner: 70 pts / 3rd: 50 pts' },
          { id: 'sub-g-3', name: 'Senior Citizen Event', startDate: '2026-09-15', time: '11:00 AM', category: 'Senior Citizens', points: 'Winner: 30 pts / Runner: 20 pts' },
          { id: 'sub-g-4', name: 'Dumbtakshari', startDate: '2026-09-15', time: '07:30 PM', points: 'Winner: 50 pts / Runner: 30 pts' },
          { id: 'sub-g-5', name: 'Kids Event (Below 10)', startDate: '2026-09-16', time: '05:00 PM', category: 'Below 10' },
          { id: 'sub-g-6', name: 'Kids Stage Performances', startDate: '2026-09-16', time: '07:30 PM', category: 'Below 16' },
          { id: 'sub-g-7', name: 'Adults Stage Performances', startDate: '2026-09-17', time: '07:30 PM', category: 'Above 16', points: 'Winner: 50 pts / Runner: 30 pts' },
          { id: 'sub-g-8', name: 'Ganesh Visarjan & Dhol Tasha', startDate: '2026-09-18', time: '03:00 PM' },
          { id: 'sub-g-9', name: 'Gala Dinner', startDate: '2026-09-18', time: '07:30 PM' }
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
    topPerformers: [],
    competitions: [],
    registrations: [],
    galleryAlbums: [
      { id: 'album-1', title: 'Ganesh Utsav Memories', coverUrl: 'https://picsum.photos/seed/scotganesh/400/300', count: 12 },
      { id: 'album-2', title: 'Carrom & Sports Moments', coverUrl: 'https://picsum.photos/seed/scotsports/400/300', count: 8 }
    ],
    tasks: []
  };
}
