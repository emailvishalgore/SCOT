import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container) {
  const state = store.getState();
  const user = state.currentUser || { wing: 'Wing N', wingId: 'wing-n' };
  const leaderboard = state.leaderboard || [];
  const topPerformers = state.topPerformers || [];

  // Sort wings alphabetically if points are 0, or by points descending
  const sortedStandings = [...leaderboard].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  const totalSeasonPoints = sortedStandings.reduce((sum, item) => sum + (item.points || 0), 0);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Wing Championship Leaderboard</h1>
          <p class="page-subtitle">Topaz Park Season 2026-27 Standings & Points</p>
        </div>

        <div class="tabs" id="leaderboard-tabs">
          <button class="tab active" id="tab-standings">Wing Standings</button>
          <button class="tab" id="tab-performers">Top Performers</button>
        </div>
      </div>
    </div>

    <!-- Wing Standings View -->
    <div id="content-standings">
      <div class="card mb-lg" style="margin-bottom: 1.5rem; padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 70px;">Rank</th>
                <th>Wing</th>
                <th style="text-align: center;">Wins</th>
                <th style="text-align: center;">Events Played</th>
                <th style="text-align: right;">Total Points</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStandings.map((row, index) => {
                const isUserWing = row.name === user.wing || row.wingId === user.wingId;
                const rankNum = totalSeasonPoints > 0 ? index + 1 : '-';
                return `
                  <tr style="${isUserWing ? 'background-color: var(--color-primary-lighter); font-weight: 700;' : ''}">
                    <td>
                      ${totalSeasonPoints > 0 && index < 3 ? `
                        <span class="rank-badge ${index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : 'rank-3')}">
                          ${index + 1}
                        </span>
                      ` : `
                        <span class="badge badge-slate" style="width: 28px; justify-content: center;">${rankNum}</span>
                      `}
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: var(--color-text); font-size: 1rem;">${row.name}</strong>
                        ${isUserWing ? '<span class="badge badge-violet">Your Wing</span>' : ''}
                      </div>
                    </td>
                    <td style="text-align: center; color: var(--color-text-secondary);">${row.wins || 0}</td>
                    <td style="text-align: center; color: var(--color-text-secondary);">${row.events || 0}</td>
                    <td style="text-align: right;" class="points-display">${row.points || 0} pts</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Points Chart Widget -->
      <div class="card">
        <h2 style="font-family: var(--font-heading); font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;">Points Breakdown by Wing</h2>
        ${totalSeasonPoints > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 0.875rem;">
            ${sortedStandings.slice(0, 5).map(row => `
              <div>
                <div class="flex-between" style="font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">
                  <span>${row.name}</span>
                  <span style="font-family: var(--font-mono); color: var(--color-primary);">${row.points} pts</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${Math.min(100, Math.max(5, (row.points / sortedStandings[0].points) * 100))}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
            <i data-lucide="trophy" style="width: 40px; height: 40px; margin-bottom: 0.5rem; opacity: 0.4;"></i>
            <p style="font-weight: 600;">Season 2026-27 has not started yet.</p>
            <p style="font-size: 0.8125rem; color: var(--color-text-muted);">Points will be automatically updated as competitions are completed and scores are entered by Champions.</p>
          </div>
        `}
      </div>
    </div>

    <!-- Top Performers View -->
    <div id="content-performers" class="hidden">
      <div class="card" style="padding: 0; overflow: hidden;">
        ${topPerformers.length > 0 ? `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 60px;">Rank</th>
                  <th>Resident Name</th>
                  <th>Wing</th>
                  <th style="text-align: center;">Events</th>
                  <th style="text-align: right;">Points Won</th>
                </tr>
              </thead>
              <tbody>
                ${topPerformers.map((row, index) => `
                  <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td><strong style="color: var(--color-text);">${row.name}</strong></td>
                    <td><span class="badge badge-violet">${row.wing}</span></td>
                    <td style="text-align: center;">${row.events}</td>
                    <td style="text-align: right;" class="points-display">${row.points} pts</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="text-align: center; padding: 3rem; color: var(--color-text-secondary);">
            <i data-lucide="award" style="width: 48px; height: 48px; margin-bottom: 0.75rem; opacity: 0.4;"></i>
            <h3 style="font-family: var(--font-heading); font-size: 1.125rem; font-weight: 700; color: var(--color-text);">No Individual Standings Yet</h3>
            <p style="font-size: 0.875rem; color: var(--color-text-muted); max-width: 420px; margin: 0.5rem auto 0;">Individual resident points will appear here once scores are recorded in the Carrom and Table Tennis tournaments.</p>
          </div>
        `}
      </div>
    </div>
  `;

  // Tab switching logic
  const tabStandings = container.querySelector('#tab-standings');
  const tabPerformers = container.querySelector('#tab-performers');
  const contentStandings = container.querySelector('#content-standings');
  const contentPerformers = container.querySelector('#content-performers');

  if (tabStandings && tabPerformers) {
    tabStandings.addEventListener('click', () => {
      tabStandings.classList.add('active');
      tabPerformers.classList.remove('active');
      contentStandings.classList.remove('hidden');
      contentPerformers.classList.add('hidden');
    });

    tabPerformers.addEventListener('click', () => {
      tabPerformers.classList.add('active');
      tabStandings.classList.remove('active');
      contentPerformers.classList.remove('hidden');
      contentStandings.classList.add('hidden');
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
