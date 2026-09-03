// SCOT TOPAZ Core Team Portal - Utilities

// Currency formatter
export function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

// Date formatter
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Show Toast notification
export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background: none; border: none; color: inherit; font-weight: bold; cursor: pointer;">✕</button>
  `;
  
  // Close handler
  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => toast.remove());
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'none'; // reset animation
    toast.offsetHeight; // trigger reflow
    toast.style.animation = 'slideInUp 0.2s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// Open Bottom Sheet Modal
export function openBottomSheet(title, htmlContent) {
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  const sheet = document.getElementById('bottom-sheet');
  const content = document.getElementById('bottom-sheet-content');
  
  if (!backdrop || !sheet || !content) return;
  
  content.innerHTML = `
    <div class="bottom-sheet-header">
      <div class="bottom-sheet-title">${title}</div>
      <button onclick="appUtils.closeBottomSheet()" style="background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer;">✕</button>
    </div>
    <div class="bottom-sheet-body">
      ${htmlContent}
    </div>
  `;
  
  backdrop.classList.add('show');
  sheet.classList.add('show');
}

// Close Bottom Sheet Modal
export function closeBottomSheet() {
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  const sheet = document.getElementById('bottom-sheet');
  
  if (backdrop) backdrop.classList.remove('show');
  if (sheet) sheet.classList.remove('show');
}

// Export data to CSV
export function exportToCSV(filename, headers, rows) {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add headers
  csvContent += headers.join(",") + "\n";
  
  // Add rows
  rows.forEach(row => {
    const formattedRow = row.map(val => {
      // Escape commas and double quotes
      if (typeof val === 'string') {
        const cleaned = val.replace(/"/g, '""');
        return `"${cleaned}"`;
      }
      return val === null || val === undefined ? '' : val;
    });
    csvContent += formattedRow.join(",") + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link); // Required for FF
  
  link.click();
  document.body.removeChild(link);
}

// Helper to make custom HTML element out of SVG icons
export function getIconSvg(name, size = 20) {
  // Mapping of common Lucide icons used
  const icons = {
    chevronRight: '<polyline points="9 18 15 12 9 6"></polyline>',
    check: '<polyline points="20 6 9 17 4 12"></polyline>',
    x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    alertTriangle: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>'
  };

  const svgContent = icons[name] || '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}">${svgContent}</svg>`;
}

// Expose on window for easy click handlers
window.appUtils = {
  closeBottomSheet,
  openBottomSheet
};
