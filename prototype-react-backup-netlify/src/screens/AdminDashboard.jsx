import React from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, Users, Calendar, CheckCircle2, Flag, Edit, GitBranch, UserCheck, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard({ onViewScreen }) {
  const { state, postAnnouncement } = useStore();
  const currentUser = state.currentUser;

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <Shield size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>You must be registered as a SCOT Admin to access this panel.</p>
      </div>
    );
  }

  const events = state.events || [];
  
  // Calculate sorted standing points
  const sortedStandings = [...(state.leaderboard || [])].sort((a, b) => (b.points || 0) - (a.points || 0));

  const handleWhatsAppShare = () => {
    let text = `*🏆 TOPAZ PARK WING CHAMPIONSHIP STANDINGS*\n`;
    text += `----------------------------------------\n`;
    sortedStandings.forEach((row, index) => {
      text += `*#${index + 1}* ${row.name} — *${row.points || 0} pts* (${row.wins || 0} wins)\n`;
    });
    text += `----------------------------------------\n`;
    text += `_Shared from Topaz Park SCOT Platform_`;

    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Standings copied to clipboard! Opening WhatsApp share...');
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      })
      .catch(err => {
        console.error('Failed to copy standings:', err);
      });
  };

  const handlePublishStandingsAnnouncement = () => {
    let standingsContent = `The Topaz Park Season 2026-27 championship standings have been updated by the committee. Here is the current wing-wise standings leaderboard:\n\n`;
    sortedStandings.forEach((row, index) => {
      standingsContent += `#${index + 1} — ${row.name}: ${row.points || 0} pts (${row.wins || 0} wins)\n`;
    });
    standingsContent += `\nKeep participating and supporting your wing!`;

    postAnnouncement(
      '🏆 Official Wing Championship Standings Update',
      'Global',
      standingsContent,
      ''
    );
    alert('Standings published as a Global Announcement notice successfully!');
  };
  const pendingUsers = (state.users || []).filter(u => u.status === 'PENDING_APPROVAL');
  const tasks = state.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const taskPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 67; // fallback to 67%

  // Calculate SVG gauge variables
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (taskPercent / 100) * circumference;

  const quickLinks = [
    { title: 'Member Approvals', desc: 'Verify contribution dues & active profiles', icon: <UserCheck size={24} />, route: 'admin/members', count: pendingUsers.length },
    { title: 'Event Editor', desc: 'Schedule matches & categories', icon: <Edit size={24} />, route: 'admin/events' },
    { title: 'Brackets & Scores', desc: 'Record tournament scores & fixtures', icon: <GitBranch size={24} />, route: 'admin/competitions' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Admin Control Panel</h1>
            <p className="page-subtitle">Manage Topaz Park housing society operations, registrations, and scores</p>
          </div>
          <span className="badge badge-amber" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
            <Shield size={14} style={{ marginRight: '4px' }} /> Season Active
          </span>
        </div>
      </div>

      {/* Control Panel Stats */}
      <div className="grid-4 mb-lg" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Events</span>
            <span className="stat-value">{events.length}</span>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={20} />
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-info">
            <span className="stat-label">Member Registrations</span>
            <span className="stat-value">{(state.users || []).length}</span>
          </div>
          <div className="stat-icon-wrapper green">
            <Users size={20} />
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-info">
            <span className="stat-label">Pending Approvals</span>
            <span className="stat-value">{pendingUsers.length}</span>
          </div>
          <div className="stat-icon-wrapper amber">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-info">
            <span className="stat-label">Wings Registered</span>
            <span className="stat-value">10</span>
          </div>
          <div className="stat-icon-wrapper blue">
            <Flag size={20} />
          </div>
        </div>
      </div>

  {/* Standings Share Section */}
  <div className="card mb-lg" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
          🏆 Society Standings & Leaderboard
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Share the current championship scores with residents via WhatsApp or post as an official platform notice.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={handleWhatsAppShare}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}>
            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.202-1.362a9.923 9.923 0 0 0 4.808 1.236h.005c5.507 0 9.99-4.478 9.99-9.986 0-2.67-1.037-5.178-2.924-7.065A9.917 9.917 0 0 0 12.012 2zm4.957 13.987c-.272.766-1.396 1.48-1.922 1.579-.472.088-1.09.167-3.183-.699-2.676-1.109-4.385-3.83-4.518-4.008-.133-.177-1.082-1.442-1.082-2.75 0-1.309.684-1.95.928-2.217.243-.266.531-.333.708-.333.177 0 .354.002.508.01.162.008.38-.06.594.46.216.527.742 1.81.808 1.943.066.133.111.288.022.465-.088.177-.133.288-.266.443-.133.155-.279.346-.398.465-.133.133-.272.278-.117.545.155.266.69 1.134 1.482 1.839.998.89 1.838 1.166 2.096 1.299.257.133.408.111.562-.066.155-.178.663-.778.841-1.043.177-.266.354-.221.597-.133.243.089 1.547.73 1.81.863.266.133.443.2.508.31.066.111.066.643-.206 1.409z" />
          </svg>
          <span>Share Standings (WhatsApp)</span>
        </button>
        <button 
          className="btn btn-primary btn-sm"
          onClick={handlePublishStandingsAnnouncement}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Megaphone size={14} />
          <span>Publish Standings Notice</span>
        </button>
      </div>
    </div>

    {/* Miniature Standings View */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
      {sortedStandings.map((item, idx) => {
        const colors = ['#F59E0B', '#64748B', '#B45309', '#3B82F6', '#10B981', '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6', '#F43F5E'];
        const color = colors[idx] || 'var(--color-primary)';
        return (
          <div key={item.wingId} style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', width: '22px', height: '22px', borderRadius: '50%', background: color, color: '#FFF', fontSize: '0.72rem', fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>
                {idx + 1}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
              {item.points || 0} pts
            </span>
          </div>
        );
      })}
    </div>
  </div>

  {/* Quick Actions & Tasks Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1.5rem' }} className="dash-columns">
        
        {/* Quick Links Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Quick Action Boards
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {quickLinks.map((link, idx) => (
                <div 
                  key={idx} 
                  className="card card-interactive" 
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}
                  onClick={() => onViewScreen(link.route)}
                >
                  <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary)' }}>
                    {link.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
                      {link.title}
                      {link.count > 0 && <span className="badge badge-amber" style={{ marginLeft: '8px' }}>{link.count} pending</span>}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{link.desc}</p>
                  </div>
                  <span style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>&rarr;</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Circular Progress Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', width: '100%' }}>
            Tasks Completion Rate
          </h2>

          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
              <circle 
                cx="60" cy="60" r={radius} 
                fill="transparent" 
                stroke="#E2E8F0" 
                strokeWidth="10" 
              />
              <motion.circle 
                cx="60" cy="60" r={radius} 
                fill="transparent" 
                stroke="var(--color-primary)" 
                strokeWidth="10" 
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                {taskPercent}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Completed
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '1.5rem', lineHeight: 1.4 }}>
            <strong>{completedTasks} of {tasks.length}</strong> operational planning tasks have been signed off.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
