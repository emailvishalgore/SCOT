// SCOT TOPAZ Core Team Portal - Main App Entry Point
import { appAuth } from './auth.js';
import { appRouter } from './router.js';
import { appRealtime } from './realtime.js';

// Import Pages dynamically/statically
import { render as renderDashboard } from './pages/dashboard.js';
import { render as renderMembers } from './pages/members.js';
import { render as renderContributions } from './pages/contributions.js';
import { render as renderExpenses } from './pages/expenses.js';
import { render as renderVendors } from './pages/vendors.js';
import { render as renderSponsors } from './pages/sponsors.js';
import { render as renderAnnouncements } from './pages/announcements.js';
import { render as renderApprovals } from './pages/approvals.js';
import { render as renderReports } from './pages/reports.js';
import { render as renderMore } from './pages/more.js';

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  // 1. Register Page Renders
  appRouter.register('#/dashboard', renderDashboard);
  appRouter.register('#/members', renderMembers);
  appRouter.register('#/contributions', renderContributions);
  appRouter.register('#/expenses', renderExpenses);
  appRouter.register('#/vendors', renderVendors);
  appRouter.register('#/sponsors', renderSponsors);
  appRouter.register('#/announcements', renderAnnouncements);
  appRouter.register('#/approvals', renderApprovals);
  appRouter.register('#/reports', renderReports);
  appRouter.register('#/more', renderMore);

  // 2. Check login session
  const loggedIn = appAuth.checkSession();
  
  if (loggedIn) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    
    // Initialize Realtime subscriptions
    appRealtime.init();
  } else {
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  }

  // 3. Start Router
  appRouter.init();
});

// Teardown Realtime on tab close / reload
window.addEventListener('beforeunload', () => {
  appRealtime.destroy();
});
