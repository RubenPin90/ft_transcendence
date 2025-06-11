export function hideAllPages() {
  const pageIds = [
    'main-menu',
    'profile-page',
    'settings-page',
    'game-container',
    'tournament-page',
    't-lobby-page',
    'bracket-overlay',
    'matchmaking_div',
  ];

  for (const id of pageIds) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
}