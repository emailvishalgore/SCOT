// SCOT TOPAZ Core Team Portal - Members Page
import { supabase } from '../supabase-client.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;
  const isSystemAdmin = window.appAuth.session.role === 'SCOT_ADMIN';

  // Set page refresher
  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh members from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // Fetch members, assignments, profiles
    const { data: assignments, error } = await supabase
      .from('member_season_assignment')
      .select(`
        id,
        role,
        wing_id,
        member:core.member(
          id,
          resident:core.resident(name, phone)
        )
      `)
      .eq('season_id', activeSeason);

    if (error) throw error;

    // Fetch portfolios per assignment
    const { data: portfolios } = await supabase
      .from('member_portfolio_assignment')
      .select('member_assignment_id, portfolio(name)');

    // Fetch wings lookup
    const { data: wings } = await supabase.from('wing').select('id, name');
    
    // Group portfolios by assignment ID
    const portfolioMap = {};
    if (portfolios) {
      portfolios.forEach(item => {
        const key = item.member_assignment_id;
        if (!portfolioMap[key]) portfolioMap[key] = [];
        if (item.portfolio?.name) {
          portfolioMap[key].push(item.portfolio.name);
        }
      });
    }

    // Format final list
    const memberList = assignments.map(a => {
      const name = a.member?.resident?.name || 'Unknown Member';
      const phone = a.member?.resident?.phone || 'N/A';
      const wing = wings ? wings.find(w => w.id === a.wing_id)?.name : null;
      const memberPortfolios = portfolioMap[a.id] || [];
      
      return {
        id: a.id,
        name,
        phone,
        role: a.role,
        wing,
        portfolios: memberPortfolios
      };
    });

    renderList(memberList);
  }

  function renderList(members) {
    let activeFilter = 'ALL';
    
    function filterAndRender() {
      const query = document.getElementById('member-search')?.value?.toLowerCase() || '';
      const filtered = members.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(query) || m.phone.includes(query);
        const matchesRole = activeFilter === 'ALL' || m.role === activeFilter;
        return matchesSearch && matchesRole;
      });

      const listContainer = document.getElementById('members-list');
      if (listContainer) {
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No members found.</div>';
          return;
        }
        
        listContainer.innerHTML = filtered.map(m => `
          <div class="list-item-card">
            <div class="list-item-header">
              <div>
                <span class="list-item-title">${m.name}</span>
                <div class="list-item-subtitle">${m.phone}</div>
              </div>
              <span class="badge ${m.role === 'SCOT_ADMIN' ? 'badge-danger' : m.role === 'CORE_TEAM' ? 'badge-primary' : 'badge-success'}">${m.role}</span>
            </div>
            <div class="list-item-body" style="margin-top: 4px;">
              <span class="list-item-meta">
                ${m.wing ? `🏢 Wing ${m.wing}` : '🌐 Global Scope'}
              </span>
              <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">
                Portfolios: ${m.portfolios.length > 0 ? m.portfolios.join(', ') : 'None'}
              </span>
            </div>
          </div>
        `).join('');
      }
    }

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Society Organizers</h2>
        <p class="page-subtitle">SCOT Committee & Portfolio Assignments</p>
      </div>

      <!-- Search Box -->
      <div class="search-container">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="member-search" class="search-input" placeholder="Search members...">
      </div>

      <!-- Filter Chip Row -->
      <div class="filter-row">
        <button class="chip active" data-filter="ALL">All</button>
        <button class="chip" data-filter="SCOT_ADMIN">Admins</button>
        <button class="chip" data-filter="CORE_TEAM">Core Team</button>
        <button class="chip" data-filter="EVENT_CHAMPION">Champions</button>
        <button class="chip" data-filter="WING_COMMANDER">Commanders</button>
        <button class="chip" data-filter="WING_CAPTAIN">Captains</button>
      </div>

      <!-- Scrollable list of members -->
      <div id="members-list">
        <!-- Rendered items -->
      </div>
    `;

    // Hook search event
    document.getElementById('member-search').addEventListener('input', filterAndRender);
    
    // Hook filters
    const chips = container.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter');
        filterAndRender();
      });
    });

    filterAndRender();
  }

  await loadDataAndRender();
}
