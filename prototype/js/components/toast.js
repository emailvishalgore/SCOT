export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  
  // Base classes
  let bgColor = 'bg-green-500';
  let icon = 'check-circle';
  
  if (type === 'error') {
    bgColor = 'bg-red-500';
    icon = 'alert-circle';
  } else if (type === 'info') {
    bgColor = 'bg-blue-500';
    icon = 'info';
  }
  
  toast.className = `${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 transform translate-y-full opacity-0 transition-all duration-300`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-5 h-5"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  if (window.lucide) {
    window.lucide.createIcons({ root: toast });
  }
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-full', 'opacity-0');
  });
  
  // Auto remove
  setTimeout(() => {
    toast.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}
