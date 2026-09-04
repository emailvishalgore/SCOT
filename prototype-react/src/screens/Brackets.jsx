import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, Trophy, Award, GitBranch, Edit3, CheckCheck, Clock, UserCheck, CalendarDays, Eye, Megaphone, Play, Pause, Download, Music, Shuffle, Trash2, Plus, ArrowLeftRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatPlayerDisplay = (str) => {
  if (!str) return '';
  if (str === 'BYE') return 'BYE';
  
  // Strip out phone number (e.g. • Ph: 1122334455, Ph: ..., etc.)
  let clean = String(str)
    .replace(/•\s*Ph:?\s*\d+/gi, '')
    .replace(/,\s*Ph:?\s*\d+/gi, '')
    .replace(/Ph:?\s*\d+/gi, '')
    .trim();

  // Clean trailing punctuation or extra commas
  clean = clean.replace(/,\s*\)/g, ')').replace(/\s{2,}/g, ' ').trim();
  return clean;
};

// Helper to extract wing letter for participant cross-wing matching
const getRegistrationWing = (r, users = [], paidFlats = []) => {
  if (!r) return 'OTHER';
  if (r.wing) {
    const clean = String(r.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
    if (clean) return clean;
  }
  const str = String(r.name || '');
  const m1 = str.match(/\[Wing\s*([A-Za-z0-9]+)\]/i);
  if (m1) return m1[1].toUpperCase();
  const m2 = str.match(/Wing\s*([A-Za-z0-9]+)/i);
  if (m2) return m2[1].toUpperCase();
  const m3 = str.match(/\(\s*([N-W])\s*[\),]/i);
  if (m3) return m3[1].toUpperCase();

  if (r.registeredByUserId && users.length > 0) {
    const creator = users.find(u => u.id === r.registeredByUserId);
    if (creator && creator.wing) {
      const clean = String(creator.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
      if (clean) return clean;
    }
  }

  const flatMatch = str.match(/Flat\s*[:#-]?\s*(\d{3})/i) || str.match(/\b(\d{3})\b/);
  if (flatMatch && paidFlats.length > 0) {
    const flatNum = flatMatch[1];
    const match = paidFlats.find(f => {
      const ff = String(f.flat || '').replace(/\D/g, '');
      return ff === flatNum || parseInt(ff, 10) === parseInt(flatNum, 10);
    });
    if (match && match.wing) {
      const clean = String(match.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
      if (clean) return clean;
    }
  }

  const m4 = str.match(/\b([N-W])\b/i);
  if (m4) return m4[1].toUpperCase();

  return 'OTHER';
};

// Helper to extract winner and runner-up points configured for an event / sub-event
const getEventPoints = (event, subEventId) => {
  if (!event) return { winnerPoints: 100, runnerUpPoints: 50 };
  
  let targetObj = event;
  if (subEventId && event.subEvents && event.subEvents.length > 0) {
    const sub = event.subEvents.find(s => s.id === subEventId);
    if (sub) targetObj = sub;
  }

  let winPts = targetObj.winnerPoints !== undefined && targetObj.winnerPoints !== '' ? parseInt(targetObj.winnerPoints, 10) : NaN;
  let runPts = targetObj.runnerUpPoints !== undefined && targetObj.runnerUpPoints !== '' ? parseInt(targetObj.runnerUpPoints, 10) : NaN;

  if (isNaN(winPts) && targetObj.points) {
    const pStr = String(targetObj.points);
    const winMatch = pStr.match(/Winner:\s*(\d+)/i) || pStr.match(/(\d+)\s*pts/i) || pStr.match(/^(\d+)$/);
    if (winMatch) winPts = parseInt(winMatch[1], 10);
  }
  if (isNaN(runPts) && targetObj.points) {
    const pStr = String(targetObj.points);
    const runMatch = pStr.match(/Runner:\s*(\d+)/i) || pStr.match(/Runner-?up:\s*(\d+)/i);
    if (runMatch) runPts = parseInt(runMatch[1], 10);
  }

  if (isNaN(winPts) || winPts <= 0) winPts = 100;
  if (isNaN(runPts) || runPts <= 0) runPts = 50;

  return { winnerPoints: winPts, runnerUpPoints: runPts };
};

export default function Brackets({ onShowToast }) {
  const { state, setStoreState, recordFixtureScore, approveEventRegistration, rejectEventRegistration, postAnnouncement, toggleParticipantVoting, publishParticipantResults, validateFlatDues, registerForEvent, canEditEvent, canEditSubEvent, canSubmitNominations } = useStore();
  const currentUser = state.currentUser;

  const isAdminOrChamp = currentUser?.role === 'admin' || currentUser?.role === 'champion' || currentUser?.role === 'scot_member' || currentUser?.role === 'wing_captain' || currentUser?.isChampion;
  const canGenerateDraws = currentUser?.role === 'admin' || currentUser?.role === 'champion' || currentUser?.role === 'scot_member';

  if (!isAdminOrChamp) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <Shield size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>You must be registered as an Event Champion or Admin to access this panel.</p>
      </div>
    );
  }

  const events = state.events || [];
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [selectedSubEventId, setSelectedSubEventId] = useState('all');

  // Dynamically sync selectedEventId if state.events loads or changes
  React.useEffect(() => {
    if (events.length > 0) {
      const exists = events.some(e => e.id === selectedEventId);
      if (!selectedEventId || !exists) {
        setSelectedEventId(events[0].id);
      }
    }
  }, [events, selectedEventId]);
  
  // Tabs: 'fixtures' (or 'participants') and 'approvals'
  const [activeTab, setActiveTab] = useState('fixtures');
  const [playingRegId, setPlayingRegId] = useState(null);
  const audioPlayerRef = React.useRef(null);

  // Manual participant entry states
  const [manualName, setManualName] = useState('');
  const [manualWing, setManualWing] = useState(() => {
    const cw = currentUser?.wing;
    if (cw) return String(cw).replace(/Wing\s*/i, '').trim().toUpperCase() || 'N';
    return 'N';
  });
  const [manualFlat, setManualFlat] = useState('');
  const [manualGender, setManualGender] = useState('Male');
  const [manualAge, setManualAge] = useState('Above 16');
  const [duesStatus, setDuesStatus] = useState(null); // { valid, reason } or null
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handlePlayPause = (regId, trackUrl) => {
    if (!audioPlayerRef.current) return;
    
    if (playingRegId === regId) {
      audioPlayerRef.current.pause();
      setPlayingRegId(null);
    } else {
      audioPlayerRef.current.src = trackUrl;
      audioPlayerRef.current.load();
      audioPlayerRef.current.play().then(() => {
        setPlayingRegId(regId);
      }).catch((e) => {
        console.error("Audio playback error: ", e);
        onShowToast('Playback failed! Verify file link.', 'error');
      });
    }
  };

  const [scoringModal, setScoringModal] = useState(null); // { compId, fixture } or null
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  // ✏️ Match Fixture Editing & Custom Pairing States (Admin & Wing Champion only)
  const [editMatchModal, setEditMatchModal] = useState(null); // { fixture, compId }
  const [editPlayerA, setEditPlayerA] = useState('');
  const [editPlayerB, setEditPlayerB] = useState('');
  const [editRound, setEditRound] = useState('Round 1');

  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [newMatchPlayerA, setNewMatchPlayerA] = useState('');
  const [newMatchPlayerB, setNewMatchPlayerB] = useState('');
  const [newMatchRound, setNewMatchRound] = useState('Round 1');

  const activeEvent = events.find(e => e.id === selectedEventId) || events[0];

  // Reset selectedSubEventId when selectedEventId changes
  React.useEffect(() => {
    setSelectedSubEventId('all');
  }, [selectedEventId]);

  // Try to find matching competition (brackets) for Carrom or Table Tennis
  const competitions = state.competitions || [];
  const matchingComp = competitions.find(c => 
    c.eventId === selectedEventId && 
    (selectedSubEventId === 'all' || c.subEventId === selectedSubEventId || String(c.name || '').toLowerCase().includes(String(getSubEventName(selectedSubEventId) || '').toLowerCase()))
  );

  // Fetch pending registrations for this event
  const pendingRegistrations = (state.registrations || []).filter(
    r => r.eventId === selectedEventId && r.status === 'PENDING' && (selectedSubEventId === 'all' || r.subEventId === selectedSubEventId)
  );

  // Fetch approved registrations for this event
  const approvedRegistrations = (state.registrations || []).filter(
    r => r.eventId === selectedEventId && r.status === 'APPROVED' && (selectedSubEventId === 'all' || r.subEventId === selectedSubEventId)
  );

  const getRegisteredByUserDetail = (userId) => {
    const u = (state.users || []).find(user => user.id === userId);
    return u ? `${u.name} (${u.wing}, ${u.flat})` : 'Unknown Resident';
  };

  const getSubEventName = (subId) => {
    if (!subId) return 'Main Event';
    const sub = activeEvent?.subEvents?.find(s => s.id === subId);
    return sub ? sub.name : 'Sub-Event';
  };

  const handleOpenScoreModal = (fixture) => {
    if (!matchingComp) return;
    setEditMatchModal(null);
    setIsAddMatchModalOpen(false);
    setScoringModal({ compId: matchingComp.id, fixture });
    setScoreA(fixture.scoreA || '');
    setScoreB(fixture.scoreB || '');
  };

  // --- ✏️ Open / Save Match Pairing Edit ---
  const handleOpenEditMatch = (fixture) => {
    if (!matchingComp) return;
    setScoringModal(null);
    setIsAddMatchModalOpen(false);
    setEditMatchModal({ fixture, compId: matchingComp.id });
    setEditPlayerA(fixture.playerA);
    setEditPlayerB(fixture.playerB);
    setEditRound(fixture.round || 'Round 1');
  };

  const handleSaveEditMatch = (e) => {
    e.preventDefault();
    if (!matchingComp || !editMatchModal) return;
    if (!editPlayerA || !editPlayerB) {
      onShowToast('Please select both Player/Team A and Player/Team B', 'error');
      return;
    }
    if (editPlayerA === editPlayerB && editPlayerA !== 'BYE') {
      onShowToast('Player A and Player B cannot be the same participant!', 'error');
      return;
    }

    setStoreState(prev => {
      const nextComps = (prev.competitions || []).map(c => {
        if (c.id !== matchingComp.id) return c;
        return {
          ...c,
          fixtures: (c.fixtures || []).map(f => {
            if (f.id !== editMatchModal.fixture.id) return f;
            return {
              ...f,
              playerA: editPlayerA,
              playerB: editPlayerB,
              round: editRound,
              scoreA: '',
              scoreB: '',
              winnerId: null
            };
          })
        };
      });
      try { localStorage.setItem('scot_comps_cache', JSON.stringify(nextComps)); } catch (e) {}
      return { ...prev, competitions: nextComps };
    });

    onShowToast('Match pairing updated successfully!', 'success');
    setEditMatchModal(null);
  };

  const handleDeleteMatch = (fixtureId, e) => {
    if (e) e.stopPropagation();
    if (!matchingComp) return;
    if (!window.confirm('Are you sure you want to remove this match fixture?')) return;

    setStoreState(prev => {
      const nextComps = (prev.competitions || []).map(c => {
        if (c.id !== matchingComp.id) return c;
        return {
          ...c,
          fixtures: (c.fixtures || []).filter(f => f.id !== fixtureId)
        };
      });
      try { localStorage.setItem('scot_comps_cache', JSON.stringify(nextComps)); } catch (e) {}
      return { ...prev, competitions: nextComps };
    });

    onShowToast('Match fixture removed.', 'info');
  };

  const handleSaveNewMatch = (e) => {
    e.preventDefault();
    if (!matchingComp) {
      // No bracket exists yet - create one
      const subEvtId = selectedSubEventId === 'all' ? (activeEvent?.subEvents?.[0]?.id || '') : selectedSubEventId;
      const compName = `${activeEvent?.name || 'Event'} - ${getSubEventName(subEvtId)} Draw`;
      const newFix = {
        id: `fix-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        round: newMatchRound || 'Round 1',
        playerA: newMatchPlayerA,
        playerB: newMatchPlayerB,
        scoreA: '',
        scoreB: '',
        winnerId: null
      };
      const newComp = {
        id: `comp-${Date.now()}`,
        name: compName,
        eventId: selectedEventId,
        subEventId: subEvtId,
        type: 'SINGLE_ELIMINATION',
        fixtures: [newFix]
      };
      setStoreState(prev => {
        const nextComps = [...(prev.competitions || []), newComp];
        try { localStorage.setItem('scot_comps_cache', JSON.stringify(nextComps)); } catch (e) {}
        return { ...prev, competitions: nextComps };
      });
      onShowToast('New bracket created with custom match fixture!', 'success');
      setIsAddMatchModalOpen(false);
      setNewMatchPlayerA('');
      setNewMatchPlayerB('');
      return;
    }
    if (!newMatchPlayerA || !newMatchPlayerB) {
      onShowToast('Please select both Player A and Player B', 'error');
      return;
    }
    if (newMatchPlayerA === newMatchPlayerB && newMatchPlayerA !== 'BYE') {
      onShowToast('Player A and Player B cannot be the same participant!', 'error');
      return;
    }

    const newFix = {
      id: `fix-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      round: newMatchRound || 'Round 1',
      playerA: newMatchPlayerA,
      playerB: newMatchPlayerB,
      scoreA: '',
      scoreB: '',
      winnerId: null
    };

    setStoreState(prev => {
      const nextComps = (prev.competitions || []).map(c => {
        if (c.id !== matchingComp.id) return c;
        return {
          ...c,
          fixtures: [...(c.fixtures || []), newFix]
        };
      });
      try { localStorage.setItem('scot_comps_cache', JSON.stringify(nextComps)); } catch (e) {}
      return { ...prev, competitions: nextComps };
    });

    onShowToast('New custom match fixture added!', 'success');
    setIsAddMatchModalOpen(false);
    setNewMatchPlayerA('');
    setNewMatchPlayerB('');
  };

  const handleSaveScore = (e) => {
    e.preventDefault();
    if (!scoringModal || !matchingComp) return;

    const { fixture } = scoringModal;
    const { playerA, playerB } = fixture;

    let winnerId = null;
    const numA = parseInt(scoreA, 10);
    const numB = parseInt(scoreB, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA > numB) winnerId = playerA;
      else if (numB > numA) winnerId = playerB;
      else winnerId = playerA; // Tie: default winner to Player A (home advantage)
    }

    recordFixtureScore(matchingComp.id, fixture.id, scoreA, scoreB, winnerId);

    onShowToast(`Score recorded: ${formatPlayerDisplay(playerA)} vs ${formatPlayerDisplay(playerB)} (${scoreA}-${scoreB})`, 'success');
    setScoringModal(null);
  };

  const handleApproveRegistration = (regId, name) => {
    approveEventRegistration(regId);
    onShowToast(`Approved registration for ${name}!`, 'success');
  };

  const handleRejectRegistration = (regId, name) => {
    if (window.confirm(`Are you sure you want to disapprove/reject registration for ${name}?`)) {
      rejectEventRegistration(regId);
      onShowToast(`Disapproved/rejected registration for ${name}.`, 'info');
    }
  };

  const handlePublishParticipants = () => {
    const count = approvedRegistrations.length;
    if (count === 0) {
      onShowToast('Cannot publish an empty participant list.', 'error');
      return;
    }
    const participantNames = approvedRegistrations.map(r => `- ${r.name} (${getSubEventName(r.subEventId)})`).join('\n');
    const title = `Official Participant Directory: ${activeEvent.name}`;
    const content = `The official participant directory for ${activeEvent.name} has been published!\nTotal approved registrations: ${count} participants.\n\nApproved Members list:\n${participantNames}\n\nGood luck to all wings and players!`;
    
    postAnnouncement(title, `Event: ${activeEvent.name}`, content);
    onShowToast(`Participant list published to Announcements board!`, 'success');
  };

  const handlePublishScores = () => {
    if (!matchingComp) return;
    const resultsSummary = matchingComp.fixtures.map(f => {
      const scoreText = f.scoreA !== '' ? `(${f.scoreA} - ${f.scoreB})` : '(Pending Outcome)';
      const winnerText = f.winnerId ? `🏆 Winner: ${f.winnerId}` : '';
      return `- ${f.playerA} vs ${f.playerB} ${scoreText} ${winnerText}`;
    }).join('\n');

    const title = `Standings Bulletin: ${matchingComp.name}`;
    const content = `Official scores and standings have been published for ${matchingComp.name}!\n\nMatch outcomes:\n${resultsSummary}\n\nCheck the Leaderboard to see your wing's updated rankings!`;
    
    postAnnouncement(title, `Event: ${activeEvent.name}`, content);
    onShowToast(`Fixtures and scores published to Announcements board!`, 'success');
  };

  const handleValidateDues = () => {
    if (!manualWing || !manualFlat) {
      onShowToast('Enter wing and flat number first!', 'error');
      return;
    }
    const result = validateFlatDues(manualWing, manualFlat);
    setDuesStatus(result);
    if (result.valid) {
      onShowToast(`✅ ${result.reason}`, 'success');
    } else {
      onShowToast(`⚠️ ${result.reason}`, 'error');
    }
  };

  const handleManualRegister = () => {
    if (!manualName.trim()) {
      onShowToast('Participant name is required!', 'error');
      return;
    }
    if (!manualFlat || !/^\d{3}$/.test(manualFlat)) {
      onShowToast('Flat number must be exactly 3 digits!', 'error');
      return;
    }

    const subEvtId = selectedSubEventId === 'all' ? (activeEvent?.subEvents?.[0]?.id || '') : selectedSubEventId;
    const wingName = `Wing ${manualWing}`;
    const displayName = `${manualName.trim()} (${manualWing})`;

    const result = registerForEvent(selectedEventId, subEvtId, displayName, manualGender, manualAge, []);
    if (result.success) {
      // Auto-approve using the registration ID returned from registerForEvent
      if (result.registration && result.registration.id && result.registration.status === 'PENDING') {
        approveEventRegistration(result.registration.id);
      }
      onShowToast(`✅ ${manualName} (${wingName}, Flat ${manualFlat}) registered and approved!`, 'success');
      setManualName('');
      setManualFlat('');
      setDuesStatus(null);
    } else {
      onShowToast(`❌ ${result.error}`, 'error');
    }
  };

  // --- Cross-Wing Randomized Draw Generator ---
  const handleGenerateRandomDraw = () => {
    if (!canGenerateDraws) {
      onShowToast('Bracket draw generation is reserved for SCOT Members and Admins.', 'error');
      return;
    }
    if (approvedRegistrations.length < 2) {
      onShowToast('Need at least 2 approved participants to generate a draw!', 'error');
      return;
    }

    // 1. Group approved participants by their Wing
    const wingBuckets = {};
    approvedRegistrations.forEach(r => {
      const wing = getRegistrationWing(r, state.users || [], state.paidFlats || []);
      if (!wingBuckets[wing]) wingBuckets[wing] = [];
      wingBuckets[wing].push(r);
    });

    // 2. Shuffle participants inside each wing bucket for fairness
    Object.keys(wingBuckets).forEach(w => {
      const arr = wingBuckets[w];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    });

    // 3. Handle BYE if total participants is odd
    // Choose BYE from the wing with the largest count (to maximize cross-wing matches among the rest)
    let byeFixture = null;
    const totalCount = approvedRegistrations.length;
    if (totalCount % 2 !== 0) {
      let maxWing = null;
      let maxCount = -1;
      const wingKeys = Object.keys(wingBuckets).filter(w => wingBuckets[w].length > 0);
      // Shuffle wingKeys so ties in maxCount are broken randomly
      for (let i = wingKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wingKeys[i], wingKeys[j]] = [wingKeys[j], wingKeys[i]];
      }
      wingKeys.forEach(w => {
        if (wingBuckets[w].length > maxCount) {
          maxCount = wingBuckets[w].length;
          maxWing = w;
        }
      });

      if (maxWing && wingBuckets[maxWing].length > 0) {
        const byeParticipant = wingBuckets[maxWing].pop();
        byeFixture = {
          id: `fix-${Date.now()}-bye`,
          round: 'Round 1',
          playerA: byeParticipant.name,
          playerB: 'BYE',
          scoreA: '',
          scoreB: '',
          winnerId: byeParticipant.name
        };
      }
    }

    // 4. Pair participants giving priority to Cross-Wing matches
    const pairs = [];
    while (true) {
      // Get all wings that still have participants
      const activeWings = Object.keys(wingBuckets).filter(w => wingBuckets[w].length > 0);
      if (activeWings.length === 0) break;

      if (activeWings.length >= 2) {
        // Sort active wings descending by remaining count, with random tie-breaking
        activeWings.sort((a, b) => {
          const diff = wingBuckets[b].length - wingBuckets[a].length;
          return diff !== 0 ? diff : (Math.random() - 0.5);
        });

        const wingA = activeWings[0]; // Wing with most remaining participants
        const otherWings = activeWings.slice(1);
        
        // Pick wingB: if wingA has >= sum of remaining other wings, must pick largest of others;
        // otherwise pick randomly among other wings
        const otherTotal = otherWings.reduce((s, w) => s + wingBuckets[w].length, 0);
        let wingB = otherWings[0];
        if (otherWings.length > 1 && wingBuckets[wingA].length < otherTotal) {
          wingB = otherWings[Math.floor(Math.random() * otherWings.length)];
        }

        const pA = wingBuckets[wingA].pop();
        const pB = wingBuckets[wingB].pop();

        // 50% chance to swap position A and B for visual balance
        if (Math.random() > 0.5) {
          pairs.push({ pA, pB, crossWing: true });
        } else {
          pairs.push({ pA: pB, pB: pA, crossWing: true });
        }
      } else {
        // Only 1 wing remains (more participants from the same wing)
        const wing = activeWings[0];
        if (wingBuckets[wing].length >= 2) {
          const pA = wingBuckets[wing].pop();
          const pB = wingBuckets[wing].pop();
          pairs.push({ pA, pB, crossWing: false });
        } else if (wingBuckets[wing].length === 1) {
          const pA = wingBuckets[wing].pop();
          pairs.push({ pA, pB: { name: 'BYE' }, crossWing: false, isBye: true });
        }
      }
    }

    // 5. Shuffle the created match pairs so they are distributed nicely
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    const defaultDrawRound = pairs.length === 1 
      ? 'Finals (Championship)' 
      : (pairs.length === 2 ? 'Semi Finals' : (pairs.length <= 4 ? 'Quarter Finals' : 'Round 1'));

    // 6. Build the fixtures list
    const newFixtures = pairs.map((pair, idx) => {
      if (pair.isBye || pair.pB.name === 'BYE') {
        return {
          id: `fix-${Date.now()}-${idx}`,
          round: defaultDrawRound,
          playerA: pair.pA.name,
          playerB: 'BYE',
          scoreA: '',
          scoreB: '',
          winnerId: pair.pA.name
        };
      }
      return {
        id: `fix-${Date.now()}-${idx}`,
        round: defaultDrawRound,
        playerA: pair.pA.name,
        playerB: pair.pB.name,
        scoreA: '',
        scoreB: '',
        winnerId: null
      };
    });

    if (byeFixture) {
      byeFixture.round = defaultDrawRound;
      newFixtures.push(byeFixture);
    }

    const subEvtId = selectedSubEventId === 'all' ? (activeEvent?.subEvents?.[0]?.id || '') : selectedSubEventId;
    const compName = `${activeEvent.name} - ${getSubEventName(subEvtId)} Draw`;

    // Check if a competition bracket already exists for this event/sub-event
    const existingComp = (state.competitions || []).find(c => c.eventId === selectedEventId && (selectedSubEventId === 'all' || c.subEventId === selectedSubEventId));

    if (existingComp) {
      // Update existing competition's fixtures
      setStoreState(prev => {
        const nextComps = prev.competitions.map(c => c.id === existingComp.id ? { ...c, fixtures: newFixtures } : c);
        try { localStorage.setItem('scot_comps_cache', JSON.stringify(nextComps)); } catch (e) {}
        return { ...prev, competitions: nextComps };
      });
    } else {
      // Create a new competition bracket
      const newComp = {
        id: `comp-${Date.now()}`,
        name: compName,
        eventId: selectedEventId,
        subEventId: subEvtId,
        type: 'SINGLE_ELIMINATION',
        fixtures: newFixtures
      };
      setStoreState(prev => {
        const nextComps = [...(prev.competitions || []), newComp];
        try { localStorage.setItem('scot_comps_cache', JSON.stringify(nextComps)); } catch (e) {}
        return { ...prev, competitions: nextComps };
      });
    }

    onShowToast(`🎲 Random draw generated! ${newFixtures.length} matches created.`, 'success');
    setActiveTab('fixtures');
  };

  if (!events || events.length === 0 || !activeEvent) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--color-text-secondary)' }}>
          <Trophy size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h2>No Events Available Yet</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
            There are currently no events created in the tournament schedule. Create or sync events to begin managing fixtures and participant approvals.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Event & Brackets Manager</h1>
            <p className="page-subtitle">Select an event to manage registrations, participant approvals, or match scores</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Selected Event:</span>
              <select 
                className="select" 
                value={selectedEventId} 
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setActiveTab('fixtures');
                }}
                style={{ width: 'auto', minWidth: '200px' }}
              >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {activeEvent?.subEvents?.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Category:</span>
                <select 
                  className="select" 
                  value={selectedSubEventId} 
                  onChange={(e) => setSelectedSubEventId(e.target.value)}
                  style={{ width: 'auto', minWidth: '180px' }}
                >
                  <option value="all">All Categories</option>
                  {activeEvent.subEvents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixtures vs Approvals Subtabs */}
      <div className="flex-between mb-lg" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'fixtures' ? 'active' : ''}`}
            onClick={() => setActiveTab('fixtures')}
          >
            {matchingComp ? 'Bracket & Fixtures' : 'Approved Participants Directory'}
          </button>
          <button 
            className={`tab ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            Pending Approvals ({pendingRegistrations.length})
          </button>
          {activeEvent?.category === 'Cultural' && (
            <button 
              className={`tab ${activeTab === 'voting' ? 'active' : ''}`}
              onClick={() => setActiveTab('voting')}
            >
              🎭 Live Voting Manager
            </button>
          )}
        </div>
      </div>

      {/* 🥊 Fixtures & Matches Tab */}
      {activeTab === 'fixtures' && (
        <div className="card">
          <div className="flex-between mb-sm" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
                {activeEvent.name} — {selectedSubEventId === 'all' ? 'All Fixtures' : getSubEventName(selectedSubEventId)}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Record match scores, declare winners, and broadcast live outcomes to the society leaderboard.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {canGenerateDraws && (
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={() => { setScoringModal(null); setEditMatchModal(null); setIsAddMatchModalOpen(true); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <Plus size={13} /> Add Match Pair
                </button>
              )}
              {canGenerateDraws && approvedRegistrations.length >= 2 && (
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={() => {
                    if (window.confirm('Re-shuffle will generate new random fixture pairings. Any recorded scores for current matches will be reset. Proceed?')) {
                      handleGenerateRandomDraw();
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <Shuffle size={13} /> Re-Shuffle
                </button>
              )}
              <button 
                type="button"
                className="btn btn-secondary btn-sm" 
                onClick={handlePublishScores}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                <Megaphone size={12} /> Broadcast Results
              </button>
              {matchingComp?.fixtures?.length > 0 && (
                <span className="badge badge-violet">
                  {matchingComp.fixtures.filter(f => f.winnerId).length} / {matchingComp.fixtures.length} Completed
                </span>
              )}
            </div>
          </div>

          {matchingComp && matchingComp.fixtures && matchingComp.fixtures.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matchingComp.fixtures.map((f, idx) => {
                const isBye = f.playerB === 'BYE' || f.playerA === 'BYE';
                const isCompleted = isBye ? !!f.winnerId : (!!f.winnerId && f.scoreA !== '' && f.scoreB !== '');
                const isPlayerAWinner = f.winnerId === f.playerA;
                const isPlayerBWinner = f.winnerId === f.playerB;

                return (
                  <div 
                    key={f.id || idx}
                    className="card card-interactive"
                    style={{ 
                      padding: '1rem 1.25rem', 
                      background: isCompleted ? '#F8FAFC' : '#FFFFFF',
                      borderLeft: isCompleted ? '4px solid var(--color-cta, #10B981)' : '4px solid #CBD5E1',
                      border: '1px solid var(--color-border)',
                      borderLeftWidth: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                    onClick={() => handleOpenScoreModal(f)}
                  >
                    {/* Fixture Header */}
                    <div className="flex-between">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Match #{idx + 1} • {f.round || 'Round 1'}
                      </span>
                      {isCompleted ? (
                        <span className="badge badge-green" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                          🟢 Final Score
                        </span>
                      ) : (
                        <span className="badge badge-slate" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                          ⏳ Scheduled / Pending Score
                        </span>
                      )}
                    </div>

                    {/* Competitors Scoreboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem' }}>
                      {/* Player A */}
                      <div style={{ 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '8px', 
                        background: isPlayerAWinner ? '#ECFDF5' : '#F1F5F9',
                        border: isPlayerAWinner ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: isPlayerAWinner ? '#065F46' : 'var(--color-text)', display: 'block' }}>
                            {formatPlayerDisplay(f.playerA)}
                          </strong>
                          {isPlayerAWinner && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              🏆 Winner (+30 pts)
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: isPlayerAWinner ? '#059669' : 'var(--color-text-muted)', marginLeft: '8px' }}>
                          {f.scoreA !== '' ? f.scoreA : '-'}
                        </span>
                      </div>

                      <span style={{ fontWeight: 800, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>VS</span>

                      {/* Player B */}
                      <div style={{ 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '8px', 
                        background: isPlayerBWinner ? '#ECFDF5' : '#F1F5F9',
                        border: isPlayerBWinner ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: isPlayerBWinner ? '#065F46' : 'var(--color-text)', display: 'block' }}>
                            {formatPlayerDisplay(f.playerB)}
                          </strong>
                          {isPlayerBWinner && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              🏆 Winner (+30 pts)
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: isPlayerBWinner ? '#059669' : 'var(--color-text-muted)', marginLeft: '8px' }}>
                          {f.scoreB !== '' ? f.scoreB : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Footer / Action */}
                    <div className="flex-between" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: isCompleted ? '#059669' : 'var(--color-text-muted)', fontWeight: isCompleted ? 700 : 500 }}>
                        {isCompleted 
                          ? `🏆 Winner declared: ${formatPlayerDisplay(f.winnerId)}` 
                          : 'Tap to enter match score and declare winner'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {canGenerateDraws && (
                          <>
                            <button 
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={(e) => { e.stopPropagation(); handleOpenEditMatch(f); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px' }}
                              title="Edit / Swap Match Participants"
                            >
                              <ArrowLeftRight size={11} /> Edit Pairing
                            </button>
                            <button 
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={(e) => handleDeleteMatch(f.id, e)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 6px', color: 'var(--color-danger)', borderColor: '#FECACA' }}
                              title="Delete Match Fixture"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                        <button 
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => { e.stopPropagation(); handleOpenScoreModal(f); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px', fontWeight: 700 }}
                        >
                          <Edit3 size={11} /> {isCompleted ? 'Edit Score' : 'Record Score'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-text-secondary)' }}>
              <GitBranch size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <h3>No fixtures generated yet</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px', maxWidth: '440px', margin: '4px auto 1rem' }}>
                There are {approvedRegistrations.length} approved participant(s) in this category. Generate random match draws to create fixtures.
              </p>
              {approvedRegistrations.length >= 2 ? (
                <button className="btn btn-primary" onClick={handleGenerateRandomDraw}>
                  🎲 Generate Random Draw ({approvedRegistrations.length} Players)
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => setActiveTab('approvals')}>
                  📋 Go to Approvals & Entries
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approvals' && (
        <>
        {/* Manual Participant Entry / Wing Nominations */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
              {currentUser?.role === 'wing_captain' 
                ? `📋 Submit ${currentUser.wing || 'Wing'} Nominations` 
                : '➕ Manual Participant Entry'}
            </h2>
            <button
              className={`btn btn-sm ${showManualEntry ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setShowManualEntry(!showManualEntry)}
            >
              {showManualEntry ? 'Close Form' : (currentUser?.role === 'wing_captain' ? 'Submit Nomination' : 'Add Participant')}
            </button>
          </div>

          <AnimatePresence>
            {showManualEntry && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Participant Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ramesh Kulkarni"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Gender</label>
                    <select className="select" value={manualGender} onChange={(e) => setManualGender(e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Wing</label>
                    <select 
                      className="select" 
                      value={currentUser?.role === 'wing_captain' && currentUser?.wing ? currentUser.wing.replace('Wing ', '').trim() : manualWing} 
                      onChange={(e) => { setManualWing(e.target.value); setDuesStatus(null); }}
                      disabled={currentUser?.role === 'wing_captain' && !!currentUser?.wing}
                    >
                      {['N','O','P','Q','R','S','T','U','V','W'].map(w => (
                        <option key={w} value={w}>Wing {w}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Flat No.</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="402"
                      value={manualFlat}
                      onChange={(e) => { setManualFlat(e.target.value.replace(/\D/g, '').slice(0, 3)); setDuesStatus(null); }}
                      maxLength={3}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Age Category</label>
                    <select className="select" value={manualAge} onChange={(e) => setManualAge(e.target.value)}>
                      <option value="Above 16">Above 16</option>
                      <option value="Below 16">Below 16</option>
                    </select>
                  </div>
                </div>

                {/* Dues Validation */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleValidateDues}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🔍 Validate Dues
                  </button>
                  {duesStatus && (
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: duesStatus.valid ? 'var(--color-success-bg, #ECFDF5)' : 'var(--color-danger-bg, #FEF2F2)',
                      color: duesStatus.valid ? 'var(--color-success, #059669)' : 'var(--color-danger, #DC2626)',
                      border: `1px solid ${duesStatus.valid ? '#A7F3D0' : '#FECACA'}`
                    }}>
                      {duesStatus.valid ? '✅' : '⚠️'} {duesStatus.reason}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleManualRegister}
                  style={{ width: '100%' }}
                >
                  Register & Approve Participant
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        /* Event Manager Approvals Queue */
        <div className="card">
          <div className="flex-between mb-sm" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              Pending Participant Approvals
            </h2>
            <span className="badge badge-amber">Action Needed</span>
          </div>

          {pendingRegistrations.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Participant Name</th>
                    <th>Category/Sub-Event</th>
                    <th>Submitted By Resident</th>
                    <th>Gender</th>
                    <th>Age Category</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRegistrations.map(reg => (
                    <tr key={reg.id}>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{reg.name}</strong>
                        {reg.gender === 'Group' && (
                          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {reg.groupMembers && reg.groupMembers.length > 0 
                              ? `👥 Members: ${reg.groupMembers.join(', ')}` 
                              : '👥 Wing Group Entry'}
                          </span>
                        )}
                      </td>
                      <td><span className="badge badge-violet">{getSubEventName(reg.subEventId)}</span></td>
                      <td>{getRegisteredByUserDetail(reg.registeredByUserId)}</td>
                      <td>{reg.gender === 'Group' ? 'Group' : reg.gender}</td>
                      <td>{reg.gender === 'Group' ? 'Group' : reg.ageCategory}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRejectRegistration(reg.id, reg.name)}
                            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent' }}
                          >
                            Reject
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApproveRegistration(reg.id, reg.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <UserCheck size={14} /> Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-secondary)' }}>
              <CheckCheck size={48} style={{ margin: '0 auto 0.75rem', color: 'var(--color-cta)' }} />
              <h3>All entries approved!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                There are no pending registrations waiting for approvals in this event category.
              </p>
            </div>
          )}
        </div>
        </>
      )}

      {/* 🎭 Live Voting Manager Tab Block */}
      {activeTab === 'voting' && (
        <div className="card">
          <div className="flex-between mb-sm" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
                Live Voting Manager — {activeEvent.name}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Open/close voting for individual performers as they take the stage. Only Admin can start/stop voting.
              </p>
            </div>
            {currentUser.role === 'admin' && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to publish the complete voting standings bulletin?')) {
                    const res = publishParticipantResults(selectedEventId, selectedSubEventId);
                    if (res.success) {
                      onShowToast('Standings bulletin published to announcements page!', 'success');
                    } else {
                      onShowToast(res.error, 'error');
                    }
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Megaphone size={14} /> Publish Standings Bulletin
              </button>
            )}
          </div>

          {/* List Performer Rows */}
          {approvedRegistrations.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Performer Name</th>
                    <th>Wing</th>
                    <th>Sub-Event Category</th>
                    <th style={{ textAlign: 'center' }}>Live Voting Status</th>
                    <th style={{ textAlign: 'center' }}>Media Backing Track</th>
                    <th style={{ textAlign: 'center' }}>Live Performance Metrics</th>
                    <th style={{ textAlign: 'right' }}>Voting Control Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedRegistrations.map(reg => {
                    const regVotes = (state.votes || []).filter(v => v.registrationId === reg.id);
                    const totalVotes = regVotes.length;
                    const averageRating = totalVotes > 0 
                      ? (regVotes.reduce((sum, v) => sum + v.rating, 0) / totalVotes).toFixed(1)
                      : '0.0';

                    // Extract wing letter
                    const wingLetter = reg.name.match(/\(([^)]+)\)/)?.[1] || reg.wing || 'Main';

                    return (
                      <tr key={reg.id}>
                        <td>
                          <strong style={{ color: 'var(--color-text)' }}>{reg.name}</strong>
                          {reg.gender === 'Group' && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {reg.groupMembers && reg.groupMembers.length > 0 
                                ? `👥 Members: ${reg.groupMembers.join(', ')}` 
                                : '👥 Wing Group Entry'}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-slate">{wingLetter}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{getSubEventName(reg.subEventId)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${
                            reg.votingStatus === 'OPEN' 
                              ? 'badge-red' 
                              : (reg.votingStatus === 'CLOSED' ? 'badge-slate' : 'badge-amber')
                          }`}>
                            {reg.votingStatus === 'OPEN' 
                              ? '🔴 LIVE VOTING OPEN' 
                              : (reg.votingStatus === 'CLOSED' ? 'VOTING ENDED' : 'NOT STARTED')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {reg.mediaTrack ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              {reg.mediaTrack.startsWith('data:video') ? (
                                <button 
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => {
                                    const win = window.open();
                                    win.document.write(`<video src="${reg.mediaTrack}" controls autoplay style="width:100%;height:100%;background:#000;"></video>`);
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
                                  title="Open video player window"
                                >
                                  <Eye size={12} /> Play Video
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handlePlayPause(reg.id, reg.mediaTrack)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
                                >
                                  {playingRegId === reg.id ? <Pause size={12} /> : <Play size={12} />}
                                  {playingRegId === reg.id ? 'Pause' : 'Play Audio'}
                                </button>
                              )}

                              <a 
                                href={reg.mediaTrack} 
                                download={`SCOT_media_${String(reg.name || '').replace(/\s+/g, '_')}`}
                                className="btn btn-secondary btn-xs"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', textDecoration: 'none' }}
                                title="Download track to local PC"
                              >
                                <Download size={12} /> Download
                              </a>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              No track uploaded
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                            ⭐ {averageRating} / 5.0
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                            ({totalVotes} vote{totalVotes !== 1 ? 's' : ''})
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {currentUser.role === 'admin' ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {reg.votingStatus !== 'OPEN' ? (
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    toggleParticipantVoting(reg.id, 'OPEN');
                                    onShowToast(`Voting opened for ${reg.name}!`, 'success');
                                  }}
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Play size={12} /> Start Voting
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    toggleParticipantVoting(reg.id, 'CLOSED');
                                    onShowToast(`Voting stopped for ${reg.name}.`, 'info');
                                  }}
                                  style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent', padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Pause size={12} /> Stop Voting
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              Admin controls only
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-secondary)' }}>
              <Music size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <h3>No approved participants found</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Performer entries approved in the approvals queue will show up here to manage voting.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hidden standard player */}
      <audio 
        ref={audioPlayerRef} 
        onEnded={() => setPlayingRegId(null)} 
        style={{ display: 'none' }} 
      />

      {/* Record Score Modal Overlay */}
      <AnimatePresence>
        {scoringModal && (
          <div className="modal-overlay">
            <motion.div 
              className="modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <form onSubmit={handleSaveScore} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800 }}>
                  Record Match Outcome
                </h2>
                {(() => {
                  const isFinals = scoringModal?.fixture?.round && (
                    String(scoringModal.fixture.round).toLowerCase() === 'finals' ||
                    String(scoringModal.fixture.round).toLowerCase() === 'final' ||
                    String(scoringModal.fixture.round).toLowerCase().includes('finals (championship)') ||
                    (String(scoringModal.fixture.round).toLowerCase().includes('final') && !String(scoringModal.fixture.round).toLowerCase().includes('semi') && !String(scoringModal.fixture.round).toLowerCase().includes('quarter'))
                  );
                  const subEvtId = selectedSubEventId === 'all' ? (activeEvent?.subEvents?.[0]?.id || '') : selectedSubEventId;
                  const { winnerPoints, runnerUpPoints } = getEventPoints(activeEvent, subEvtId);

                  return (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '-8px', lineHeight: 1.4 }}>
                      {isFinals ? (
                        <span>
                          🏆 <strong>Finals Championship Match:</strong> Winner earns <strong>+{winnerPoints} pts</strong> (Gold), Runner-up earns <strong>+{runnerUpPoints} pts</strong> (Silver) for their Wing.
                        </span>
                      ) : (
                        <span>
                          ℹ️ <strong>{scoringModal?.fixture?.round || 'Preliminary Match'}:</strong> Winner advances to next round. Championship points are awarded at the <strong>Finals</strong>.
                        </span>
                      )}
                    </p>
                  );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 12px 1fr', alignItems: 'center', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatPlayerDisplay(scoringModal.fixture.playerA)}
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="Score" 
                      value={scoreA}
                      onChange={(e) => setScoreA(e.target.value)}
                      required 
                    />
                  </div>

                  <span style={{ alignSelf: 'flex-end', paddingBottom: '12px', fontWeight: 700, color: 'var(--color-text-muted)' }}>vs</span>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatPlayerDisplay(scoringModal.fixture.playerB)}
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="Score" 
                      value={scoreB}
                      onChange={(e) => setScoreB(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setScoringModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Score &rarr;</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ Edit Match Pairing Modal (Admin & Wing Champion only) */}
      <AnimatePresence>
        {editMatchModal && (
          <div className="modal-overlay">
            <motion.div 
              className="modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '520px' }}
            >
              <form onSubmit={handleSaveEditMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <div className="flex-between">
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800 }}>
                    ✏️ Edit Match Pairing
                  </h2>
                  <button type="button" className="btn-icon" onClick={() => setEditMatchModal(null)}>
                    <X size={18} />
                  </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '-8px' }}>
                  Modify the competitors or swap opponents for this scheduled fixture.
                </p>

                <div className="form-group">
                  <label className="form-label">Round / Stage</label>
                  <select className="select" value={editRound} onChange={(e) => setEditRound(e.target.value)}>
                    <option value="Round 1">Round 1</option>
                    <option value="Round 2">Round 2</option>
                    <option value="Quarter Finals">Quarter Finals</option>
                    <option value="Semi Finals">Semi Finals</option>
                    <option value="Bronze Match (3rd Place)">Bronze Match (3rd Place)</option>
                    <option value="Finals (Championship)">Finals (Championship)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'flex-end', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      Player / Team A
                    </label>
                    <select 
                      className="select" 
                      value={editPlayerA} 
                      onChange={(e) => setEditPlayerA(e.target.value)}
                      required
                    >
                      <option value="">-- Select Player A --</option>
                      {approvedRegistrations.map(r => (
                        <option key={r.id} value={r.name}>{formatPlayerDisplay(r.name)}</option>
                      ))}
                      <option value="BYE">BYE (Walkover)</option>
                    </select>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const temp = editPlayerA;
                      setEditPlayerA(editPlayerB);
                      setEditPlayerB(temp);
                    }}
                    style={{ marginBottom: '4px', padding: '6px 8px' }}
                    title="Swap Player A and B"
                  >
                    <ArrowLeftRight size={14} />
                  </button>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      Player / Team B
                    </label>
                    <select 
                      className="select" 
                      value={editPlayerB} 
                      onChange={(e) => setEditPlayerB(e.target.value)}
                      required
                    >
                      <option value="">-- Select Player B --</option>
                      {approvedRegistrations.map(r => (
                        <option key={r.id} value={r.name}>{formatPlayerDisplay(r.name)}</option>
                      ))}
                      <option value="BYE">BYE (Walkover)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditMatchModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Pairing &rarr;</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ➕ Add Custom Match Fixture Modal */}
      <AnimatePresence>
        {isAddMatchModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '520px' }}
            >
              <form onSubmit={handleSaveNewMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <div className="flex-between">
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800 }}>
                    ➕ Add Match Fixture
                  </h2>
                  <button type="button" className="btn-icon" onClick={() => setIsAddMatchModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '-8px' }}>
                  Create an additional custom fixture pairing for {activeEvent?.name}.
                </p>

                <div className="form-group">
                  <label className="form-label">Round / Stage</label>
                  <select className="select" value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)}>
                    <option value="Round 1">Round 1</option>
                    <option value="Round 2">Round 2</option>
                    <option value="Quarter Finals">Quarter Finals</option>
                    <option value="Semi Finals">Semi Finals</option>
                    <option value="Bronze Match (3rd Place)">Bronze Match (3rd Place)</option>
                    <option value="Finals (Championship)">Finals (Championship)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      Player / Team A
                    </label>
                    <select 
                      className="select" 
                      value={newMatchPlayerA} 
                      onChange={(e) => setNewMatchPlayerA(e.target.value)}
                      required
                    >
                      <option value="">-- Select Player A --</option>
                      {approvedRegistrations.map(r => (
                        <option key={r.id} value={r.name}>{formatPlayerDisplay(r.name)}</option>
                      ))}
                      <option value="BYE">BYE (Walkover)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      Player / Team B
                    </label>
                    <select 
                      className="select" 
                      value={newMatchPlayerB} 
                      onChange={(e) => setNewMatchPlayerB(e.target.value)}
                      required
                    >
                      <option value="">-- Select Player B --</option>
                      {approvedRegistrations.map(r => (
                        <option key={r.id} value={r.name}>{formatPlayerDisplay(r.name)}</option>
                      ))}
                      <option value="BYE">BYE (Walkover)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddMatchModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Fixture &rarr;</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
