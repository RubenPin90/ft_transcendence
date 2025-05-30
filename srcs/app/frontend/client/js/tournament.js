import { getMyId, setCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
function send(sock, msg) {
    sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
}
export function renderBracketOverlay(rounds) {
    var _a, _b, _c, _d;
    const overlay = document.getElementById('bracket-overlay');
    const beginBtn = document.getElementById('bracket-begin-btn');
    const cardTpl = document.getElementById('match-card-tpl').content;
    if (!overlay || !beginBtn || !cardTpl) {
        console.error('Bracket overlay HTML missing');
        return;
    }
    overlay.replaceChildren(beginBtn);
    rounds.forEach((round, rIdx) => {
        const col = document.createElement('div');
        col.className = 'round-col';
        const h3 = document.createElement('h3');
        h3.textContent = `Round ${rIdx + 1}`;
        col.appendChild(h3);
        round.forEach(match => {
            if (!match || !Array.isArray(match.players))
                return;
            const card = cardTpl.cloneNode(true);
            const p1El = card.querySelector('.p1');
            const p2El = card.querySelector('.p2');
            if (!p1El || !p2El) {
                console.warn('Match-card template is missing .p1 or .p2');
                return;
            }
            const nam = (p) => { var _a, _b; return p && !('pendingMatchId' in p) ? (_a = p.name) !== null && _a !== void 0 ? _a : (_b = p.id) === null || _b === void 0 ? void 0 : _b.slice(0, 4) : '— TBD —'; };
            p1El.textContent = nam(match.players[0]) || 'BYE';
            p2El.textContent = nam(match.players[1]) || 'BYE';
            col.appendChild(card);
        });
        overlay.insertBefore(col, beginBtn);
    });
    try {
        const TLobby = (_b = (_a = window).getCurrentTLobby) === null || _b === void 0 ? void 0 : _b.call(_a);
        const myId = (_d = (_c = window).getMyId) === null || _d === void 0 ? void 0 : _d.call(_c);
        const amHost = TLobby && myId && TLobby.hostId === myId;
        beginBtn.hidden = !amHost;
        if (amHost) {
            beginBtn.onclick = () => {
                socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
                    type: 'beginFirstRound',
                    payload: { tournamentId: TLobby.id }
                }));
                overlay.hidden = true;
            };
        }
    }
    catch (_e) {
        beginBtn.hidden = true;
    }
    overlay.hidden = false;
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
