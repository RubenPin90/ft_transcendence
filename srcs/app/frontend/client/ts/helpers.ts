export function hideAllPages() {
  const pageIds = [
    'main-menu',
    'profile-page',
    'settings-page',
    'game-container',
    'tournament-page',
    't-lobby-page',
    'matchmaking-page',
    'bracket-overlay',
  ];

  for (const id of pageIds) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
}