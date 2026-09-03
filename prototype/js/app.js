import { initRouter, registerRoute, navigateTo } from './router.js';
import { store } from './store.js';
import { initSidebar, updateSidebarProfile } from './components/sidebar.js';
import { initHeader, updateHeaderProfile } from './components/header.js';

// Screen imports
import * as loginScreenModule from './screens/login.js';
import * as dashboardScreen from './screens/dashboard.js';
import * as eventsScreen from './screens/events.js';
import * as eventDetailScreen from './screens/event-detail.js';
import * as leaderboardScreen from './screens/leaderboard.js';
import * as announcementsScreen from './screens/announcements.js';
import * as galleryScreen from './screens/gallery.js';
import * as adminScreen from './screens/admin.js';
import * as eventEditorScreen from './screens/event-editor.js';
import * as bracketsScreen from './screens/brackets.js';
import * as membersScreen from './screens/members.js';

import { showToast } from './components/toast.js';

export function login(profileId) {
  const state = store.getState();
  const users = state.users || state.profiles || [];
  const user = users.find(p => p.id === profileId || p.role === profileId) || state.currentUser;
  
  if (user) {
    if (user.status === 'PENDING_APPROVAL') {
      showToast(`Account for ${user.name} is PENDING Admin approval of flat contribution.`, 'error');
      showLogin();
      return;
    }

    store.setState(() => ({ currentUser: user }));
    showAppShell(user);
    navigateTo('dashboard');
  }
}

window.__scotLogin = login;

export function logout() {
  store.setState(() => ({ currentUser: null }));
  showLogin();
}

function showAppShell(user) {
  const appShell = document.getElementById('app-shell');
  const loginRoot = document.getElementById('login-root');
  
  if (appShell) appShell.classList.remove('hidden');
  if (loginRoot) loginRoot.classList.add('hidden');
  
  updateSidebarProfile(user);
  updateHeaderProfile(user);
}

function showLogin() {
  const appShell = document.getElementById('app-shell');
  const loginRoot = document.getElementById('login-root');
  
  if (appShell) appShell.classList.add('hidden');
  if (loginRoot) {
    loginRoot.classList.remove('hidden');
    if (loginScreenModule.render) {
      loginScreenModule.render(loginRoot);
    }
  }
}

function initApp() {
  // Register routes
  registerRoute('dashboard', dashboardScreen.render);
  registerRoute('events', eventsScreen.render);
  registerRoute('events/:id', eventDetailScreen.render);
  registerRoute('leaderboard', leaderboardScreen.render);
  registerRoute('announcements', announcementsScreen.render);
  registerRoute('gallery', galleryScreen.render);
  registerRoute('admin', adminScreen.render);
  registerRoute('admin/members', membersScreen.render);
  registerRoute('admin/events', eventEditorScreen.render);
  registerRoute('admin/competitions', bracketsScreen.render);

  // Init UI
  initSidebar();
  initHeader();
  initRouter();

  // Check auth state
  const state = store.getState();
  if (state.currentUser) {
    showAppShell(state.currentUser);
  } else {
    showLogin();
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

document.addEventListener('DOMContentLoaded', initApp);

