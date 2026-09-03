import React from 'react';
import { useStore } from '../context/StoreContext';
import { LayoutDashboard, Calendar, Trophy, Megaphone, Image as ImageIcon, Shield, Edit, GitBranch, UserCheck, LogOut, X } from 'lucide-react';
import { motion } from 'framer-motion';
import TextRoll from './TextRoll';

const navLinkVariants = {
  initial: { x: -40, opacity: 0 },
  enter: (i) => ({
    x: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.05 * i }
  }),
  exit: (i) => ({
    x: -40,
    opacity: 0,
    transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1], delay: 0.03 * i }
  })
};

export default function Sidebar({ currentScreen, onViewScreen, isOpen, onClose }) {
  const { state, logout } = useStore();
  const user = state.currentUser;

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isChampion = user.role === 'champion' || user.isChampion;

  const initials = user.name ? String(user.name).split(' ').map(n => n[0]).join('') : 'U';

  const residentLinks = [
    { title: 'Dashboard', screen: 'dashboard', icon: <LayoutDashboard size={18} /> },
    { title: 'Events Calendar', screen: 'events', icon: <Calendar size={18} /> },
    { title: 'Leaderboard', screen: 'leaderboard', icon: <Trophy size={18} /> },
    { title: 'Announcements', screen: 'announcements', icon: <Megaphone size={18} /> },
    { title: 'Media Gallery', screen: 'gallery', icon: <ImageIcon size={18} /> }
  ];

  const adminLinks = [
    { title: 'Control Panel', screen: 'admin', icon: <Shield size={18} /> },
    { title: 'Member Approvals', screen: 'admin/members', icon: <UserCheck size={18} /> },
    { title: 'Event Editor', screen: 'admin/events', icon: <Edit size={18} /> },
    { title: 'Brackets & Scores', screen: 'admin/competitions', icon: <GitBranch size={18} /> }
  ];

  const handleNavClick = (screen) => {
    onViewScreen(screen);
    if (onClose) onClose(); // Auto close menu drawer on mobile nav
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <img src="/images/scot-logo.png" alt="SCOT Logo" className="sidebar-logo" />
        <div className="sidebar-brand">
          <span className="sidebar-title">SCOT</span>
          <span className="sidebar-subtitle">Topaz Park</span>
        </div>
        <button 
          className="sidebar-close" 
          onClick={onClose}
          title="Close Menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav List */}
      <div className="sidebar-nav">
        {/* Resident section */}
        <div className="nav-section">
          <span className="nav-label">Resident Tools</span>
          {residentLinks.map((link, idx) => {
            const isActive = currentScreen === link.screen || currentScreen.startsWith(`${link.screen}/`);
            return (
              <motion.div
                key={link.screen}
                custom={idx}
                variants={navLinkVariants}
                initial="initial"
                animate="enter"
              >
                <motion.button 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(link.screen)}
                  whileHover="hover"
                >
                  {link.icon} <span><TextRoll>{link.title}</TextRoll></span>
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Management Section (Admin / Champion only) */}
        {(isAdmin || isChampion) && (
          <div className="nav-section">
            <span className="nav-label">Management Panel</span>
            {adminLinks.map((link, idx) => {
              const isAllowed = isAdmin || (link.screen === 'admin/events' || link.screen === 'admin/competitions');
              if (!isAllowed) return null;

              const isActive = currentScreen === link.screen;
              return (
                <motion.div
                  key={link.screen}
                  custom={idx + residentLinks.length}
                  variants={navLinkVariants}
                  initial="initial"
                  animate="enter"
                >
                  <motion.button 
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(link.screen)}
                    whileHover="hover"
                  >
                    {link.icon} <span><TextRoll>{link.title}</TextRoll></span>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-profile">
          {user.profilePhoto ? (
            <img 
              src={user.profilePhoto} 
              alt="Avatar" 
              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-primary-light)' }} 
            />
          ) : (
            <div className="avatar-circle" style={{ backgroundColor: 'var(--color-primary-light)' }}>
              {initials}
            </div>
          )}
          <div className="sidebar-profile-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="profile-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
              {user.name}
            </span>
            <span className="profile-role">
              {String(user.role || 'resident').toUpperCase()} {user.flat ? `(${user.flat})` : ''}
            </span>
          </div>
        </div>

        <button 
          className="logout-btn" 
          onClick={logout} 
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* SVG Elastic Curve (Larose/21st.dev Curved Menu effect) */}
      <svg 
        style={{
          position: 'absolute',
          top: 0,
          right: '-99px',
          width: '100px',
          height: '100%',
          stroke: 'none',
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <defs>
          <linearGradient id="sidebar-curve-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <motion.path
          fill="url(#sidebar-curve-grad)"
          variants={{
            initial: { d: "M0 0 L0 100% Q100 50% 0 0 Z" },
            enter: { 
              d: "M0 0 L0 100% Q0 50% 0 0 Z",
              transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
            },
            exit: { 
              d: "M0 0 L0 100% Q100 50% 0 0 Z",
              transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
            }
          }}
          initial="initial"
          animate={isOpen ? "enter" : "initial"}
        />
      </svg>
    </aside>
  );
}
