// SCOT TOPAZ Core Team Portal - Sponsors Page
import { supabase } from '../supabase-client.js';
import { formatCurrency, showToast, openBottomSheet, closeBottomSheet } from '../utils.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;

  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh sponsors from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    const { data: sponsors, error } = await supabase
      .from('sponsor')
      .select('*')
      .eq('season_id', activeSeason);

    if (error) throw error;

    const totalCommitted = sponsors ? sponsors.reduce((s, sp) => s + (parseFloat(sp.amount_committed) || 0), 0) : 0;
    const totalCollected = sponsors ? sponsors.reduce((s, sp) => s + (parseFloat(sp.amount_collected) || 0), 0) : 0;

    renderUI(sponsors || [], totalCommitted, totalCollected);
  }

  function renderUI(sponsors, totalCommitted, totalCollected) {
    function filterAndRender() {
      const query = document.getElementById('sponsor-search')?.value?.toLowerCase() || '';
      const filtered = sponsors.filter(s => 
        s.company_name.toLowerCase().includes(query) || s.contact_person.toLowerCase().includes(query)
      );

      const listContainer = document.getElementById('sponsors-list');
      if (listContainer) {
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No sponsors found.</div>';
          return;
        }

        listContainer.innerHTML = filtered.map(s => {
          let statusBadge = 'badge-warning';
          if (s.status === 'FULLY_PAID') statusBadge = 'badge-success';
          if (s.status === 'PARTIALLY_PAID') statusBadge = 'badge-primary';

          const pct = s.amount_committed > 0 ? Math.round((s.amount_collected / s.amount_committed) * 100) : 0;

          return `
            <div class="list-item-card" onclick="window.viewSponsorOptions('${s.id}')">
              <div class="list-item-header">
                <div>
                  <span class="list-item-title">${s.company_name}</span>
                  <div class="list-item-subtitle">Contact: ${s.contact_person} &middot; ${s.phone}</div>
                </div>
                <span class="badge ${statusBadge}">${s.status}</span>
              </div>
              
              <div style="margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                  <span>Collected: ${formatCurrency(s.amount_collected)}</span>
                  <span>Committed: ${formatCurrency(s.amount_committed)}</span>
                </div>
                <div class="progress-list-track" style="height: 8px;">
                  <div class="progress-list-bar" style="width: ${pct}%;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="page-title">Sponsors</h2>
          <p class="page-subtitle">Committed brand partnerships</p>
        </div>
        <button id="btn-add-sponsor" class="btn btn-primary" style="padding: 8px 12px; font-size: 13px; min-height: 38px;">+ Add Sponsor</button>
      </div>

      <!-- sponsor statistics bar -->
      <div class="card" style="padding: 12px; text-align: center; font-weight: 700; color: var(--text-secondary); font-size: 13px; margin-bottom: 12px; background-color: var(--success-light);">
        Collected: ${formatCurrency(totalCollected)} &middot; Target: ${formatCurrency(totalCommitted)} (${totalCommitted > 0 ? Math.round((totalCollected / totalCommitted) * 100) : 0}%)
      </div>

      <!-- Search bar -->
      <div class="search-container">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="sponsor-search" class="search-input" placeholder="Search company or contact name...">
      </div>

      <!-- sponsors list -->
      <div id="sponsors-list">
        <!-- Rendered list -->
      </div>
    `;

    document.getElementById('sponsor-search').addEventListener('input', filterAndRender);
    
    // Add Sponsor handler
    document.getElementById('btn-add-sponsor').addEventListener('click', () => {
      const formHtml = `
        <form id="add-sponsor-form" onsubmit="event.preventDefault(); window.submitNewSponsor()">
          <div class="form-group">
            <label class="form-label" for="sp-company">Company Name</label>
            <input type="text" id="sp-company" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="sp-contact">Contact Person</label>
            <input type="text" id="sp-contact" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="sp-phone">Phone Number</label>
            <input type="text" id="sp-phone" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="sp-committed">Amount Committed (₹)</label>
            <input type="number" id="sp-committed" class="form-control" min="0" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Save Sponsor</button>
        </form>
      `;
      openBottomSheet('Add New Sponsor', formHtml);
    });

    window.submitNewSponsor = async () => {
      const company = document.getElementById('sp-company').value;
      const contact = document.getElementById('sp-contact').value;
      const phone = document.getElementById('sp-phone').value;
      const committed = parseFloat(document.getElementById('sp-committed').value);

      try {
        closeBottomSheet();
        showToast('Saving sponsor details...', 'warning');
        
        const { error } = await supabase.from('sponsor').insert({
          season_id: activeSeason,
          company_name: company,
          contact_person: contact,
          phone,
          amount_committed: committed,
          amount_collected: 0,
          status: 'COMMITTED'
        });
        
        if (error) throw error;
        
        showToast('Sponsor created successfully!', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error adding sponsor:', err);
        showToast(err.message || 'Error saving sponsor.', 'error');
      }
    };

    window.viewSponsorOptions = (sponsorId) => {
      const sp = sponsors.find(s => s.id === sponsorId);
      if (!sp) return;

      const detailHtml = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <h4 style="margin-bottom: 12px;">${sp.company_name} Options</h4>
          
          <form id="record-sponsor-collection" onsubmit="event.preventDefault(); window.submitSponsorCollection('${sp.id}', ${sp.amount_committed})">
            <div class="form-group">
              <label class="form-label" for="sp-col-amount">Add Collected Amount (₹)</label>
              <input type="number" id="sp-col-amount" class="form-control" max="${sp.amount_committed - sp.amount_collected}" placeholder="e.g. 5000" required>
              <small class="helper-text">Currently collected: ${formatCurrency(sp.amount_collected)} of ${formatCurrency(sp.amount_committed)}</small>
            </div>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 12px;">Record Collection</button>
          </form>
        </div>
      `;
      openBottomSheet('Update Sponsor', detailHtml);
    };

    window.submitSponsorCollection = async (sponsorId, amountCommitted) => {
      const inputAmount = document.getElementById('sp-col-amount');
      const addAmount = inputAmount ? parseFloat(inputAmount.value) : 0;
      
      const sp = sponsors.find(s => s.id === sponsorId);
      if (!sp) return;

      const newCollected = (parseFloat(sp.amount_collected) || 0) + addAmount;
      let newStatus = 'COMMITTED';
      if (newCollected >= amountCommitted) {
        newStatus = 'FULLY_PAID';
      } else if (newCollected > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      try {
        closeBottomSheet();
        showToast('Recording sponsorship collection...', 'warning');
        
        const { error } = await supabase
          .from('sponsor')
          .update({
            amount_collected: newCollected,
            status: newStatus
          })
          .eq('id', sponsorId);
          
        if (error) throw error;
        
        showToast('Sponsorship collection recorded successfully!', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error recording sponsorship:', err);
        showToast(err.message || 'Error updating sponsor details.', 'error');
      }
    };

    filterAndRender();
  }

  await loadDataAndRender();
}
