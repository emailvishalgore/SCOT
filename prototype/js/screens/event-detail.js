import { store } from '../store.js';
import { navigateTo } from '../router.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function render(container, params) {
  const state = store.getState();
  const user = state.currentUser || { id: 'anon', name: 'Guest Resident' };
  const eventId = params ? params.id : 'evt-carrom-2026';
  const event = (state.events || []).find(e => e.id === eventId) || state.events[0];
  const registrations = state.registrations || [];

  if (!event) {
    container.innerHTML = `<div style="padding: 2rem;">Event not found. <button class="btn btn-secondary" onclick="window.location.hash='#/events'">Back to events</button></div>`;
    return;
  }

  // Helper check for registration
  const isRegisteredForSub = (subId) => {
    return registrations.some(r => r.residentId === user.id && r.subEventId === subId);
  };

  const isRegisteredForEvent = () => {
    return registrations.some(r => r.residentId === user.id && r.eventId === event.id);
  };

  container.innerHTML = `
    <!-- Back Button -->
    <div style="margin-bottom: 1rem;">
      <button class="btn btn-secondary btn-sm" id="back-to-events">
        <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
        Back to Events
      </button>
    </div>

    <!-- Account Status Alert if Pending -->
    ${user.status === 'PENDING_APPROVAL' ? `
      <div style="padding: 1rem 1.25rem; border-radius: var(--radius-md); background-color: var(--color-warning-bg); border: 1px solid rgba(245, 158, 11, 0.4); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 12px; color: #92400E;">
        <i data-lucide="alert-triangle" style="width: 24px; height: 24px; flex-shrink: 0; color: #D97706;"></i>
        <div>
          <strong style="font-size: 0.9375rem;">Registration Pending Admin Verification</strong>
          <p style="font-size: 0.8125rem; margin-top: 2px;">Your account registration is pending Admin verification of annual flat contribution dues (${user.wing}, ${user.flat}). You can browse events and self-register once verified.</p>
        </div>
      </div>
    ` : ''}

    <!-- Hero Banner -->
    <div class="card" style="background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%); color: white; padding: 2rem; border-radius: var(--radius-xl); margin-bottom: 1.5rem; border: none;">
      <div class="flex-between mb-xs">
        <span class="badge ${event.category === 'Sports' ? 'badge-green' : 'badge-violet'}">${event.category}</span>
        <span class="badge badge-slate">${event.status}</span>
      </div>
      <h1 style="font-family: var(--font-heading); font-size: 2.25rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">${event.name}</h1>
      <p style="font-size: 1rem; opacity: 0.95; max-width: 700px; line-height: 1.5;">${event.description}</p>
    </div>

    <!-- Event Info Grid -->
    <div class="grid-3 mb-lg" style="margin-bottom: 1.5rem;">
      <div class="card" style="display: flex; align-items: center; gap: 1rem;">
        <div class="stat-icon-wrapper">
          <i data-lucide="calendar"></i>
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700;">Date Range</span>
          <p style="font-weight: 700; color: var(--color-text);">${event.startDate} ${event.endDate !== event.startDate ? 'to ' + event.endDate : ''}</p>
        </div>
      </div>

      <div class="card" style="display: flex; align-items: center; gap: 1rem;">
        <div class="stat-icon-wrapper green">
          <i data-lucide="map-pin"></i>
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700;">Venue</span>
          <p style="font-weight: 700; color: var(--color-text);">${event.venue}</p>
        </div>
      </div>

      <div class="card" style="display: flex; align-items: center; gap: 1rem;">
        <div class="stat-icon-wrapper amber">
          <i data-lucide="clock"></i>
        </div>
        <div>
          <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700;">Time Details</span>
          <p style="font-weight: 700; color: var(--color-text);">${event.time}</p>
        </div>
      </div>
    </div>

    <!-- Sub-Events Section (Accordion List) -->
    <div class="card mb-lg" style="margin-bottom: 1.5rem;">
      <h2 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border);">
        ${event.type === 'UMBRELLA' ? 'Sub-Events & Competition Categories' : 'Event Details & Schedule'}
      </h2>

      ${event.subEvents && event.subEvents.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${event.subEvents.map(sub => {
            const alreadyReg = isRegisteredForSub(sub.id);
            return `
              <div style="padding: 1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid ${alreadyReg ? 'var(--color-cta)' : 'var(--color-border)'}; background: ${alreadyReg ? 'var(--color-cta-light)' : '#FAF5FF'}; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                    <h3 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: var(--color-text);">${sub.name}</h3>
                    ${alreadyReg ? '<span class="badge badge-green">Registered ✓</span>' : ''}
                  </div>
                  <p style="font-size: 0.8125rem; color: var(--color-text-secondary);">
                    ${sub.category ? 'Category: ' + sub.category + ' &bull; ' : ''} 
                    ${sub.points ? 'Points: ' + sub.points : 'Open Participation'}
                  </p>
                </div>

                ${alreadyReg ? `
                  <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.8; cursor: not-allowed;">
                    <i data-lucide="check-circle" style="width: 14px; height: 14px; color: var(--color-cta);"></i> Registered
                  </button>
                ` : `
                  <button class="btn btn-primary btn-sm register-sub-btn" data-subid="${sub.id}" data-name="${sub.name}">
                    <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i> Self Register
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="text-align: center; padding: 1.5rem;">
          ${isRegisteredForEvent() ? `
            <span class="badge badge-green" style="font-size: 1rem; padding: 8px 16px; margin-bottom: 1rem;">
              <i data-lucide="check-circle"></i> You are Registered for this Event
            </span>
          ` : `
            <p style="font-size: 1rem; color: var(--color-text-secondary); margin-bottom: 1rem;">This is a standalone event open for resident participation.</p>
            <button class="btn btn-primary btn-lg register-sub-btn" data-subid="" data-name="${event.name}">
              <i data-lucide="user-plus"></i> Self Register Now
            </button>
          `}
        </div>
      `}
    </div>
  `;

  // Event Listeners
  const backBtn = container.querySelector('#back-to-events');
  if (backBtn) backBtn.addEventListener('click', () => navigateTo('events'));

  container.querySelectorAll('.register-sub-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subId = e.currentTarget.dataset.subid;
      const subName = e.currentTarget.dataset.name;

      // Duplicate registration check
      const state = store.getState();
      const currentRegs = state.registrations || [];
      const isAlready = currentRegs.some(r => r.residentId === user.id && (subId ? r.subEventId === subId : r.eventId === event.id));

      if (isAlready) {
        showToast(`Error: You are already registered for ${subName}!`, 'error');
        return;
      }

      openModal(`
        <div style="display: flex; flex-direction: column; gap: 1rem; text-align: center;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-cta-light); color: var(--color-cta); display: flex; align-items: center; justify-content: center; margin: 0 auto;">
            <i data-lucide="check-circle-2" style="width: 32px; height: 32px;"></i>
          </div>
          <h2 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800;">Confirm Registration</h2>
          <p style="font-size: 0.9375rem; color: var(--color-text-secondary);">
            Registering for: <strong>${subName}</strong><br/>
            Resident: <strong>${user.name} (${user.wing}, ${user.flat})</strong>
          </p>
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; justify-content: center;">
            <button class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button class="btn btn-primary" id="confirm-modal">Confirm Registration</button>
          </div>
        </div>
      `);

      if (window.lucide) window.lucide.createIcons();

      document.getElementById('cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('confirm-modal')?.addEventListener('click', () => {
        closeModal();

        // Add registration to store
        const newReg = {
          id: `reg-${Date.now()}`,
          eventId: event.id,
          subEventId: subId || null,
          residentId: user.id,
          registeredAt: new Date().toISOString()
        };

        store.setState(s => ({
          registrations: [...(s.registrations || []), newReg]
        }));

        showToast(`Successfully registered for ${subName}!`, 'success');
        render(container, params); // Re-render page to show Registered badge
      });
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
