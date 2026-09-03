// SCOT TOPAZ Core Team Portal - Vendors Page
import { supabase } from '../supabase-client.js';
import { formatCurrency, showToast, openBottomSheet, closeBottomSheet } from '../utils.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;

  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh vendors from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // 1. Fetch persistent vendor repository
    const { data: vendors, error: vErr } = await supabase.from('vendor').select('*');
    if (vErr) throw vErr;
    
    // 2. Fetch quotations for active season
    const { data: quotes, error: qErr } = await supabase
      .from('vendor_quotation')
      .select('id, vendor_id, amount, quotation_file_url, status, event(name)')
      .eq('season_id', activeSeason);
      
    if (qErr) throw qErr;
    
    // Group quotations by vendor_id
    const quoteMap = {};
    if (quotes) {
      quotes.forEach(q => {
        if (!quoteMap[q.vendor_id]) quoteMap[q.vendor_id] = [];
        quoteMap[q.vendor_id].push(q);
      });
    }
    
    const vendorList = vendors.map(v => ({
      ...v,
      quotes: quoteMap[v.id] || []
    }));

    renderUI(vendorList);
  }

  function renderUI(vendors) {
    function filterAndRender() {
      const query = document.getElementById('vendor-search')?.value?.toLowerCase() || '';
      const filtered = vendors.filter(v => 
        v.name.toLowerCase().includes(query) || v.service_category.toLowerCase().includes(query)
      );

      const listContainer = document.getElementById('vendors-list');
      if (listContainer) {
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No vendors found.</div>';
          return;
        }

        listContainer.innerHTML = filtered.map(v => `
          <div class="list-item-card">
            <div class="list-item-header">
              <div>
                <span class="list-item-title">${v.name}</span>
                <div class="list-item-subtitle">${v.phone} &middot; Rating: ⭐${v.rating || 'N/A'}</div>
              </div>
              <span class="badge badge-primary">${v.service_category}</span>
            </div>
            
            <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;">
              Active Season Quotations (${v.quotes.length}):
            </div>
            
            ${v.quotes.length === 0 ? `
              <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">No bids submitted for this season.</div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
                ${v.quotes.map(q => {
                  let badge = 'badge-warning';
                  if (q.status === 'APPROVED') badge = 'badge-success';
                  if (q.status === 'REJECTED') badge = 'badge-danger';
                  
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; background-color: var(--background); padding: 8px 10px; border-radius: var(--radius-sm);">
                      <div>
                        <div style="font-size: 12px; font-weight: 600;">${q.event?.name || 'General Event'}</div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--primary); margin-top: 2px;">${formatCurrency(q.amount)}</div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge ${badge}" style="font-size: 10px; padding: 2px 6px;">${q.status}</span>
                        <button class="header-btn" style="padding: 4px;" onclick="window.viewQuoteOptions('${q.id}', '${q.status}')">⋮</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        `).join('');
      }
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="page-title">Vendor Directory</h2>
          <p class="page-subtitle">Quotation bids & repository</p>
        </div>
        <button id="btn-add-vendor" class="btn btn-primary" style="padding: 8px 12px; font-size: 13px; min-height: 38px;">+ Add Vendor</button>
      </div>

      <!-- Search bar -->
      <div class="search-container">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="vendor-search" class="search-input" placeholder="Search vendor name or category...">
      </div>

      <!-- Vendor cards -->
      <div id="vendors-list">
        <!-- Rendered list -->
      </div>
    `;

    document.getElementById('vendor-search').addEventListener('input', filterAndRender);
    
    // Add Vendor handler
    document.getElementById('btn-add-vendor').addEventListener('click', () => {
      const formHtml = `
        <form id="add-vendor-form" onsubmit="event.preventDefault(); window.submitNewVendor()">
          <div class="form-group">
            <label class="form-label" for="vendor-name">Company Name</label>
            <input type="text" id="vendor-name" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="vendor-contact">Contact Person</label>
            <input type="text" id="vendor-contact" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="vendor-phone">Phone Number</label>
            <input type="text" id="vendor-phone" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="vendor-cat">Service Category</label>
            <select id="vendor-cat" class="form-control" required>
              <option value="VENDOR">Vendor/Event Management</option>
              <option value="LOGISTICS">Logistics/Tents/Seating</option>
              <option value="PRIZES">Trophies & Prizes</option>
              <option value="CATERING">Catering & Food</option>
              <option value="MISCELLANEOUS">Miscellaneous</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="vendor-rating">Rating (1-5)</label>
            <input type="number" id="vendor-rating" class="form-control" min="1" max="5" step="0.1" value="4.0" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Save Vendor</button>
        </form>
      `;
      openBottomSheet('Add New Vendor', formHtml);
    });

    window.submitNewVendor = async () => {
      const name = document.getElementById('vendor-name').value;
      const contact = document.getElementById('vendor-contact').value;
      const phone = document.getElementById('vendor-phone').value;
      const category = document.getElementById('vendor-cat').value;
      const rating = parseFloat(document.getElementById('vendor-rating').value);

      try {
        closeBottomSheet();
        showToast('Saving vendor...', 'warning');
        
        const { error } = await supabase.from('vendor').insert({
          name,
          contact_person: contact,
          phone,
          service_category: category,
          rating
        });
        
        if (error) throw error;
        
        showToast('Vendor added successfully!', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error adding vendor:', err);
        showToast(err.message || 'Error saving vendor.', 'error');
      }
    };

    window.viewQuoteOptions = (quoteId, status) => {
      const isApproved = status === 'APPROVED';
      const isRejected = status === 'REJECTED';

      const detailHtml = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <h4 style="margin-bottom: 12px;">Quotation Action Options</h4>
          <button class="btn btn-outline btn-block" onclick="window.openQuoteLink('${quoteId}')">
            View Quotation PDF File ↗
          </button>
          
          ${!isApproved ? `
            <button class="btn btn-primary btn-block" style="margin-top: 8px;" onclick="window.updateQuoteStatus('${quoteId}', 'APPROVED')">
              Approve Quotation Bid
            </button>
          ` : ''}
          
          ${!isRejected ? `
            <button class="btn btn-outline btn-block" style="border-color: var(--danger); color: var(--danger);" onclick="window.updateQuoteStatus('${quoteId}', 'REJECTED')">
              Reject Quotation Bid
            </button>
          ` : ''}
        </div>
      `;
      openBottomSheet('Quotation Actions', detailHtml);
    };

    window.openQuoteLink = async (quoteId) => {
      const quote = quotes.find(q => q.id === quoteId);
      if (quote && quote.quotation_file_url) {
        window.open(quote.quotation_file_url, '_blank');
      } else {
        showToast('Quotation document URL not found.', 'error');
      }
    };

    window.updateQuoteStatus = async (quoteId, status) => {
      try {
        closeBottomSheet();
        showToast(`Updating quote to ${status}...`, 'warning');
        
        const { error } = await supabase
          .from('vendor_quotation')
          .update({ status: status })
          .eq('id', quoteId);
          
        if (error) throw error;
        
        showToast(`Quotation status updated to ${status}!`, 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error updating quotation:', err);
        showToast(err.message || 'Error updating quotation.', 'error');
      }
    };

    filterAndRender();
  }

  await loadDataAndRender();
}
