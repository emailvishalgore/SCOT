import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';

// Screens
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Events from './screens/Events';
import EventDetail from './screens/EventDetail';
import Leaderboard from './screens/Leaderboard';
import Announcements from './screens/Announcements';
import Gallery from './screens/Gallery';
import AdminDashboard from './screens/AdminDashboard';
import MemberApprovals from './screens/MemberApprovals';
import EventEditor from './screens/EventEditor';
import Brackets from './screens/Brackets';

import { AnimatePresence } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h2 style={{ color: '#DC2626', marginBottom: '1rem' }}>⚠️ Something went wrong</h2>
          <p style={{ color: '#64748B', marginBottom: '0.5rem' }}>The application encountered a runtime error. This might be due to outdated cached storage or a mismatch in database records.</p>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1.5rem', fontFamily: 'monospace' }}>{this.state.error?.toString()}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ padding: '10px 20px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '8px' }}>Clear Cache &amp; Reload</button>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#E2E8F0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { state, updateUserFcmToken } = useStore();
  const currentUser = state.currentUser;
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [toastList, setToastList] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ask for Push Notification permission and register token
  useEffect(() => {
    if (currentUser) {
      import('./firebase').then(({ requestForToken }) => {
        requestForToken().then(token => {
          if (token && currentUser.fcmToken !== token) {
            updateUserFcmToken(currentUser.id, token);
          }
        });
      });
    }
  }, [currentUser]);

  // Foreground message listener
  useEffect(() => {
    let unsubscribe;
    import('./firebase').then(({ onMessageListener }) => {
      const listenForMessages = () => {
        onMessageListener().then(payload => {
          if (payload?.notification) {
            triggerToast(`${payload.notification.title}: ${payload.notification.body}`, 'success');
          }
          listenForMessages();
        }).catch(() => {
          setTimeout(listenForMessages, 5000);
        });
      };
      listenForMessages();
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Hash-based simple router syncing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash) {
        setCurrentScreen(hash);
      } else {
        setCurrentScreen('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setView = (screen) => {
    window.location.hash = `#/${screen}`;
    setCurrentScreen(screen);
  };

  const triggerToast = (message, type = 'info') => {
    const id = Date.now();
    setToastList(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToastList(prev => prev.filter(t => t.id !== id));
  };

  if (!state.currentUser) {
    return (
      <>
        <Login onLoginSuccess={() => {
          const existingHash = window.location.hash.replace(/^#\/?/, '');
          setView(existingHash || 'dashboard');
        }} onShowToast={triggerToast} />
        <div className="toast-container">
          <AnimatePresence>
            {toastList.map(t => (
              <Toast 
                key={t.id} 
                message={t.message} 
                type={t.type} 
                onClose={() => removeToast(t.id)} 
              />
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  // Route resolver
  const renderScreen = () => {
    if (currentScreen === 'dashboard') {
      return <Dashboard onViewScreen={setView} />;
    }
    if (currentScreen === 'events') {
      return <Events onViewScreen={setView} />;
    }
    if (currentScreen.startsWith('events/')) {
      const eventId = currentScreen.replace('events/', '');
      return (
        <EventDetail 
          eventId={eventId} 
          onViewScreen={setView} 
          onShowToast={triggerToast} 
        />
      );
    }
    if (currentScreen === 'leaderboard') {
      return <Leaderboard onShowToast={triggerToast} />;
    }
    if (currentScreen === 'announcements') {
      return <Announcements onShowToast={triggerToast} />;
    }
    if (currentScreen === 'gallery') {
      return <Gallery onShowToast={triggerToast} />;
    }
    if (currentScreen === 'admin') {
      return <AdminDashboard onViewScreen={setView} />;
    }
    if (currentScreen === 'admin/members') {
      return <MemberApprovals onShowToast={triggerToast} />;
    }
    if (currentScreen === 'admin/events') {
      return <EventEditor onShowToast={triggerToast} onViewScreen={setView} />;
    }
    if (currentScreen === 'admin/competitions') {
      return <Brackets onShowToast={triggerToast} />;
    }

    return (
      <div style={{ padding: '2rem' }}>
        <h2>Screen Not Found</h2>
        <button className="btn btn-primary" onClick={() => setView('dashboard')}>Go to Dashboard</button>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar 
        currentScreen={currentScreen} 
        onViewScreen={setView} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header onMenuClick={() => setSidebarOpen(true)} onShowToast={triggerToast} />
        
        <main className="main-content">
          <AnimatePresence mode="wait">
            <React.Fragment key={currentScreen}>
              {renderScreen()}
            </React.Fragment>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Toast Notification Containers */}
      <div className="toast-container">
        <AnimatePresence>
          {toastList.map(t => (
            <Toast 
              key={t.id} 
              message={t.message} 
              type={t.type} 
              onClose={() => removeToast(t.id)} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
}
