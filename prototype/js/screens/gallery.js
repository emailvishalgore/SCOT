import { store } from '../store.js';
import { navigateTo } from '../router.js';

export function render(container, params) {
  // albums mock data
  const albums = [
    { id: 1, title: 'Season 2025 Highlights', count: 24, seed: 'highlight' },
    { id: 2, title: 'Carrom Tournament 2025', count: 18, seed: 'carrom' },
    { id: 3, title: 'Ganesh Festival 2025', count: 42, seed: 'ganesh' },
    { id: 4, title: 'Sports Day 2025', count: 31, seed: 'sports' }
  ];

  container.innerHTML = `
    <header class="page-header">
      <h1 class="heading-primary" style="font-family: 'Fira Code', monospace; color: #4C1D95; margin-bottom: 0.25rem;">Gallery</h1>
      <p class="text-secondary subtitle" style="color: #6B7280; margin-top: 0;">Event Highlights & Memories</p>
    </header>
    
    <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
      ${albums.map(album => `
        <div class="card album-card" data-id="${album.id}" style="position: relative; overflow: hidden; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); aspect-ratio: 4/3;">
          <img class="album-cover" src="https://picsum.photos/seed/${album.seed}/400/300" alt="${album.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" />
          <div class="album-badge" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 4px; font-size: 0.85rem; font-weight: bold;">
            <i data-lucide="image" style="width: 14px; height: 14px;"></i> ${album.count}
          </div>
          <div class="album-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 24px 16px 16px; color: white;">
            <h3 class="heading-secondary" style="margin: 0; font-family: 'Fira Code', monospace; font-size: 1.1rem;">${album.title}</h3>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Lightbox -->
    <div id="lightbox" class="lightbox" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;">
      <div class="lightbox-header" style="position: absolute; top: 20px; right: 20px; display: flex; align-items: center; gap: 1rem; color: white;">
        <span id="photo-counter" style="font-family: 'Fira Code', monospace; font-size: 1.1rem;"></span>
        <button id="close-lightbox" class="btn btn-icon" style="background: transparent; color: white; border: none; cursor: pointer; padding: 8px; border-radius: 50%;">
          <i data-lucide="x" style="width: 28px; height: 28px;"></i>
        </button>
      </div>
      
      <button id="prev-photo" class="btn btn-icon" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); color: white; cursor: pointer; border: none; padding: 12px; border-radius: 50%; z-index: 10;">
        <i data-lucide="chevron-left" style="width: 32px; height: 32px;"></i>
      </button>
      
      <img id="lightbox-img" class="lightbox-image" src="" alt="Gallery Image" style="max-width: 90%; max-height: 85vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: opacity 0.2s ease; opacity: 0;" />
      
      <button id="next-photo" class="btn btn-icon" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); color: white; cursor: pointer; border: none; padding: 12px; border-radius: 50%; z-index: 10;">
        <i data-lucide="chevron-right" style="width: 32px; height: 32px;"></i>
      </button>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Lightbox logic
  const lightbox = container.querySelector('#lightbox');
  const lightboxImg = container.querySelector('#lightbox-img');
  const closeBtn = container.querySelector('#close-lightbox');
  const prevBtn = container.querySelector('#prev-photo');
  const nextBtn = container.querySelector('#next-photo');
  const counter = container.querySelector('#photo-counter');
  
  let currentAlbum = null;
  let currentPhotoIndex = 0;
  let photos = [];

  const openLightbox = (albumId) => {
    currentAlbum = albums.find(a => a.id === parseInt(albumId));
    if (!currentAlbum) return;
    
    // Generate mock photos for the album
    const numPhotos = Math.min(currentAlbum.count, 8); // Limit to 8 for demo
    photos = Array.from({length: numPhotos}, (_, i) => `https://picsum.photos/seed/${currentAlbum.seed}_${i}/1024/768`);
    
    currentPhotoIndex = 0;
    updateLightbox();
    
    lightbox.style.display = 'flex';
    // Force reflow
    void lightbox.offsetWidth;
    lightbox.style.opacity = '1';
    
    document.addEventListener('keydown', handleKeydown);
  };

  const closeLightboxView = () => {
    lightbox.style.opacity = '0';
    setTimeout(() => {
      lightbox.style.display = 'none';
    }, 300);
    document.removeEventListener('keydown', handleKeydown);
  };

  const updateLightbox = () => {
    lightboxImg.style.opacity = '0';
    setTimeout(() => {
      lightboxImg.src = photos[currentPhotoIndex];
      lightboxImg.onload = () => {
        lightboxImg.style.opacity = '1';
      };
      counter.textContent = `${currentPhotoIndex + 1} / ${photos.length}`;
    }, 200);
  };

  const nextPhoto = () => {
    currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
    updateLightbox();
  };

  const prevPhoto = () => {
    currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
    updateLightbox();
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') closeLightboxView();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
  };

  // Event Listeners
  container.querySelectorAll('.album-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.querySelector('.album-cover').style.transform = 'scale(1.05)';
    });
    card.addEventListener('mouseleave', () => {
      card.querySelector('.album-cover').style.transform = 'scale(1)';
    });
    card.addEventListener('click', (e) => {
      openLightbox(e.currentTarget.dataset.id);
    });
  });

  closeBtn.addEventListener('click', closeLightboxView);
  nextBtn.addEventListener('click', nextPhoto);
  prevBtn.addEventListener('click', prevPhoto);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightboxView();
  });
}
