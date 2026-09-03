// SCOT TOPAZ Core Team Portal - Onboarding Approvals Page
import { supabase } from '../supabase-client.js';
import { showToast, openBottomSheet, closeBottomSheet } from '../utils.js';

export async function render(container) {
  const currentMemberId = window.appAuth.session.member_id;

  window.currentPageRefresher = async (table, payload) => {
    console.log('Realtime refresh approvals from', table);
    await loadDataAndRender();
  };

  async function loadDataAndRender() {
    // 1. Fetch pending registration requests
    const { data: requests, error } = await supabase
      .from('registration_request')
      .select('id, username, mobile, wing_id, flat_id, status')
      .eq('status', 'PENDING');

    if (error) throw error;
    
    // 2. Fetch associated family members
    const { data: familyMembers } = await supabase
      .from('registration_member_request')
      .select('request_id, name, gender, age_group');

    // Group family members by request_id
    const familyMap = {};
    if (familyMembers) {
      familyMembers.forEach(m => {
        if (!familyMap[m.request_id]) familyMap[m.request_id] = [];
        familyMap[m.request_id].push(m);
      });
    }

    const requestList = requests.map(r => ({
      ...r,
      family: familyMap[r.id] || []
    }));

    renderUI(requestList);
  }

  function renderUI(requests) {
    const listContainer = container;
    
    if (requests.length === 0) {
      container.innerHTML = `
        <div class="page-header">
          <h2 class="page-title">Onboarding Approvals</h2>
          <p class="page-subtitle">Resident requests queued</p>
        </div>
        <div class="card" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
          <h3>All Cleared!</h3>
          <p style="margin-top: 8px;">No pending resident onboarding requests found.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Onboarding Approvals</h2>
        <p class="page-subtitle">Review resident onboarding requests</p>
      </div>

      <div style="margin-top: 16px;">
        ${requests.map(r => `
          <div class="list-item-card" onclick="window.viewApprovalDetailsModal('${r.id}')">
            <div class="list-item-header">
              <div>
                <span class="list-item-title">${r.username}</span>
                <div class="list-item-subtitle">${r.mobile || 'No Phone'}</div>
              </div>
              <span class="badge badge-warning">${r.status}</span>
            </div>
            
            <div class="list-item-body" style="margin-top: 6px;">
              <span class="list-item-meta">
                🏢 Wing ${r.wing_id || ''} &middot; Flat ${r.flat_id || ''}
              </span>
              <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">
                Family size: ${r.family.length + 1}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Modal Callback
    window.viewApprovalDetailsModal = (requestId) => {
      const r = requests.find(req => req.id === requestId);
      if (!r) return;

      const detailHtml = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label class="form-label">Primary Account Holder</label>
            <div style="font-weight: 600; font-size: 16px;">${r.username}</div>
          </div>
          <div>
            <label class="form-label">Flat Allocation</label>
            <div style="font-weight: 500;">Wing ${r.wing_id} &middot; Flat ${r.flat_id}</div>
          </div>
          <div>
            <label class="form-label">Mobile Number</label>
            <div style="font-weight: 500;">${r.mobile || 'Not provided'}</div>
          </div>
          
          <div>
            <label class="form-label">Co-Occupants / Family Members (${r.family.length})</label>
            ${r.family.length === 0 ? `
              <div style="font-size: 13px; color: var(--text-muted);">No additional members requested.</div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
                ${r.family.map(f => `
                  <div style="background-color: var(--background); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;">
                    <strong>${f.name}</strong> (${f.gender} &middot; ${f.age_group})
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button class="btn btn-outline" style="flex: 1; border-color: var(--danger); color: var(--danger);" onclick="window.rejectRegistration('${r.id}')">
              Reject
            </button>
            <button class="btn btn-primary" style="flex: 1;" onclick="window.approveRegistration('${r.id}')">
              Approve
            </button>
          </div>
        </div>
      `;

      openBottomSheet('Registration Request', detailHtml);
    };

    window.approveRegistration = async (requestId) => {
      try {
        closeBottomSheet();
        showToast('Onboarding resident...', 'warning');
        
        const { error } = await supabase.rpc('approve_registration_request', {
          p_request_id: requestId,
          p_approver_member_id: currentMemberId
        });
        
        if (error) throw error;
        
        showToast('Resident onboarded successfully!', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error approving registration:', err);
        showToast(err.message || 'Error onboarding resident.', 'error');
      }
    };

    window.rejectRegistration = async (requestId) => {
      try {
        closeBottomSheet();
        showToast('Rejecting request...', 'warning');
        
        const { error } = await supabase
          .from('registration_request')
          .update({ status: 'REJECTED' })
          .eq('id', requestId);
          
        if (error) throw error;
        
        showToast('Onboarding request rejected.', 'success');
        await loadDataAndRender();
      } catch (err) {
        console.error('Error rejecting request:', err);
        showToast(err.message || 'Error processing rejection.', 'error');
      }
    };
  }

  await loadDataAndRender();
}
