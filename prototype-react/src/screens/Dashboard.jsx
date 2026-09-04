import React from 'react';
import { useStore } from '../context/StoreContext';
import { Calendar, CheckCircle2, Trophy, Award, MapPin, ArrowRight, UserPlus, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard({ onViewScreen }) {
  const { state, canEditEvent, canSubmitNominations } = useStore();
  const user = state.currentUser || { name: 'Rahul Sharma', flat: 'N-402', wing: 'Wing N' };
  const events = state.events || [];
  const leaderboard = state.leaderboard || [];
  const announcements = state.announcements || [];
  const registrations = state.registrations || [];

  const userRegs = registrations.filter(r => r.registeredByUserId === user.id);
  const assignedEvents = events.filter(e => canEditEvent(user, e));
  const nominationEvents = events.filter(e => canSubmitNominations(user, e));

  // Calculate wing rank and points
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.points - a.points);
  const totalPtsAwarded = sortedLeaderboard.reduce((s, i) => s + (i.points || 0), 0);
  const userWingIndex = sortedLeaderboard.findIndex(l => l.name === user.wing || l.wingId === user.wingId);
  const rankDisplay = totalPtsAwarded > 0 && userWingIndex !== -1 ? `#${userWingIndex + 1}` : '-';
  const wingPoints = leaderboard.find(l => l.name === user.wing || l.wingId === user.wingId)?.points || 0;

  const wingFlatText = user.wing && user.flat ? `${user.wing} (${user.flat})` : (user.wing || user.flat || '');
  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const subtitleText = wingFlatText ? `${wingFlatText} • ${formattedDate}` : formattedDate;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      {/* 🌟 Sports & Cultural Banner Image */}
      <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid var(--color-border)', background: '#F1F5F9' }}>
        <img 
          src="./images/scot_banner.jpg" 
          alt="SCOT Sports & Cultural Festival Banner" 
          style={{ width: '100%', height: 'auto', display: 'block' }} 
        />
      </div>

      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Welcome back, {user.name}!</h1>
            <p className="page-subtitle">{subtitleText}</p>
          </div>
          <button className="btn btn-primary" onClick={() => onViewScreen('events')}>
            <Calendar size={16} style={{ marginRight: '6px' }} />
            <span>Explore Events</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid-4 mb-lg" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onViewScreen('events')}>
          <div className="stat-info">
            <span className="stat-label">Season Events</span>
            <span className="stat-value">{events.length}</span>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={20} />
          </div>
        </div>

        <div className="stat-card green" style={{ cursor: 'pointer' }} onClick={() => onViewScreen('events')}>
          <div className="stat-info">
            <span className="stat-label">My Registrations</span>
            <span className="stat-value">{userRegs.length}</span>
          </div>
          <div className="stat-icon-wrapper green">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="stat-card amber" style={{ cursor: 'pointer' }} onClick={() => onViewScreen('leaderboard')}>
          <div className="stat-info">
            <span className="stat-label">{user.wing} Rank</span>
            <span className="stat-value">{rankDisplay}</span>
          </div>
          <div className="stat-icon-wrapper amber">
            <Trophy size={20} />
          </div>
        </div>

        <div className="stat-card blue" style={{ cursor: 'pointer' }} onClick={() => onViewScreen('leaderboard')}>
          <div className="stat-info">
            <span className="stat-label">Wing Points</span>
            <span className="stat-value">{wingPoints}</span>
          </div>
          <div className="stat-icon-wrapper blue">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* Two Columns Dashboard Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }} className="dash-columns">
        {/* Left Column: Events & Notices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 🎯 Assigned Events to Manage (SCOT Members / Champions) */}
          {user.role !== 'admin' && assignedEvents.length > 0 && (
            <div className="card" style={{ background: '#FAF5FF', border: '1.5px solid var(--color-primary-light)' }}>
              <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                    🎯 My Assigned Events to Manage ({assignedEvents.length})
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>You have been assigned as Event Manager for these events.</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => onViewScreen('admin/events')}>
                  Manage All
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {assignedEvents.map(evt => (
                  <div key={evt.id} style={{ background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{evt.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{evt.startDate} • {evt.venue}</span>
                    <button className="btn btn-secondary btn-xs" style={{ marginTop: '6px', alignSelf: 'flex-start' }} onClick={() => onViewScreen('admin/events')}>
                      ✏️ Edit & Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📋 Wing Nominations Open (Wing Captains) */}
          {user.role === 'wing_captain' && nominationEvents.length > 0 && (
            <div className="card" style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D' }}>
              <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#92400E' }}>
                    📋 Wing Nominations Open ({nominationEvents.length})
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#B45309' }}>Submit participant entries for {user.wing || 'your Wing'}.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {nominationEvents.map(evt => (
                  <div key={evt.id} style={{ background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{evt.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Deadline: {evt.registrationDeadline || evt.startDate}</span>
                    <button className="btn btn-primary btn-xs" style={{ marginTop: '6px', alignSelf: 'flex-start' }} onClick={() => onViewScreen('admin/competitions')}>
                      📋 Submit Wing Nominations
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events Preview */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>Upcoming Events</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Topaz Park Season 2026-27 Schedule</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onViewScreen('events')}>
                View All ({events.length})
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {events.slice(0, 3).map(evt => (
                <div 
                  key={evt.id} 
                  className="card card-interactive" 
                  style={{ padding: '1rem', borderLeft: `4px solid ${evt.category === 'Sports' ? 'var(--color-cta)' : 'var(--color-primary)'}`, background: '#FAF5FF' }}
                  onClick={() => onViewScreen(`events/${evt.id}`)}
                >
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <span className={`badge ${evt.category === 'Sports' ? 'badge-green' : 'badge-violet'}`}>{evt.category}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{evt.startDate}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{evt.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> {evt.venue}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {evt.type === 'UMBRELLA' ? `${evt.subEvents.length} Sub-events` : 'Single Event'}
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>
                      Details <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements Widget */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>Announcements Board</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => onViewScreen('announcements')}>
                View Board
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {state.announcements.slice(0, 3).map(ann => (
                <div 
                  key={ann.id} 
                  style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)', background: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}
                >
                  <div className="flex-between">
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>{ann.title}</h4>
                    <span className={`badge ${ann.scope === 'Global' ? 'badge-blue' : (ann.scope.includes('Wing') ? 'badge-green' : 'badge-violet')}`}>{ann.scope}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ann.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mini Leaderboard Standings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>Wing Championship</h2>
              <button className="btn btn-outline btn-sm" onClick={() => onViewScreen('leaderboard')}>
                Full List
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Rank</th>
                    <th>Wing</th>
                    <th style={{ textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.slice(0, 5).map((item, index) => {
                    const isUserWing = item.name === user.wing || item.wingId === user.wingId;
                    const rankBadgeClass = index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : 'badge-slate'));
                    const rankNum = totalPtsAwarded > 0 ? index + 1 : '-';

                    return (
                      <tr key={item.wingId} style={isUserWing ? { backgroundColor: 'var(--color-primary-lighter)', fontWeight: 700 } : {}}>
                        <td>
                          <span className={`rank-badge ${rankBadgeClass}`}>
                            {rankNum}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-text)' }}>{item.name}</strong>
                          {isUserWing && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }} className="badge badge-violet">You</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{item.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
