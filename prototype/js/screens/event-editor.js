import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container, params) {
  const user = store.user || { role: 'admin' };
  
  if (user.role !== 'admin' && user.role !== 'champion') {
    container.innerHTML = `
      <div class="access-denied" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 1rem;">
        <i data-lucide="lock" style="color: #7C3AED; width: 64px; height: 64px; margin-bottom: 1rem;"></i>
        <h2 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0;">Access Denied</h2>
        <button id="btn-back" class="btn" style="background: #7C3AED; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 1.5rem;">Return</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    container.querySelector('#btn-back').addEventListener('click', () => navigateTo('admin'));
    return;
  }

  // Mock events data
  let events = store.events || [
    { id: 1, name: 'Ganesh Festival', type: 'Umbrella', date: 'Sep 15 - Sep 25, 2026', venue: 'Clubhouse', status: 'Upcoming', subevents: 4 },
    { id: 2, name: 'Carrom Tournament', type: 'Standalone', date: 'Oct 10, 2026', venue: 'Sports Room', status: 'Active', subevents: 0 }
  ];

  const renderTable = () => `
    <table style="width: 100%; text-align: left; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
      <thead style="background: #FAF5FF; color: #7C3AED; font-family: 'Fira Code', monospace; border-bottom: 1px solid #E5E7EB;">
        <tr>
          <th style="padding: 1rem;">Event Name</th>
          <th style="padding: 1rem;">Type</th>
          <th style="padding: 1rem;">Date</th>
          <th style="padding: 1rem;">Venue</th>
          <th style="padding: 1rem;">Status</th>
          <th style="padding: 1rem; text-align: center;">Sub-events</th>
          <th style="padding: 1rem; text-align: center;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${events.map(ev => `
          <tr class="event-row" style="border-bottom: 1px solid #E5E7EB; cursor: pointer; transition: background-color 0.2s;">
            <td style="padding: 1rem; font-weight: bold; color: #1F2937;">${ev.name}</td>
            <td style="padding: 1rem;">
              <span style="background: ${ev.type === 'Umbrella' ? '#7C3AED' : '#A78BFA'}; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem;">${ev.type}</span>
            </td>
            <td style="padding: 1rem; font-size: 0.9rem; color: #4B5563;">${ev.date}</td>
            <td style="padding: 1rem; font-size: 0.9rem; color: #4B5563;">${ev.venue}</td>
            <td style="padding: 1rem;">
              <span style="background: ${ev.status === 'Active' ? '#22C55E' : '#6B7280'}; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem;">${ev.status}</span>
            </td>
            <td style="padding: 1rem; text-align: center; color: #4B5563;">${ev.subevents > 0 ? ev.subevents : '-'}</td>
            <td style="padding: 1rem; text-align: center;">
              <div style="display: flex; justify-content: center; gap: 0.5rem;">
                <button class="btn-edit" data-id="${ev.id}" style="background: transparent; color: #7C3AED; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px;"><i data-lucide="pencil" style="width:18px;height:18px;"></i></button>
                <button class="btn-view" style="background: transparent; color: #6B7280; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px;"><i data-lucide="eye" style="width:18px;height:18px;"></i></button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = `
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <div>
        <h1 style="font-family: 'Fira Code', monospace; color: #4C1D95; margin: 0;">Event Editor</h1>
        <p style="color: #6B7280; margin: 0.25rem 0 0 0;">Manage events and schedules</p>
      </div>
      <button id="btn-create" style="background: #22C55E; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 4px; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Create Event
      </button>
    </header>

    <div style="overflow-x: auto; padding-bottom: 2rem;">
      ${renderTable()}
    </div>

    <!-- Modal -->
    <div id="event-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease;">
      <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 1rem;">
          <h2 id="modal-title" style="font-family: 'Fira Code', monospace; color: #7C3AED; margin: 0;">Create Event</h2>
          <button id="btn-close-modal" style="background: transparent; border: none; color: #6B7280; cursor: pointer; padding: 0.25rem;"><i data-lucide="x"></i></button>
        </div>
        
        <form id="event-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Event Name</label>
            <input type="text" id="ev-name" required style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem;" />
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Description</label>
            <textarea id="ev-desc" rows="3" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem; resize: vertical;"></textarea>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Type</label>
              <select id="ev-type" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem; background: white;">
                <option value="Standalone">Standalone</option>
                <option value="Umbrella">Umbrella</option>
              </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Category</label>
              <select id="ev-cat" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem; background: white;">
                <option value="Sports">Sports</option>
                <option value="Cultural">Cultural</option>
              </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Start Date</label>
              <input type="date" id="ev-start" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem;" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">End Date</label>
              <input type="date" id="ev-end" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem;" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Time</label>
              <input type="text" id="ev-time" placeholder="e.g. 10:00 AM - 4:00 PM" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem;" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: bold; font-size: 0.9rem; color: #1F2937;">Venue</label>
              <input type="text" id="ev-venue" style="padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 4px; font-family: inherit; font-size: 1rem;" />
            </div>
          </div>

          <div id="subevents-section" style="display: none; margin-top: 1rem; padding: 1.5rem; background: #FAF5FF; border-radius: 8px; border: 1px solid #E5E7EB;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="color: #7C3AED; margin: 0; font-size: 1.1rem;">Sub-events</h3>
              <button type="button" id="btn-add-sub" style="background: transparent; color: #7C3AED; border: 1px solid #7C3AED; padding: 0.4rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">Add Sub-event</button>
            </div>
            <div id="subevents-list" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- Dynamically added -->
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #E5E7EB;">
            <button type="button" id="btn-cancel" style="background: transparent; color: #4B5563; border: 1px solid #D1D5DB; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Cancel</button>
            <button type="submit" style="background: #7C3AED; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Save Event</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Toast -->
    <div id="toast" style="position: fixed; bottom: 2rem; right: 2rem; background: #22C55E; color: white; padding: 1rem 1.5rem; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.75rem; transform: translateY(150%); transition: transform 0.3s ease; z-index: 2000;">
      <i data-lucide="check-circle" style="width: 20px; height: 20px;"></i> Event saved successfully!
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const modal = container.querySelector('#event-modal');
  const typeSelect = container.querySelector('#ev-type');
  const subSection = container.querySelector('#subevents-section');
  const subList = container.querySelector('#subevents-list');
  const toast = container.querySelector('#toast');

  const openModal = (isEdit = false) => {
    container.querySelector('#modal-title').textContent = isEdit ? 'Edit Event' : 'Create Event';
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.style.opacity = '1';
  };

  const closeModal = () => {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
      container.querySelector('#event-form').reset();
      subList.innerHTML = '';
      subSection.style.display = 'none';
    }, 200);
  };

  const showToast = () => {
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.transform = 'translateY(150%)';
    }, 3000);
  };

  typeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'Umbrella') {
      subSection.style.display = 'block';
    } else {
      subSection.style.display = 'none';
    }
  });

  container.querySelector('#btn-add-sub').addEventListener('click', () => {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 1rem; align-items: flex-end; background: white; padding: 1rem; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);';
    div.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem;">
        <label style="font-size: 0.8rem; font-weight: bold; color: #4B5563;">Name</label>
        <input type="text" required style="padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px;" />
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem;">
        <label style="font-size: 0.8rem; font-weight: bold; color: #4B5563;">Date</label>
        <input type="date" required style="padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px;" />
      </div>
      <button type="button" class="btn-remove-sub" style="background: transparent; color: #EF4444; border: none; cursor: pointer; padding: 0.5rem;"><i data-lucide="trash-2" style="width:18px;height:18px;"></i></button>
    `;
    subList.appendChild(div);
    if (window.lucide) window.lucide.createIcons();
    
    div.querySelector('.btn-remove-sub').addEventListener('click', () => div.remove());
  });

  container.querySelector('#btn-create').addEventListener('click', () => openModal(false));
  container.querySelector('#btn-close-modal').addEventListener('click', closeModal);
  container.querySelector('#btn-cancel').addEventListener('click', closeModal);
  
  container.querySelector('#event-form').addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal();
    showToast();
  });

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openModal(true));
  });

  container.querySelectorAll('.event-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = '#F3F4F6';
    });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = 'transparent';
    });
  });
}
