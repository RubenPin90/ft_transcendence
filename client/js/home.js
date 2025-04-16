"use strict";
const navigate = (path) => {
    history.pushState({}, '', path);
    route(); // вызывай route() из main.ts
};
document.addEventListener('DOMContentLoaded', () => {
    const showPage = (pageId) => {
        const pages = ['profile-page', 'settings-page'];
        pages.forEach(id => {
            const el = document.getElementById(id);
            if (el)
                el.style.display = id === pageId ? 'block' : 'none';
        });
    };
    const settingsBtn = document.getElementById('settings-btn');
    const profileBtn = document.getElementById('profile-btn');
    const aiBtn = document.getElementById('sp-vs-pve-btn');
    const oneVsOneBtn = document.getElementById('one-vs-one-btn');
    const CustomgameBtn = document.getElementById('Customgame-btn');
    settingsBtn === null || settingsBtn === void 0 ? void 0 : settingsBtn.addEventListener('click', () => showPage('settings-page'));
    profileBtn === null || profileBtn === void 0 ? void 0 : profileBtn.addEventListener('click', () => showPage('profile-page'));
    // Updated navigation for game modes
    aiBtn === null || aiBtn === void 0 ? void 0 : aiBtn.addEventListener('click', () => navigate('/game/pve'));
    oneVsOneBtn === null || oneVsOneBtn === void 0 ? void 0 : oneVsOneBtn.addEventListener('click', () => navigate('/game/1v1'));
    CustomgameBtn === null || CustomgameBtn === void 0 ? void 0 : CustomgameBtn.addEventListener('click', () => navigate('/game/Customgame'));
});
