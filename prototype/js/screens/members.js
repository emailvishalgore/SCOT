import { store } from '../store.js';
import { showToast } from '../components/toast.js';

export function render(container) {
  const state = store.getState();
  const currentUser = state.currentUser;

  if (!currentUser || currentUser.role !== 'admin') {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <i data-lucide="lock" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--color-danger);"></i>
        <h2>Admin Access Required</h2>
        <p style="color: var(--color-text-secondary);">Only SCOT Administrators can access Member Approvals & Flat Contribution records.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const users = state.users || [];
  const pendingUsers = users.filter(u => u.status === 'PENDING_APPROVAL');
  const approvedUsers = users.filter(u => u.status !== 'PENDING_APPROVAL');

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Member Approvals & Flat Dues</h1>
          <p class="page-subtitle">Verify annual flat contributions and approve resident account registrations</p>
        </div>
      </div>
    </div>

    <!-- Pending Approvals Section -->
    <div class="card mb-lg" style="margin-bottom: 1.5rem;">
      <div class="flex-between mb-sm">
        <h2 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">
          Pending Resident Approvals (${pendingUsers.length})
        </h2>
        <span class="badge badge-amber">Action Required</span>
      </div>

      ${pendingUsers.length > 0 ? `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Wing & Flat</th>
                <th>Phone</th>
                <th>Requested Role</th>
                <th>Flat Dues Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingUsers.map(u => `
                <tr>
                  <td><strong style="color: var(--color-text);">${u.name}</strong></td>
                  <td>${u.wing} (${u.flat})</td>
                  <td>${u.phone}</td>
                  <td><span class="badge badge-violet">${u.role}</span></td>
                  <td><span class="badge badge-amber">Unverified / Unpaid</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-primary btn-sm approve-user-btn" data-id="${u.id}" data-name="${u.name}">
                      <i data-lucide="check" style="width: 14px; height: 14px;"></i> Verify & Approve
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
          <i data-lucide="check-circle-2" style="width: 40px; height: 40px; margin-bottom: 0.5rem; color: var(--color-cta);"></i>
          <p style="font-weight: 600;">No pending resident registrations!</p>
          <p style="font-size: 0.8125rem; color: var(--color-text-muted);">All resident accounts have been verified and approved.</p>
        </div>
      `}
    </div>

    <!-- Approved Active Directory -->
    <div class="card">
      <h2 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">
        Active Member Directory (${approvedUsers.length})
      </h2>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Wing & Flat</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Contribution Status</th>
              <th>Account Status</th>
            </tr>
          </thead>
          <tbody>
            ${approvedUsers.map(u => `
              <tr>
                <td><strong style="color: var(--color-text);">${u.name}</strong></td>
                <td>${u.wing} (${u.flat})</td>
                <td>${u.phone}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-amber' : (u.role === 'champion' ? 'badge-violet' : 'badge-green')}">${u.role}</span></td>
                <td><span class="badge badge-green">PAID</span></td>
                <td><span class="badge badge-green">APPROVED</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Approve action listener
  container.querySelectorAll('.approve-user-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userId = e.currentTarget.dataset.id;
      const userName = e.currentTarget.dataset.name;

      store.setState(s => ({
        users: s.users.map(u => u.id === userId ? { ...u, status: 'APPROVED', contributionStatus: 'PAID' } : u)
      }));

      showToast(`Verified flat contribution and approved account for ${userName}!`, 'success');
      render(container);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}
