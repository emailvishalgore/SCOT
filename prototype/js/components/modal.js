export function openModal(contentHTML) {
  let overlay = document.getElementById('modal-overlay');
  
  if (!overlay) {
    // Create modal structure if it doesn't exist
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden opacity-0 transition-opacity duration-300';
    
    const container = document.createElement('div');
    container.id = 'modal-container';
    container.className = 'bg-white rounded-lg shadow-xl w-full max-w-md mx-4 transform scale-95 transition-transform duration-300 flex flex-col max-h-[90vh]';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 text-gray-500 hover:text-gray-800';
    closeBtn.innerHTML = '<i data-lucide="x"></i>';
    closeBtn.onclick = closeModal;
    
    const content = document.createElement('div');
    content.id = 'modal-content';
    content.className = 'p-6 overflow-y-auto';
    
    container.appendChild(closeBtn);
    container.appendChild(content);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Allow clicking outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  
  const contentEl = document.getElementById('modal-content');
  contentEl.innerHTML = contentHTML;
  
  // Show modal
  overlay.classList.remove('hidden');
  // Trigger reflow
  void overlay.offsetWidth;
  overlay.classList.remove('opacity-0');
  
  const container = document.getElementById('modal-container');
  if (container) {
    container.classList.remove('scale-95');
    container.classList.add('scale-100');
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  
  overlay.classList.add('opacity-0');
  
  const container = document.getElementById('modal-container');
  if (container) {
    container.classList.remove('scale-100');
    container.classList.add('scale-95');
  }
  
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}
