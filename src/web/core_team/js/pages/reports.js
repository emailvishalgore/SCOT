// SCOT TOPAZ Core Team Portal - Reports & Analytics Page
import { supabase } from '../supabase-client.js';
import { formatCurrency, showToast } from '../utils.js';

export async function render(container) {
  const activeSeason = window.appAuth.session.season_id;

  async function loadDataAndRender() {
    // 1. Fetch flat contributions
    const { data: contributions } = await supabase
      .from('flat_contribution')
      .select('amount, status, flat_id')
      .eq('season_id', activeSeason);

    // 2. Fetch sponsors
    const { data: sponsors } = await supabase
      .from('sponsor')
      .select('amount_collected')
      .eq('season_id', activeSeason);

    // 3. Fetch expenses
    const { data: expenses } = await supabase
      .from('expense')
      .select('amount, category, status')
      .eq('season_id', activeSeason);

    // 4. Fetch wings & flats
    const { data: wings } = await supabase.from('wing').select('id, name').order('name');
    const { data: flats } = await supabase.from('flat').select('id, wing_id');

    // Calculations
    const flatIncome = contributions
      ? contributions.filter(c => c.status === 'PAID').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
      : 0;
      
    const sponsorIncome = sponsors
      ? sponsors.reduce((s, sp) => s + (parseFloat(sp.amount_collected) || 0), 0)
      : 0;

    const totalIncome = flatIncome + sponsorIncome;

    const approvedExpenses = expenses
      ? expenses.filter(e => e.status === 'APPROVED' || e.status === 'DISBURSED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      : 0;
      
    const disbursedExpenses = expenses
      ? expenses.filter(e => e.status === 'DISBURSED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      : 0;

    const balance = totalIncome - approvedExpenses;

    // Wing progress breakdown
    const wingStats = wings.map(w => {
      const flatIdsInWing = flats ? flats.filter(f => f.wing_id === w.id).map(f => f.id) : [];
      const wingContributions = contributions
        ? contributions.filter(c => flatIdsInWing.includes(c.flat_id))
        : [];
      
      const paidCount = wingContributions.filter(c => c.status === 'PAID').length;
      const collected = wingContributions.filter(c => c.status === 'PAID').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const pct = Math.round((paidCount / 28) * 100);
      
      return {
        name: w.name,
        paid: paidCount,
        pending: 28 - paidCount,
        collected,
        pct
      };
    });

    renderUI(totalIncome, flatIncome, sponsorIncome, approvedExpenses, disbursedExpenses, balance, wingStats);
  }

  function renderUI(totalIncome, flatIncome, sponsorIncome, approvedExpenses, disbursedExpenses, balance, wingStats) {
    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="page-title">Reports & Analytics</h2>
          <p class="page-subtitle">Season operational performance</p>
        </div>
        <button id="btn-share-report" class="btn btn-outline" style="padding: 8px 12px; font-size: 13px; min-height: 38px; gap: 6px;">
          Share WhatsApp 💬
        </button>
      </div>

      <!-- Financial Health Card -->
      <div class="card">
        <h3 style="font-size: 16px; margin-bottom: 12px;">Financial Summary</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: var(--text-secondary);">Total Collected Income:</span>
            <strong style="color: var(--success);">${formatCurrency(totalIncome)}</strong>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); padding-left: 12px; display: flex; flex-direction: column; gap: 4px;">
            <span>&middot; Flat Contributions: ${formatCurrency(flatIncome)}</span>
            <span>&middot; Sponsorship Collections: ${formatCurrency(sponsorIncome)}</span>
          </div>
          <hr style="border: none; border-top: 1px solid var(--border); margin: 4px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: var(--text-secondary);">Approved Expenses:</span>
            <strong style="color: var(--danger);">${formatCurrency(approvedExpenses)}</strong>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); padding-left: 12px;">
            <span>&middot; Disbursed (Paid): ${formatCurrency(disbursedExpenses)}</span>
          </div>
          <hr style="border: none; border-top: 1px solid var(--border); margin: 4px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700;">
            <span>Net Available Balance:</span>
            <span style="color: var(--primary);">${formatCurrency(balance)}</span>
          </div>
        </div>
      </div>

      <!-- Wing Collection Progress -->
      <div class="card" style="margin-bottom: 0;">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Wing Collection Roster</h3>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${wingStats.map(w => `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                <span>Wing ${w.name} (${w.paid}/28 flats paid)</span>
                <span>${formatCurrency(w.collected)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="progress-list-track" style="height: 10px; margin-bottom: 0;">
                  <div class="progress-list-bar" style="width: ${w.pct}%;"></div>
                </div>
                <span style="font-size: 11px; font-weight: 700; width: 36px; text-align: right;">${w.pct}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Hook Share report to WhatsApp
    document.getElementById('btn-share-report').addEventListener('click', () => {
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const message = 
`*SCOT TOPAZ Core Team Financial Report*
📅 Date: ${dateStr}

💰 *Income Summary:*
&middot; Flat Contributions: ${formatCurrency(flatIncome)}
&middot; Sponsorship Collections: ${formatCurrency(sponsorIncome)}
*Total Income:* ${formatCurrency(totalIncome)}

💸 *Expense Summary:*
&middot; Approved Expenses: ${formatCurrency(approvedExpenses)}
&middot; Disbursed: ${formatCurrency(disbursedExpenses)}

🏦 *Net Balance:* ${formatCurrency(balance)}

*Wing-wise Collections:*
${wingStats.map(w => `&middot; Wing ${w.name}: ${w.paid}/28 Paid (${w.pct}%) - ${formatCurrency(w.collected)}`).join('\n')}

_Generated via SCOT TOPAZ Core Team Portal_`;

      navigator.clipboard.writeText(message).then(() => {
        showToast('Financial summary report copied to clipboard!', 'success');
        const encoded = encodeURIComponent(message);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }).catch(() => {
        const encoded = encodeURIComponent(message);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      });
    });
  }

  await loadDataAndRender();
}
