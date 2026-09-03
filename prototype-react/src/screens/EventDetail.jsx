import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle2, UserPlus, AlertTriangle, Trash2, CalendarDays, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventDetail({ eventId, onViewScreen, onShowToast }) {
  const { state, registerForEvent, withdrawRegistration, uploadRegistrationMedia, castParticipantVote, approveEventRegistration, rejectEventRegistration } = useStore();
  const user = state.currentUser || { id: 'anon', name: 'Guest Resident', status: 'PENDING_APPROVAL' };
  const event = state.events.find(e => e.id === eventId) || state.events[0];
  const allApprovedEventRegs = (state.registrations || []).filter(
    r => r.eventId === eventId && r.status === 'APPROVED'
  );

  // Modal registration form states
  const [confirmModalData, setConfirmModalData] = useState(null); // { subId, subName, isDoubles } or null
  const [teamName, setTeamName] = useState('');
  const [participants, setParticipants] = useState([
    { name: '', flat: '', phone: '', gender: 'Male', ageCategory: 'Above 16' }
  ]);

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

  const handleOpenRegister = (subId, subName) => {
    if (user.id === 'anon' || user.status === 'PENDING_APPROVAL') {
      onShowToast('You must be registered and verified by admin to sign up for events!', 'error');
      return;
    }
    const isDoubles = String(subName || '').toLowerCase().includes('double') || String(subName || '').toLowerCase().includes('pair');
    setConfirmModalData({ subId, subName, isDoubles });
    setTeamName('');
    
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
      if (!p.flat || !/^\d{3}$/.test(p.flat)) {
        onShowToast(`${pLabel} Flat number must be exactly 3 digits (e.g. 402)!`, 'error');
        return;
      }
      if (p.phone && !/^\d{10}$/.test(p.phone)) {
        onShowToast(`${pLabel} mobile phone number must be 10 digits!`, 'error');
        return;
      }
    }

    const wingText = user.wing || 'Wing N';
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
      const prefix = teamName.trim() ? `${teamName.trim()}: ` : '';
      finalDisplayName = `${prefix}${playersText} [${wingText}]`;
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
      onShowToast(
        isGroupOrMulti 
          ? `Team "${finalDisplayName}" registered successfully! Pending approval.` 
          : `Nomination submitted for ${finalDisplayName}! Pending approval.`, 
        'success'
      );
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

  const handleRegTypeChange = (type) => {
    setRegType(type);
    if (type === 'self') {
      setRegName(user.name || '');
    } else {
      setRegName('');
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
    reader.onload = (event) => {
      uploadRegistrationMedia(registrationId, event.target.result);
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

  const mainDeadlineDate = event.registrationDeadline || '2026-12-31';
  const mainDeadlineTime = event.registrationDeadlineTime || '23:59';
  const isMainDeadlinePassed = checkDeadlinePassed(mainDeadlineDate, mainDeadlineTime);

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
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
          {event.type === 'UMBRELLA' ? 'Sub-Events & Competition Categories' : 'Registration Options'}
        </h2>

        {event.subEvents && event.subEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {event.subEvents.map(sub => {
              const subRegs = getSubRegistrations(sub.id);
              const allApprovedSubRegs = (state.registrations || []).filter(
                r => r.eventId === event.id && r.subEventId === sub.id && r.status === 'APPROVED'
              );
              const subDeadlineDate = sub.deadlineDate || mainDeadlineDate;
              const subDeadlineTime = sub.deadlineTime || mainDeadlineTime;
              const isSubDeadlinePassed = checkDeadlinePassed(subDeadlineDate, subDeadlineTime);
              return (
                <div 
                  key={sub.id}
                  style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: '#FAF5FF', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>{sub.name}</h3>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {sub.points ? `Points Scale: ${sub.points}` : 'Wing Performance / Non-Point Category'}
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
          const sub = event.subEvents?.find(s => s.id === confirmModalData.subId);
          const targetConfig = sub || event;
          const isGroup = targetConfig?.regType === 'GROUP_REQUIRED' || targetConfig?.regType === 'GROUP_OPTIONAL' || targetConfig?.regType === 'GROUP';
          const requireMembers = targetConfig?.regType === 'GROUP_REQUIRED' || targetConfig?.requireMembers;

          const wingNeighbors = (state.users || []).filter(
            u => u.status === 'APPROVED' && u.wing === user.wing && u.id !== user.id
          );

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
                      Category: <strong>{confirmModalData.subName}</strong> • Wing: <strong>{user.wing || 'Wing N'}</strong>
                    </p>
                  </div>

                  {/* Optional Team / Pair Label */}
                  {participants.length > 1 && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '2px' }}>Team / Pair Name (Optional)</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. Wing U Dynamic Duo" 
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
                            <input 
                              type="text" 
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="input" 
                              placeholder="e.g. 402" 
                              value={p.flat}
                              onChange={(e) => handleUpdateParticipant(idx, 'flat', e.target.value.replace(/\D/g, '').slice(0, 3))}
                              maxLength={3}
                              required
                            />
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

                  {/* ➕ Add Partner / Participant Button */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddParticipant}
                    style={{ width: '100%', borderStyle: 'dashed', borderColor: 'var(--color-primary)', fontWeight: 700 }}
                  >
                    ➕ Add {participants.length === 1 ? 'Doubles Partner' : 'Another Participant'}
                  </button>

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
    </motion.div>
  );
}
