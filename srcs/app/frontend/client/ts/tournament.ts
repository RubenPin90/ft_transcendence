  // tournaments.ts

  import type { TLobbyState, PlayerStub, MatchStub, BracketRounds, TourneySummary } from './types.js';
  import { getMyId, setCurrentTLobby } from './state.js';
  import { hideAllPages } from './helpers.js';
  declare const socket: WebSocket | undefined;

  function send<T extends object>(sock: WebSocket, msg: T) {
    sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
  }

  export function renderBracketOverlay(rounds: BracketRounds) {
    const overlay   = document.getElementById('bracket-overlay')  as HTMLDivElement;
    const beginBtn  = document.getElementById('bracket-begin-btn') as HTMLButtonElement;
    const cardTpl   = (document.getElementById('match-card-tpl') as HTMLTemplateElement).content;
  
    if (!overlay || !beginBtn || !cardTpl) {
      console.error('Bracket overlay HTML missing');
      return;
    }
    
    console.log('Rendering tournament bracket overlay with rounds:', rounds);

    /* wipe previous columns but keep the button */
    overlay.replaceChildren(beginBtn);
  
    /* build columns */
    /* build columns */
  rounds.forEach((round, rIdx) => {
    const col = document.createElement('div');
    col.className = 'round-col';

    const h3 = document.createElement('h3');
    h3.textContent = `Round ${rIdx + 1}`;
    col.appendChild(h3);

    round.forEach(match => {
      if (!match || !Array.isArray(match.players)) return;

      // clone the template fragment
      const card = cardTpl.cloneNode(true) as DocumentFragment;

      // explicitly fetch the two player-name divs
      const p1El = card.querySelector<HTMLDivElement>('.p1');
      const p2El = card.querySelector<HTMLDivElement>('.p2');

      if (!p1El || !p2El) {
        console.warn('Match-card template is missing .p1 or .p2');
        return;
      }

      const nam = (p: any) =>
        p && !('pendingMatchId' in p) ? p.name ?? p.id?.slice(0, 4) : '— TBD —';

      p1El.textContent = nam(match.players[0]) || 'BYE';
      p2El.textContent = nam(match.players[1]) || 'BYE';

      col.appendChild(card);
    });

    overlay.insertBefore(col, beginBtn); // keep button last
  });

  
    /* host-only “Begin” button */
    try {
      const TLobby = (window as any).getCurrentTLobby?.();
      const myId   = (window as any).getMyId?.();
      const amHost = TLobby && myId && TLobby.hostId === myId;
  
      beginBtn.hidden = !amHost;
      if (amHost) {
        beginBtn.onclick = () => {
          socket?.send(JSON.stringify({
            type: 'beginFirstRound',
            payload: { tournamentId: TLobby.id }
          }));
          overlay.hidden = true;
        };
      }
    } catch { beginBtn.hidden = true; }
  
    overlay.hidden = false;
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