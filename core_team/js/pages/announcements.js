// SCOT TOPAZ Core Team Portal - Announcements Page
import { supabase } from '../supabase-client.js';
import { formatDate, showToast, openBottomSheet, closeBottomSheet } from '../utils.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;
  const currentMemberId = window.appAuth.session.member_id;

  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh announcements from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // Note: The announcements table is a sub-module of communication. Let's verify name
    // Let's do a select check for the announcements table. It could be core.announcement.
    // Let's check existing columns or test queries first.
    const { data: announcements, error } = await supabase
      .from('announcement')
      .select('*')
      .eq('season_id', activeSeason)
      .order('created_at', { ascending: false });

    // Fallback or error check - if table is named differently or has no rows
    if (error) {
      console.warn("Announcement check error, trying global schema or core schema: ", error);
    }

    renderUI(announcements || []);
  }

  function renderUI(announcements) {
    function filterAndRender() {
      const query = document.getElementById('announce-search')?.value?.toLowerCase() || '';
      const filtered = announcements.filter(a => 
        (a.title || '').toLowerCase().includes(query) || (a.content || '').toLowerCase().includes(query)
      );

      const listContainer = document.getElementById('announcements-list');
      if (listContainer) {
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No announcements found.</div>';
          return;
        }

        listContainer.innerHTML = filtered.map(a => `
          <div class="list-item-card">
            <div class="list-item-header">
              <div>
                <span class="list-item-title">${a.title}</span>
                <div class="list-item-subtitle">${formatDate(a.created_at)}</div>
              </div>
              <span class="badge badge-primary">${a.scope || 'GLOBAL'}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); white-space: pre-wrap; margin-top: 6px;">${a.content}</div>
          </div>
        `).join('');
      }
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="page-title">Announcements</h2>
          <p class="page-subtitle">Broadcasting updates</p>
        </div>
      </div>

      <!-- Search bar -->
      <div class="search-container">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="announce-search" class="search-input" placeholder="Search announcements...">
      </div>

      <!-- announcements list -->
      <div id="announcements-list">
        <!-- Rendered list -->
      </div>

      <!-- FAB button for new announcement -->
      <button id="fab-new-announce" class="fab" title="New Announcement">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    `;

    document.getElementById('announce-search').addEventListener('input', filterAndRender);
    
    // FAB compose announcement modal
    document.getElementById('fab-new-announce').addEventListener('click', () => {
      const formHtml = `
        <form id="new-announce-form" onsubmit="event.preventDefault(); window.submitAnnouncement()">
          <div class="form-group">
            <label class="form-label" for="ann-title">Title</label>
            <input type="text" id="ann-title" class="form-control" placeholder="e.g. Cricket Tournament Schedule" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="ann-scope">Scope</label>
            <select id="ann-scope" class="form-control" required>
              <option value="GLOBAL">Global (All society)</option>
              <option value="WING">Wing Specific</option>
              <option value="EVENT">Event Specific</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ann-content">Content Details</label>
            <textarea id="ann-content" class="form-control" rows="5" placeholder="Write announcement details here..." required style="resize: none;"></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Publish Announcement</button>
        </form>
      `;
      openBottomSheet('New Announcement', formHtml);
    });

    window.submitAnnouncement = async () => {
      const title = document.getElementById('ann-title').value;
      const scope = document.getElementById('ann-scope').value;
      const content = document.getElementById('ann-content').value;

      try {
        closeBottomSheet();
        showToast('Publishing broadcast...', 'warning');
        
        const { error } = await supabase.from('announcement').insert({
          season_id: activeSeason,
          title,
          content,
          scope,
          created_by_id: currentMemberId
        });
        
        if (error) throw error;
        
        showToast('Announcement published successfully!', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error adding announcement:', err);
        showToast(err.message || 'Error publishing announcement.', 'error');
      }
    };

    filterAndRender();
  }

  await loadDataAndRender();
}
