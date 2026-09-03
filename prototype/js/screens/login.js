import { store } from '../store.js';
import { navigateTo } from '../router.js';
import { showToast } from '../components/toast.js';

export function render(container) {
  const loginRoot = document.getElementById('login-root');
  if (!loginRoot) return;

  const state = store.getState();
  const wings = state.wings || [];

  let activeTab = 'signup'; // 'signup', 'signin', 'pending_screen'
  let pendingRegData = null;

  const renderContent = () => {
    const existingUsers = store.getState().users || [];

    loginRoot.innerHTML = `
      <div class="login-container animate-scaleIn">
        <div class="login-header">
          <img src="/images/scot-logo.png" alt="SCOT Logo" class="scot-logo" />
          <h1>Topaz Park</h1>
          <p class="tagline">Sports & Cultural Organisers of Topaz</p>
        </div>
        
        <!-- Auth Tabs -->
        ${activeTab !== 'pending_screen' ? `
          <div class="tabs mb-md" style="width: 100%; display: flex; justify-content: center; margin-bottom: 1.25rem;">
            <button class="tab ${activeTab === 'signup' ? 'active' : ''}" id="tab-signup" style="flex: 1; text-align: center;">
              <i data-lucide="user-plus" style="width: 14px; height: 14px; display: inline;"></i> Resident Register
            </button>
            <button class="tab ${activeTab === 'signin' ? 'active' : ''}" id="tab-signin" style="flex: 1; text-align: center;">
              <i data-lucide="log-in" style="width: 14px; height: 14px; display: inline;"></i> Sign In
            </button>
          </div>
        ` : ''}

        ${activeTab === 'pending_screen' && pendingRegData ? `
          <!-- Registration Received / Pending Approval View -->
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--color-warning-bg); border: 2px solid var(--color-warning); color: var(--color-warning); display: flex; align-items: center; justify-content: center;">
              <i data-lucide="clock" style="width: 36px; height: 36px;"></i>
            </div>

            <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: var(--color-text);">
              Registration Submitted!
            </h2>

            <p style="font-size: 0.9375rem; color: var(--color-text-secondary); max-width: 380px; line-height: 1.5;">
              Thank you, <strong>${pendingRegData.name}</strong>! Your registration for <strong>${pendingRegData.wing}, Flat ${pendingRegData.flat}</strong> has been received.
            </p>

            <div style="padding: 1rem; border-radius: var(--radius-md); background: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; text-align: left; font-size: 0.8125rem; line-height: 1.5;">
              <strong style="display: block; margin-bottom: 4px; font-size: 0.875rem;">⏳ Pending Admin Approval:</strong>
              Your account registration must be verified and approved by the <strong>SCOT Admin / Wing Commander</strong> after checking your flat's annual contribution dues. Once approved, you can sign in using your mobile number and PIN.
            </div>

            <button class="btn btn-primary btn-lg" id="btn-back-signin" style="width: 100%; margin-top: 0.5rem;">
              Back to Sign In &rarr;
            </button>
          </div>
        ` : (activeTab === 'signup' ? `
          <!-- Sign Up Form (Resident) -->
          <form id="signup-form" style="width: 100%; display: flex; flex-direction: column; gap: 0.875rem; text-align: left;">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="reg-name" class="input" placeholder="e.g. Ramesh Kulkarni" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Wing</label>
                <select id="reg-wing" class="select" required>
                  ${wings.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Flat Number</label>
                <input type="text" id="reg-flat" class="input" placeholder="e.g. N-402" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" id="reg-phone" class="input" placeholder="10-digit mobile" required />
              </div>

              <div class="form-group">
                <label class="form-label">4-Digit PIN</label>
                <input type="password" id="reg-pin" class="input" placeholder="1234" maxlength="4" required />
              </div>
            </div>

            <div class="form-group" style="background: var(--color-primary-lighter); padding: 0.75rem; border-radius: var(--radius-sm);">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; color: var(--color-primary-dark);">
                <input type="checkbox" id="reg-is-champ" style="width: 16px; height: 16px;" />
                <span>I am also an Event Champion / Coordinator</span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="margin-top: 0.5rem; width: 100%;">
              Submit Registration for Approval &rarr;
            </button>
          </form>
        ` : `
          <!-- Sign In Form (Phone + PIN) -->
          <form id="signin-form" style="width: 100%; display: flex; flex-direction: column; gap: 0.875rem; text-align: left;">
            <div class="form-group">
              <label class="form-label">Registered Mobile Number</label>
              <input type="tel" id="login-phone" class="input" placeholder="e.g. 9876543210" required />
            </div>

            <div class="form-group">
              <label class="form-label">4-Digit Security PIN</label>
              <input type="password" id="login-pin" class="input" placeholder="Enter PIN" maxlength="4" required />
            </div>

            <button type="submit" class="btn btn-violet btn-lg" style="width: 100%; margin-top: 0.5rem;">
              Sign In to Platform &rarr;
            </button>

            <!-- Quick Demo Accounts list for instant testing -->
            <div style="margin-top: 1rem; border-top: 1px solid var(--color-border); padding-top: 0.75rem;">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.5rem;">
                Select Account to Sign In:
              </span>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${existingUsers.map(u => `
                  <button type="button" class="btn btn-secondary btn-sm quick-demo-btn" data-id="${u.id}" style="justify-content: space-between; text-align: left;">
                    <span><strong>${u.name}</strong> (${u.role})</span>
                    <span class="badge ${u.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}">${u.status === 'APPROVED' ? 'Approved' : 'Pending'}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </form>
        `)}

        <div style="margin-top: 1.25rem; width: 100%; text-align: center; border-top: 1px solid var(--color-border); padding-top: 0.75rem;">
          <button type="button" class="btn btn-outline btn-sm" id="admin-quick-btn" style="width: 100%;">
            <i data-lucide="shield" style="width: 14px; height: 14px;"></i> Direct Admin Login (Amit Joshi)
          </button>
        </div>

        <div class="prototype-label" style="margin-top: 1rem;">
          Topaz Park SCOT Platform &bull; Prototype v4.0
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Tab switcher
    loginRoot.querySelector('#tab-signup')?.addEventListener('click', () => { activeTab = 'signup'; renderContent(); });
    loginRoot.querySelector('#tab-signin')?.addEventListener('click', () => { activeTab = 'signin'; renderContent(); });
    loginRoot.querySelector('#btn-back-signin')?.addEventListener('click', () => { activeTab = 'signin'; renderContent(); });

    // Handle Quick Admin Login
    loginRoot.querySelector('#admin-quick-btn')?.addEventListener('click', () => {
      const adminUser = existingUsers.find(u => u.role === 'admin') || existingUsers[0];
      if (adminUser) {
        store.setState(() => ({ currentUser: adminUser }));
        if (typeof window.__scotLogin === 'function') window.__scotLogin(adminUser.id);
      }
    });

    // Handle Signup Form Submit
    const signupForm = loginRoot.querySelector('#signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = loginRoot.querySelector('#reg-name').value.trim();
        const wingId = loginRoot.querySelector('#reg-wing').value;
        const flat = loginRoot.querySelector('#reg-flat').value.trim();
        const phone = loginRoot.querySelector('#reg-phone').value.trim();
        const pin = loginRoot.querySelector('#reg-pin').value.trim();
        const isChamp = loginRoot.querySelector('#reg-is-champ').checked;

        if (pin.length !== 4) {
          showToast('Please enter a valid 4-digit PIN', 'error');
          return;
        }

        const wingObj = wings.find(w => w.id === wingId);
        const newUser = {
          id: `user-${Date.now()}`,
          name,
          phone,
          pin,
          wing: wingObj ? wingObj.name : 'Wing N',
          wingId,
          flat,
          role: isChamp ? 'champion' : 'resident',
          isChampion: isChamp,
          status: 'PENDING_APPROVAL', // Strict pending approval
          contributionStatus: 'UNPAID',
          registeredAt: new Date().toISOString().split('T')[0]
        };

        // Save to store, but DO NOT set currentUser or log in!
        store.setState(s => ({
          users: [...s.users, newUser]
        }));

        pendingRegData = newUser;
        activeTab = 'pending_screen';
        renderContent();
      });
    }

    // Handle Signin Form Submit
    const signinForm = loginRoot.querySelector('#signin-form');
    if (signinForm) {
      signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = loginRoot.querySelector('#login-phone').value.trim();
        const pin = loginRoot.querySelector('#login-pin').value.trim();

        const user = existingUsers.find(u => u.phone === phone && u.pin === pin);
        if (user) {
          if (user.status === 'PENDING_APPROVAL') {
            showToast(`Sign in blocked: Account for ${user.name} is pending Admin approval of flat contribution.`, 'error');
            return;
          }

          store.setState(() => ({ currentUser: user }));
          if (typeof window.__scotLogin === 'function') window.__scotLogin(user.id);
        } else {
          showToast('Invalid Phone Number or PIN!', 'error');
        }
      });
    }

    // Handle Quick Demo Buttons
    loginRoot.querySelectorAll('.quick-demo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.currentTarget.dataset.id;
        const user = existingUsers.find(u => u.id === userId);
        if (user) {
          if (user.status === 'PENDING_APPROVAL') {
            showToast(`Account for ${user.name} is PENDING APPROVAL by Admin. Please switch to Admin to approve.`, 'error');
            return;
          }

          store.setState(() => ({ currentUser: user }));
          if (typeof window.__scotLogin === 'function') window.__scotLogin(user.id);
        }
      });
    });
  };

  renderContent();
}
