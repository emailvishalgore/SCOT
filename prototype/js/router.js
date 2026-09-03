const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigateTo(path) {
  window.location.hash = '#/' + path.replace(/^\/|^#\//, '');
}

export function getCurrentRoute() { return currentRoute; }

export function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash.slice(2) || 'dashboard'; // remove '#/'
    const container = document.getElementById('page-container');
    if (!container) return;
    
    // Find matching route (support params like events/:id)
    let handler = routes[hash];
    let params = {};
    
    if (!handler) {
      // Try parameterized routes
      for (const [pattern, h] of Object.entries(routes)) {
        const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
        const match = hash.match(regex);
        if (match) {
          handler = h;
          const paramNames = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
          paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
          break;
        }
      }
    }
    
    if (handler) {
      currentRoute = hash;
      container.innerHTML = '';
      container.classList.add('animate-fadeIn');
      handler(container, params);
      updateActiveNav(hash);
      setTimeout(() => container.classList.remove('animate-fadeIn'), 300);
    }
  };
  
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Initial route
}

function updateActiveNav(route) {
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkRoute = link.dataset.route;
    if (linkRoute) {
      link.classList.toggle('active', linkRoute === route || route.startsWith(linkRoute + '/'));
    }
  });
}
