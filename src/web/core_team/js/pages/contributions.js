// SCOT TOPAZ Core Team Portal - Contributions Page
import { supabase } from '../supabase-client.js';
import { formatCurrency, formatDate, showToast, openBottomSheet, closeBottomSheet } from '../utils.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;
  const currentMemberId = window.appAuth.session.member_id;

  // Set page refresher
  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh contributions from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // 1. Fetch wings, flats, resident assignments, contributions
    const { data: wings } = await supabase.from('wing').select('id, name').order('name');
    const { data: flats } = await supabase.from('flat').select('id, number, wing_id');
    const { data: assignments } = await supabase
      .from('resident_flat_assignment')
      .select('flat_id, resident(name, phone)')
      .eq('season_id', activeSeason);
      
    const { data: contributions } = await supabase
      .from('flat_contribution')
      .select(`
        id,
        flat_id,
        amount,
        status,
        payment_date,
        recorded_by:core.member(
          id,
          resident:core.resident(name)
        )
      `)
      .eq('season_id', activeSeason);

    // Group info by flat_id
    const assignmentMap = {};
    if (assignments) {
      assignments.forEach(a => {
        assignmentMap[a.flat_id] = a.resident;
      });
    }

    const contributionMap = {};
    if (contributions) {
      contributions.forEach(c => {
        contributionMap[c.flat_id] = c;
      });
    }

    const wingMap = {};
    if (wings) {
      wings.forEach(w => {
        wingMap[w.id] = w.name;
      });
    }

    // Merge everything into a flat roster
    const roster = flats.map(f => {
      const resident = assignmentMap[f.id] || { name: 'Unassigned', phone: '' };
      const contribution = contributionMap[f.id];
      const wingName = wingMap[f.wing_id] || '';
      
      const hasContribution = !!contribution;
      const status = hasContribution ? contribution.status : 'PENDING';
      const amount = hasContribution && contribution.amount !== null && contribution.amount !== undefined 
        ? parseFloat(contribution.amount) 
        : 3000.00;
      
      return {
        flatId: f.id,
        flatNumber: f.number,
        wingId: f.wing_id,
        wingName,
        residentName: resident.name,
        residentPhone: resident.phone,
        status: status,
        amount: amount,
        paymentDate: hasContribution ? contribution.payment_date : null,
        recordedByName: hasContribution && contribution.recorded_by?.resident?.name || ''
      };
    });

    // Sort roster: Wing name ascending, Flat number ascending
    roster.sort((a, b) => {
      if (a.wingName !== b.wingName) {
        return a.wingName.localeCompare(b.wingName);
      }
      return parseInt(a.flatNumber) - parseInt(b.flatNumber);
    });

    renderUI(roster, wings);
  }

  function renderUI(roster, wings) {
    let activeWingFilter = 'ALL';
    let activeStatusFilter = 'ALL';
    
    function filterAndRender() {
      const query = document.getElementById('flat-search')?.value?.toLowerCase() || '';
      const filtered = roster.filter(f => {
        const matchesSearch = f.flatNumber.includes(query) || f.residentName.toLowerCase().includes(query);
        const matchesWing = activeWingFilter === 'ALL' || f.wingId === activeWingFilter;
        const matchesStatus = activeStatusFilter === 'ALL' || f.status === activeStatusFilter;
        return matchesSearch && matchesWing && matchesStatus;
      });

      // Calculate totals for filtered subset
      const totalCollected = filtered.filter(f => f.status === 'PAID').reduce((s, f) => s + f.amount, 0);
      const paidCount = filtered.filter(f => f.status === 'PAID').length;
      
      // Update Summary metrics
      const statsPanel = document.getElementById('contributions-stats');
      if (statsPanel) {
        statsPanel.innerHTML = `
          ${paidCount} Paid &middot; ${filtered.length - paidCount} Pending &middot; ${formatCurrency(totalCollected)}
        `;
      }

      const listContainer = document.getElementById('contributions-list');
      if (listContainer) {
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No flats matching criteria.</div>';
          return;
        }

        listContainer.innerHTML = filtered.map(f => `
          <div class="list-item-card" style="border-left: 4px solid ${f.status === 'PAID' ? 'var(--success)' : 'var(--warning)'};">
            <div class="list-item-header">
              <div>
                <span class="badge badge-primary">Wing ${f.wingName}</span>
                <span class="list-item-title" style="margin-left: 8px;">Flat ${f.flatNumber}</span>
                <div class="list-item-subtitle" style="margin-top: 2px;">${f.residentName}</div>
              </div>
              <span class="badge ${f.status === 'PAID' ? 'badge-success' : 'badge-warning'}">${f.status}</span>
            </div>
            
            ${f.status === 'PAID' ? `
              <div class="list-item-body" style="margin-top: 4px;">
                <span class="list-item-meta">
                  💰 ${formatCurrency(f.amount)}
                </span>
                <span style="font-size: 11px; color: var(--text-secondary);">
                  Paid ${formatDate(f.paymentDate)} ${f.recordedByName ? `&middot; By ${f.recordedByName}` : ''}
                </span>
              </div>
            ` : `
              <div class="list-item-body" style="margin-top: 4px; justify-content: flex-end;">
                <button class="btn btn-primary btn-sm tap-target" style="padding: 6px 12px; font-size: 12px; min-height: 36px; min-width: auto;" onclick="window.recordFlatPaymentModal('${f.flatId}', '${f.wingName}', '${f.flatNumber}', '${f.residentName}', ${f.amount})">
                  Record Payment
                </button>
              </div>
            `}
          </div>
        `).join('');
      }
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="page-title">Flat Contributions</h2>
          <p class="page-subtitle">Roster collection logs</p>
        </div>
        <button id="btn-export-csv" class="header-btn" title="Export CSV" style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px;">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
      </div>

      <!-- Quick Stats summary bar -->
      <div class="card" style="padding: 12px; text-align: center; font-weight: 700; color: var(--text-secondary); font-size: 13px; margin-bottom: 12px; background-color: var(--primary-light);">
        <span id="contributions-stats">- Paid &middot; - Pending &middot; ₹0</span>
      </div>

      <!-- Search bar -->
      <div class="search-container">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="flat-search" class="search-input" placeholder="Search flat or resident...">
      </div>

      <!-- Wing Filter Chip Row -->
      <div class="filter-row" style="margin-bottom: 8px;">
        <button class="chip active" data-wing-filter="ALL">All Wings</button>
        ${wings.map(w => `<button class="chip" data-wing-filter="${w.id}">Wing ${w.name}</button>`).join('')}
      </div>

      <!-- Status Filter Chip Row -->
      <div class="filter-row">
        <button class="chip active" data-status-filter="ALL">All Status</button>
        <button class="chip" data-status-filter="PAID">Paid Only</button>
        <button class="chip" data-status-filter="PENDING">Pending Only</button>
      </div>

      <!-- Flat list wrapper -->
      <div id="contributions-list">
        <!-- Rendered items -->
      </div>
    `;

    // Hook search event
    document.getElementById('flat-search').addEventListener('input', filterAndRender);
    
    // Hook wing filter chips
    const wingChips = container.querySelectorAll('[data-wing-filter]');
    wingChips.forEach(chip => {
      chip.addEventListener('click', () => {
        wingChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeWingFilter = chip.getAttribute('data-wing-filter');
        filterAndRender();
      });
    });

    // Hook status filter chips
    const statusChips = container.querySelectorAll('[data-status-filter]');
    statusChips.forEach(chip => {
      chip.addEventListener('click', () => {
        statusChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeStatusFilter = chip.getAttribute('data-status-filter');
        filterAndRender();
      });
    });

    // Hook Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const headers = ['Wing', 'Flat', 'Resident Name', 'Status', 'Amount (INR)', 'Payment Date', 'Recorded By'];
      const rows = roster.map(f => [
        f.wingName,
        f.flatNumber,
        f.residentName,
        f.status,
        f.amount,
        f.paymentDate ? f.paymentDate.split('T')[0] : '',
        f.recordedByName
      ]);
      exportToCSV(`Topaz_Contributions_Season_${activeSeason}.csv`, headers, rows);
      showToast('Collection report exported successfully', 'success');
    });

    // Render list
    filterAndRender();
  }

  // Define payment recorder function globally so it can be called from card button onClick
  window.recordFlatPaymentModal = (flatId, wingName, flatNumber, residentName, defaultAmount) => {
    const sheetHtml = `
      <form id="record-payment-form" onsubmit="event.preventDefault(); window.submitFlatPayment('${flatId}', ${defaultAmount})">
        <div style="margin-bottom: 16px;">
          <label class="form-label">Flat Description</label>
          <div style="font-weight: 600; font-size: 16px;">Wing ${wingName} - Flat ${flatNumber}</div>
          <div style="font-size: 13px; color: var(--text-secondary);">${residentName}</div>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="pay-amount">Contribution Amount (₹)</label>
          <input type="number" id="pay-amount" class="form-control" value="${defaultAmount}" min="1" step="any" required>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button type="button" class="btn btn-outline" style="flex: 1;" onclick="appUtils.closeBottomSheet()">Cancel</button>
          <button type="submit" class="btn btn-primary" style="flex: 1;">Save Payment</button>
        </div>
      </form>
    `;
    openBottomSheet('Record Contribution', sheetHtml);
  };

  window.submitFlatPayment = async (flatId, defaultAmount) => {
    const inputAmount = document.getElementById('pay-amount');
    const amountVal = inputAmount ? parseFloat(inputAmount.value) : defaultAmount;
    
    try {
      closeBottomSheet();
      showToast('Recording payment...', 'warning');
      
      const { data, error } = await supabase.rpc('record_payment', {
        target_flat_id: flatId,
        active_season_id: activeSeason,
        payment_amount: amountVal,
        recorder_member_id: currentMemberId
      });
      
      if (error) throw error;
      
      showToast('Payment recorded successfully!', 'success');
      await loadDataAndRender();
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast(err.message || 'Error processing payment.', 'error');
    }
  };

  await loadDataAndRender();
}
