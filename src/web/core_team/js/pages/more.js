// SCOT TOPAZ Core Team Portal - More Page (Mobile overflow)
import { appAuth } from '../auth.js';
import { getIconSvg } from '../utils.js';

export async function render(container) {
  const user = appAuth.session;
  const portfolios = user.portfolios ? JSON.parse(JSON.stringify(user.portfolios)) : [];
  const portfoliosStr = portfolios.length > 0 ? portfolios.join(', ') : 'General Body';

  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">More Operations</h2>
      <p class="page-subtitle">Additional modules and configuration</p>
    </div>
    
    <!-- User Info Card -->
    <div class="card" style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
      <div class="header-avatar" style="width: 56px; height: 56px; font-size: 24px;">
        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>
      <div>
        <h3 style="font-size: 17px; margin-bottom: 2px;">${user.name || 'User'}</h3>
        <span class="badge badge-primary">${user.role || 'CORE_TEAM'}</span>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
          Portfolios: ${portfoliosStr}
        </div>
      </div>
    </div>
    
    <!-- More Menu Options -->
    <div style="background-color: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-sm);">
      <div class="menu-row" onclick="appRouter.navigate('#/expenses')">
        <div class="menu-row-left">
          <div class="menu-row-icon" style="color: var(--secondary);">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>
          </div>
          <span class="menu-row-label">Expense Approvals</span>
        </div>
        ${getIconSvg('chevronRight')}
      </div>
      
      <div class="menu-row" onclick="appRouter.navigate('#/vendors')">
        <div class="menu-row-left">
          <div class="menu-row-icon" style="color: var(--primary);">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <span class="menu-row-label">Vendor Management</span>
        </div>
        ${getIconSvg('chevronRight')}
      </div>
      
      <div class="menu-row" onclick="appRouter.navigate('#/sponsors')">
        <div class="menu-row-left">
          <div class="menu-row-icon" style="color: var(--success);">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          </div>
          <span class="menu-row-label">Sponsorship Tracking</span>
        </div>
        ${getIconSvg('chevronRight')}
      </div>
      
      <div class="menu-row" onclick="appRouter.navigate('#/announcements')">
        <div class="menu-row-left">
          <div class="menu-row-icon" style="color: var(--warning);">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <span class="menu-row-label">Announcements</span>
        </div>
        ${getIconSvg('chevronRight')}
      </div>
      
      <div class="menu-row" onclick="appRouter.navigate('#/reports')">
        <div class="menu-row-left">
          <div class="menu-row-icon" style="color: #06b6d4;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <span class="menu-row-label">Reports & Analytics</span>
        </div>
        ${getIconSvg('chevronRight')}
      </div>
      
      <div class="menu-row" style="border-bottom: none;" onclick="appAuth.logout()">
        <div class="menu-row-left" style="color: var(--danger);">
          <div class="menu-row-icon" style="color: inherit;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
          <span class="menu-row-label">Log Out</span>
        </div>
        ${getIconSvg('chevronRight')}
      </div>
    </div>
  `;
}
