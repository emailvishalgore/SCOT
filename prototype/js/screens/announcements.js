import { store } from '../store.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function render(container) {
  const state = store.getState();
  const currentUser = state.currentUser || {};
  const isAdminOrChamp = currentUser.role === 'admin' || currentUser.role === 'champion' || currentUser.isChampion;
  
  let currentFilter = 'all';

  const renderContent = () => {
    const announcements = store.getState().announcements || [];
    
    const filteredAnnouncements = announcements.filter(a => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'global') return a.scope === 'Global' || a.scopeType === 'global';
      if (currentFilter === 'wing') return a.scope.includes('Wing') || a.scopeType === 'wing';
      if (currentFilter === 'event') return a.scope.includes('Event') || a.scopeType === 'event';
      return true;
    });

    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-row">
          <div>
            <h1 class="page-title">Announcements Board</h1>
            <p class="page-subtitle">Official society updates, wing notices, and event schedules</p>
          </div>
          ${isAdminOrChamp ? `
            <button class="btn btn-primary" id="btn-new-announcement">
              <i data-lucide="plus-circle"></i> New Announcement
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="tabs mb-lg" id="announcement-tabs" style="margin-bottom: 1.5rem;">
        <button class="tab ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All Updates</button>
        <button class="tab ${currentFilter === 'global' ? 'active' : ''}" data-filter="global">Global Notices</button>
        <button class="tab ${currentFilter === 'wing' ? 'active' : ''}" data-filter="wing">Wing Updates</button>
        <button class="tab ${currentFilter === 'event' ? 'active' : ''}" data-filter="event">Event Alerts</button>
      </div>

      <!-- Announcements List -->
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${filteredAnnouncements.length > 0 ? filteredAnnouncements.map(ann => `
          <div class="card card-interactive announcement-card" style="border-left: 4px solid ${ann.scope === 'Global' ? 'var(--color-info)' : (ann.scope.includes('Wing') ? 'var(--color-cta)' : 'var(--color-primary)')};">
            <div class="flex-between mb-xs">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge ${ann.scope === 'Global' ? 'badge-blue' : (ann.scope.includes('Wing') ? 'badge-green' : 'badge-violet')}">
                  ${ann.scope}
                </span>
                ${ann.priority ? '<span class="badge badge-amber"><i data-lucide="alert-triangle" style="width: 12px; height: 12px;"></i> High Priority</span>' : ''}
              </div>
              <span style="font-size: 0.8125rem; color: var(--color-text-muted); font-weight: 500;">${ann.date}</span>
            </div>

            <h2 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.5rem;">${ann.title}</h2>
            <p style="font-size: 0.9375rem; color: var(--color-text-secondary); line-height: 1.5;">${ann.content}</p>
          </div>
        `).join('') : `
          <div class="card" style="text-align: center; padding: 3rem; color: var(--color-text-secondary);">
            <i data-lucide="megaphone" style="width: 48px; height: 48px; margin-bottom: 0.75rem; opacity: 0.4;"></i>
            <h3>No announcements found</h3>
            <p style="font-size: 0.875rem; color: var(--color-text-muted);">No notices match the selected category filter.</p>
          </div>
        `}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Filter tab clicks
    container.querySelectorAll('#announcement-tabs .tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        currentFilter = e.currentTarget.dataset.filter;
        renderContent();
      });
    });

    // New Announcement Modal click
    const btnNew = container.querySelector('#btn-new-announcement');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        openModal(`
          <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
            <h2 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800;">Post New Announcement</h2>
            
            <div class="form-group">
              <label class="form-label">Announcement Title</label>
              <input type="text" id="post-title" class="input" placeholder="e.g. Carrom Tournament Schedule" required />
            </div>

            <div class="form-group">
              <label class="form-label">Scope / Audience</label>
              <select id="post-scope" class="select">
                <option value="Global">Global (All Society Residents)</option>
                <option value="Wing N">Wing N Residents</option>
                <option value="Wing O">Wing O Residents</option>
                <option value="Wing P">Wing P Residents</option>
                <option value="Event: Carrom">Event: Carrom Tournament</option>
                <option value="Event: Ganesh Utsav">Event: Ganesh Utsav</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Message Content</label>
              <textarea id="post-content" class="textarea" rows="4" placeholder="Type the official announcement message here..." required></textarea>
            </div>

            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
              <button class="btn btn-secondary" id="cancel-post-btn">Cancel</button>
              <button class="btn btn-primary" id="submit-post-btn">Post Announcement</button>
            </div>
          </div>
        `);

        if (window.lucide) window.lucide.createIcons();

        document.getElementById('cancel-post-btn')?.addEventListener('click', closeModal);
        document.getElementById('submit-post-btn')?.addEventListener('click', () => {
          const title = document.getElementById('post-title')?.value.trim();
          const scope = document.getElementById('post-scope')?.value;
          const content = document.getElementById('post-content')?.value.trim();

          if (!title || !content) {
            showToast('Please enter both title and message content', 'error');
            return;
          }

          const newAnn = {
            id: `ann-${Date.now()}`,
            title,
            scope,
            content,
            date: new Date().toISOString().split('T')[0]
          };

          store.setState(s => ({
            announcements: [newAnn, ...(s.announcements || [])]
          }));

          closeModal();
          showToast('Announcement posted successfully!', 'success');
          renderContent();
        });
      });
    }
  };

  renderContent();
}
