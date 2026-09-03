// SCOT TOPAZ Core Team Portal - Dashboard Page
import { supabase } from '../supabase-client.js';
import { formatCurrency } from '../utils.js';

export async function render(container) {
  // Set dynamic re-renderer for realtime updates
  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh dashboard from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // 1. Fetch dashboard statistics
    const activeSeason = window.appAuth.session.season_id;
    
    // Total collected and paid ratio
    const { data: contributions } = await supabase
      .from('flat_contribution')
      .select('amount, status, flat_id')
      .eq('season_id', activeSeason);
      
    // Count pending expenses
    const { count: pendingExpenses } = await supabase
      .from('expense')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', activeSeason)
      .eq('status', 'PENDING_APPROVAL');

    // Count active events
    const { count: activeEvents } = await supabase
      .from('event')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', activeSeason)
      .eq('status', 'ACTIVE');
      
    // Calculate stats
    const totalCollected = contributions
      ? contributions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
      : 0;
      
    const totalPaidFlats = contributions ? contributions.filter(c => c.status === 'PAID').length : 0;
    const totalFlats = 280; // Fixed society flats count
    const paidPct = totalFlats > 0 ? Math.round((totalPaidFlats / totalFlats) * 100) : 0;
    
    // Fetch wing data
    const { data: wings } = await supabase
      .from('wing')
      .select('id, name')
      .order('name');
      
    // Fetch flat list to map flat to wing
    const { data: flats } = await supabase
      .from('flat')
      .select('id, wing_id');

    // Compute collections by wing
    const wingStats = wings.map(w => {
      const flatIdsInWing = flats ? flats.filter(f => f.wing_id === w.id).map(f => f.id) : [];
      const wingContributions = contributions
        ? contributions.filter(c => flatIdsInWing.includes(c.flat_id))
        : [];
      
      const paidCount = wingContributions.filter(c => c.status === 'PAID').length;
      const collected = wingContributions.filter(c => c.status === 'PAID').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const pct = Math.round((paidCount / 28) * 100); // 28 flats per wing
      
      return {
        name: w.name,
        collected,
        paidCount,
        pct
      };
    });

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Dashboard</h2>
        <p class="page-subtitle">Season Overview & Metrics</p>
      </div>
      
      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-title" style="color: var(--primary);">Collection</span>
          <span class="kpi-value">${formatCurrency(totalCollected)}</span>
          <span class="kpi-subtitle">${paidPct}% of total goal</span>
        </div>
        
        <div class="kpi-card">
          <span class="kpi-title" style="color: var(--success);">Paid Flats</span>
          <span class="kpi-value">${totalPaidFlats} / ${totalFlats}</span>
          <span class="kpi-subtitle">${totalFlats - totalPaidFlats} flats pending</span>
        </div>
        
        <div class="kpi-card" onclick="appRouter.navigate('#/expenses')" style="cursor: pointer;">
          <span class="kpi-title" style="color: var(--danger);">Pending Expenses</span>
          <span class="kpi-value">${pendingExpenses || 0}</span>
          <span class="kpi-subtitle">Needs review</span>
        </div>
        
        <div class="kpi-card">
          <span class="kpi-title" style="color: var(--secondary);">Active Events</span>
          <span class="kpi-value">${activeEvents || 0}</span>
          <span class="kpi-subtitle">Ongoing competitions</span>
        </div>
      </div>
      
      <!-- Collection Progress by Wing -->
      <div class="card">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Collection by Wing</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${wingStats.map(w => `
            <div class="progress-list-item">
              <div class="progress-list-label">Wing ${w.name}</div>
              <div class="progress-list-track">
                <div class="progress-list-bar" style="width: ${w.pct}%"></div>
              </div>
              <div class="progress-list-pct">${w.pct}%</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Quick Action Buttons -->
      <div class="card" style="margin-bottom: 0;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">Quick Actions</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button class="btn btn-primary btn-block" onclick="appRouter.navigate('#/contributions')">
            Record Flat Contribution
          </button>
          <button class="btn btn-outline btn-block" onclick="appRouter.navigate('#/reports')">
            Generate Collection Report
          </button>
        </div>
      </div>
    `;
  }

  await loadDataAndRender();
}
