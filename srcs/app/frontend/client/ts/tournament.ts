  // tournaments.ts

  import type { TLobbyState, PlayerStub, MatchStub, BracketRounds, TourneySummary } from './types.js';
  import { getMyId, setCurrentTLobby } from './state.js';
  import { hideAllPages } from './helpers.js';
  declare const socket: WebSocket | undefined;

  function send<T extends object>(sock: WebSocket, msg: T) {
    sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
  }

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
          <div class="text-black font-bold text-base">${t.name}</div>
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

  export async function renderTLobby(TLobby: TLobbyState, sock: WebSocket) {
    setCurrentTLobby(TLobby);

    const myId   = getMyId();
    const amHost = TLobby.hostId === myId;
    const players = Array.isArray(TLobby.players) ? TLobby.players : [];

    const totalSlots =
      typeof TLobby.slots === 'number'
        ? TLobby.slots
        : Number.parseInt(String(TLobby.slots), 10) || players.length;

    const displayName = (p: typeof players[number]) => {
      const youMark  = p.id === myId      ? ' (you)' : '';
      const hostMark = p.id === TLobby.hostId ? ' ★'   : '';
      return `${p.name}${youMark}${hostMark}`;
    };

    hideAllPages();
    (document.getElementById('t-lobby-page') as HTMLElement)?.classList.remove('hidden');
    (document.getElementById('t-lobby-page') as HTMLElement)?.classList.add('block');

    const table = document.getElementById('t-lobby-table')!;
    table.innerHTML = '';

    const frag = document.createDocumentFragment();

    for (let i = 0; i < totalSlots; i++) {
      const p        = players[i];
      const isFilled = Boolean(p);

      const row = document.createElement('div');
      row.className = 'TLobby-row';

      const nameSpan       = document.createElement('span');
      nameSpan.className   = 't-name';
      nameSpan.textContent = isFilled ? displayName(p!) : '— empty —';
      row.appendChild(nameSpan);

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

      frag.appendChild(row);
    }

    table.appendChild(frag);


    const allReady =
      players.length === totalSlots && players.every(p => p.ready);

    const hostControls = document.getElementById('host-controls') as HTMLElement;
    const playerControls = document.getElementById('player-controls') as HTMLElement;
    if (amHost) {
      hostControls.classList.remove('hidden');
      playerControls.classList.add('hidden');
    } else {
      hostControls.classList.add('hidden');
      playerControls.classList.remove('hidden');
    }

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