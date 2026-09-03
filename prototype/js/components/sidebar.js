import { store } from '../store.js';
import { logout } from '../app.js';

export function initSidebar() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const closeBtn = document.getElementById('sidebar-close');
  const logoutBtn = document.getElementById('logout-btn');

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('hidden');
  }

  if (hamburger) hamburger.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);
  if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
      if (sidebar.classList.contains('open')) {
        toggleSidebar();
      }
    });
  }
}

export function updateSidebarProfile(user) {
  if (!user) return;
  
  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl = document.getElementById('profile-name');
  const roleEl = document.getElementById('profile-role');
  const adminNav = document.getElementById('admin-nav');

  const initials = user.name ? user.name.split(' ').map(n=>n[0]).join('') : 'U';

  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = `${user.role.toUpperCase()} ${user.flat ? '(' + user.flat + ')' : ''}`;
  
  const isAdmin = user.role === 'admin';
  const isChampion = user.role === 'champion' || user.isChampion;

  if (adminNav) {
    if (isAdmin || isChampion) {
      adminNav.classList.remove('hidden');
      
      // Admin only links
      document.querySelectorAll('.admin-only-link').forEach(link => {
        if (isAdmin) link.classList.remove('hidden');
        else link.classList.add('hidden');
      });

      // Champion links
      document.querySelectorAll('.champ-link').forEach(link => {
        if (isAdmin || isChampion) link.classList.remove('hidden');
        else link.classList.add('hidden');
      });
    } else {
      adminNav.classList.add('hidden');
    }
  }
}
