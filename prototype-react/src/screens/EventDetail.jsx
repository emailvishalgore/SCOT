import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, Calendar, MapPin, Clock, UserPlus, AlertTriangle, Trash2, CalendarDays, Eye, Trophy, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventDetail({ eventId, onViewScreen, onShowToast }) {
  const { state, registerForEvent, withdrawRegistration, uploadRegistrationMedia, castParticipantVote, approveEventRegistration, recordEventResult } = useStore();
  const user = state.currentUser || { id: 'anon', name: 'Guest Resident', status: 'PENDING_APPROVAL' };
  const event = state.events.find(e => e.id === eventId) || state.events[0];
  const allApprovedEventRegs = (state.registrations || []).filter(
    r => r.eventId === eventId && r.status === 'APPROVED'
  );

  // Modal registration form states
  const [confirmModalData, setConfirmModalData] = useState(null); // { subId, subName, isDoubles } or null
  const [teamName, setTeamName] = useState('');
  const [selectedWing, setSelectedWing] = useState(user.wing || 'Wing N');
  const [participants, setParticipants] = useState([
    { name: '', flat: '', phone: '', gender: 'Male', ageCategory: 'Above 16' }
  ]);

  // Direct Results Declaration Modal states
  const [resultModalData, setResultModalData] = useState(null); // { subId, subName, winnerPoints, runnerUpPoints, isCompleted }
  const [isSavingResult, setIsSavingResult] = useState(false);
  
  const [winnerType, setWinnerType] = useState('registered'); // 'registered' | 'custom'
  const [winnerRegId, setWinnerRegId] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [winnerWing, setWinnerWing] = useState('Wing N');
  const [winnerFlat, setWinnerFlat] = useState('');
  const [winnerVictoryType, setWinnerVictoryType] = useState('individual'); // 'individual' | 'team'
  const [winnerTeamMembers, setWinnerTeamMembers] = useState([{ name: '', flat: '' }]);
  
  const [runnerUpType, setRunnerUpType] = useState('registered'); // 'registered' | 'custom'
  const [runnerUpRegId, setRunnerUpRegId] = useState('');
  const [runnerUpName, setRunnerUpName] = useState('');
  const [runnerUpWing, setRunnerUpWing] = useState('Wing N');
  const [runnerUpFlat, setRunnerUpFlat] = useState('');
  const [runnerUpVictoryType, setRunnerUpVictoryType] = useState('individual'); // 'individual' | 'team'
  const [runnerUpTeamMembers, setRunnerUpTeamMembers] = useState([{ name: '', flat: '' }]);

  const handleAddWinnerMember = () => {
    if (winnerTeamMembers.length >= 12) {
      onShowToast('Maximum 12 members per team.', 'warning');
      return;
    }
    setWinnerTeamMembers(prev => [...prev, { name: '', flat: '' }]);
  };

  const handleRemoveWinnerMember = (index) => {
    if (winnerTeamMembers.length <= 1) return;
    setWinnerTeamMembers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateWinnerMember = (index, field, value) => {
    setWinnerTeamMembers(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: value } : m));
  };

  const handleAddRunnerUpMember = () => {
    if (runnerUpTeamMembers.length >= 12) {
      onShowToast('Maximum 12 members per team.', 'warning');
      return;
    }
    setRunnerUpTeamMembers(prev => [...prev, { name: '', flat: '' }]);
  };

  const handleRemoveRunnerUpMember = (index) => {
    if (runnerUpTeamMembers.length <= 1) return;
    setRunnerUpTeamMembers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateRunnerUpMember = (index, field, value) => {
    setRunnerUpTeamMembers(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: value } : m));
  };

  if (!event) {
    return (
      <div style={{ padding: '2rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onViewScreen('events')}>
          <ArrowLeft size={16} /> Back to Events
        </button>
        <p style={{ marginTop: '1rem' }}>Event details not found.</p>
      </div>
    );
  }

  // Calculate deadlines
  const checkDeadlinePassed = (deadlineDate, deadlineTime) => {
    if (!deadlineDate) return false;
    const timePart = deadlineTime || '23:59';
    const deadlineStr = `${deadlineDate}T${timePart}`;
    return new Date() > new Date(deadlineStr);
  };

  const isWingLeader = user.role === 'admin' || user.role === 'champion' || user.role === 'wing_captain';

  const getSubRegistrations = (subId) => {
    return (state.registrations || []).filter(r => {
      if (r.eventId !== eventId || r.subEventId !== subId) return false;
      if (r.registeredByUserId === user.id) return true;
      if (isWingLeader) {
        if (user.role === 'admin') return true;
        const regCreator = state.users.find(u => u.id === r.registeredByUserId);
        if (regCreator && user.wing && regCreator.wing === user.wing) return true;
        if (user.wing && String(r.name || '').includes(user.wing)) return true;
      }
      return false;
    });
  };

  const getEventRegistrations = () => {
    return (state.registrations || []).filter(r => {
      if (r.eventId !== eventId) return false;
      if (r.registeredByUserId === user.id) return true;
      if (isWingLeader) {
        if (user.role === 'admin') return true;
        const regCreator = state.users.find(u => u.id === r.registeredByUserId);
        if (regCreator && user.wing && regCreator.wing === user.wing) return true;
        if (user.wing && String(r.name || '').includes(user.wing)) return true;
      }
      return false;
    });
  };

  const getEventPoints = (evt, subId) => {
    if (!evt) return { winnerPoints: 100, runnerUpPoints: 50 };
    let target = evt;
    if (subId && evt.subEvents && evt.subEvents.length > 0) {
      const sub = evt.subEvents.find(s => s.id === subId);
      if (sub) target = sub;
    }
    let win = target.winnerPoints !== undefined && target.winnerPoints !== '' ? parseInt(target.winnerPoints, 10) : NaN;
    let run = target.runnerUpPoints !== undefined && target.runnerUpPoints !== '' ? parseInt(target.runnerUpPoints, 10) : NaN;
    if (isNaN(win) && target.points) {
      const pStr = String(target.points);
      const winMatch = pStr.match(/Winner:\s*(\d+)/i) || pStr.match(/(\d+)\s*pts/i) || pStr.match(/^(\d+)$/);
      if (winMatch) win = parseInt(winMatch[1], 10);
    }
    if (isNaN(run) && target.points) {
      const pStr = String(target.points);
      const runMatch = pStr.match(/Runner:\s*(\d+)/i) || pStr.match(/Runner-?up:\s*(\d+)/i);
      if (runMatch) run = parseInt(runMatch[1], 10);
    }
    if (isNaN(win)) win = 100;
    if (isNaN(run)) run = 50;
    return { winnerPoints: win, runnerUpPoints: run };
  };

  const mainDeadlineDate = event.registrationDeadline || '2026-12-31';
  const mainDeadlineTime = event.registrationDeadlineTime || '23:59';
  const isMainDeadlinePassed = checkDeadlinePassed(mainDeadlineDate, mainDeadlineTime);

  const handleOpenDeclareResult = (subId = null, subName = null) => {
    const targetSub = subId && event.subEvents ? event.subEvents.find(s => s.id === subId) : null;
    const target = targetSub || event;
    const displayName = subName || target.name;
    const { winnerPoints, runnerUpPoints } = getEventPoints(event, subId);

    const existingWinner = target.winner || null;
    const existingRunnerUp = target.runnerUp || null;

    // Detect if this category is naturally a team/group event
    const isGroupByDefault = target.regType === 'GROUP_REQUIRED' || target.regType === 'GROUP_OPTIONAL' ||
      String(displayName).toLowerCase().includes('group') || String(displayName).toLowerCase().includes('team') ||
      String(displayName).toLowerCase().includes('pair') || String(displayName).toLowerCase().includes('double');

    setResultModalData({
      subId,
      subName: displayName,
      winnerPoints,
      runnerUpPoints,
      isCompleted: target.status === 'COMPLETED'
    });

    if (existingWinner) {
      setWinnerType(existingWinner.registrationId ? 'registered' : 'custom');
      setWinnerRegId(existingWinner.registrationId || '');
      setWinnerName(existingWinner.name || '');
      setWinnerWing(existingWinner.wing || 'Wing N');
      setWinnerFlat(existingWinner.flat || '');
      const isTeam = existingWinner.victoryType === 'team' || (existingWinner.members && existingWinner.members.length > 0);
      setWinnerVictoryType(isTeam ? 'team' : 'individual');
      setWinnerTeamMembers(existingWinner.members && existingWinner.members.length > 0 
        ? existingWinner.members 
        : [{ name: '', flat: '' }]);
    } else {
      setWinnerType('registered');
      setWinnerName('');
      setWinnerWing('Wing N');
      setWinnerFlat('');
      setWinnerRegId('');
      setWinnerVictoryType(isGroupByDefault ? 'team' : 'individual');
      setWinnerTeamMembers([{ name: '', flat: '' }, { name: '', flat: '' }]);
    }

    if (existingRunnerUp) {
      setRunnerUpType(existingRunnerUp.registrationId ? 'registered' : 'custom');
      setRunnerUpRegId(existingRunnerUp.registrationId || '');
      setRunnerUpName(existingRunnerUp.name || '');
      setRunnerUpWing(existingRunnerUp.wing || 'Wing N');
      setRunnerUpFlat(existingRunnerUp.flat || '');
      const isTeam = existingRunnerUp.victoryType === 'team' || (existingRunnerUp.members && existingRunnerUp.members.length > 0);
      setRunnerUpVictoryType(isTeam ? 'team' : 'individual');
      setRunnerUpTeamMembers(existingRunnerUp.members && existingRunnerUp.members.length > 0 
        ? existingRunnerUp.members 
        : [{ name: '', flat: '' }]);
    } else {
      setRunnerUpType('registered');
      setRunnerUpName('');
      setRunnerUpWing('Wing N');
      setRunnerUpFlat('');
      setRunnerUpRegId('');
      setRunnerUpVictoryType(isGroupByDefault ? 'team' : 'individual');
      setRunnerUpTeamMembers([{ name: '', flat: '' }, { name: '', flat: '' }]);
    }
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!resultModalData || isSavingResult) return;

    // Resolve winner data
    let finalWinner = null;
    if (winnerType === 'registered') {
      const reg = (state.registrations || []).find(r => r.id === winnerRegId);
      if (!reg) {
        onShowToast('Please select a registered Winner participant or choose Manual Entry!', 'error');
        return;
      }
      const wingMatch = reg.name.match(/Wing\s*([A-Za-z0-9]+)/i);
      const flatMatch = reg.name.match(/Flat\s*[:#-]?\s*(\d{3})/i);
      const wWing = wingMatch ? `Wing ${wingMatch[1].toUpperCase()}` : (reg.wing || user.wing || 'Wing N');
      const wFlat = flatMatch ? flatMatch[1] : '';
      const isTeam = reg.gender === 'Group' || reg.gender === 'Doubles' || (reg.groupMembers && reg.groupMembers.length > 0);

      let parsedMembers = [];
      if (reg.groupMembers && Array.isArray(reg.groupMembers)) {
        parsedMembers = reg.groupMembers.map(mStr => {
          const fm = String(mStr).match(/Flat\s*[:#-]?\s*(\d{3})/i);
          const nm = String(mStr).replace(/\(Flat.*?\)/i, '').replace(/Ph:.*$/i, '').trim();
          return { name: nm || mStr, flat: fm ? fm[1] : '' };
        });
      }

      finalWinner = {
        victoryType: isTeam ? 'team' : 'individual',
        name: reg.name,
        wing: wWing,
        flat: wFlat,
        members: parsedMembers,
        registrationId: reg.id
      };
    } else {
      // Manual Entry
      if (!winnerName.trim()) {
        onShowToast(winnerVictoryType === 'team' ? 'Winner Team Name is required!' : 'Winner Name is required!', 'error');
        return;
      }

      let validMembers = [];
      if (winnerVictoryType === 'team') {
        validMembers = winnerTeamMembers.filter(m => m.name && m.name.trim().length > 0);
        if (validMembers.length === 0) {
          onShowToast('Please add at least 1 member name for the winning team!', 'error');
          return;
        }
      }

      finalWinner = {
        victoryType: winnerVictoryType,
        name: winnerName.trim(),
        wing: winnerWing,
        flat: winnerVictoryType === 'individual' ? winnerFlat : (validMembers[0]?.flat || winnerFlat),
        members: validMembers
      };
    }

    // Resolve runner-up data
    let finalRunnerUp = null;
    if (runnerUpType === 'registered') {
      const reg = (state.registrations || []).find(r => r.id === runnerUpRegId);
      if (!reg) {
        onShowToast('Please select a registered Runner-Up participant or choose Manual Entry!', 'error');
        return;
      }
      const wingMatch = reg.name.match(/Wing\s*([A-Za-z0-9]+)/i);
      const flatMatch = reg.name.match(/Flat\s*[:#-]?\s*(\d{3})/i);
      const rWing = wingMatch ? `Wing ${wingMatch[1].toUpperCase()}` : (reg.wing || user.wing || 'Wing N');
      const rFlat = flatMatch ? flatMatch[1] : '';
      const isTeam = reg.gender === 'Group' || reg.gender === 'Doubles' || (reg.groupMembers && reg.groupMembers.length > 0);

      let parsedMembers = [];
      if (reg.groupMembers && Array.isArray(reg.groupMembers)) {
        parsedMembers = reg.groupMembers.map(mStr => {
          const fm = String(mStr).match(/Flat\s*[:#-]?\s*(\d{3})/i);
          const nm = String(mStr).replace(/\(Flat.*?\)/i, '').replace(/Ph:.*$/i, '').trim();
          return { name: nm || mStr, flat: fm ? fm[1] : '' };
        });
      }

      finalRunnerUp = {
        victoryType: isTeam ? 'team' : 'individual',
        name: reg.name,
        wing: rWing,
        flat: rFlat,
        members: parsedMembers,
        registrationId: reg.id
      };
    } else {
      // Manual Entry
      if (!runnerUpName.trim()) {
        onShowToast(runnerUpVictoryType === 'team' ? 'Runner-Up Team Name is required!' : 'Runner-Up Name is required!', 'error');
        return;
      }

      let validMembers = [];
      if (runnerUpVictoryType === 'team') {
        validMembers = runnerUpTeamMembers.filter(m => m.name && m.name.trim().length > 0);
        if (validMembers.length === 0) {
          onShowToast('Please add at least 1 member name for the runner-up team!', 'error');
          return;
        }
      }

      finalRunnerUp = {
        victoryType: runnerUpVictoryType,
        name: runnerUpName.trim(),
        wing: runnerUpWing,
        flat: runnerUpVictoryType === 'individual' ? runnerUpFlat : (validMembers[0]?.flat || runnerUpFlat),
        members: validMembers
      };
    }

    try {
      setIsSavingResult(true);
      const res = await recordEventResult(event.id, resultModalData.subId, finalWinner, finalRunnerUp);
      if (res.success) {
        onShowToast(`🏆 Results saved & published for ${resultModalData.subName}! Synced live to Google Sheets.`, 'success');
        setResultModalData(null);
      } else {
        onShowToast(res.error || 'Failed to save results.', 'error');
      }
    } catch (err) {
      console.error("Save result failed:", err);
      onShowToast('Failed to save results. Please try again.', 'error');
    } finally {
      setIsSavingResult(false);
    }
  };

  const handleClearResult = async () => {
    if (!resultModalData || isSavingResult) return;
    if (window.confirm(`Are you sure you want to clear results for ${resultModalData.subName}? This will revoke awarded championship points.`)) {
      try {
        setIsSavingResult(true);
        await recordEventResult(event.id, resultModalData.subId, null, null, true);
        onShowToast(`Results cleared for ${resultModalData.subName}. Google Sheets updated.`, 'info');
        setResultModalData(null);
      } catch (err) {
        console.error("Clear result failed:", err);
        onShowToast('Failed to clear result.', 'error');
      } finally {
        setIsSavingResult(false);
      }
    }
  };

  const handleOpenRegister = (subId, subName) => {
    if (user.id === 'anon' || user.status === 'PENDING_APPROVAL') {
      onShowToast('You must be registered and verified by admin to sign up for events!', 'error');
      return;
    }
    const isDoubles = String(subName || '').toLowerCase().includes('double') || String(subName || '').toLowerCase().includes('pair');
    setConfirmModalData({ subId, subName, isDoubles });
    setTeamName('');
    setSelectedWing(user.wing || 'Wing N');
    
    if (isDoubles) {
      setParticipants([
        { name: '', flat: '', phone: '', gender: 'Male', ageCategory: 'Above 16' },
        { name: '', flat: '', phone: '', gender: 'Male', ageCategory: 'Above 16' }
      ]);
    } else {
      setParticipants([
        { name: '', flat: '', phone: '', gender: 'Male', ageCategory: 'Above 16' }
      ]);
    }
  };

  const handleAddParticipant = () => {
    if (participants.length >= 10) {
      onShowToast('Maximum 10 participants per entry.', 'warning');
      return;
    }
    setParticipants(prev => [
      ...prev,
      { name: '', flat: '', phone: '', gender: 'Male', ageCategory: 'Above 16' }
    ]);
  };

  const handleRemoveParticipant = (index) => {
    if (participants.length <= 1) {
      onShowToast('At least 1 participant is required!', 'warning');
      return;
    }
    setParticipants(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateParticipant = (index, field, value) => {
    setParticipants(prev => prev.map((p, idx) => idx === index ? { ...p, [field]: value } : p));
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!confirmModalData) return;

    const subId = confirmModalData.subId;
    let dDate = mainDeadlineDate;
    let dTime = mainDeadlineTime;
    
    if (subId) {
      const sub = event.subEvents?.find(s => s.id === subId);
      if (sub) {
        dDate = sub.deadlineDate || dDate;
        dTime = sub.deadlineTime || dTime;
      }
    }

    if (checkDeadlinePassed(dDate, dTime)) {
      onShowToast('Registration is closed for this event category!', 'error');
      return;
    }

    // Validate all participants in the form
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const pLabel = participants.length > 1 ? `Participant #${i + 1}` : 'Participant';
      if (!p.name.trim()) {
        onShowToast(`${pLabel} name is required!`, 'error');
        return;
      }
      const VALID_FLATS = ['101','102','103','104','201','202','203','204','301','302','303','304','401','402','403','404','501','502','503','504','601','602','603','604','701','702','703','704'];
      if (!p.flat || !VALID_FLATS.includes(p.flat)) {
        onShowToast(`${pLabel} Please select a valid flat number!`, 'error');
        return;
      }
      if (p.phone && !/^\d{10}$/.test(p.phone)) {
        onShowToast(`${pLabel} mobile phone number must be 10 digits!`, 'error');
        return;
      }
    }

    const wingText = (user.role === 'admin' && selectedWing) ? selectedWing : (user.wing || selectedWing || 'Wing N');
    let finalDisplayName = '';
    let groupMembersList = [];

    if (participants.length === 1) {
      const p = participants[0];
      const phoneText = p.phone ? ` • Ph: ${p.phone}` : '';
      finalDisplayName = `${p.name.trim()} (${wingText}, Flat ${p.flat})${phoneText}`;
      groupMembersList = [];
    } else {
      // Doubles or Multi-Participant
      const playersText = participants.map(p => `${p.name.trim()} (Flat ${p.flat})`).join(' & ');
      if (teamName.trim()) {
        finalDisplayName = `${teamName.trim()} [${wingText}] (${playersText})`;
      } else {
        finalDisplayName = `${playersText} [${wingText}]`;
      }
      groupMembersList = participants.map(p => `${p.name.trim()} (Flat ${p.flat}${p.phone ? ', Ph: ' + p.phone : ''})`);
    }

    const isGroupOrMulti = participants.length > 1;
    const res = registerForEvent(
      event.id,
      confirmModalData.subId,
      finalDisplayName,
      isGroupOrMulti ? 'Doubles' : participants[0].gender,
      isGroupOrMulti ? 'Doubles' : participants[0].ageCategory,
      groupMembersList
    );

    if (res.success) {
      if (res.autoApproved) {
        onShowToast(
          isGroupOrMulti 
            ? `✅ Team "${finalDisplayName}" registered & AUTO-APPROVED (Flat Dues Verified)!` 
            : `✅ "${finalDisplayName}" registered & AUTO-APPROVED (Flat Dues Verified)!`, 
          'success'
        );
      } else {
        onShowToast(
          `ℹ️ Nomination submitted for "${finalDisplayName}" (Pending Review: ${res.reason || 'Dues Unverified'})`, 
          'info'
        );
      }
      setConfirmModalData(null);
    } else {
      onShowToast(res.error, 'error');
    }
  };

  const handleWithdraw = (regId, name) => {
    const reg = (state.registrations || []).find(r => r.id === regId);
    let dDate = mainDeadlineDate;
    let dTime = mainDeadlineTime;
    
    if (reg && reg.subEventId) {
      const sub = event.subEvents?.find(s => s.id === reg.subEventId);
      if (sub) {
        dDate = sub.deadlineDate || dDate;
        dTime = sub.deadlineTime || dTime;
      }
    }
    
    const deadlinePassed = checkDeadlinePassed(dDate, dTime);
    if (deadlinePassed) {
      onShowToast('Cannot Withdraw: Registration deadline has passed!', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to withdraw registration for ${name}?`)) {
      withdrawRegistration(regId);
      onShowToast(`Withdrew registration for ${name}.`, 'info');
    }
  };



  const handleMediaUpload = (e, registrationId) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      onShowToast('File size exceeds the 50MB limit!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      uploadRegistrationMedia(registrationId, ev.target.result);
      onShowToast(`Backing track "${file.name}" uploaded successfully!`, 'success');
    };
    reader.onerror = () => {
      onShowToast('Failed to read file!', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (registrationId) => {
    if (window.confirm('Are you sure you want to remove this backing track?')) {
      uploadRegistrationMedia(registrationId, '');
      onShowToast('Backing track removed.', 'info');
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      {/* Back Button */}
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onViewScreen('events')}>
          <ArrowLeft size={16} /> Back to Events
        </button>
      </div>

      {/* Verification Gated Alert */}
      {user.status === 'PENDING_APPROVAL' && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(245, 158, 11, 0.4)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#92400E' }}>
          <AlertTriangle size={24} style={{ flexShrink: 0, color: '#D97706' }} />
          <div>
            <strong style={{ fontSize: '0.9375rem' }}>Registration Pending Admin Verification</strong>
            <p style={{ fontSize: '0.8125rem', marginTop: '2px' }}>Your account is pending verification of flat contribution dues. You can browse details and register once verified.</p>
          </div>
        </div>
      )}

      {/* Event Hero Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)', color: 'white', padding: '2rem', border: 'none', marginBottom: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
          <span className={`badge ${event.category === 'Sports' ? 'badge-green' : 'badge-violet'}`}>{event.category}</span>
          <span className="badge badge-slate" style={{ opacity: 0.9 }}>{event.status}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.25rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>{event.name}</h1>
        <p style={{ fontSize: '1rem', opacity: 0.95, maxWidth: '700px', lineHeight: 1.5 }}>{event.description}</p>
      </div>

      {/* Info Cards Grid & Deadline Indicator */}
      <div className="grid-4 mb-lg" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <div className="stat-icon-wrapper">
            <Calendar size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Dates</span>
            <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{event.startDate}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <div className="stat-icon-wrapper green">
            <MapPin size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Venue</span>
            <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{event.venue}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <div className="stat-icon-wrapper amber">
            <Clock size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Time Details</span>
            <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{event.time}</p>
          </div>
        </div>

        {/* Deadline Indicator */}
        <div className={`card ${isMainDeadlinePassed ? 'red' : 'green'}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderLeft: `4px solid ${isMainDeadlinePassed ? 'var(--color-danger)' : 'var(--color-cta)'}` }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: isMainDeadlinePassed ? '#FEF2F2' : '#ECFDF5', color: isMainDeadlinePassed ? 'var(--color-danger)' : 'var(--color-cta)' }}>
            <CalendarDays size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Registration Deadline</span>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: isMainDeadlinePassed ? 'var(--color-danger)' : 'var(--color-cta)' }}>
              {mainDeadlineDate} @ {mainDeadlineTime} {isMainDeadlinePassed ? '(Closed)' : '(Active)'}
            </p>
          </div>
        </div>
      </div>

      {/* 🎭 Audience Live Voting Section */}
      {event.category === 'Cultural' && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}></div>
          <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              🎭 Audience Live Voting
            </h2>
            <span className="badge badge-violet" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Stage Feedback</span>
          </div>

          {/* Active Performers Voting */}
          {(() => {
            const activePerformer = (state.registrations || []).find(
              r => r.eventId === eventId && r.votingStatus === 'OPEN' && r.status === 'APPROVED'
            );

            if (activePerformer) {
              const subEvent = event.subEvents?.find(s => s.id === activePerformer.subEventId);
              const subName = subEvent ? subEvent.name : event.name;

              // Check if current user has voted for this active performer
              const myVote = (state.votes || []).find(
                v => v.registrationId === activePerformer.id && v.userId === user.id
              );
              const myRating = myVote ? myVote.rating : 0;

              return (
                <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', margin: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '0.25rem' }}>
                    <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', display: 'inline-block' }}></span>
                    <strong style={{ fontSize: '0.8rem', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Now Performing on Stage</strong>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 800, color: '#9F1239', margin: '0.25rem 0 0.1rem' }}>
                    {activePerformer.name}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#B91C1C', fontWeight: 600, marginBottom: '1rem' }}>
                    Category: {subName}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4E0E1F' }}>
                      {myRating > 0 ? `Your Rating: ${myRating} Star${myRating > 1 ? 's' : ''}` : 'Tap Stars to Cast Your Vote!'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {[1, 2, 3, 4, 5].map(star => {
                        const filled = star <= myRating;
                        return (
                          <button
                            key={star}
                            onClick={() => {
                              if (user.id === 'anon' || user.status === 'PENDING_APPROVAL') {
                                onShowToast('You must be registered and verified by admin to vote!', 'error');
                                return;
                              }
                              const res = castParticipantVote(eventId, activePerformer.subEventId, activePerformer.id, star);
                              if (res.success) {
                                onShowToast(`Rated ${star} stars for ${activePerformer.name}!`, 'success');
                              } else {
                                onShowToast(res.error, 'error');
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              fontSize: '2rem',
                              color: filled ? '#F59E0B' : '#E2E8F0',
                              transition: 'transform 0.1s ease',
                            }}
                            className="star-btn"
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#E11D48', marginTop: '4px' }}>
                      *Voting is time-bound. Cast your vote before the admin closes this performance!
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--color-text-secondary)', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No performance is active for voting right now.</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Audience voting will open dynamically as participants take the stage. Keep this page open!
                </p>
              </div>
            );
          })()}

          {/* Locked Past Ratings by the User */}
          {(() => {
            const myPastVotes = (state.votes || []).filter(v => v.userId === user.id && v.eventId === eventId);
            if (myPastVotes.length > 0) {
              return (
                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                    Your Submitted Ratings:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {myPastVotes.map(v => {
                      const reg = (state.registrations || []).find(r => r.id === v.registrationId);
                      if (!reg) return null;
                      return (
                        <div key={v.id} className="flex-between" style={{ fontSize: '0.8rem', background: '#F1F5F9', padding: '6px 10px', borderRadius: '6px' }}>
                          <span><strong>{reg.name}</strong></span>
                          <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>⭐ {v.rating} / 5.0</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Sub-events configure list */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
            {event.type === 'UMBRELLA' ? 'Sub-Events & Competition Categories' : 'Registration & Results'}
          </h2>
          {isWingLeader && (!event.subEvents || event.subEvents.length === 0) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenDeclareResult(null, event.name)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#F59E0B', color: '#B45309', fontWeight: 700 }}
            >
              <Trophy size={14} /> {event.status === 'COMPLETED' ? 'Edit Event Results' : 'Declare Winner & Runner-up'}
            </button>
          )}
        </div>

        {/* Standalone Event Podium Banner if completed */}
        {(!event.subEvents || event.subEvents.length === 0) && event.status === 'COMPLETED' && event.winner && (
          <div style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)', border: '1.5px solid #F59E0B', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={16} style={{ color: '#D97706' }} /> Official Podium Declared
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                COMPLETED
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #FCD34D', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🥇 Winner (Gold Medal)
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#78350F', marginTop: '4px' }}>{event.winner.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: 600, marginTop: '2px' }}>
                  {event.winner.wing} {event.winner.flat ? `• Flat ${event.winner.flat}` : ''} • <strong style={{ color: '#B45309' }}>+{getEventPoints(event, null).winnerPoints} pts</strong>
                </div>
                {event.winner.members && event.winner.members.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: '#92400E', marginTop: '6px', background: '#FEF9C3', padding: '4px 8px', borderRadius: '6px', border: '1px solid #FEF08A' }}>
                    👥 <strong>Team Members:</strong> {event.winner.members.map(m => `${m.name}${m.flat ? ` (${m.flat})` : ''}`).join(', ')}
                  </div>
                )}
              </div>
              {event.runnerUp && (
                <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', boxShadow: '0 2px 6px rgba(100, 116, 139, 0.12)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🥈 Runner-Up (Silver Medal)
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B', marginTop: '4px' }}>{event.runnerUp.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                    {event.runnerUp.wing} {event.runnerUp.flat ? `• Flat ${event.runnerUp.flat}` : ''} • <strong style={{ color: '#475569' }}>+{getEventPoints(event, null).runnerUpPoints} pts</strong>
                  </div>
                  {event.runnerUp.members && event.runnerUp.members.length > 0 && (
                    <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '6px', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      👥 <strong>Team Members:</strong> {event.runnerUp.members.map(m => `${m.name}${m.flat ? ` (${m.flat})` : ''}`).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {event.subEvents && event.subEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {event.subEvents.map(sub => {
              const subRegs = getSubRegistrations(sub.id);
              const subDeadlineDate = sub.deadlineDate || mainDeadlineDate;
              const subDeadlineTime = sub.deadlineTime || mainDeadlineTime;
              const isSubDeadlinePassed = checkDeadlinePassed(subDeadlineDate, subDeadlineTime);
              const { winnerPoints: subWinPts, runnerUpPoints: subRunPts } = getEventPoints(event, sub.id);

              return (
                <div 
                  key={sub.id}
                  style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: '#FAF5FF', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{sub.name}</h3>
                        {sub.status === 'COMPLETED' && (
                          <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                            🏆 Results Declared
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {`Points Template: Winner ${subWinPts} pts • Runner-up ${subRunPts} pts`}
                      </p>
                      {/* Sub-Category Date & Time details */}
                      {(sub.startDate || sub.time) && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Calendar size={12} /> {sub.startDate || event.startDate}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>&bull;</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Clock size={12} /> {sub.time || event.time}</span>
                        </p>
                      )}
                      {/* Sub-Category Event Manager contact */}
                      {sub.managerName && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', marginTop: '4px', fontWeight: 700 }}>
                          Manager: {sub.managerName} {sub.managerPhone ? `(${sub.managerPhone})` : ''}
                        </p>
                      )}
                      {/* Sub-Category Specific Registration Deadline */}
                      <p style={{ fontSize: '0.8rem', color: isSubDeadlinePassed ? 'var(--color-danger)' : 'var(--color-cta)', marginTop: '4px', fontWeight: 700 }}>
                        Reg Deadline: {subDeadlineDate} @ {subDeadlineTime} {isSubDeadlinePassed ? '(Closed)' : '(Active)'}
                      </p>

                      {/* 📜 Collapsible Rules Summary */}
                      {sub.rules && (
                        <details style={{ marginTop: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                          <summary style={{ color: 'var(--color-primary)', fontWeight: 700, outline: 'none' }}>
                            📜 View Rules & Regulations
                          </summary>
                          <div style={{ marginTop: '4px', background: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-line', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: '1.4' }}>
                            {sub.rules}
                          </div>
                        </details>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Declare / Edit Results Button (for Admin & Event Leaders) */}
                      {isWingLeader && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDeclareResult(sub.id, sub.name)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#F59E0B', color: '#B45309', fontWeight: 700 }}
                        >
                          <Trophy size={14} /> {sub.status === 'COMPLETED' ? 'Edit Results' : 'Declare Results'}
                        </button>
                      )}

                      {isSubDeadlinePassed ? (
                        <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                          Closed
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenRegister(sub.id, sub.name)}
                        >
                          <UserPlus size={14} /> Add Registration
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 🏆 Sub-Event Podium Card if Completed */}
                  {sub.status === 'COMPLETED' && sub.winner && (
                    <div style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)', border: '1.5px solid #F59E0B', borderRadius: '10px', padding: '12px 14px', margin: '4px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🏆 Official Podium Declared
                        </span>
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                          Completed
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #FCD34D', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>🥇 Winner (Gold Medal)</div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#78350F', marginTop: '2px' }}>{sub.winner.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 600, marginTop: '2px' }}>
                            {sub.winner.wing} {sub.winner.flat ? `• Flat ${sub.winner.flat}` : ''} • <strong style={{ color: '#B45309' }}>+{subWinPts} pts</strong>
                          </div>
                          {sub.winner.members && sub.winner.members.length > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '6px', background: '#FEF9C3', padding: '3px 6px', borderRadius: '4px', border: '1px solid #FEF08A' }}>
                              👥 <strong>Team:</strong> {sub.winner.members.map(m => `${m.name}${m.flat ? ` (${m.flat})` : ''}`).join(', ')}
                            </div>
                          )}
                        </div>
                        {sub.runnerUp && (
                          <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', boxShadow: '0 2px 4px rgba(100, 116, 139, 0.1)' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>🥈 Runner-Up (Silver Medal)</div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B', marginTop: '2px' }}>{sub.runnerUp.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                              {sub.runnerUp.wing} {sub.runnerUp.flat ? `• Flat ${sub.runnerUp.flat}` : ''} • <strong style={{ color: '#475569' }}>+{subRunPts} pts</strong>
                            </div>
                            {sub.runnerUp.members && sub.runnerUp.members.length > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '6px', background: '#F1F5F9', padding: '3px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                👥 <strong>Team:</strong> {sub.runnerUp.members.map(m => `${m.name}${m.flat ? ` (${m.flat})` : ''}`).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Registered Flat Members List for this Sub-Event */}
                  {subRegs.length > 0 && (
                    <div style={{ background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                        Registered from your flat:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {subRegs.map(r => (
                          <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                            <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                              <div>
                                <strong style={{ color: 'var(--color-text)' }}>{r.name}</strong> 
                                {r.gender === 'Group' ? (
                                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', display: 'block', marginTop: '2px' }}>
                                    {r.groupMembers && r.groupMembers.length > 0 
                                      ? `👥 Members: ${r.groupMembers.join(', ')}` 
                                      : '👥 Wing Group Entry'}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginLeft: '6px' }}>
                                    ({r.gender}, {r.ageCategory})
                                  </span>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={`badge ${r.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                                  {r.status}
                                </span>
                                {!isSubDeadlinePassed && (
                                  <button 
                                    className="logout-btn" 
                                    style={{ padding: '2px', color: 'var(--color-text-muted)' }}
                                    onClick={() => handleWithdraw(r.id, r.name)}
                                    title="Withdraw"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 🎵 Media Upload Block for Cultural Events */}
                            {event.category === 'Cultural' && (
                              <div style={{ marginTop: '8px', padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                {r.mediaTrack ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                                      <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        🎵 Media Track Uploaded
                                      </span>
                                      {!isSubDeadlinePassed && (
                                        <button
                                          className="btn btn-secondary btn-xs"
                                          onClick={() => handleRemoveMedia(r.id)}
                                          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '2px 6px', fontSize: '0.7rem' }}
                                        >
                                          Remove Track
                                        </button>
                                      )}
                                    </div>
                                    {/* Preview Player */}
                                    {r.mediaTrack.startsWith('data:video') ? (
                                      <video 
                                        src={r.mediaTrack} 
                                        controls 
                                        style={{ width: '100%', maxHeight: '140px', borderRadius: '6px', background: '#000', marginTop: '4px' }}
                                      />
                                    ) : (
                                      <audio 
                                        src={r.mediaTrack} 
                                        controls 
                                        style={{ width: '100%', height: '36px', marginTop: '4px' }}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-between" style={{ fontSize: '0.78rem', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>No backing track (music/video) uploaded.</span>
                                    {!isSubDeadlinePassed && (
                                      <label className="btn btn-secondary btn-xs" style={{ cursor: 'pointer', margin: 0, padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}>
                                        Upload Track
                                        <input
                                          type="file"
                                          accept="audio/*,video/*"
                                          onChange={(e) => handleMediaUpload(e, r.id)}
                                          style={{ display: 'none' }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Competitors / Registered Nominations List */}
                  {(() => {
                    const allSubRegs = (state.registrations || []).filter(
                      r => r.eventId === event.id && r.subEventId === sub.id
                    );
                    return (
                      <div style={{ marginTop: '0.25rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem' }}>
                        <details style={{ fontSize: '0.825rem', cursor: 'pointer' }}>
                          <summary style={{ color: 'var(--color-primary-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', outline: 'none' }}>
                            <Eye size={12} /> View Registered Participants ({allSubRegs.length})
                          </summary>
                          <div style={{ marginTop: '0.5rem', background: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #CBD5E1', maxHeight: '220px', overflowY: 'auto' }}>
                            {allSubRegs.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {allSubRegs.map(r => {
                                  const u = (state.users || []).find(user => user.id === r.registeredByUserId);
                                  const creatorInfo = u ? `Reg by: ${u.name} (${u.wing})` : '';
                                  return (
                                    <div key={r.id} className="flex-between" style={{ padding: '6px 8px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '6px' }}>
                                      <div>
                                        <strong style={{ fontSize: '0.85rem' }}>{r.name}</strong>
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', display: 'block' }}>
                                          {r.gender !== 'Group' ? `${r.gender} • ${r.ageCategory}` : 'Group Entry'} {creatorInfo ? `• ${creatorInfo}` : ''}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className={`badge ${r.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                          {r.status === 'APPROVED' ? 'Approved' : 'Pending Approval'}
                                        </span>
                                        {isWingLeader && r.status === 'PENDING' && (
                                          <button
                                            className="btn btn-primary btn-xs"
                                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                            onClick={() => {
                                              approveEventRegistration(r.id);
                                              onShowToast(`Approved ${r.name}!`, 'success');
                                            }}
                                          >
                                            Approve
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>No registrations yet. Be the first to register!</span>
                            )}
                          </div>
                        </details>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          /* Standalone event registration view */
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            {getEventRegistrations().length > 0 && (
              <div style={{ maxWidth: '480px', margin: '0 auto 1.5rem', background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                  Registered participants:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {getEventRegistrations().map(r => (
                    <div key={r.id} className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <div>
                        <strong>{r.name}</strong> 
                        {r.gender === 'Group' ? (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', display: 'block', marginTop: '2px' }}>
                            {r.groupMembers && r.groupMembers.length > 0 
                              ? `👥 Members: ${r.groupMembers.join(', ')}` 
                              : '👥 Wing Group Entry'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginLeft: '6px' }}>
                            ({r.gender}, {r.ageCategory})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${r.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}`}>{r.status}</span>
                        {!isMainDeadlinePassed && (
                          <button className="logout-btn" onClick={() => handleWithdraw(r.id, r.name)}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 📜 Collapsible Rules Summary for Standalone Event */}
            {event.rules && (
              <div style={{ maxWidth: '480px', margin: '0 auto 1.25rem', textAlign: 'left' }}>
                <details style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  <summary style={{ color: 'var(--color-primary)', fontWeight: 700, outline: 'none' }}>
                    📜 View Rules & Regulations
                  </summary>
                  <div style={{ marginTop: '4px', background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', whiteSpace: 'pre-line', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                    {event.rules}
                  </div>
                </details>
              </div>
            )}

            {isMainDeadlinePassed ? (
              <div className="badge badge-slate" style={{ fontSize: '0.9375rem', padding: '8px 16px' }}>
                Registrations Closed
              </div>
            ) : (
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => handleOpenRegister(null, event.name)}
              >
                <UserPlus size={16} /> Add Participant Registration
              </button>
            )}

            {/* Collapsible Competitors List for Standalone Event */}
            <div style={{ maxWidth: '480px', margin: '1.5rem auto 0', textAlign: 'left', borderTop: '1px dashed var(--color-border)', paddingTop: '1rem' }}>
              <details style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                <summary style={{ color: 'var(--color-primary-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', outline: 'none' }}>
                  <Eye size={14} /> View Registered Competitors ({allApprovedEventRegs.length})
                </summary>
                <div style={{ marginTop: '0.5rem', background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed #CBD5E1', maxHeight: '200px', overflowY: 'auto' }}>
                  {allApprovedEventRegs.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {allApprovedEventRegs.map(r => {
                        const u = (state.users || []).find(user => user.id === r.registeredByUserId);
                        const flatInfo = u ? `(${u.wing}, ${u.flat})` : '';
                        return (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderBottom: '1px solid #E2E8F0' }}>
                            <span style={{ fontWeight: 600 }}>{r.name}</span>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{flatInfo}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', display: 'block', textAlign: 'center' }}>No approved competitors yet. Be the first to register!</span>
                  )}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

      {/* Upgraded Participant Registration Modal */}
      <AnimatePresence>
        {confirmModalData && (() => {
          return (
            <div className="modal-overlay">
              <motion.div 
                className="modal"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}
              >
                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                      {confirmModalData.isDoubles ? '🏸 Doubles / Pair Nomination Form' : (participants.length > 1 ? '👥 Team / Multi-Participant Entry Form' : '👤 Wing Participant Nomination Form')}
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Category: <strong>{confirmModalData.subName}</strong>
                      {user.role !== 'admin' && (
                        <span> • Wing: <strong>{user.wing || 'Wing N'}</strong></span>
                      )}
                    </p>
                  </div>

                  {/* 🏛️ Admin Wing Selector (Allows Admin to submit entries for ANY wing) */}
                  {user.role === 'admin' && (
                    <div className="form-group" style={{ margin: 0, padding: '10px 12px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400E', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🏛️ Target Wing for this Entry:</span>
                        <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Admin Entry</span>
                      </label>
                      <select 
                        className="select" 
                        value={selectedWing} 
                        onChange={(e) => setSelectedWing(e.target.value)}
                        style={{ fontWeight: 700, backgroundColor: '#FFFFFF', borderColor: '#FCD34D' }}
                      >
                        {['Wing N','Wing O','Wing P','Wing Q','Wing R','Wing S','Wing T','Wing U','Wing V','Wing W'].map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Optional Team / Pair Label */}
                  {participants.length > 1 && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '3px' }}>
                        🏆 Team / Pair Name (e.g. Topaz Smashers)
                      </label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. Topaz Smashers" 
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                    </div>
                  )}

                  {/* 👥 Dynamic Participant Cards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {participants.map((p, idx) => (
                      <div key={idx} style={{ padding: '0.85rem 1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div className="flex-between">
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            👤 {participants.length === 2 ? (idx === 0 ? 'Player 1 (Primary)' : 'Player 2 (Partner)') : `Participant #${idx + 1}`}
                          </span>
                          {participants.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleRemoveParticipant(idx)}
                              style={{ color: 'var(--color-danger)', borderColor: '#FECACA', padding: '2px 6px', fontSize: '0.7rem' }}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          )}
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Full Name</label>
                          <input 
                            type="text" 
                            className="input" 
                            placeholder="e.g. Ramesh Kulkarni" 
                            value={p.name}
                            onChange={(e) => handleUpdateParticipant(idx, 'name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                            required 
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Flat No.</label>
                            <select
                              className="select"
                              value={p.flat}
                              onChange={(e) => handleUpdateParticipant(idx, 'flat', e.target.value)}
                              required
                              style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                            >
                              <option value="">Select</option>
                              {[101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504,601,602,603,604,701,702,703,704].map(f => (
                                <option key={f} value={String(f)}>{f}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Mobile Phone (Opt)</label>
                            <input 
                              type="tel" 
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="input" 
                              placeholder="9876543210" 
                              value={p.phone}
                              onChange={(e) => handleUpdateParticipant(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                              maxLength={10}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Gender</label>
                            <select className="select" value={p.gender} onChange={(e) => handleUpdateParticipant(idx, 'gender', e.target.value)}>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Age Group</label>
                            <select className="select" value={p.ageCategory} onChange={(e) => handleUpdateParticipant(idx, 'ageCategory', e.target.value)}>
                              <option value="Below 10">Below 10</option>
                              <option value="Below 16">Below 16</option>
                              <option value="Above 16">Above 16</option>
                              <option value="Senior Citizen">Senior Citizen</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ➕ Add Partner / Participant Button - Only for doubles/multi events */}
                  {confirmModalData?.isDoubles && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddParticipant}
                      style={{ width: '100%', borderStyle: 'dashed', borderColor: 'var(--color-primary)', fontWeight: 700 }}
                    >
                      ➕ Add {participants.length === 1 ? 'Doubles Partner' : 'Another Participant'}
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirmModalData(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      {participants.length > 1 ? `Submit Pair (${participants.length} Players)` : 'Submit Nomination'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 🏆 Direct Event Results Declaration Modal (Winner & Runner-Up) */}
      <AnimatePresence>
        {resultModalData && (() => {
          const categoryRegs = (state.registrations || []).filter(r => {
            if (r.eventId !== event.id) return false;
            if (resultModalData.subId) return r.subEventId === resultModalData.subId;
            return true;
          });

          // Compute live preview of points and wings
          const getPreviewWing = (type, regId, customWing) => {
            if (type === 'registered') {
              const reg = categoryRegs.find(r => r.id === regId);
              if (reg) {
                const wm = reg.name.match(/Wing\s*([A-Za-z0-9]+)/i);
                if (wm) return `Wing ${wm[1].toUpperCase()}`;
                return reg.wing || 'Wing N';
              }
              return 'Select Participant';
            }
            return customWing || 'Wing N';
          };

          const winnerWingPreview = getPreviewWing(winnerType, winnerRegId, winnerWing);
          const runnerUpWingPreview = getPreviewWing(runnerUpType, runnerUpRegId, runnerUpWing);

          return (
            <div className="modal-overlay">
              <motion.div 
                className="modal"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto' }}
              >
                <form onSubmit={handleSaveResult} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Trophy size={20} style={{ color: '#F59E0B' }} />
                      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                        Declare Event Podium Results
                      </h2>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                      Category: <strong>{resultModalData.subName}</strong>
                    </p>
                  </div>

                  {/* Points Allocation Notice */}
                  <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>🥇 1st Place (Gold)</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#B45309' }}>+{resultModalData.winnerPoints} pts</div>
                    </div>
                    <div style={{ height: '24px', width: '1px', background: '#FCD34D' }}></div>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>🥈 2nd Place (Silver)</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#475569' }}>+{resultModalData.runnerUpPoints} pts</div>
                    </div>
                  </div>

                  {/* 🥇 WINNER SELECTION */}
                  <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: '10px', padding: '12px 14px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        🥇 Select 1st Place Winner (Gold)
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className={`btn btn-xs ${winnerType === 'registered' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setWinnerType('registered')}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          From Registrations
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${winnerType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setWinnerType('custom')}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          Manual Entry
                        </button>
                      </div>
                    </div>

                    {winnerType === 'registered' ? (
                      <div className="form-group" style={{ margin: 0 }}>
                        <select
                          className="select"
                          value={winnerRegId}
                          onChange={(e) => setWinnerRegId(e.target.value)}
                          required
                          style={{ backgroundColor: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          <option value="">-- Choose Approved Winner --</option>
                          {categoryRegs.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.wing ? `(${r.wing})` : ''}
                            </option>
                          ))}
                        </select>
                        {categoryRegs.length === 0 && (
                          <p style={{ fontSize: '0.72rem', color: '#D97706', marginTop: '4px' }}>
                            No approved participants in this category yet. Use "Manual Entry" above.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Victory Type Selector for Winner */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>Format:</span>
                          <button
                            type="button"
                            className={`btn btn-xs ${winnerVictoryType === 'individual' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setWinnerVictoryType('individual')}
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          >
                            👤 Individual
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs ${winnerVictoryType === 'team' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setWinnerVictoryType('team')}
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          >
                            👥 Team
                          </button>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                            {winnerVictoryType === 'team' ? '🏆 Winner Team Name' : '👤 Winner Participant Name'}
                          </label>
                          <input
                            type="text"
                            className="input"
                            placeholder={winnerVictoryType === 'team' ? "e.g. MasterChef Queens / Wing N Culinary Crew" : "e.g. Pooja Sharma"}
                            value={winnerName}
                            onChange={(e) => setWinnerName(e.target.value)}
                            required
                            style={{ backgroundColor: '#FFFFFF' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: winnerVictoryType === 'team' ? '1fr' : '1.2fr 1fr', gap: '8px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                              {winnerVictoryType === 'team' ? 'Winning Wing (Receives overall +' + resultModalData.winnerPoints + ' pts)' : 'Wing'}
                            </label>
                            <select
                              className="select"
                              value={winnerWing}
                              onChange={(e) => setWinnerWing(e.target.value)}
                              style={{ backgroundColor: '#FFFFFF', fontSize: '0.85rem' }}
                            >
                              {['Wing N','Wing O','Wing P','Wing Q','Wing R','Wing S','Wing T','Wing U','Wing V','Wing W'].map(w => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                            </select>
                          </div>
                          {winnerVictoryType === 'individual' && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Flat (Opt)</label>
                              <select
                                className="select"
                                value={winnerFlat}
                                onChange={(e) => setWinnerFlat(e.target.value)}
                                style={{ backgroundColor: '#FFFFFF', fontSize: '0.85rem' }}
                              >
                                <option value="">Select Flat</option>
                                {[101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504,601,602,603,604,701,702,703,704].map(f => (
                                  <option key={f} value={String(f)}>{f}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Team Members List (Only for Team Victory) */}
                        {winnerVictoryType === 'team' && (
                          <div style={{ background: '#FFF9E6', padding: '10px', borderRadius: '8px', border: '1px dashed #FCD34D', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <div className="flex-between">
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E' }}>
                                👥 Winning Team Members ({winnerTeamMembers.length})
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#B45309', fontWeight: 600 }}>
                                *Overall points only
                              </span>
                            </div>

                            {winnerTeamMembers.map((m, idx) => (
                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="input input-sm"
                                  placeholder={`Member #${idx + 1} Name`}
                                  value={m.name}
                                  onChange={(e) => handleUpdateWinnerMember(idx, 'name', e.target.value)}
                                  required
                                  style={{ backgroundColor: '#FFFFFF', fontSize: '0.8rem' }}
                                />
                                <select
                                  className="select select-sm"
                                  value={m.flat}
                                  onChange={(e) => handleUpdateWinnerMember(idx, 'flat', e.target.value)}
                                  style={{ backgroundColor: '#FFFFFF', fontSize: '0.8rem' }}
                                >
                                  <option value="">Flat</option>
                                  {[101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504,601,602,603,604,701,702,703,704].map(f => (
                                    <option key={f} value={String(f)}>{f}</option>
                                  ))}
                                </select>
                                {winnerTeamMembers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWinnerMember(idx)}
                                    className="logout-btn"
                                    style={{ padding: '3px', color: 'var(--color-danger)' }}
                                    title="Remove member"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            ))}

                            <div className="flex-between" style={{ marginTop: '2px' }}>
                              <button
                                type="button"
                                onClick={handleAddWinnerMember}
                                className="btn btn-secondary btn-xs"
                                style={{ fontSize: '0.72rem', borderColor: '#FCD34D', color: '#92400E', fontWeight: 700 }}
                              >
                                ➕ Add Member
                              </button>
                              <span style={{ fontSize: '0.68rem', color: '#92400E', fontStyle: 'italic' }}>
                                ℹ️ +{resultModalData.winnerPoints} pts assigned to Wing in total
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 🥈 RUNNER-UP SELECTION */}
                  <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '12px 14px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        🥈 Select 2nd Place Runner-Up (Silver)
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className={`btn btn-xs ${runnerUpType === 'registered' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setRunnerUpType('registered')}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          From Registrations
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${runnerUpType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setRunnerUpType('custom')}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          Manual Entry
                        </button>
                      </div>
                    </div>

                    {runnerUpType === 'registered' ? (
                      <div className="form-group" style={{ margin: 0 }}>
                        <select
                          className="select"
                          value={runnerUpRegId}
                          onChange={(e) => setRunnerUpRegId(e.target.value)}
                          required
                          style={{ backgroundColor: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          <option value="">-- Choose Approved Runner-Up --</option>
                          {categoryRegs.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.wing ? `(${r.wing})` : ''}
                            </option>
                          ))}
                        </select>
                        {categoryRegs.length === 0 && (
                          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                            No approved participants in this category yet. Use "Manual Entry" above.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Victory Type Selector for Runner-Up */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Format:</span>
                          <button
                            type="button"
                            className={`btn btn-xs ${runnerUpVictoryType === 'individual' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setRunnerUpVictoryType('individual')}
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          >
                            👤 Individual
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs ${runnerUpVictoryType === 'team' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setRunnerUpVictoryType('team')}
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          >
                            👥 Team
                          </button>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                            {runnerUpVictoryType === 'team' ? '🥈 Runner-Up Team Name' : '👤 Runner-Up Participant Name'}
                          </label>
                          <input
                            type="text"
                            className="input"
                            placeholder={runnerUpVictoryType === 'team' ? "e.g. Culinary Queens / Wing R MasterChef Team" : "e.g. Sunita Patil"}
                            value={runnerUpName}
                            onChange={(e) => setRunnerUpName(e.target.value)}
                            required
                            style={{ backgroundColor: '#FFFFFF' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: runnerUpVictoryType === 'team' ? '1fr' : '1.2fr 1fr', gap: '8px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                              {runnerUpVictoryType === 'team' ? 'Runner-Up Wing (Receives overall +' + resultModalData.runnerUpPoints + ' pts)' : 'Wing'}
                            </label>
                            <select
                              className="select"
                              value={runnerUpWing}
                              onChange={(e) => setRunnerUpWing(e.target.value)}
                              style={{ backgroundColor: '#FFFFFF', fontSize: '0.85rem' }}
                            >
                              {['Wing N','Wing O','Wing P','Wing Q','Wing R','Wing S','Wing T','Wing U','Wing V','Wing W'].map(w => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                            </select>
                          </div>
                          {runnerUpVictoryType === 'individual' && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Flat (Opt)</label>
                              <select
                                className="select"
                                value={runnerUpFlat}
                                onChange={(e) => setRunnerUpFlat(e.target.value)}
                                style={{ backgroundColor: '#FFFFFF', fontSize: '0.85rem' }}
                              >
                                <option value="">Select Flat</option>
                                {[101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504,601,602,603,604,701,702,703,704].map(f => (
                                  <option key={f} value={String(f)}>{f}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Team Members List (Only for Team Victory) */}
                        {runnerUpVictoryType === 'team' && (
                          <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '8px', border: '1px dashed #CBD5E1', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <div className="flex-between">
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                                👥 Runner-Up Team Members ({runnerUpTeamMembers.length})
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                                *Overall points only
                              </span>
                            </div>

                            {runnerUpTeamMembers.map((m, idx) => (
                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="input input-sm"
                                  placeholder={`Member #${idx + 1} Name`}
                                  value={m.name}
                                  onChange={(e) => handleUpdateRunnerUpMember(idx, 'name', e.target.value)}
                                  required
                                  style={{ backgroundColor: '#FFFFFF', fontSize: '0.8rem' }}
                                />
                                <select
                                  className="select select-sm"
                                  value={m.flat}
                                  onChange={(e) => handleUpdateRunnerUpMember(idx, 'flat', e.target.value)}
                                  style={{ backgroundColor: '#FFFFFF', fontSize: '0.8rem' }}
                                >
                                  <option value="">Flat</option>
                                  {[101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504,601,602,603,604,701,702,703,704].map(f => (
                                    <option key={f} value={String(f)}>{f}</option>
                                  ))}
                                </select>
                                {runnerUpTeamMembers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRunnerUpMember(idx)}
                                    className="logout-btn"
                                    style={{ padding: '3px', color: 'var(--color-danger)' }}
                                    title="Remove member"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            ))}

                            <div className="flex-between" style={{ marginTop: '2px' }}>
                              <button
                                type="button"
                                onClick={handleAddRunnerUpMember}
                                className="btn btn-secondary btn-xs"
                                style={{ fontSize: '0.72rem', borderColor: '#CBD5E1', color: '#475569', fontWeight: 700 }}
                              >
                                ➕ Add Member
                              </button>
                              <span style={{ fontSize: '0.68rem', color: '#64748B', fontStyle: 'italic' }}>
                                ℹ️ +{resultModalData.runnerUpPoints} pts assigned to Wing in total
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Impact Preview */}
                  <div style={{ background: '#F1F5F9', borderRadius: '8px', padding: '10px 12px', fontSize: '0.78rem', color: '#475569' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px', color: '#1E293B' }}>📊 Standings Impact:</div>
                    <div>🥇 Gold Winner: +{resultModalData.winnerPoints} pts awarded to <strong>{winnerWingPreview}</strong> {winnerVictoryType === 'team' ? '(Overall Team Victory)' : ''}</div>
                    <div>🥈 Silver Runner-Up: +{resultModalData.runnerUpPoints} pts awarded to <strong>{runnerUpWingPreview}</strong> {runnerUpVictoryType === 'team' ? '(Overall Team Victory)' : ''}</div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    {resultModalData.isCompleted ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleClearResult}
                        disabled={isSavingResult}
                        style={{ color: 'var(--color-danger)', borderColor: '#FECACA' }}
                      >
                        <RotateCcw size={14} /> Clear Result
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setResultModalData(null)} disabled={isSavingResult}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSavingResult}
                        style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', fontWeight: 800, minWidth: '170px' }}
                      >
                        {isSavingResult ? 'Saving to Google Sheet...' : (resultModalData.isCompleted ? '💾 Save & Update Results' : '💾 Save & Publish Results')}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
