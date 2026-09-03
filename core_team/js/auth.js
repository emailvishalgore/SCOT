// SCOT TOPAZ Core Team Portal - Authentication
import { supabase } from './supabase-client.js';
import { showToast } from './utils.js';

export const appAuth = {
  session: null,

  async login(username, pin) {
    try {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: username,
        p_pin: pin
      });
      
      if (error) throw error;
      
      if (data && data.success) {
        // Enforce coordinator check & role restriction
        if (data.type !== 'COORDINATOR' || (data.role !== 'SCOT_ADMIN' && data.role !== 'CORE_TEAM')) {
          return { success: false, message: 'Access Denied: Core Team/Admin privileges required.' };
        }
        
        this.session = data;
        sessionStorage.setItem('scot_core_session', JSON.stringify(data));
        
        // Show user avatar representation
        const avatar = document.getElementById('user-avatar');
        if (avatar && data.name) {
          avatar.textContent = data.name.charAt(0).toUpperCase();
        }
        
        return { success: true };
      } else {
        return { success: false, message: data?.message || 'Invalid username or PIN.' };
      }
    } catch (err) {
      console.error('Authentication error:', err);
      return { success: false, message: err.message || 'Server connection error.' };
    }
  },

  logout() {
    this.session = null;
    sessionStorage.removeItem('scot_core_session');
    
    // Hide App UI, Show Login Screen
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    
    // Clear login form inputs
    document.getElementById('login-username').value = '';
    document.getElementById('login-pin').value = '';
    
    showToast('Logged out successfully', 'success');
  },

  checkSession() {
    const cached = sessionStorage.getItem('scot_core_session');
    if (cached) {
      this.session = JSON.parse(cached);
      
      // Update UI Header user avatar
      const avatar = document.getElementById('user-avatar');
      if (avatar && this.session.name) {
        avatar.textContent = this.session.name.charAt(0).toUpperCase();
      }
      
      // Set logout tap action
      if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.onclick = () => {
          if (confirm('Do you want to log out?')) {
            this.logout();
          }
        };
      }
      
      return true;
    }
    return false;
  },

  async handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const pinInput = document.getElementById('login-pin');
    const errBanner = document.getElementById('auth-error');
    
    if (!usernameInput || !pinInput) return;
    
    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (errBanner) errBanner.classList.add('hidden');
    
    const result = await this.login(username, pin);
    
    if (result.success) {
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('app-shell').classList.remove('hidden');
      
      showToast(`Welcome back, ${this.session.name}!`, 'success');
      
      // Redirect to dashboard page
      window.location.hash = '#/dashboard';
      if (window.appRouter) {
        window.appRouter.handleRoute();
      }
    } else {
      if (errBanner) {
        errBanner.textContent = result.message;
        errBanner.classList.remove('hidden');
      }
    }
  }
};

window.appAuth = appAuth;
export default appAuth;
