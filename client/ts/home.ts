const navigate = (path: string) => {
  window.location.href = path;
};

document.addEventListener('DOMContentLoaded', () => {
  const showPage = (pageId: string) => {
      const pages = ['profile-page', 'settings-page'];
      pages.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = id === pageId ? 'block' : 'none';
      });
  };

  const settingsBtn = document.getElementById('settings-btn');
  const profileBtn = document.getElementById('profile-btn');
  const aiBtn = document.getElementById('sp-vs-ai-btn');
  const oneVsOneBtn = document.getElementById('one-vs-one-btn');
  const deathmatchBtn = document.getElementById('deathmatch-btn');

  settingsBtn?.addEventListener('click', () => showPage('settings-page'));
  profileBtn?.addEventListener('click', () => showPage('profile-page'));

  // Updated navigation for game modes
  aiBtn?.addEventListener('click', () => navigate('/game/ai'));
  oneVsOneBtn?.addEventListener('click', () => navigate('/game/1v1'));
  deathmatchBtn?.addEventListener('click', () => navigate('/game/deathmatch'));
});
