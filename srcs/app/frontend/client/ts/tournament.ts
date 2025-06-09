  // tournaments.ts

  import type { TLobbyState, PlayerStub, MatchStub, BracketRounds, TourneySummary } from './types.js';
  import { getMyId, setCurrentTLobby } from './state.js';
  import { hideAllPages } from './helpers.js';
  declare const socket: WebSocket | undefined;

  function send<T extends object>(sock: WebSocket, msg: T) {
    sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(msg));
  }

  //TODO: remove button logic 
  export function renderBracketOverlay(rounds: BracketRounds) {
    const overlay = document.getElementById('bracket-overlay') as HTMLDivElement;
    const cardTpl = (document.getElementById('match-card-tpl') as HTMLTemplateElement).content;
  
    if (!overlay || !cardTpl) {
      console.error('Bracket overlay HTML missing');
      return;
    }
  
    console.log('Rendering tournament bracket overlay with rounds:', rounds);
  
    // Clear out any existing children (no begin button)
    overlay.replaceChildren();
  
    rounds.forEach((round, rIdx) => {
      const col = document.createElement('div');
      col.className = 'round-col';
  
      const h3 = document.createElement('h3');
      h3.textContent = `Round ${rIdx + 1}`;
      col.appendChild(h3);
  
      round.forEach(match => {
        if (!match || !Array.isArray(match.players)) return;
  
        const card = cardTpl.cloneNode(true) as DocumentFragment;
  
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
  
      overlay.appendChild(col);
    });
  
    overlay.hidden = false;
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

  export async function renderTLobby(TLobby: TLobbyState, sock: WebSocket) {
    setCurrentTLobby(TLobby);

    const myId   = getMyId();
    //key
    const myName = await fetch('/get_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "get": "keys",
        }),
    });
    console.log (`myName: ${myName}: `, myName);
  
    const amHost = TLobby.hostId === myId;
    const players = Array.isArray(TLobby.players) ? TLobby.players : [];

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

    hideAllPages();
    document.getElementById('t-lobby-page')!.style.display = 'block';

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

      frag.appendChild(row);
    }

    table.appendChild(frag);


    (document.getElementById('t-share-code') as HTMLInputElement).value =
      '#' + (TLobby.code ?? '----');

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