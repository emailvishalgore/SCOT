import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container) {
  const state = store.getState();
  const allEvents = state.events || [];

  let currentCategory = 'All';
  let searchQuery = '';

  const renderEvents = () => {
    const filtered = allEvents.filter(evt => {
      const matchesCat = currentCategory === 'All' || evt.category === currentCategory;
      const matchesSearch = evt.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            evt.venue.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });

    const grid = container.querySelector('#events-grid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--color-text-secondary);">
          <i data-lucide="search-x" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
          <h3>No events found</h3>
          <p>Try adjusting your search or category filter.</p>
        </div>
      `;
    } else {
      grid.innerHTML = filtered.map(evt => `
        <div class="event-card card-interactive" data-id="${evt.id}">
          <div class="event-card-header ${evt.category === 'Sports' ? 'sports' : ''}">
            <div class="flex-between mb-xs">
              <span class="badge ${evt.category === 'Sports' ? 'badge-green' : 'badge-violet'}">${evt.category}</span>
              <span class="badge badge-slate">${evt.type}</span>
            </div>
            <h3 class="event-card-title">${evt.name}</h3>
            <p style="font-size: 0.8125rem; opacity: 0.9;"><i data-lucide="calendar" style="width: 14px; height: 14px; display: inline;"></i> ${evt.startDate} ${evt.endDate !== evt.startDate ? 'to ' + evt.endDate : ''}</p>
          </div>

          <div class="event-card-body">
            <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${evt.description}
            </p>

            <div class="event-meta-item">
              <i data-lucide="map-pin" style="width: 16px; height: 16px; color: var(--color-primary);"></i>
              <span>${evt.venue} (${evt.time})</span>
            </div>

            <div class="event-meta-item">
              <i data-lucide="layers" style="width: 16px; height: 16px; color: var(--color-cta);"></i>
              <span>${evt.subEvents ? evt.subEvents.length + ' Sub-events / Categories' : 'Standalone Event'}</span>
            </div>

            <div class="flex-between" style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--color-border);">
              <span class="badge badge-primary">${evt.status}</span>
              <button class="btn btn-primary btn-sm">
                View & Register &rarr;
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    grid.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        navigateTo(`events/${id}`);
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Events Hub</h1>
          <p class="page-subtitle">Browse and self-register for Topaz Park 2026 sports & cultural competitions</p>
        </div>

        <div class="search-input-wrapper">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="events-search" class="input" placeholder="Search events or venues..." />
        </div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex-between mb-lg" style="margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div class="tabs" id="category-tabs">
        <button class="tab active" data-cat="All">All Events</button>
        <button class="tab" data-cat="Sports">Sports Competitions</button>
        <button class="tab" data-cat="Cultural">Cultural Festivals</button>
      </div>

      <span style="font-size: 0.875rem; color: var(--color-text-secondary); font-weight: 500;">
        Showing ${allEvents.length} active events
      </span>
    </div>

    <!-- Events Grid -->
    <div class="grid-3" id="events-grid"></div>
  `;

  // Search input handler
  const searchInput = container.querySelector('#events-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderEvents();
    });
  }

  // Filter tabs handler
  const categoryTabs = container.querySelectorAll('#category-tabs .tab');
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.cat;
      renderEvents();
    });
  });

  renderEvents();
}
