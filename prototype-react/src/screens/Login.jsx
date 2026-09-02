import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, UserPlus, LogIn } from 'lucide-react';
import WavyBackground from '../components/WavyBackground';

export default function Login({ onLoginSuccess, onShowToast }) {
  const { state, login, register, sendSupportMessage } = useStore();
  const wings = state.wings || [];
  const existingUsers = state.users || [];

  const [activeTab, setActiveTab] = useState('signin'); // 'signin', 'signup', 'pending'
  const [pendingUser, setPendingUser] = useState(null);
  
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [contactSender, setContactSender] = useState('');

  // Organizer signup form states
  const [name, setName] = useState('');
  const [wingId, setWingId] = useState('wing-n');
  const [flat, setFlat] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // Signin form states
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      setErrorMsg('Name must contain only alphabets and spaces!');
      return;
    }

    if (!/^\d{3}$/.test(flat)) {
      setErrorMsg('Flat number must be exactly 3 digits (e.g., 101, 304)!');
      return;
    }

    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setErrorMsg('Mobile number must be exactly 10 digits!');
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg('Security PIN must be exactly 4 digits!');
      return;
    }

    if (existingUsers.some(u => String(u.phone) === String(phone))) {
      setErrorMsg('An account with this mobile number already exists!');
      return;
    }

    let token = '';
    try {
      const { requestForToken } = await import('../firebase');
      token = await requestForToken() || '';
    } catch (err) {
      console.log('Firebase registration token fetch skipped: ', err);
    }

    // All organizer signups default to 'champion' role
    const newUser = register(name, wingId, flat, phone, pin, true, token);
    setPendingUser(newUser);
    setActiveTab('pending');
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const numericPhone = loginPhone.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setErrorMsg('Mobile number must be exactly 10 digits!');
      return;
    }

    if (loginPin.length !== 4 || !/^\d{4}$/.test(loginPin)) {
      setErrorMsg('Security PIN must be exactly 4 digits!');
      return;
    }

    const res = login(loginPhone, loginPin);
    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!adminMessage.trim()) {
      if (onShowToast) onShowToast('Please enter a message.', 'error');
      return;
    }
    sendSupportMessage(adminMessage, contactSender || 'Anonymous Organizer');
    if (onShowToast) {
      onShowToast('Message successfully sent to Topaz Park Admin!', 'success');
    }
    setAdminMessage('');
    setContactSender('');
    setShowContactAdmin(false);
  };

  return (
    <WavyBackground className="login-root">
      
      {/* Decorative Moving Background Shapes */}
      <motion.div 
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 70%)',
          pointerEvents: 'none'
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <motion.div 
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none'
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, 40, 0]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Main Login Card Container */}
      <motion.div 
        className="login-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 2rem', zIndex: 5 }}
      >
        <div className="login-header" style={{ marginBottom: '1.75rem', width: '100%' }}>
          <img 
            src="./images/scot-logo.png" 
            alt="SCOT Logo" 
            className="scot-logo" 
            style={{ height: '64px', width: 'auto', marginBottom: '0.75rem' }}
          />
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Topaz Park SCOT
          </h1>
          <p className="tagline" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Event Organisers & Wing Champions Portal
          </p>
        </div>

        {/* Sliding Tab Indicator */}
        {activeTab !== 'pending' && (
          <div className="tabs mb-md" style={{ width: '100%', display: 'flex', position: 'relative', background: '#F1F5F9', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem', border: 'none' }}>
            <button 
              type="button"
              className={`tab ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('signin'); setErrorMsg(''); }}
              style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', zIndex: 2, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: activeTab === 'signin' ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)' }}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button 
              type="button"
              className={`tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => { setActiveTab('signup'); setErrorMsg(''); }}
              style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', zIndex: 2, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: activeTab === 'signup' ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)' }}
            >
              <UserPlus size={14} /> Organizer Signup
            </button>
            
            {/* Sliding backdrop active marker */}
            <motion.div 
              style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: activeTab === 'signin' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
                background: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                zIndex: 1
              }}
              layout
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          </div>
        )}

        {/* Feedback Alert banner */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', width: '100%', padding: '0.75rem', background: 'var(--color-danger-bg)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'left' }}
          >
            ⚠️ {errorMsg}
          </motion.div>
        )}

        {/* Animated Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'pending' && pendingUser ? (
            <motion.div 
              key="pending"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-warning-bg)', border: '2px solid var(--color-warning)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={28} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
                Registration Submitted
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Thank you, <strong>{pendingUser.name}</strong>! Your organizer registration for <strong>{pendingUser.wing}, Flat {pendingUser.flat}</strong> has been received.
              </p>
              
              <div style={{ padding: '0.875rem 1rem', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', textAlign: 'left', fontSize: '0.8rem', lineHeight: 1.4 }}>
                <strong style={{ display: 'block', marginBottom: '2px' }}>⏳ Pending Admin Approval:</strong>
                Organizer accounts require admin approval. Once approved, you can sign in with your mobile number and PIN to manage events.
              </div>
              
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '44px', borderRadius: '10px' }}
                onClick={() => { setActiveTab('signin'); setPendingUser(null); }}
              >
                Back to Sign In
              </button>
            </motion.div>
          ) : activeTab === 'signup' ? (
            <motion.form 
              key="signup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRegister}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--color-primary-lighter)', border: '1px solid var(--color-primary-light)', fontSize: '0.78rem', color: 'var(--color-primary-dark)', fontWeight: 600, textAlign: 'left', lineHeight: 1.4 }}>
                🎯 This registration is for <strong>Event Champions & Wing Coordinators</strong> only. Your account will be reviewed and approved by the SCOT Admin.
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Full Name</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ramesh Kulkarni" 
                  value={name} 
                  onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Wing</label>
                  <select className="select" value={wingId} onChange={(e) => setWingId(e.target.value)} required>
                    {wings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Flat No.</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="402" 
                    value={flat} 
                    onChange={(e) => setFlat(e.target.value.replace(/\D/g, '').slice(0, 3))} 
                    maxLength={3}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Mobile Phone</label>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="Mobile number" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    maxLength={10}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>4-Digit PIN</label>
                  <input 
                    type="password" 
                    className="input" 
                    placeholder="1234" 
                    value={pin} 
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                    maxLength={4} 
                    required 
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '8px', textAlign: 'left', marginTop: '4px', lineHeight: 1.45 }}>
                <Shield size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', color: 'var(--color-text)', marginBottom: '2px', fontSize: '0.75rem' }}>🔒 Organizer Access Only:</strong>
                  This portal is for event organisers and wing champions. Resident information entered during events is used solely for tournament coordination.
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', height: '44px', borderRadius: '10px' }}>
                Submit Organizer Registration &rarr;
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="signin"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSignIn}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Mobile Phone</label>
                <input 
                  type="tel" 
                  className="input" 
                  placeholder="e.g. 9876543210" 
                  value={loginPhone} 
                  onChange={(e) => setLoginPhone(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Security PIN</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="Enter 4-digit PIN" 
                  value={loginPin} 
                  onChange={(e) => setLoginPin(e.target.value)} 
                  maxLength={4} 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-violet" style={{ width: '100%', height: '44px', borderRadius: '10px', marginTop: '0.5rem' }}>
                Sign In to Platform &rarr;
              </button>

              {/* Contact Admin facility */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', textAlign: 'left' }}>
                {!showContactAdmin ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', borderRadius: '8px', fontSize: '0.8rem', justifyContent: 'center' }}
                    onClick={() => setShowContactAdmin(true)}
                  >
                    Need Help? Contact Admin
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                      Send message to Topaz Park Admin
                    </label>
                    <textarea 
                      className="textarea" 
                      rows={3} 
                      placeholder="Describe your issue or verification request..."
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                      required
                    />
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Your Name, Phone, or Flat (e.g. Wing P - 302)"
                      value={contactSender}
                      onChange={(e) => setContactSender(e.target.value)}
                      style={{ fontSize: '0.8rem', borderRadius: '8px', padding: '6px 10px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setShowContactAdmin(false)}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1.5 }}
                        onClick={handleContactSubmit}
                      >
                        Send Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="prototype-label" style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          Topaz Park SCOT Platform &bull; Wing Champions Edition
        </div>
      </motion.div>
    </WavyBackground>
  );
}
