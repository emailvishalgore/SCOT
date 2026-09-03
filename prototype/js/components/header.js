export function initHeader() {
  const seasonSelector = document.getElementById('season-selector');
  if (seasonSelector) {
    seasonSelector.addEventListener('change', (e) => {
      console.log('Season changed to:', e.target.value);
      // Logic for season change could dispatch to store
    });
  }

  const headerProfile = document.getElementById('header-profile');
  if (headerProfile) {
    headerProfile.addEventListener('click', () => {
      console.log('Header profile clicked');
      // Could open a profile dropdown
    });
  }
}

export function updateHeaderProfile(user) {
  if (!user) return;
  const headerAvatar = document.getElementById('header-avatar');
  if (headerAvatar) {
    headerAvatar.textContent = user.avatar;
  }
}
