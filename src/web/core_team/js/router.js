// SCOT TOPAZ Core Team Portal - Router
import { appAuth } from './auth.js';

export const appRouter = {
  routes: {},

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  register(route, renderFunction) {
    this.routes[route] = renderFunction;
  },

  navigate(hash) {
    window.location.hash = hash;
  },

  async handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    
    // Auth Guard check
    const isAuthenticated = appAuth.checkSession();
    
    if (!isAuthenticated) {
      document.getElementById('app-shell').classList.add('hidden');
      document.getElementById('auth-screen').classList.remove('hidden');
      return;
    } else {
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('app-shell').classList.remove('hidden');
    }
    
    // Parse base route
    let route = hash;
    
    // Render dynamic page
    const renderFn = this.routes[route];
    const contentArea = document.getElementById('app-content');
    
    if (contentArea) {
      contentArea.innerHTML = '<div style="display: flex; justify-content: center; padding: 40px;"><div class="spinner"></div></div>';
      
      if (renderFn) {
        try {
          await renderFn(contentArea);
        } catch (err) {
          console.error(`Error rendering route ${route}:`, err);
          contentArea.innerHTML = `
            <div class="card" style="text-align: center; border-color: var(--danger-light); background-color: var(--danger-light); color: var(--danger);">
              <h3>Error Loading Page</h3>
              <p style="margin-top: 8px;">${err.message || 'Please check your connection.'}</p>
              <button class="btn btn-outline" style="margin-top: 16px;" onclick="window.location.reload()">Reload Application</button>
            </div>
          `;
        }
      } else {
        contentArea.innerHTML = `
          <div class="card" style="text-align: center;">
            <h3>Page Not Found</h3>
            <p style="margin-top: 8px;">The page you are looking for does not exist.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="appRouter.navigate('#/dashboard')">Go to Dashboard</button>
          </div>
        `;
      }
    }
    
    // Update active tab in bottom navigation
    this.updateActiveTab(route);
  },

  updateActiveTab(route) {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Map sub-routes to active parent tabs
    let activeIndex = 0; // default Dashboard
    if (route.startsWith('#/members')) activeIndex = 1;
    else if (route.startsWith('#/contributions') || route.startsWith('#/expenses') || route.startsWith('#/sponsors')) activeIndex = 2; // Finance
    else if (route.startsWith('#/approvals')) activeIndex = 3; // Approvals
    else if (route.startsWith('#/more') || route.startsWith('#/vendors') || route.startsWith('#/announcements') || route.startsWith('#/reports')) activeIndex = 4; // More
    
    if (navItems[activeIndex]) {
      navItems[activeIndex].classList.add('active');
    }
  }
};

window.appRouter = appRouter;
export default appRouter;
