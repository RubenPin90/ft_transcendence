import { getMyId, setCurrentLobby } from './state.js';
import { hideAllPages } from './helpers.js';
export function joinByCode(socket, codeFromBtn) {
    var _a;
    const codeInput = document.getElementById('t-code-input');
    const code = ((_a = codeFromBtn !== null && codeFromBtn !== void 0 ? codeFromBtn : codeInput === null || codeInput === void 0 ? void 0 : codeInput.value) !== null && _a !== void 0 ? _a : '').trim();
    if (!code) {
        alert('Please enter a tournament code');
        return;
    }
    socket.send(JSON.stringify({
        type: 'joinByCode',
        payload: { code }
    }));
}
export function renderTournamentList(list, onJoin) {
    if (!Array.isArray(list))
        return;
    const box = document.getElementById('tournament-list');
    box.innerHTML = '';
    list.forEach(t => {
        var _a;
        const card = document.createElement('div');
        card.className = 't-card';
        card.innerHTML = `
        <div>
          <div>${t.name}</div>
          <div>${t.slots}</div>
        </div>
        <button class="join-btn" ${t.joinable ? '' : 'disabled'} data-code="${t.code}">
          ${t.joinable ? 'JOIN' : 'FULL'}
        </button>`;
        (_a = card.querySelector('.join-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', e => {
            const btn = e.currentTarget;
            if (btn.disabled)
                return;
            onJoin(btn.dataset.code);
        });
        box.appendChild(card);
    });
}
export function renderLobby(lobby) {
    var _a, _b, _c;
    setCurrentLobby(lobby);
    console.log('rendering lobby', lobby);
    const myId = getMyId();
    const amHost = lobby.hostId === myId;
    console.log('amHost', amHost);
    console.log('myId', myId);
    console.log('lobby', lobby);
    const me = lobby.players.find(p => p.id === myId);
    setCurrentLobby(lobby);
    const safePlayers = Array.isArray(lobby.players) ? lobby.players : [];
    // Check if everyone is ready
    const allReady = safePlayers.length === lobby.slots && safePlayers.every(p => p.ready);
    // --- Show only the correct page ---
    hideAllPages();
    const pageId = amHost ? 't-lobby-page' : 't-guest-lobby-page';
    document.getElementById(pageId).style.display = 'block';
    // --- Render player table ---
    const table = document.getElementById(amHost ? 't-lobby-table' : 't-guest-table');
    table.innerHTML = '';
    for (let idx = 0; idx < lobby.slots; idx++) {
        const p = safePlayers[idx];
        const row = document.createElement('div');
        row.className = 'lobby-row';
        row.innerHTML = `
        <span>${(_a = p === null || p === void 0 ? void 0 : p.name) !== null && _a !== void 0 ? _a : '— empty —'}</span>
        ${p ? `<span class="${p.ready ? 'green-dot' : 'red-dot'}"></span>` : '<span></span>'}
      `;
        table.appendChild(row);
    }
    // --- Host view ---
    if (amHost === true) {
        const shareInput = document.getElementById('t-share-code');
        shareInput.value = '#' + ((_b = lobby.code) !== null && _b !== void 0 ? _b : '----');
        const startBtn = document.getElementById('t-start-btn');
        startBtn.disabled = !allReady;
        return;
    }
    else {
        // --- Guest view ---
        const shareInput = document.getElementById('t-guest-share-code');
        shareInput.value = '#' + ((_c = lobby.code) !== null && _c !== void 0 ? _c : '----');
        const readyDot = document.getElementById('t-my-ready-dot');
        if (me)
            readyDot.className = me.ready ? 'green-dot' : 'red-dot';
        const status = document.getElementById('t-guest-status');
        if (!allReady) {
            status.textContent = 'Waiting for players…';
        }
        else {
            status.textContent = 'Waiting for host to start…';
        }
    }
}
