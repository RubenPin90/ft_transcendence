// socket.ts – singleton WebSocket + type-safe message bus

import type { GameState } from './game.js';
import type { TLobbyState, TourneySummary } from './types.js';
import { check_cookie_fe } from './redirect.js';

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

// You can replace this with actual token logic if needed
declare const authToken: string | null;
declare function getJwt(): string | null;

function isLoggedIn(): boolean {
  return !!authToken || !!getJwt();
}

function createSocket(): WebSocket {
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`
  );

  ws.addEventListener('message', ev => {
    const data: ServerMessage = JSON.parse(ev.data);
    if (data.type !== 'tournamentList' && data.type !== 'state')
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

  if (!isLoggedIn()) throw new Error('WebSocket requested before auth');

  if (socket && socket._justFailed) return socket;

  socket = createSocket() as CustomWebSocket;
  socket._justFailed = false;

  socket.addEventListener('close', () => {
    socket!._justFailed = true;
    setTimeout(() => {
      if (socket) socket._justFailed = false;
    }, 250);
    socket = null;
  });

  return socket;
}

/**
 * Call **after** your login request succeeds.
 * Returns when the WebSocket is fully open.
 */
export async function connect(): Promise<void> {
  const hasCookie = await check_cookie_fe();
  if (!hasCookie) throw new Error('User not authenticated – cookie missing');

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
