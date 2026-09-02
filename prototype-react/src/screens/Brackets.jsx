import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, Trophy, Award, GitBranch, Edit3, CheckCheck, Clock, UserCheck, CalendarDays, Eye, Megaphone, Play, Pause, Download, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Brackets({ onShowToast }) {
  const { state, setStoreState, recordFixtureScore, approveEventRegistration, rejectEventRegistration, postAnnouncement, toggleParticipantVoting, publishParticipantResults, validateFlatDues, registerForEvent } = useStore();
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
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || 'evt-carrom-2026');
  const [selectedSubEventId, setSelectedSubEventId] = useState('all');
  
  // Tabs: 'fixtures' (or 'participants') and 'approvals'
  const [activeTab, setActiveTab] = useState('fixtures');
  const [playingRegId, setPlayingRegId] = useState(null);
  const audioPlayerRef = React.useRef(null);

  // Manual participant entry states
  const [manualName, setManualName] = useState('');
  const [manualWing, setManualWing] = useState('N');
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
    setScoringModal({ compId: matchingComp.id, fixture });
    setScoreA(fixture.scoreA || '');
    setScoreB(fixture.scoreB || '');
  };

  const handleSaveScore = (e) => {
    e.preventDefault();
    if (!scoringModal || !matchingComp) return;

    const { fixture } = scoringModal;
    const { playerA, playerB } = fixture;

    let winnerId = null;
    if (parseInt(scoreA) > parseInt(scoreB)) winnerId = playerA;
    if (parseInt(scoreB) > parseInt(scoreA)) winnerId = playerB;

    // Retrieve previous winner to adjust points if score is being edited
    const originalFixture = matchingComp.fixtures?.find(f => f.id === fixture.id);
    const prevWinner = originalFixture ? originalFixture.winnerId : null;

    let prevWingLetter = null;
    if (prevWinner) {
      const match = prevWinner.match(/\(([^)]+)\)/);
      if (match) prevWingLetter = match[1];
    }

    let newWingLetter = null;
    if (winnerId) {
      const match = winnerId.match(/\(([^)]+)\)/);
      if (match) newWingLetter = match[1];
    }

    recordFixtureScore(matchingComp.id, fixture.id, scoreA, scoreB, winnerId);

    // Leaderboard score correction logic
    setStoreState(prev => ({
      ...prev,
      leaderboard: prev.leaderboard.map(item => {
        let updatedPoints = item.points || 0;
        let updatedWins = item.wins || 0;
        let changed = false;

        // Deduct points/wins from previous winner
        if (prevWingLetter && item.letter === prevWingLetter) {
          updatedPoints = Math.max(0, updatedPoints - 30);
          updatedWins = Math.max(0, updatedWins - 1);
          changed = true;
        }

        // Add points/wins to new winner
        if (newWingLetter && item.letter === newWingLetter) {
          updatedPoints = updatedPoints + 30;
          updatedWins = updatedWins + 1;
          changed = true;
        }

        return changed ? { ...item, points: updatedPoints, wins: updatedWins } : item;
      })
    }));

    onShowToast(`Score recorded: ${playerA} vs ${playerB} (${scoreA}-${scoreB})`, 'success');
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
      // Auto-approve the registration immediately
      const newRegs = state.registrations || [];
      const latestReg = newRegs[newRegs.length - 1];
      if (latestReg && latestReg.status === 'PENDING') {
        approveEventRegistration(latestReg.id);
      }
      onShowToast(`✅ ${manualName} (${wingName}, Flat ${manualFlat}) registered and approved!`, 'success');
      setManualName('');
      setManualFlat('');
      setDuesStatus(null);
    } else {
      onShowToast(`❌ ${result.error}`, 'error');
    }
  };

  // --- Draw Generator ---
  const handleGenerateRandomDraw = () => {
    if (!canGenerateDraws) {
      onShowToast('Bracket draw generation is reserved for SCOT Members and Admins.', 'error');
      return;
    }
    if (approvedRegistrations.length < 2) {
      onShowToast('Need at least 2 approved participants to generate a draw!', 'error');
      return;
    }
    // Fisher-Yates shuffle
    const shuffled = [...approvedRegistrations];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Create fixture pairs
    const newFixtures = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const pA = shuffled[i];
      const pB = shuffled[i + 1];
      if (pA && pB) {
        newFixtures.push({
          id: `fix-${Date.now()}-${i}`,
          round: 'Round 1',
          playerA: pA.name,
          playerB: pB.name,
          scoreA: '',
          scoreB: '',
          winnerId: null
        });
      } else if (pA) {
        // Bye for odd participant
        newFixtures.push({
          id: `fix-${Date.now()}-${i}`,
          round: 'Round 1',
          playerA: pA.name,
          playerB: 'BYE',
          scoreA: '',
          scoreB: '',
          winnerId: pA.name
        });
      }
    }

    const subEvtId = selectedSubEventId === 'all' ? (activeEvent?.subEvents?.[0]?.id || '') : selectedSubEventId;
    const compName = `${activeEvent.name} - ${getSubEventName(subEvtId)} Draw`;

    // Check if a competition bracket already exists for this event/sub-event
    const existingComp = (state.competitions || []).find(c => c.eventId === selectedEventId && (selectedSubEventId === 'all' || c.subEventId === selectedSubEventId));

    if (existingComp) {
      // Update existing competition's fixtures
      setStoreState(prev => ({
        ...prev,
        competitions: prev.competitions.map(c => c.id === existingComp.id ? { ...c, fixtures: newFixtures } : c)
      }));
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
      setStoreState(prev => ({
        ...prev,
        competitions: [...(prev.competitions || []), newComp]
      }));
    }

    onShowToast(`🎲 Random draw generated! ${newFixtures.length} matches created.`, 'success');
    setActiveTab('fixtures');
  };

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
          {activeEvent.category === 'Cultural' && (
            <button 
              className={`tab ${activeTab === 'voting' ? 'active' : ''}`}
              onClick={() => setActiveTab('voting')}
            >
              🎭 Live Voting Manager
            </button>
          )}
        </div>
      </div>

      {activeTab === 'fixtures' && (
        matchingComp ? (
          /* Render Tournament brackets for Carrom / TT */
          matchingComp.type === 'knockout' ? (
            /* Knockout Bracket View */
            <div className="card">
              <div className="flex-between mb-sm" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
                  {matchingComp.name} Tree
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm" 
                    onClick={handlePublishScores}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    <Megaphone size={12} /> Broadcast Results
                  </button>
                  <span className="badge badge-violet">Single Elimination</span>
                </div>
              </div>

              <div className="bracket-svg-container" style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
                  {/* Quarterfinals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '-1.5rem' }}>Quarter Finals</div>
                    {matchingComp.fixtures.map(f => (
                      <div 
                        key={f.id} 
                        className="card card-interactive" 
                        style={{ padding: '0.75rem 1rem', width: '220px', borderLeft: f.winnerId ? '4px solid var(--color-cta)' : '1px solid var(--color-border)' }}
                        onClick={() => handleOpenScoreModal(f)}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: f.winnerId === f.playerA ? 700 : 500, color: f.winnerId && f.winnerId !== f.playerA ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                            <span>{f.playerA}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{f.scoreA !== '' ? f.scoreA : '-'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: f.winnerId === f.playerB ? 700 : 500, color: f.winnerId && f.winnerId !== f.playerB ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                            <span>{f.playerB}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{f.scoreB !== '' ? f.scoreB : '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Semifinals Mock */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '-5.5rem' }}>Semi Finals</div>
                    <div className="card" style={{ padding: '0.75rem 1rem', width: '220px', background: '#F8FAFC', opacity: 0.85 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        <div>Winner QF1</div>
                        <div>Winner QF2</div>
                      </div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem 1rem', width: '220px', background: '#F8FAFC', opacity: 0.85 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        <div>Winner QF3</div>
                        <div>Winner QF4</div>
                      </div>
                    </div>
                  </div>

                  {/* Finals Mock */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.5rem' }}>Finals</div>
                    <div className="card" style={{ padding: '0.75rem 1rem', width: '220px', background: '#F8FAFC', opacity: 0.7 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        <div>Winner SF1</div>
                        <div>Winner SF2</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Round Robin Table */
            <div className="card">
              <div className="flex-between mb-sm" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
                  {matchingComp.name} Standings
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm" 
                    onClick={handlePublishScores}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    <Megaphone size={12} /> Broadcast Results
                  </button>
                  <span className="badge badge-green">Round Robin</span>
                </div>
              </div>

              <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th style={{ textAlign: 'center' }}>Played</th>
                      <th style={{ textAlign: 'center' }}>Won</th>
                      <th style={{ textAlign: 'center' }}>Lost</th>
                      <th style={{ textAlign: 'right' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingComp.teams?.map((t, idx) => (
                      <tr key={idx}>
                        <td><strong>{t}</strong></td>
                        <td style={{ textAlign: 'center' }}>{idx < 2 ? 1 : 0}</td>
                        <td style={{ textAlign: 'center' }}>{idx === 0 ? 1 : 0}</td>
                        <td style={{ textAlign: 'center' }}>{idx === 1 ? 1 : 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{idx === 0 ? '30 pts' : '0 pts'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Match Fixtures</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {matchingComp.fixtures?.map(f => (
                  <div 
                    key={f.id} 
                    className="card card-interactive flex-between" 
                    style={{ padding: '0.75rem 1.25rem' }}
                    onClick={() => handleOpenScoreModal(f)}
                  >
                    <span><strong>{f.playerA}</strong> vs <strong>{f.playerB}</strong></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {f.scoreA !== '' ? `${f.scoreA} - ${f.scoreB}` : 'Pending score'}
                      </span>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                        <Edit3 size={12} /> Score
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          /* Render General Registrations List for Cultural events (Ganesh Utsav, Dandiya, etc.) */
          <div className="card">
            <div className="flex-between mb-sm" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
                Approved Event Participant Directory
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={handlePublishParticipants}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <Megaphone size={12} /> Broadcast Directory
                </button>
                <span className="badge badge-green">Approved Directory ({approvedRegistrations.length})</span>
              </div>
            </div>

            {approvedRegistrations.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Participant Name</th>
                      <th>Category/Sub-Event</th>
                      <th>Registered By Resident</th>
                      <th>Gender</th>
                      <th>Age Category</th>
                      <th>Submission Date</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRegistrations.map(reg => (
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
                        <td>{new Date(reg.registeredAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRejectRegistration(reg.id, reg.name)}
                            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent' }}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                <CalendarDays size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <h3>No approved participants found</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Approved resident registrations for this event category will show up here.
                </p>
              </div>
            )}

            {/* 🎲 Draw Generator (Admins & SCOT Members only) */}
            {canGenerateDraws && approvedRegistrations.length >= 2 && (
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
                  🎲 Tournament Draw Generator
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  Generate match fixtures from {approvedRegistrations.length} approved participants. You can shuffle randomly or assign slots manually in the Fixtures tab.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateRandomDraw}
                  >
                    🎲 Generate Random Draw
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      onShowToast('Switch to the Fixtures tab to manually assign slots.', 'info');
                      setActiveTab('fixtures');
                    }}
                  >
                    ✏️ Manual Slot Assignment
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {activeTab === 'approvals' && (
        <>
        {/* Manual Participant Entry */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
              ➕ Manual Participant Entry
            </h2>
            <button
              className={`btn btn-sm ${showManualEntry ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setShowManualEntry(!showManualEntry)}
            >
              {showManualEntry ? 'Close Form' : 'Add Participant'}
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
                    <select className="select" value={manualWing} onChange={(e) => { setManualWing(e.target.value); setDuesStatus(null); }}>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '-8px' }}>
                  Enter results to declare match winner. Winner's wing earns <strong>+30 points</strong> automatically.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 12px 1fr', alignItems: 'center', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scoringModal.fixture.playerA}
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
                    <label className="form-label" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scoringModal.fixture.playerB}
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
    </motion.div>
  );
}
