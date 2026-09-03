// SCOT TOPAZ Core Team Portal - Expenses Page
import { supabase } from '../supabase-client.js';
import { formatCurrency, formatDate, showToast, openBottomSheet, closeBottomSheet } from '../utils.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;
  const currentMemberId = window.appAuth.session.member_id;

  // Set page refresher
  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh expenses from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // Fetch expenses with category details
    const { data: expenses, error } = await supabase
      .from('expense')
      .select(`
        id,
        category,
        description,
        amount,
        receipt_url,
        status,
        approved_by_id,
        created_by_id,
        vendor:finance.vendor(name),
        event:core.event(name)
      `)
      .eq('season_id', activeSeason);

    if (error) throw error;

    renderUI(expenses || []);
  }

  function renderUI(expenses) {
    let activeFilter = 'PENDING_APPROVAL'; // Default to show what needs review
    
    function filterAndRender() {
      const query = document.getElementById('expense-search')?.value?.toLowerCase() || '';
      const filtered = expenses.filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(query) || (e.vendor?.name || '').toLowerCase().includes(query);
        const matchesStatus = activeFilter === 'ALL' || e.status === activeFilter;
        return matchesSearch && matchesStatus;
      });

      const listContainer = document.getElementById('expenses-list');
      if (listContainer) {
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No expenses found.</div>';
          return;
        }

        listContainer.innerHTML = filtered.map(e => {
          let statusBadge = 'badge-warning';
          if (e.status === 'APPROVED') statusBadge = 'badge-success';
          if (e.status === 'REJECTED') statusBadge = 'badge-danger';
          if (e.status === 'DISBURSED') statusBadge = 'badge-primary';

          return `
            <div class="list-item-card" onclick="window.viewExpenseDetailsModal('${e.id}')">
              <div class="list-item-header">
                <div>
                  <span class="badge badge-primary">${e.category}</span>
                  <span class="list-item-title" style="margin-left: 8px;">${e.description}</span>
                  <div class="list-item-subtitle" style="margin-top: 2px;">
                    ${e.vendor?.name ? `Vendor: ${e.vendor.name}` : ''} 
                    ${e.event?.name ? `&middot; Event: ${e.event.name}` : ''}
                  </div>
                </div>
                <span class="badge ${statusBadge}">${e.status}</span>
              </div>
              <div class="list-item-body">
                <span class="list-item-meta" style="font-weight: 700; font-size: 15px; color: var(--text-primary);">
                  ${formatCurrency(e.amount)}
                </span>
                <span style="font-size: 11px; color: var(--primary); font-weight: 600;">
                  Tap for actions &middot; details
                </span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Expense Log</h2>
        <p class="page-subtitle">Approvals & tracking</p>
      </div>

      <!-- Search bar -->
      <div class="search-container">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="expense-search" class="search-input" placeholder="Search expense description or vendor...">
      </div>

      <!-- Status Filter Chips -->
      <div class="filter-row">
        <button class="chip active" data-expense-filter="PENDING_APPROVAL">Pending Review</button>
        <button class="chip" data-expense-filter="APPROVED">Approved</button>
        <button class="chip" data-expense-filter="DISBURSED">Disbursed</button>
        <button class="chip" data-expense-filter="REJECTED">Rejected</button>
        <button class="chip" data-expense-filter="ALL">All Log</button>
      </div>

      <!-- Expenses list -->
      <div id="expenses-list">
        <!-- Rendered items -->
      </div>
    `;

    // Hook search event
    document.getElementById('expense-search').addEventListener('input', filterAndRender);
    
    // Hook filters
    const filterChips = container.querySelectorAll('[data-expense-filter]');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-expense-filter');
        filterAndRender();
      });
    });

    filterAndRender();

    // Modal Details view callback
    window.viewExpenseDetailsModal = (expenseId) => {
      const exp = expenses.find(e => e.id === expenseId);
      if (!exp) return;

      const actionsHtml = exp.status === 'PENDING_APPROVAL' ? `
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button class="btn btn-outline" style="flex: 1; border-color: var(--danger); color: var(--danger);" onclick="window.updateExpenseStatus('${exp.id}', 'REJECTED')">
            Reject
          </button>
          <button class="btn btn-primary" style="flex: 1;" onclick="window.approveExpenseAction('${exp.id}')">
            Approve
          </button>
        </div>
      ` : exp.status === 'APPROVED' ? `
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button class="btn btn-primary btn-block" onclick="window.updateExpenseStatus('${exp.id}', 'DISBURSED')">
            Mark Disbursed (Paid)
          </button>
        </div>
      ` : '';

      const detailHtml = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label class="form-label">Description</label>
            <div style="font-weight: 600; font-size: 16px;">${exp.description}</div>
          </div>
          <div>
            <label class="form-label">Amount</label>
            <div style="font-weight: 700; font-size: 20px; color: var(--primary);">${formatCurrency(exp.amount)}</div>
          </div>
          <div>
            <label class="form-label">Category</label>
            <div style="font-weight: 500;">${exp.category}</div>
          </div>
          ${exp.vendor?.name ? `
            <div>
              <label class="form-label">Vendor</label>
              <div style="font-weight: 500;">${exp.vendor.name}</div>
            </div>
          ` : ''}
          ${exp.event?.name ? `
            <div>
              <label class="form-label">Event</label>
              <div style="font-weight: 500;">${exp.event.name}</div>
            </div>
          ` : ''}
          <div>
            <label class="form-label">Receipt Voucher</label>
            ${exp.receipt_url ? `
              <a href="${exp.receipt_url}" target="_blank" class="btn btn-outline btn-block" style="margin-top: 4px;">
                View Receipt/Invoice File ↗
              </a>
            ` : '<div style="color: var(--text-muted); font-size: 13px;">No receipt document attached</div>'}
          </div>
          ${actionsHtml}
        </div>
      `;

      openBottomSheet('Expense Details', detailHtml);
    };

    window.approveExpenseAction = async (expenseId) => {
      try {
        closeBottomSheet();
        showToast('Processing approval...', 'warning');
        
        const { data, error } = await supabase.rpc('approve_expense', {
          target_expense_id: expenseId,
          approver_member_id: currentMemberId
        });
        
        if (error) throw error;
        
        showToast('Expense approved successfully!', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error approving expense:', err);
        showToast(err.message || 'Error approving expense.', 'error');
      }
    };

    window.updateExpenseStatus = async (expenseId, status) => {
      try {
        closeBottomSheet();
        showToast(`Updating status to ${status}...`, 'warning');
        
        const { data, error } = await supabase
          .from('expense')
          .update({ status: status })
          .eq('id', expenseId);
          
        if (error) throw error;
        
        showToast(`Expense updated successfully to ${status}!`, 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error updating status:', err);
        showToast(err.message || 'Error updating status.', 'error');
      }
    };
  }

  await loadDataAndRender();
}
