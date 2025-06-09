// socket.ts – singleton WebSocket + type-safe message bus

import type { GameState } from './game.js';
import type { TLobbyState, TourneySummary } from './types.js';
import { check_cookie_fe, check_cookies_expire } from './redirect.js';

export type ServerMessage =
  | { type: 'error';                payload: { message: string } }
  | { type: 'welcome';              payload: { userId: string } }
  | { type: 'matchFound';           payload: { gameId: string; mode: string; userId: string } }
  | { type: 'state';                state: GameState }
  | { type: 'tournamentList';       payload: TourneySummary[] }
  | { type: 'joinedTLobby';         payload: { playerId: string; TLobby?: TLobbyState } }
  | { type: 'tournamentCreated';    payload: TLobbyState }
  | { type: 'tournamentUpdated';    payload: TLobbyState }
  | { type: 'tLobbyState';          payload: TLobbyState }
  | { type: 'matchAssigned';        payload: { tournamentId: string; matchId: string; players: { id: string; name: string }[] } }
  | { type: 'TournamentBracket';    payload: { tournamentId: string; rounds: { matchId: string; players: { id: string; name: string }[] }[] } }
  | { type: 'eliminated';           payload: { tournamentId: string; matchId: string; winnerId: string; reason: 'lostMatch' } }
  | { type: 'tournamentFinished';   payload: { tournamentId: string; winnerId: string } }
  | { type: 'roundStarted';         payload: { tournamentId: string; roundNumber: number } }
  | { type: 'tournamentBracketMsg'; payload: { tournamentId: string; rounds: { matchId: string; players: { id: string; name: string }[] }[] } };

export type MsgType = ServerMessage['type'];
type Listener<T extends MsgType> = (msg: Extract<ServerMessage, { type: T }>) => void;

const listeners: { [K in MsgType]?: Set<Listener<any>> } = {};

interface CustomWebSocket extends WebSocket {
  _justFailed?: boolean;
}

let socket: CustomWebSocket | null = null;

declare const authToken: string | null;


function isLoggedIn(): boolean {
  return !!localStorage.getItem('playerId');
}


function getJwt(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function createSocket(): WebSocket {
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`
  );

  ws.addEventListener('message', ev => {
    const data: ServerMessage = JSON.parse(ev.data);
    if (data.type !== 'tournamentList' && data.type !== 'state' && data.type !== 'tLobbyState')
      console.log(`[socket] ← ${data.type}`, data);
    listeners[data.type]?.forEach(cb => cb(data as any));
  });

  ws.addEventListener('close', () => {
    socket = null;
  });

  return ws;
}

function ensureSocket(): WebSocket {
  if (socket && socket.readyState <= WebSocket.OPEN) return socket;

  if (socket?._justFailed) return socket;

  if (!isLoggedIn()) throw new Error('WebSocket requested before auth');

  socket = createSocket() as CustomWebSocket;
  socket._justFailed = false;

  socket.addEventListener('close', () => {
    socket!._justFailed = true;
    const ref = socket;
    setTimeout(() => {
      if (socket === ref) socket = null;
    }, 250);
  });

  return socket;
}



export async function connect(): Promise<void> {
  const hasCookie = await check_cookie_fe();
  if (!hasCookie) throw new Error('User not authenticated – cookie missing');

  const expiredCookie = await check_cookies_expire();
  if (expiredCookie) {
    history.pushState({}, '', '/');
    throw new Error('User not authenticated – cookie expired');
  } 
  if (localStorage.getItem('playerId') != null) {
    localStorage.removeItem('playerId');
  }
  if (localStorage.getItem('currentGameId') != null) {
    localStorage.removeItem('currentGameId');
  }

  if (socket && socket.readyState === WebSocket.OPEN) return;

  return new Promise<void>((resolve, reject) => {
    try {
      socket = createSocket() as CustomWebSocket;
    } catch (err) {
      reject(err);
      return;
    }

    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', reject);
  });
}

export function getSocket(): WebSocket {
  return ensureSocket();
}

export function send(data: unknown): void {
  ensureSocket().send(JSON.stringify(data));
}

export function on<T extends MsgType>(type: T, cb: Listener<T>): void {
  (listeners[type] ??= new Set()).add(cb as any);
}

export function off<T extends MsgType>(type: T, cb: Listener<T>): void {
  listeners[type]?.delete(cb as any);
}

export function disconnect(): void {
  socket?.close();
  socket = null;
}
