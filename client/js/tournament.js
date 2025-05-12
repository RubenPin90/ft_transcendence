// tournaments.ts
// -------------------------------------------------------------------
// Handles tournament lobby UI
// -------------------------------------------------------------------
import { getMyId, setCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
function send(sock, msg) {
    sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
}
/** Join a tournament via its 4‑letter invitation code. */
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
/** Render the tournament selection list (right column on the page). */
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
/* ------------------------------------------------------------------ *
 * Lobby rendering – called whenever the server pushes a new TLobbyState
 * ------------------------------------------------------------------ */
export function renderTLobby(TLobby, sock) {
    var _a;
    // cache latest lobby in global state
    setCurrentTLobby(TLobby);
    // handy locals
    const myId = getMyId();
    const amHost = TLobby.hostId === myId;
    const players = Array.isArray(TLobby.players) ? TLobby.players : [];
    if (amHost) {
        console.log('testing amHost', TLobby.hostId, myId);
    }
    /* ---------- show page & hide others -------------------------------- */
    hideAllPages();
    document.getElementById('t-lobby-page').style.display = 'block';
    /* ---------- player table ------------------------------------------- */
    const table = document.getElementById('t-lobby-table');
    table.innerHTML = '';
    // Build one row per slot (filled or empty)
    for (let i = 0; i < TLobby.slots; i++) {
        const p = players[i];
        const isFilled = Boolean(p);
        // prettier‑ignore
        table.insertAdjacentHTML('beforeend', `<div class="TLobby-row">
         <span class="t-name">${isFilled ? p.name : '— empty —'}</span>
         <span class="t-status ${isFilled ? (p.ready ? 'green-dot' : 'red-dot') : ''}"></span>
         ${amHost && isFilled && p.id !== myId ? `<button class="kick-btn" data-id="${p.id}">Kick</button>` : ''}
       </div>`);
    }
    /* ----- attach kick events (host only) ------------------------------ */
    if (amHost) {
        table.querySelectorAll('.kick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.dataset.id;
                if (!pid)
                    return;
                if (!confirm('Kick this player from the lobby?'))
                    return;
                send(sock, { type: 'kickPlayer', payload: { playerId: pid } });
            });
        });
    }
    /* ---------- share‑code widget -------------------------------------- */
    document.getElementById('t-share-code').value = '#' + ((_a = TLobby.code) !== null && _a !== void 0 ? _a : '----');
    /* ---------- host / player control blocks --------------------------- */
    const allReady = players.length === TLobby.slots && players.every((p) => p.ready);
    const hostControls = document.getElementById('host-controls');
    const playerControls = document.getElementById('player-controls');
    hostControls.style.display = amHost ? 'block' : 'none';
    playerControls.style.display = amHost ? 'none' : 'block';
    // START button (host)
    const startBtn = document.getElementById('t-start-btn');
    startBtn.disabled = !allReady;
    if (amHost && !startBtn.onclick) {
        startBtn.onclick = () => send(sock, { type: 'startTournament' });
    }
    const readyBtn = document.getElementById('t-ready-btn');
    const myReadyDot = document.getElementById('t-my-ready-dot');
    const me = players.find((p) => p.id === myId);
    myReadyDot.className = (me === null || me === void 0 ? void 0 : me.ready) ? 'green-dot' : 'red-dot';
    if (!amHost && !readyBtn.onclick) {
        readyBtn.onclick = () => send(sock, { type: 'toggleReady', payload: { tournamentId: TLobby.id } });
    }
    /* ---------- headline status ---------------------------------------- */
    const status = document.getElementById('t-lobby-status');
    status.textContent = amHost
        ? `Waiting for players… (${players.length}/${TLobby.slots})`
        : allReady
            ? 'Waiting for host to start…'
            : 'Waiting for players…';
}
