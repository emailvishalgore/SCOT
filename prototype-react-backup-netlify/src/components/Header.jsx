import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Award, Menu, Upload, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ onMenuClick, onShowToast }) {
  const { state, updateProfile } = useStore();
  const user = state.currentUser;

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Sync state on modal open
  useEffect(() => {
    if (user && showProfileModal) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [user, showProfileModal]);

  if (!user) return null;

  const initials = user.name ? String(user.name).split(' ').map(n => n[0]).join('') : 'U';

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      if (onShowToast) onShowToast('Please enter your name.', 'error');
      return;
    }
    updateProfile(profileName.trim(), profilePhone.trim(), profilePhoto);
    if (onShowToast) onShowToast('Profile updated successfully!', 'success');
    setShowProfileModal(false);
  };

  return (
    <>
      <header className="app-header">
        {/* Society Branding */}
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="hamburger-btn" 
            onClick={onMenuClick}
            style={{ marginRight: '4px' }}
            title="Open Menu"
          >
            <Menu size={20} />
          </button>

          <img src="/images/scot-logo.png" alt="SCOT Logo" className="header-logo" />
          <div className="header-titles">
            <span className="header-society">Topaz Park SCOT</span>
            <span className="header-tagline">Sports & Cultural Organisers of Topaz</span>
          </div>
        </div>

        {/* Season Selector & Profile summary */}
        <div className="header-actions">
          <div className="season-selector">
            <Award size={14} /> <span>Season 2026-27</span>
          </div>

          <div 
            className="header-profile" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background-color 200ms' }}
            onClick={() => setShowProfileModal(true)}
            title="Edit Profile"
          >
            {user.profilePhoto ? (
              <img 
                src={user.profilePhoto} 
                alt="Avatar" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-primary-light)' }} 
              />
            ) : (
              <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.8rem', backgroundColor: 'var(--color-primary)' }}>
                {initials}
              </div>
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
              {String(user.name || '').split(' ')[0]}
            </span>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <motion.div 
              className="modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ maxWidth: '400px' }}
            >
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Edit Profile Details
                </h2>

                {/* Profile Photo Upload Circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '0.5rem 0' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    {profilePhoto ? (
                      <img 
                        src={profilePhoto} 
                        alt="Avatar Preview" 
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} 
                      />
                    ) : (
                      <div className="avatar-circle" style={{ width: '100%', height: '100%', fontSize: '1.75rem', backgroundColor: 'var(--color-primary)' }}>
                        {initials}
                      </div>
                    )}
                    
                    <label 
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '5px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid white',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                      title="Upload Profile Photo"
                    >
                      <Upload size={12} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handlePhotoSelect}
                      />
                    </label>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Click icon to upload photo</span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Full Name (Locked)</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={profileName}
                    readOnly
                    disabled
                    style={{ backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: 'var(--color-text-secondary)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Phone / Login ID (Locked)</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={profilePhone}
                    readOnly
                    disabled
                    style={{ backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: 'var(--color-text-secondary)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
