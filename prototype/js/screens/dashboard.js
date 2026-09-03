import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container) {
  const state = store.getState();
  const user = state.currentUser || { name: 'Rahul Sharma', flat: 'N-402', wing: 'Wing N' };
  const events = state.events || [];
  const leaderboard = state.leaderboard || [];

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Welcome back, ${user.name}!</h1>
          <p class="page-subtitle">${user.wing} (${user.flat}) &bull; ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button class="btn btn-primary" id="dash-register-btn">
          <i data-lucide="plus-circle" class="icon-sm"></i>
          <span>Explore Events</span>
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid-4 mb-lg" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Season Events</span>
          <span class="stat-value">${events.length}</span>
        </div>
        <div class="stat-icon-wrapper">
          <i data-lucide="calendar-days"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">My Registrations</span>
          <span class="stat-value">${(state.registrations || []).filter(r => r.residentId === user.id).length}</span>
        </div>
        <div class="stat-icon-wrapper green">
          <i data-lucide="check-circle-2"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">${user.wing || 'Wing'} Rank</span>
          <span class="stat-value">${(() => {
            const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
            const totalPts = sorted.reduce((s, i) => s + (i.points || 0), 0);
            if (totalPts === 0) return '-';
            const idx = sorted.findIndex(l => l.name === user.wing || l.wingId === user.wingId);
            return idx !== -1 ? `#${idx + 1}` : '-';
          })()}</span>
        </div>
        <div class="stat-icon-wrapper amber">
          <i data-lucide="trophy"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Wing Points</span>
          <span class="stat-value">${(() => {
            const wingItem = leaderboard.find(l => l.name === user.wing || l.wingId === user.wingId);
            return wingItem ? wingItem.points : 0;
          })()}</span>
        </div>
        <div class="stat-icon-wrapper blue">
          <i data-lucide="award"></i>
        </div>
      </div>
    </div>

    <!-- Main Content Columns -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;" class="dash-columns">
      <!-- Left Column -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Upcoming Events Showcase -->
        <div class="card">
          <div class="flex-between mb-sm" style="margin-bottom: 1rem;">
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">Upcoming Events</h2>
              <p style="font-size: 0.8125rem; color: var(--color-text-secondary);">Season 2026-27 Schedule</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="view-all-events">View All (${events.length})</button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem;">
            ${events.slice(0, 3).map(evt => `
              <div class="card card-interactive event-preview-card" data-id="${evt.id}" style="padding: 1rem; border-left: 4px solid ${evt.category === 'Sports' ? 'var(--color-cta)' : 'var(--color-primary)'}; background: #FAF5FF;">
                <div class="flex-between mb-xs" style="margin-bottom: 0.5rem;">
                  <span class="badge ${evt.category === 'Sports' ? 'badge-green' : 'badge-violet'}">${evt.category}</span>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary);">${evt.startDate}</span>
                </div>
                <h3 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.25rem;">${evt.name}</h3>
                <p style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;"><i data-lucide="map-pin" style="width: 14px; height: 14px; display: inline;"></i> ${evt.venue}</p>
                <div class="flex-between" style="margin-top: auto; padding-top: 0.5rem; border-top: 1px solid rgba(0,0,0,0.05);">
                  <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500;">${evt.type === 'UMBRELLA' ? evt.subEvents.length + ' Sub-events' : 'Single Event'}</span>
                  <span style="font-size: 0.8125rem; font-weight: 700; color: var(--color-primary);">Details &rarr;</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recent Announcements -->
        <div class="card">
          <div class="flex-between mb-sm" style="margin-bottom: 1rem;">
            <h2 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">Announcements & Alerts</h2>
            <button class="btn btn-secondary btn-sm" id="view-announcements">View Board</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${(state.announcements || []).slice(0, 3).map(ann => `
              <div style="padding: 0.875rem 1rem; border-radius: var(--radius-sm); background: #F8FAFC; border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 4px;">
                <div class="flex-between">
                  <h4 style="font-family: var(--font-heading); font-size: 0.9375rem; font-weight: 700; color: var(--color-text);">${ann.title}</h4>
                  <span class="badge ${ann.scope === 'Global' ? 'badge-blue' : (ann.scope.includes('Wing') ? 'badge-green' : 'badge-violet')}">${ann.scope}</span>
                </div>
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">${ann.date}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Wing Standings Widget -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="card">
          <div class="flex-between mb-sm" style="margin-bottom: 1rem;">
            <h2 style="font-family: var(--font-heading); font-size: 1.125rem; font-weight: 700;">Wing Championship</h2>
            <button class="btn btn-outline btn-sm" id="view-leaderboard">Full Standings</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Rank</th>
                  <th>Wing</th>
                  <th style="text-align: right;">Points</th>
                </tr>
              </thead>
              <tbody>
                ${leaderboard.slice(0, 5).map((item, index) => `
                  <tr style="${item.name === user.wing ? 'background-color: var(--color-primary-lighter); font-weight: 700;' : ''}">
                    <td>
                      <span class="rank-badge ${index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : 'badge-slate'))}">
                        ${index + 1}
                      </span>
                    </td>
                    <td><strong style="color: var(--color-text);">${item.name}</strong></td>
                    <td style="text-align: right;" class="points-display">${item.points}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  const dashRegBtn = container.querySelector('#dash-register-btn');
  if (dashRegBtn) dashRegBtn.addEventListener('click', () => navigateTo('events'));

  const viewAllBtn = container.querySelector('#view-all-events');
  if (viewAllBtn) viewAllBtn.addEventListener('click', () => navigateTo('events'));

  const viewAnnBtn = container.querySelector('#view-announcements');
  if (viewAnnBtn) viewAnnBtn.addEventListener('click', () => navigateTo('announcements'));

  const viewLeadBtn = container.querySelector('#view-leaderboard');
  if (viewLeadBtn) viewLeadBtn.addEventListener('click', () => navigateTo('leaderboard'));

  container.querySelectorAll('.event-preview-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const evtId = e.currentTarget.dataset.id;
      navigateTo(`events/${evtId}`);
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
