import { getMyId, setCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
function send(sock, msg) {
    sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
}
export function renderBracketOverlay(rounds) {
    let el = document.getElementById('bracket-overlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'bracket-overlay';
        el.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,.9);color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-family:sans-serif;overflow:auto;
    `;
        document.body.appendChild(el);
    }
    else {
        el.innerHTML = '';
    }
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '1rem';
    rounds.forEach((match) => {
        var _a, _b, _c, _d;
        const card = document.createElement('div');
        card.style.padding = '0.6rem 1rem';
        card.style.background = '#222';
        card.style.borderRadius = '6px';
        card.innerHTML = `
      <div>${(_b = (_a = match.players[0]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'BYE'}</div>
      <div style="text-align:center;">vs</div>
      <div>${(_d = (_c = match.players[1]) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'BYE'}</div>
    `;
        wrapper.appendChild(card);
    });
    el.appendChild(wrapper);
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.transition = 'opacity .3s';
        el.style.opacity = '0';
    }, 4700);
    setTimeout(() => el.remove(), 5100);
}
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
        payload: { code },
    }));
}
export function renderTournamentList(list, onJoin) {
    if (!Array.isArray(list))
        return;
    const box = document.getElementById('tournament-list');
    box.innerHTML = '';
    list.forEach((t) => {
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
        (_a = card.querySelector('.join-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (btn.disabled)
                return;
            onJoin(btn.dataset.code);
        });
        box.appendChild(card);
    });
}
export function renderTLobby(TLobby, sock) {
    var _a;
    setCurrentTLobby(TLobby);
    console.log('socket', sock);
    const myId = getMyId();
    const amHost = TLobby.hostId === myId;
    const players = Array.isArray(TLobby.players) ? TLobby.players : [];
    const totalSlots = typeof TLobby.slots === 'number'
        ? TLobby.slots
        : Number.parseInt(String(TLobby.slots), 10) || players.length;
    const displayName = (p) => {
        const youMark = p.id === myId ? ' (you)' : '';
        const hostMark = p.id === TLobby.hostId ? ' ⭐️' : '';
        const shortId = p.id.slice(0, 4);
        return `${p.name}${youMark}${hostMark}  [${shortId}]`;
    };
    hideAllPages();
    document.getElementById('t-lobby-page').style.display = 'block';
    const table = document.getElementById('t-lobby-table');
    table.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < totalSlots; i++) {
        const p = players[i];
        const isFilled = Boolean(p);
        const row = document.createElement('div');
        row.className = 'TLobby-row';
        const nameSpan = document.createElement('span');
        nameSpan.className = 't-name';
        nameSpan.textContent = isFilled ? displayName(p) : '— empty —';
        row.appendChild(nameSpan);
        console.log(`Player ${p === null || p === void 0 ? void 0 : p.name} ready: ${p === null || p === void 0 ? void 0 : p.ready}`);
        const dot = document.createElement('span');
        dot.className = 't-status';
        if (isFilled)
            dot.classList.add(p.ready ? 'green-dot' : 'red-dot');
        row.appendChild(dot);
        if (isFilled && p.ready) {
            const readyLbl = document.createElement('span');
            readyLbl.className = 't-ready-label';
            readyLbl.textContent = ' ready';
            row.appendChild(readyLbl);
        }
        if (amHost && isFilled && p.id !== myId) {
            const kick = document.createElement('button');
            kick.className = 'kick-btn';
            kick.dataset.id = p.id;
            kick.textContent = 'Kick';
            row.appendChild(kick);
        }
        frag.appendChild(row);
    }
    table.appendChild(frag);
    if (amHost) {
        table.querySelectorAll('.kick-btn').forEach(btn => {
            btn.onclick = () => {
                const pid = btn.dataset.id;
                if (!pid)
                    return;
                if (!confirm('Kick this player from the lobby?'))
                    return;
                send(sock, { type: 'kickPlayer', payload: { playerId: pid } });
            };
        });
    }
    document.getElementById('t-share-code').value =
        '#' + ((_a = TLobby.code) !== null && _a !== void 0 ? _a : '----');
    const allReady = players.length === totalSlots && players.every(p => p.ready);
    document.getElementById('host-controls').style.display =
        amHost ? 'block' : 'none';
    document.getElementById('player-controls').style.display =
        amHost ? 'none' : 'block';
    document.getElementById('t-start-btn').disabled = !allReady;
    const me = players.find(p => p.id === myId);
    document.getElementById('t-my-ready-dot').className =
        (me === null || me === void 0 ? void 0 : me.ready) ? 'green-dot' : 'red-dot';
    const statusEl = document.getElementById('t-lobby-status');
    statusEl.textContent = amHost
        ? `Waiting for players… (${players.length}/${totalSlots})`
        : allReady
            ? 'Waiting for host to start…'
            : 'Waiting for players…';
}
