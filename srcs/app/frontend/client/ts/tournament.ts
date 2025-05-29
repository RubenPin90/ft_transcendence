// tournaments.ts

import type { TLobbyState, PlayerStub, MatchStub } from './types.js';
import { getMyId, setCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
declare const socket: WebSocket | undefined;

function send<T extends object>(sock: WebSocket, msg: T) {
  sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
}

export function renderBracketOverlay(rounds: MatchStub[][]) {
  let el = document.getElementById('bracket-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bracket-overlay';
    el.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,.9); color:#fff;
      display:flex; gap:2rem; padding:2rem; overflow:auto;
      font-family:sans-serif;
    `;
    document.body.appendChild(el);
  } else {
    el.innerHTML = '';
  }

  // одна колонка = один раунд
  rounds.forEach((round, rIdx) => {
    const col = document.createElement('div');
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.style.gap = '1rem';
    col.innerHTML = `<h3 style="margin:0 0 .5rem 0">Round ${rIdx + 1}</h3>`;

    round.forEach((match, mIdx) => {
      // пропускаем placeholders без массива players
      if (!match || !Array.isArray(match.players)) return;

      const [p1, p2] = match.players;

      const card = document.createElement('div');
      card.style.cssText = `
        background:#222; border-radius:6px; padding:.6rem 1rem;
        display:flex; flex-direction:column; align-items:center; min-width:160px;
      `;

      const name = (p: any) =>
        p && !('pendingMatchId' in p)
          ? p.name ?? p.id?.slice(0, 4)
          : '— TBD —';

      card.innerHTML = `
        <div>${name(p1) || 'BYE'}</div>
        <div style="opacity:.6; margin:.3rem 0;">vs</div>
        <div>${name(p2) || 'BYE'}</div>
      `;
      col.appendChild(card);
    });

    el.appendChild(col);
  });
  try {
    // ① Определяем, я ли хост
    const TLobby = (window as any).getCurrentTLobby?.();
    const myId   = (window as any).getMyId?.();
    const amHost = TLobby && myId && TLobby.hostId === myId;
  
    if (amHost && typeof socket !== 'undefined') {
      const btn = document.createElement('button');
      btn.textContent = 'Begin round 1';
      btn.style.cssText = `
        margin-top:2rem; align-self:center; padding:.6rem 1.4rem;
        font-size:1rem; background:#357; color:#fff; border:none;
        border-radius:6px; cursor:pointer;
      `;
      btn.onclick = () => {
        socket!.send(JSON.stringify({
          type   : 'beginFirstRound',
          payload: { tournamentId: TLobby.id }
        }));
        // убираем оверлей сразу после клика
        el?.remove();
      };
      el.appendChild(btn);
    }
  } catch (_) { /* no-op if helpers are not available */ }
  
}




export interface TourneySummary {
  id: string;
  code: string;
  name: string;
  slots: string;
  joinable: boolean;
}

/** Join a tournament via its 4‑letter invitation code. */
export function joinByCode(socket: WebSocket, codeFromBtn?: string) {
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null;
  const code = (codeFromBtn ?? codeInput?.value ?? '').trim();

  if (!code) {
    alert('Please enter a tournament code');
    return;
  }

  socket.send(
    JSON.stringify({
      type: 'joinByCode',
      payload: { code },
    }),
  );
}

/** Render the tournament selection list (right column on the page). */
export function renderTournamentList(list: TourneySummary[], onJoin: (code: string) => void) {
  if (!Array.isArray(list)) return;
  const box = document.getElementById('tournament-list')!;
  box.innerHTML = '';

  list.forEach((t) => {
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

    card.querySelector<HTMLButtonElement>('.join-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (btn.disabled) return;
      onJoin(btn.dataset.code!);
    });

    box.appendChild(card);
  });
}

/* ------------------------------------------------------------------ *
 * Lobby rendering – called whenever the server pushes a new TLobbyState
 * ------------------------------------------------------------------ */

/**
 * Re-render the tournament lobby page.
 * Expects `TLobby.slots` to be a **number**, but will gracefully fall back
 * to `players.length` if it isn’t.
 */
export function renderTLobby(TLobby: TLobbyState, sock: WebSocket) {
  /* ---------- cache & locals --------------------------------------- */
  setCurrentTLobby(TLobby);
  //console.log('socket', sock);

  const myId   = getMyId();
  const amHost = TLobby.hostId === myId;
  const players = Array.isArray(TLobby.players) ? TLobby.players : [];

  /* ---------- UI helpers ------------------------------------------- */
  const totalSlots =
    typeof TLobby.slots === 'number'
      ? TLobby.slots
      : Number.parseInt(String(TLobby.slots), 10) || players.length;

  const displayName = (p: typeof players[number]) => {
    const youMark  = p.id === myId      ? ' (you)' : '';
    const hostMark = p.id === TLobby.hostId ? ' ⭐️'   : '';
    const shortId  = p.id.slice(0, 4);            // e.g. “a1b2”
    return `${p.name}${youMark}${hostMark}  [${shortId}]`;
  };

  /* ---------- page switching --------------------------------------- */
  hideAllPages();
  document.getElementById('t-lobby-page')!.style.display = 'block';

  /* ---------- player table ----------------------------------------- */
  const table = document.getElementById('t-lobby-table')!;
  table.innerHTML = '';

  const frag = document.createDocumentFragment();

  for (let i = 0; i < totalSlots; i++) {
    const p        = players[i];
    const isFilled = Boolean(p);

    const row = document.createElement('div');
    row.className = 'TLobby-row';

    /* name + id */
    const nameSpan       = document.createElement('span');
    nameSpan.className   = 't-name';
    nameSpan.textContent = isFilled ? displayName(p!) : '— empty —';
    row.appendChild(nameSpan);

    /* ready indicator */
    //console.log(`Player ${p?.name} ready: ${p?.ready}`);
    const dot = document.createElement('span');
    dot.className = 't-status';
    if (isFilled) dot.classList.add(p!.ready ? 'green-dot' : 'red-dot');
    row.appendChild(dot);

    if (isFilled && p!.ready) {
      const readyLbl = document.createElement('span');
      readyLbl.className = 't-ready-label';
      readyLbl.textContent = ' ready';
      row.appendChild(readyLbl);
    }

    /* kick button (host only, not yourself) */
    if (amHost && isFilled && p!.id !== myId) {
      const kick = document.createElement('button');
      kick.className   = 'kick-btn';
      kick.dataset.id  = p!.id;
      kick.textContent = 'Kick';
      row.appendChild(kick);
    }

    frag.appendChild(row);
  }

  table.appendChild(frag);

  /* ---------- kick-button handlers (host only) --------------------- */
  if (amHost) {
    table.querySelectorAll<HTMLButtonElement>('.kick-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.id;
        if (!pid) return;
        if (!confirm('Kick this player from the lobby?')) return;
        send(sock, { type: 'kickPlayer', payload: { playerId: pid } });
      };
    });
  }

  /* ---------- share code ------------------------------------------- */
  (document.getElementById('t-share-code') as HTMLInputElement).value =
    '#' + (TLobby.code ?? '----');

  /* ---------- controls and status ---------------------------------- */
  const allReady =
    players.length === totalSlots && players.every(p => p.ready);

  (document.getElementById('host-controls')   as HTMLElement).style.display =
    amHost ? 'block' : 'none';
  (document.getElementById('player-controls') as HTMLElement).style.display =
    amHost ? 'none'  : 'block';

  (document.getElementById('t-start-btn') as HTMLButtonElement).disabled = !allReady;

  const me = players.find(p => p.id === myId);
  (document.getElementById('t-my-ready-dot') as HTMLSpanElement).className =
    me?.ready ? 'green-dot' : 'red-dot';

  const statusEl = document.getElementById('t-lobby-status')!;
  statusEl.textContent = amHost
    ? `Waiting for players… (${players.length}/${totalSlots})`
    : allReady
      ? 'Waiting for host to start…'
      : 'Waiting for players…';
}