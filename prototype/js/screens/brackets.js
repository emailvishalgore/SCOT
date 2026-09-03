import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container, params) {
  const user = store.user || { role: 'admin' };
  
  if (user.role !== 'admin' && user.role !== 'champion') {
    container.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 1rem;">
      <i data-lucide="lock" style="color: #7C3AED; width: 64px; height: 64px; margin-bottom: 1rem;"></i>
      <h2 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0;">Access Denied</h2>
      <button id="btn-back" style="background: #7C3AED; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 1.5rem;">Return</button>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
    container.querySelector('#btn-back').addEventListener('click', () => navigateTo('admin'));
    return;
  }

  let currentComp = 'carrom';
  let currentTab = 'knockout';

  const renderContent = () => {
    if (currentComp === 'carrom') {
      return renderKnockout();
    } else {
      return renderRoundRobin();
    }
  };

  const renderKnockout = () => {
    return `
      <div style="overflow-x: auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB; min-width: max-content; margin-top: 1.5rem;">
        <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
          <!-- Lines QF to SF -->
          <path d="M 200 50 L 250 50 L 250 100 L 300 100" fill="none" stroke="#A78BFA" stroke-width="2" />
          <path d="M 200 150 L 250 150 L 250 100" fill="none" stroke="#A78BFA" stroke-width="2" />
          <path d="M 200 250 L 250 250 L 250 300 L 300 300" fill="none" stroke="#A78BFA" stroke-width="2" />
          <path d="M 200 350 L 250 350 L 250 300" fill="none" stroke="#A78BFA" stroke-width="2" />
          
          <!-- Lines SF to Final -->
          <path d="M 460 100 L 510 100 L 510 200 L 560 200" fill="none" stroke="#E5E7EB" stroke-width="2" />
          <path d="M 460 300 L 510 300 L 510 200" fill="none" stroke="#E5E7EB" stroke-width="2" />

          <!-- QF Matches -->
          ${drawMatch(40, 25, 'Wing N', 3, 'Wing S', 1, true, 'QF1', true)}
          ${drawMatch(40, 125, 'Wing P', 2, 'Wing V', 0, true, 'QF2', true)}
          ${drawMatch(40, 225, 'Wing O', 3, 'Wing Q', 2, true, 'QF3', true)}
          ${drawMatch(40, 325, 'Wing R', 1, 'Wing T', 3, false, 'QF4', true)}

          <!-- SF Matches -->
          ${drawMatch(300, 75, 'Wing N', '', 'Wing P', '', false, 'SF1', false)}
          ${drawMatch(300, 275, 'Wing O', '', 'Wing T', '', false, 'SF2', false)}

          <!-- Final -->
          ${drawMatch(560, 175, 'TBD', '', 'TBD', '', false, 'Final', false)}
        </svg>
      </div>
    `;
  };

  const drawMatch = (x, y, t1, s1, t2, s2, t1Wins, title, isFinished) => {
    const c1 = isFinished ? (t1Wins ? '#166534' : '#6B7280') : '#4C1D95';
    const c2 = isFinished ? (!t1Wins ? '#166534' : '#6B7280') : '#4C1D95';
    const bg1 = isFinished && t1Wins ? '#DCFCE7' : '#FFFFFF';
    const bg2 = isFinished && !t1Wins ? '#DCFCE7' : '#FFFFFF';
    const fw1 = isFinished && t1Wins ? 'bold' : 'normal';
    const fw2 = isFinished && !t1Wins ? 'bold' : 'normal';

    return `
      <g class="match-box" data-match="${title}" transform="translate(${x}, ${y})" style="cursor: pointer;">
        <rect x="0" y="-20" width="160" height="20" fill="transparent" />
        <text x="5" y="-5" font-family="'Fira Sans', sans-serif" font-size="11" fill="#6B7280" font-weight="bold">${title}</text>
        
        <rect x="0" y="0" width="160" height="28" fill="${bg1}" stroke="#E5E7EB" rx="4" />
        <text x="10" y="19" font-family="'Fira Sans', sans-serif" font-size="13" fill="${c1}" font-weight="${fw1}">${t1}</text>
        <text x="140" y="19" font-family="'Fira Sans', sans-serif" font-size="13" fill="${c1}" font-weight="bold">${s1}</text>
        
        <rect x="0" y="28" width="160" height="28" fill="${bg2}" stroke="#E5E7EB" rx="4" />
        <text x="10" y="47" font-family="'Fira Sans', sans-serif" font-size="13" fill="${c2}" font-weight="${fw2}">${t2}</text>
        <text x="140" y="47" font-family="'Fira Sans', sans-serif" font-size="13" fill="${c2}" font-weight="bold">${s2}</text>
      </g>
    `;
  };

  const renderRoundRobin = () => {
    return `
      <div style="margin-top: 1.5rem;">
        <h3 style="font-family: 'Fira Code', monospace; color: #7C3AED; margin: 0 0 1rem 0;">Standings</h3>
        <table style="width: 100%; text-align: left; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; margin-bottom: 2rem;">
          <thead style="background: #FAF5FF; color: #7C3AED;">
            <tr>
              <th style="padding: 1rem;">Rank</th>
              <th style="padding: 1rem;">Team</th>
              <th style="padding: 1rem;">P</th>
              <th style="padding: 1rem;">W</th>
              <th style="padding: 1rem;">D</th>
              <th style="padding: 1rem;">L</th>
              <th style="padding: 1rem; font-weight: bold;">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 1rem;">1</td><td style="padding: 1rem; font-weight: bold; color: #1F2937;">Wing N</td><td style="padding: 1rem;">2</td><td style="padding: 1rem;">2</td><td style="padding: 1rem;">0</td><td style="padding: 1rem;">0</td><td style="padding: 1rem; font-weight: bold; color: #7C3AED;">6</td></tr>
            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 1rem;">2</td><td style="padding: 1rem; font-weight: bold; color: #1F2937;">Wing O</td><td style="padding: 1rem;">2</td><td style="padding: 1rem;">1</td><td style="padding: 1rem;">1</td><td style="padding: 1rem;">0</td><td style="padding: 1rem; font-weight: bold; color: #7C3AED;">4</td></tr>
            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 1rem;">3</td><td style="padding: 1rem; font-weight: bold; color: #1F2937;">Wing P</td><td style="padding: 1rem;">2</td><td style="padding: 1rem;">1</td><td style="padding: 1rem;">0</td><td style="padding: 1rem;">1</td><td style="padding: 1rem; font-weight: bold; color: #7C3AED;">3</td></tr>
            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 1rem;">4</td><td style="padding: 1rem; font-weight: bold; color: #1F2937;">Wing Q</td><td style="padding: 1rem;">2</td><td style="padding: 1rem;">0</td><td style="padding: 1rem;">1</td><td style="padding: 1rem;">1</td><td style="padding: 1rem; font-weight: bold; color: #7C3AED;">1</td></tr>
          </tbody>
        </table>

        <h3 style="font-family: 'Fira Code', monospace; color: #7C3AED; margin: 0 0 1rem 0;">Results Matrix</h3>
        <div style="overflow-x: auto; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
          <table style="border-collapse: collapse; text-align: center; width: 100%;">
            <thead>
              <tr style="background: #F9FAFB; color: #6B7280;">
                <th style="padding: 1rem; border: 1px solid white;">vs</th>
                <th style="padding: 1rem; border: 1px solid white;">N</th>
                <th style="padding: 1rem; border: 1px solid white;">O</th>
                <th style="padding: 1rem; border: 1px solid white;">P</th>
                <th style="padding: 1rem; border: 1px solid white;">Q</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 1rem; font-weight: bold; background: #F9FAFB;">Wing N</td>
                <td style="padding: 1rem; background: #9CA3AF; color: white; border: 1px solid white;">-</td>
                <td class="match-cell" style="padding: 1rem; border: 1px solid #E5E7EB; background: #DCFCE7; color: #166534; font-weight: bold; cursor: pointer;">2-0</td>
                <td class="match-cell" style="padding: 1rem; border: 1px solid #E5E7EB; background: #DCFCE7; color: #166534; font-weight: bold; cursor: pointer;">3-1</td>
                <td class="match-cell" style="padding: 1rem; border: 1px solid #E5E7EB; color: #6B7280; cursor: pointer;">Pending</td>
              </tr>
              <tr>
                <td style="padding: 1rem; font-weight: bold; background: #F9FAFB;">Wing O</td>
                <td class="match-cell" style="padding: 1rem; border: 1px solid #E5E7EB; background: #FEE2E2; color: #991B1B; font-weight: bold; cursor: pointer;">0-2</td>
                <td style="padding: 1rem; background: #9CA3AF; color: white; border: 1px solid white;">-</td>
                <td class="match-cell" style="padding: 1rem; border: 1px solid #E5E7EB; color: #6B7280; cursor: pointer;">Pending</td>
                <td class="match-cell" style="padding: 1rem; border: 1px solid #E5E7EB; background: #FEF3C7; color: #92400E; font-weight: bold; cursor: pointer;">1-1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const renderDOM = () => {
    container.innerHTML = `
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <h1 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0;">Brackets & Scores</h1>
          <p style="color: #6B7280; margin: 0.25rem 0 0 0;">Tournament Management</p>
        </div>
        <select id="comp-selector" style="padding: 0.75rem 1rem; border: 1px solid #E5E7EB; border-radius: 4px; font-family: inherit; font-size: 1rem; background: white; color: #1F2937; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <option value="carrom" ${currentComp === 'carrom' ? 'selected' : ''}>Carrom Singles Above 16</option>
          <option value="tt" ${currentComp === 'tt' ? 'selected' : ''}>Table Tennis Above 16</option>
        </select>
      </header>

      <div style="display: flex; gap: 1.5rem; border-bottom: 1px solid #E5E7EB; margin-bottom: 1.5rem;">
        <button class="tab-btn" data-tab="knockout" style="padding: 0.75rem 0; font-weight: bold; cursor: pointer; background: transparent; border: none; border-bottom: 2px solid ${currentComp === 'carrom' ? '#7C3AED' : 'transparent'}; color: ${currentComp === 'carrom' ? '#7C3AED' : '#6B7280'};">Knockout Bracket</button>
        <button class="tab-btn" data-tab="roundrobin" style="padding: 0.75rem 0; font-weight: bold; cursor: pointer; background: transparent; border: none; border-bottom: 2px solid ${currentComp === 'tt' ? '#7C3AED' : 'transparent'}; color: ${currentComp === 'tt' ? '#7C3AED' : '#6B7280'};">Round Robin</button>
      </div>

      <div id="bracket-content">
        ${renderContent()}
      </div>

      <!-- Score Modal -->
      <div id="score-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease;">
        <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 100%; max-width: 450px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 1rem;">
            <h2 style="font-family: 'Fira Code', monospace; color: #7C3AED; margin: 0;">Record Score</h2>
            <button id="btn-close-score" style="background: transparent; border: none; color: #6B7280; cursor: pointer; padding: 0.25rem;"><i data-lucide="x"></i></button>
          </div>
          
          <h3 id="match-title" style="text-align: center; color: #1F2937; margin-bottom: 1.5rem;">Match SF1</h3>
          
          <form id="score-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 1.5rem; justify-content: space-between;">
              <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
                <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937; text-align: center;">Wing N</label>
                <input type="number" min="0" required style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 1.25rem; text-align: center;" />
              </div>
              <div style="color: #6B7280; font-weight: bold;">VS</div>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
                <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937; text-align: center;">Wing P</label>
                <input type="number" min="0" required style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 1.25rem; text-align: center;" />
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
              <input type="checkbox" id="walkover" style="cursor: pointer;" />
              <label for="walkover" style="font-size: 0.9rem; color: #4B5563; cursor: pointer;">Walkover / Forfeit</label>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem; padding-top: 1.5rem; border-top: 1px solid #E5E7EB;">
              <button type="button" id="btn-cancel-score" style="background: transparent; color: #4B5563; border: 1px solid #D1D5DB; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Cancel</button>
              <button type="submit" style="background: #22C55E; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Save Result</button>
            </div>
          </form>
        </div>
      </div>

      <div id="toast" style="position: fixed; bottom: 2rem; right: 2rem; background: #22C55E; color: white; padding: 1rem 1.5rem; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.75rem; transform: translateY(150%); transition: transform 0.3s ease; z-index: 2000;">
        <i data-lucide="check-circle" style="width: 20px; height: 20px;"></i> Score updated successfully!
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    attachListeners();
  };

  const attachListeners = () => {
    const compSelector = container.querySelector('#comp-selector');
    compSelector.addEventListener('change', (e) => {
      currentComp = e.target.value;
      renderDOM();
    });

    const scoreModal = container.querySelector('#score-modal');
    const toast = container.querySelector('#toast');

    const openScoreModal = (matchName) => {
      container.querySelector('#match-title').textContent = `Match: ${matchName}`;
      scoreModal.style.display = 'flex';
      void scoreModal.offsetWidth;
      scoreModal.style.opacity = '1';
    };

    const closeScoreModal = () => {
      scoreModal.style.opacity = '0';
      setTimeout(() => {
        scoreModal.style.display = 'none';
        container.querySelector('#score-form').reset();
      }, 200);
    };

    container.querySelectorAll('.match-box, .match-cell').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.opacity = '0.8';
      });
      el.addEventListener('mouseleave', () => {
        el.style.opacity = '1';
      });
      el.addEventListener('click', (e) => {
        const title = e.currentTarget.dataset.match || 'Round Robin Match';
        openScoreModal(title);
      });
    });

    container.querySelector('#btn-close-score').addEventListener('click', closeScoreModal);
    container.querySelector('#btn-cancel-score').addEventListener('click', closeScoreModal);

    container.querySelector('#score-form').addEventListener('submit', (e) => {
      e.preventDefault();
      closeScoreModal();
      toast.style.transform = 'translateY(0)';
      setTimeout(() => {
        toast.style.transform = 'translateY(150%)';
      }, 3000);
    });
  };

  renderDOM();
}
