import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, PlusCircle, Edit3, Trash, Plus, Minus, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventEditor({ onShowToast, onViewScreen }) {
  const { state, setStoreState } = useStore();
  const currentUser = state.currentUser;

  const isAdminOrChamp = currentUser?.role === 'admin' || currentUser?.role === 'champion' || currentUser?.isChampion;

  if (!isAdminOrChamp) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <Shield size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>You must be registered as an Event Champion or Admin to access this editor.</p>
      </div>
    );
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('STANDALONE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('Sports');
  const [regDeadlineDate, setRegDeadlineDate] = useState('');
  const [regDeadlineTime, setRegDeadlineTime] = useState('23:59');
  const [subEvents, setSubEvents] = useState([]);
  const [activeTooltipId, setActiveTooltipId] = useState(null);

  // Standalone event registration type and rules states
  const [eventRegType, setEventRegType] = useState('INDIVIDUAL');
  const [eventMinGroupSize, setEventMinGroupSize] = useState(2);
  const [eventMaxGroupSize, setEventMaxGroupSize] = useState(5);
  const [eventMaxGroupsPerWing, setEventMaxGroupsPerWing] = useState(2);
  const [eventRules, setEventRules] = useState('');

  const generateContextualRules = (name, points = '') => {
    return `📜 OFFICIAL COMPETITION RULES — ${String(name || '').toUpperCase()}

1. Eligibility & Registrations:
   • All participating members must be registered and verified residents of the housing society.
   • Registrations must be submitted before the official deadline.
   • In case of team entries, all members must belong to the same Wing.

2. Tournament Format & Rules:
   • Standard tournament rules apply. Rulings of the match referees or event managers will be final and binding.
   • Participants must arrive at the venue at least 15 minutes before the scheduled time.
   • Walkovers will be declared if a participant/team fails to arrive within 10 minutes of the slot.

3. Points & Scoring Scale:
   • ${points || 'Standard tournament points apply.'}
   • Points will be tallied and credited to the winning Wing's standings leaderboard.

4. Code of Conduct:
   • Fair play, mutual respect, and sportsmanship are strictly mandatory.
   • Any disputes must be raised cordially to the Event Manager.`;
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setName('');
    setDesc('');
    setType('STANDALONE');
    setStartDate('');
    setEndDate('');
    setVenue('');
    setTime('');
    setCategory('Sports');
    setRegDeadlineDate('');
    setRegDeadlineTime('23:59');
    setSubEvents([]);
    setEventRegType('INDIVIDUAL');
    setEventMinGroupSize(2);
    setEventMaxGroupSize(5);
    setEventMaxGroupsPerWing(2);
    setEventRules('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenEdit = (evt) => {
    setEditingEvent(evt);
    setName(evt.name);
    setDesc(evt.description);
    setType(evt.type);
    setStartDate(evt.startDate);
    setEndDate(evt.endDate);
    setVenue(evt.venue);
    setTime(evt.time);
    setCategory(evt.category);
    setRegDeadlineDate(evt.registrationDeadlineDate || evt.registrationDeadline || '');
    setRegDeadlineTime(evt.registrationDeadlineTime || '23:59');
    setSubEvents(evt.subEvents || []);
    setEventRegType(evt.regType || 'INDIVIDUAL');
    setEventMinGroupSize(evt.minGroupSize || 2);
    setEventMaxGroupSize(evt.maxGroupSize || 5);
    setEventMaxGroupsPerWing(evt.maxGroupsPerWing || 2);
    setEventRules(evt.rules || '');
    setIsModalOpen(true);
  };

  const handleAddSubEvent = () => {
    setSubEvents(prev => [
      ...prev,
      { 
        id: `sub-dynamic-${Date.now()}-${prev.length}`, 
        name: '', 
        category: '', 
        points: 'Winner: 30 pts / Runner: 20 pts',
        startDate: startDate || '',
        time: time || '',
        managerName: '',
        managerPhone: '',
        deadlineDate: regDeadlineDate || startDate || '',
        deadlineTime: regDeadlineTime || '23:59',
        regType: 'INDIVIDUAL',
        minGroupSize: 2,
        maxGroupSize: 5,
        maxGroupsPerWing: 2,
        rules: ''
      }
    ]);
  };

  const handleRemoveSubEvent = (idx) => {
    setSubEvents(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubEventChange = (idx, field, value) => {
    setSubEvents(prev => prev.map((sub, i) => {
      if (i !== idx) return sub;
      return { ...sub, [field]: value };
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalEvent = {
      id: editingEvent ? editingEvent.id : `evt-${Date.now()}`,
      name,
      description: desc,
      type,
      startDate,
      endDate: type === 'STANDALONE' ? startDate : endDate,
      venue,
      time,
      category,
      registrationDeadlineDate: regDeadlineDate,
      registrationDeadlineTime: regDeadlineTime,
      registrationDeadline: regDeadlineDate, // backup compatibility
      status: editingEvent ? editingEvent.status : 'PLANNED',
      subEvents: type === 'UMBRELLA' ? subEvents : [],
      regType: eventRegType,
      minGroupSize: eventMinGroupSize,
      maxGroupSize: eventMaxGroupSize,
      maxGroupsPerWing: eventMaxGroupsPerWing,
      rules: eventRules
    };

    setStoreState(prev => {
      let nextEvents = [];
      if (editingEvent) {
        nextEvents = prev.events.map(e => e.id === editingEvent.id ? finalEvent : e);
      } else {
        nextEvents = [...prev.events, finalEvent];
      }
      return { ...prev, events: nextEvents };
    });

    onShowToast(editingEvent ? 'Event updated successfully!' : 'Event scheduled successfully!', 'success');
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This will clear all registrations.')) return;
    setStoreState(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== eventId)
    }));
    onShowToast('Event deleted successfully.', 'info');
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
            <h1 className="page-title">Event & Competition Editor</h1>
            <p className="page-subtitle">Add standalone events or configure umbrella tournaments with sub-categories</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <PlusCircle size={16} /> Schedule New Event
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Schedule Date</th>
                <th>Venue</th>
                <th style={{ textAlign: 'center' }}>Sub-Events</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.events.map(evt => (
                <tr key={evt.id}>
                  <td><strong style={{ color: 'var(--color-text)' }}>{evt.name}</strong></td>
                  <td><span className="badge badge-slate">{evt.type}</span></td>
                  <td><span className={`badge ${evt.category === 'Sports' ? 'badge-green' : 'badge-violet'}`}>{evt.category}</span></td>
                  <td>{evt.startDate}</td>
                  <td>{evt.venue}</td>
                  <td style={{ textAlign: 'center' }}>{evt.subEvents ? evt.subEvents.length : 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onViewScreen(`events/${evt.id}`)}>
                        <Eye size={14} /> View
                      </button>
                      <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleOpenEdit(evt)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDeleteEvent(evt.id)}>
                        <Trash size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal"
              style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800 }}>
                  {editingEvent ? 'Edit Scheduled Event' : 'Schedule New Competition/Event'}
                </h2>

                <div className="form-group">
                  <label className="form-label">Event Name</label>
                  <input type="text" className="input" placeholder="e.g. Carrom Tournament 2026" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="textarea" rows="3" placeholder="Describe the tournament structure or general celebration rules..." value={desc} onChange={(e) => setDesc(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="Sports">Sports</option>
                      <option value="Cultural">Cultural</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Structure Type</label>
                    <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="STANDALONE">Standalone Event (Single day/schedule)</option>
                      <option value="UMBRELLA">Umbrella Event (Multi-day or multi-category)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  {type === 'UMBRELLA' && (
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>
                  )}
                </div>

                {/* Registration Deadline Configuration (Date & Time) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Reg Deadline Date</label>
                    <input type="date" className="input" value={regDeadlineDate} onChange={(e) => setRegDeadlineDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reg Deadline Time</label>
                    <input type="time" className="input" value={regDeadlineTime} onChange={(e) => setRegDeadlineTime(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Venue Location</label>
                    <input type="text" className="input" placeholder="e.g. Clubhouse" value={venue} onChange={(e) => setVenue(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Details</label>
                    <input type="text" className="input" placeholder="e.g. 09:30 AM onwards" value={time} onChange={(e) => setTime(e.target.value)} required />
                  </div>
                </div>

                {/* ⚙️ STANDALONE EVENT ADVANCED SETTINGS */}
                {type === 'STANDALONE' && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
                      Advanced Configurations & Rules
                    </h3>
                    
                    <div style={{ background: '#F1F5F9', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Registration Type
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <span 
                                onClick={() => setActiveTooltipId(activeTooltipId === 'event-regType' ? null : 'event-regType')}
                                style={{ cursor: 'pointer', fontSize: '0.7rem', background: '#CBD5E1', padding: '0px 4px', borderRadius: '50%', fontWeight: 700 }}
                              >
                                ?
                              </span>
                              {activeTooltipId === 'event-regType' && (
                                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: '220px', padding: '8px 10px', background: '#1E293B', color: '#FFF', fontSize: '0.75rem', borderRadius: '6px', zIndex: 100, marginBottom: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', whiteSpace: 'normal', lineHeight: '1.3' }}>
                                  <p style={{ margin: 0, fontWeight: 700, borderBottom: '1px solid #475569', paddingBottom: '2px', marginBottom: '4px' }}>Registration Types:</p>
                                  • <strong>Individual</strong>: Single resident entry.<br/>
                                  • <strong>Group (Roster Required)</strong>: Roster list of 2-5 residents from the wing is required (e.g., Antakshari, Relay).<br/>
                                  • <strong>Group (Roster Optional)</strong>: Large wing drama / tasha troupes. Resident can skip listing members.
                                </div>
                              )}
                            </div>
                          </label>
                          <select 
                            className="input input-sm" 
                            value={eventRegType} 
                            onChange={(e) => setEventRegType(e.target.value)}
                            style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                          >
                            <option value="INDIVIDUAL">Individual Entry</option>
                            <option value="GROUP_REQUIRED">Group (Roster Required)</option>
                            <option value="GROUP_OPTIONAL">Wing-Wise Group (Roster Optional)</option>
                          </select>
                        </div>

                        {(eventRegType === 'GROUP_REQUIRED' || eventRegType === 'GROUP_OPTIONAL') && (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Max Groups Per Wing
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <span 
                                  onClick={() => setActiveTooltipId(activeTooltipId === 'event-wingQuota' ? null : 'event-wingQuota')}
                                  style={{ cursor: 'pointer', fontSize: '0.7rem', background: '#CBD5E1', padding: '0px 4px', borderRadius: '50%', fontWeight: 700 }}
                                >
                                  ?
                                </span>
                                {activeTooltipId === 'event-wingQuota' && (
                                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: '220px', padding: '8px 10px', background: '#1E293B', color: '#FFF', fontSize: '0.75rem', borderRadius: '6px', zIndex: 100, marginBottom: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', whiteSpace: 'normal', lineHeight: '1.3' }}>
                                    Enforces a limit on how many separate team entries a single Wing can submit for this event.
                                  </div>
                                )}
                              </div>
                            </label>
                            <input 
                              type="number" 
                              className="input input-sm" 
                              min="1"
                              max="10"
                              value={eventMaxGroupsPerWing} 
                              onChange={(e) => setEventMaxGroupsPerWing(parseInt(e.target.value) || 2)} 
                            />
                          </div>
                        )}
                      </div>

                      {eventRegType === 'GROUP_REQUIRED' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '8px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Min Group Size</label>
                            <input 
                              type="number" 
                              className="input input-sm" 
                              min="1"
                              value={eventMinGroupSize} 
                              onChange={(e) => setEventMinGroupSize(parseInt(e.target.value) || 2)} 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Max Group Size</label>
                            <input 
                              type="number" 
                              className="input input-sm" 
                              min="1"
                              value={eventMaxGroupSize} 
                              onChange={(e) => setEventMaxGroupSize(parseInt(e.target.value) || 5)} 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 📜 RULES & REGULATIONS AREA & SUMMARY GENERATOR */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex-between">
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Rules & Guidelines</label>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            const rules = generateContextualRules(name || 'this competition', 'Winner Wing: 30 pts');
                            setEventRules(rules);
                          }}
                          style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          ✨ Auto-Generate Rules
                        </button>
                      </div>
                      <textarea 
                        className="input" 
                        rows="4" 
                        placeholder="Describe event rules, match formats, referee details..."
                        value={eventRules} 
                        onChange={(e) => setEventRules(e.target.value)} 
                        style={{ fontSize: '0.8rem', fontFamily: 'monospace', padding: '6px 8px', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {/* Sub-events configure panel */}
                {type === 'UMBRELLA' && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
                        Configure Competition Categories / Sub-events
                      </h3>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddSubEvent}>
                        <Plus size={14} style={{ marginRight: '4px' }} /> Add Category
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {subEvents.map((sub, idx) => (
                        <div 
                          key={sub.id} 
                          style={{ 
                            padding: '1rem', 
                            border: '1px solid var(--color-border)', 
                            borderRadius: '8px', 
                            background: '#F8FAFC', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.75rem',
                            position: 'relative'
                          }}
                        >
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-icon btn-sm" 
                            style={{ 
                              position: 'absolute', 
                              top: '12px', 
                              right: '12px', 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%',
                              padding: 0
                            }} 
                            onClick={() => handleRemoveSubEvent(idx)}
                            title="Remove Category"
                          >
                            <Minus size={14} />
                          </button>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingRight: '28px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Category Name</label>
                              <input 
                                type="text" 
                                className="input input-sm" 
                                placeholder="Singles Below 16" 
                                value={sub.name || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'name', e.target.value)} 
                                required 
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Points Scale</label>
                              <input 
                                type="text" 
                                className="input input-sm" 
                                placeholder="Winner: 30 pts" 
                                value={sub.points || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'points', e.target.value)} 
                                required 
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Date</label>
                              <input 
                                type="date" 
                                className="input input-sm" 
                                value={sub.startDate || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'startDate', e.target.value)} 
                                required 
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Time</label>
                              <input 
                                type="text" 
                                className="input input-sm" 
                                placeholder="e.g. 05:00 PM" 
                                value={sub.time || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'time', e.target.value)} 
                                required 
                              />
                            </div>
                          </div>

                          {/* SUB EVENT REGISTRATION DEADLINE (DATE & TIME) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Reg Deadline Date</label>
                              <input 
                                type="date" 
                                className="input input-sm" 
                                value={sub.deadlineDate || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'deadlineDate', e.target.value)} 
                                required 
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Reg Deadline Time</label>
                              <input 
                                type="time" 
                                className="input input-sm" 
                                value={sub.deadlineTime || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'deadlineTime', e.target.value)} 
                                required 
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Event Manager Name</label>
                              <input 
                                type="text" 
                                className="input input-sm" 
                                placeholder="e.g. Rajesh Kumar" 
                                value={sub.managerName || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'managerName', e.target.value)} 
                                required 
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Manager Phone</label>
                              <input 
                                type="tel" 
                                className="input input-sm" 
                                placeholder="e.g. 9876543210" 
                                value={sub.managerPhone || ''} 
                                onChange={(e) => handleSubEventChange(idx, 'managerPhone', e.target.value)} 
                                />
                            </div>
                          </div>

                          {/* ⚙️ ADVANCED CONFIGURATIONS (GROUP PARAMS & TOOLTIPS) */}
                          <div style={{ background: '#F1F5F9', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  Registration Type
                                  <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <span 
                                      onClick={() => setActiveTooltipId(activeTooltipId === `${sub.id}-regType` ? null : `${sub.id}-regType`)}
                                      style={{ cursor: 'pointer', fontSize: '0.7rem', background: '#CBD5E1', padding: '0px 4px', borderRadius: '50%', fontWeight: 700 }}
                                      title="Click for explanation of registration modes"
                                    >
                                      ?
                                    </span>
                                    {activeTooltipId === `${sub.id}-regType` && (
                                      <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: '220px', padding: '8px 10px', background: '#1E293B', color: '#FFF', fontSize: '0.75rem', borderRadius: '6px', zIndex: 100, marginBottom: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', whiteSpace: 'normal', lineHeight: '1.3' }}>
                                        <p style={{ margin: 0, fontWeight: 700, borderBottom: '1px solid #475569', paddingBottom: '2px', marginBottom: '4px' }}>Registration Types:</p>
                                        • <strong>Individual</strong>: Single resident entry.<br/>
                                        • <strong>Group (Roster Required)</strong>: Roster list of 2-5 residents from the wing is required (e.g., Antakshari, Relay).<br/>
                                        • <strong>Group (Roster Optional)</strong>: Large wing drama / tasha troupes. Resident can skip listing members.
                                      </div>
                                    )}
                                  </div>
                                </label>
                                <select 
                                  className="input input-sm" 
                                  value={sub.regType || 'INDIVIDUAL'} 
                                  onChange={(e) => handleSubEventChange(idx, 'regType', e.target.value)}
                                  style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                                >
                                  <option value="INDIVIDUAL">Individual Entry</option>
                                  <option value="GROUP_REQUIRED">Group (Roster Required)</option>
                                  <option value="GROUP_OPTIONAL">Wing-Wise Group (Roster Optional)</option>
                                </select>
                              </div>

                              {(sub.regType === 'GROUP_REQUIRED' || sub.regType === 'GROUP_OPTIONAL') && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Max Groups Per Wing
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                      <span 
                                        onClick={() => setActiveTooltipId(activeTooltipId === `${sub.id}-wingQuota` ? null : `${sub.id}-wingQuota`)}
                                        style={{ cursor: 'pointer', fontSize: '0.7rem', background: '#CBD5E1', padding: '0px 4px', borderRadius: '50%', fontWeight: 700 }}
                                        title="Click to learn about Wing Quotas"
                                      >
                                        ?
                                      </span>
                                      {activeTooltipId === `${sub.id}-wingQuota` && (
                                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: '220px', padding: '8px 10px', background: '#1E293B', color: '#FFF', fontSize: '0.75rem', borderRadius: '6px', zIndex: 100, marginBottom: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', whiteSpace: 'normal', lineHeight: '1.3' }}>
                                          Enforces a limit on how many separate team entries a single Wing can submit for this category (default is 2 groups per wing).
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                  <input 
                                    type="number" 
                                    className="input input-sm" 
                                    min="1"
                                    max="10"
                                    value={sub.maxGroupsPerWing || 2} 
                                    onChange={(e) => handleSubEventChange(idx, 'maxGroupsPerWing', parseInt(e.target.value) || 2)} 
                                  />
                                </div>
                              )}
                            </div>

                            {sub.regType === 'GROUP_REQUIRED' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '8px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Min Group Size</label>
                                  <input 
                                    type="number" 
                                    className="input input-sm" 
                                    min="1"
                                    value={sub.minGroupSize || 2} 
                                    onChange={(e) => handleSubEventChange(idx, 'minGroupSize', parseInt(e.target.value) || 2)} 
                                  />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Max Group Size</label>
                                  <input 
                                    type="number" 
                                    className="input input-sm" 
                                    min="1"
                                    value={sub.maxGroupSize || 5} 
                                    onChange={(e) => handleSubEventChange(idx, 'maxGroupSize', parseInt(e.target.value) || 5)} 
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 📜 RULES & REGULATIONS AREA & SUMMARY GENERATOR */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div className="flex-between">
                              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Rules & Guidelines</label>
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={() => {
                                  const rules = generateContextualRules(sub.name || 'this competition', sub.points);
                                  handleSubEventChange(idx, 'rules', rules);
                                }}
                                style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              >
                                ✨ Auto-Generate Rules
                              </button>
                            </div>
                            <textarea 
                              className="input" 
                              rows="3" 
                              placeholder="Describe category rules, round structures, referee names, timing details..."
                              value={sub.rules || ''} 
                              onChange={(e) => handleSubEventChange(idx, 'rules', e.target.value)} 
                              style={{ fontSize: '0.8rem', fontFamily: 'monospace', padding: '6px 8px', resize: 'vertical' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Event &rarr;</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
