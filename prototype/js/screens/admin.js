import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container, params) {
  const user = store.user || { role: 'admin' };

  if (user.role === 'resident') {
    container.innerHTML = `
      <div class="access-denied" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 1rem;">
        <i data-lucide="lock" style="color: #7C3AED; width: 64px; height: 64px; margin-bottom: 1rem;"></i>
        <h2 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0;">Access Denied</h2>
        <p style="color: #6B7280; margin-top: 0.5rem;">You do not have permission to view the control panel.</p>
        <button id="btn-back" class="btn" style="background: #7C3AED; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 1.5rem;">Return Home</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    container.querySelector('#btn-back').addEventListener('click', () => navigateTo('home'));
    return;
  }

  const activities = [
    { action: 'Carrom fixtures generated', time: '10 mins ago', icon: 'git-branch' },
    { action: 'New announcement posted', time: '2 hours ago', icon: 'megaphone' },
    { action: 'Score recorded: Wing N vs Wing O', time: '3 hours ago', icon: 'edit-2' },
    { action: 'Event "Sports Day 2025" created', time: 'Yesterday', icon: 'calendar-plus' },
    { action: 'Finance report downloaded', time: 'Yesterday', icon: 'download' },
    { action: 'Member settings updated', time: '2 days ago', icon: 'user-check' },
    { action: 'Carrom registrations closed', time: '3 days ago', icon: 'lock' },
    { action: 'Season 2026-27 initiated', time: '1 week ago', icon: 'flag' }
  ];

  const quickLinks = [
    { title: 'Event Editor', desc: 'Manage events & sub-events', icon: 'edit', path: 'event-editor' },
    { title: 'Brackets & Scores', desc: 'Manage tournaments', icon: 'git-branch', path: 'brackets' },
    { title: 'Members', desc: 'User management', icon: 'users', path: 'members' },
    { title: 'Finance', desc: 'Budgets & expenses', icon: 'wallet', path: 'finance' },
    { title: 'Announcements', desc: 'Noticeboard posts', icon: 'megaphone', path: 'announcements' },
    { title: 'Reports', desc: 'Data & analytics', icon: 'bar-chart', path: 'reports' }
  ];

  // SVG Gauge 67% = circumference 251.2
  container.innerHTML = `
    <header class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <div>
        <h1 class="heading-primary" style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0;">Control Panel</h1>
        <p class="text-secondary subtitle" style="color: #6B7280; margin: 0.25rem 0 0 0;">Admin Dashboard</p>
      </div>
      <div class="badge" style="background: #DCFCE7; color: #166534; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; border: 1px solid #22C55E;">
        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Season Active
      </div>
    </header>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
      <div class="card" style="grid-column: span 2; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h2 style="font-family: 'Fira Code', monospace; color: #7C3AED; margin: 0;">Season 2026-27</h2>
            <p style="color: #6B7280; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Oct 2026 - Mar 2027</p>
          </div>
          <span style="background: #22C55E; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: bold; font-size: 0.75rem; text-transform: uppercase;">Active</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 1.5rem;">
          <div style="background: #FAF5FF; padding: 1rem; border-radius: 6px; border: 1px solid #E5E7EB; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <i data-lucide="calendar" style="color: #7C3AED; margin-bottom: 0.5rem;"></i>
            <span style="font-family: 'Fira Code', monospace; font-size: 1.5rem; font-weight: bold; color: #4C1D95;">5</span>
            <span style="font-size: 0.7rem; color: #6B7280; text-transform: uppercase; font-weight: bold;">Total Events</span>
          </div>
          <div style="background: #FAF5FF; padding: 1rem; border-radius: 6px; border: 1px solid #E5E7EB; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <i data-lucide="users" style="color: #7C3AED; margin-bottom: 0.5rem;"></i>
            <span style="font-family: 'Fira Code', monospace; font-size: 1.5rem; font-weight: bold; color: #4C1D95;">84</span>
            <span style="font-size: 0.7rem; color: #6B7280; text-transform: uppercase; font-weight: bold;">Registrations</span>
          </div>
          <div style="background: #FAF5FF; padding: 1rem; border-radius: 6px; border: 1px solid #E5E7EB; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <i data-lucide="check-circle" style="color: #7C3AED; margin-bottom: 0.5rem;"></i>
            <span style="font-family: 'Fira Code', monospace; font-size: 1.5rem; font-weight: bold; color: #4C1D95;">4/6</span>
            <span style="font-size: 0.7rem; color: #6B7280; text-transform: uppercase; font-weight: bold;">Tasks Done</span>
          </div>
          <div style="background: #FAF5FF; padding: 1rem; border-radius: 6px; border: 1px solid #E5E7EB; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <i data-lucide="flag" style="color: #7C3AED; margin-bottom: 0.5rem;"></i>
            <span style="font-family: 'Fira Code', monospace; font-size: 1.5rem; font-weight: bold; color: #4C1D95;">10</span>
            <span style="font-size: 0.7rem; color: #6B7280; text-transform: uppercase; font-weight: bold;">Wings Active</span>
          </div>
        </div>
      </div>

      <div class="card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <h3 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0 0 1rem 0; font-size: 1.1rem;">Task Completion</h3>
        <div style="position: relative; width: 120px; height: 120px;">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" stroke-width="10"></circle>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#7C3AED" stroke-width="10" stroke-dasharray="168.3 251.2" stroke-linecap="round"></circle>
          </svg>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column;">
            <span style="font-size: 1.5rem; font-weight: bold; font-family: 'Fira Code', monospace; color: #4C1D95;">67%</span>
          </div>
        </div>
        <p style="font-size: 0.85rem; color: #6B7280; margin: 1rem 0 0 0;">4 of 6 core tasks completed</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
      <div style="grid-column: span 2;">
        <h3 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0 0 1rem 0; font-size: 1.25rem;">Quick Links</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          ${quickLinks.map(link => `
            <div class="link-card" data-path="${link.path}" style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #E5E7EB; cursor: pointer; display: flex; align-items: center; gap: 1rem; transition: all 0.2s ease;">
              <div style="background: #FAF5FF; color: #7C3AED; padding: 0.75rem; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="${link.icon}"></i>
              </div>
              <div>
                <h4 style="margin: 0; color: #4C1D95; font-size: 1rem;">${link.title}</h4>
                <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #6B7280;">${link.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h3 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0 0 1rem 0; font-size: 1.25rem;">Recent Activity</h3>
        <div class="card" style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem;">
            ${activities.map((act, i) => `
              <li style="display: flex; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: ${i !== activities.length - 1 ? '1px solid #E5E7EB' : 'none'};">
                <div style="color: #7C3AED; margin-top: 0.15rem;"><i data-lucide="${act.icon}" style="width: 16px; height: 16px;"></i></div>
                <div>
                  <p style="margin: 0; font-size: 0.9rem; color: #1F2937; font-weight: 500;">${act.action}</p>
                  <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #6B7280;">${act.time}</p>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  container.querySelectorAll('.link-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = '#7C3AED';
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '#E5E7EB';
      card.style.transform = 'none';
      card.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    });
    card.addEventListener('click', (e) => {
      navigateTo(e.currentTarget.dataset.path);
    });
  });
}
