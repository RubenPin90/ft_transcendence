// socket.ts – singleton WebSocket + type‑safe message bus

import type { GameState } from './game.js';
import type { TLobbyState, TourneySummary } from './types.js';

export type ServerMessage =
  | { type: 'error';              payload: { message: string } }
  | { type: 'welcome';            payload: { userId: string } }
  | { type: 'matchFound';         payload: { gameId: string; mode: string; userId: string } }
  | { type: 'state';              state: GameState }
  | { type: 'tournamentList';     payload: TourneySummary[] }
  | { type: 'joinedTLobby';       payload: { playerId: string; TLobby?: TLobbyState } }
  | { type: 'tournamentCreated';  payload: TLobbyState }
  | { type: 'tournamentUpdated';  payload: TLobbyState }
  | { type: 'tLobbyState';        payload: TLobbyState }
  | { type: 'matchAssigned';      payload: { tournamentId: string; matchId: string; players: { id: string; name: string }[] } }
  | { type: 'TournamentBracket'; payload: { tournamentId: string; rounds: { matchId: string; players: { id: string; name: string }[] }[] } }
  | { type: 'tournamentBracketMsg'; payload: { tournamentId: string; rounds: { matchId: string; players: { id: string; name: string }[] }[] } };



export type MsgType = ServerMessage['type'];

type Listener<T extends MsgType> = (msg: Extract<ServerMessage, { type: T }>) => void;

const listeners: { [K in MsgType]?: Set<Listener<any>> } = {};

let socket: WebSocket | null = null;

function createSocket(): WebSocket {
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`
  );

  ws.addEventListener('message', ev => {
    const data: ServerMessage = JSON.parse(ev.data);
    if (data.type != 'tournamentList' && data.type != 'state')
      console.log(`[socket] ← ${data.type}`, data);
    listeners[data.type]?.forEach(cb => cb(data as any));
  });

  ws.addEventListener('close', () => {
    socket = null;
  });

  return ws;
}



function ensureSocket(): WebSocket {
  // ⬇️ Return the existing socket while it is CONNECTING (0) or OPEN (1)
  if (socket && socket.readyState <= WebSocket.OPEN) return socket;

  // ⬇️ *If we just failed*, give the stack a chance to unwind so we don’t spin
  if (socket && socket._justFailed) return socket as WebSocket; // bailout guard

  socket = createSocket();
  (socket as any)._justFailed = false;

  socket.addEventListener('close', () => {
    // Mark it as failed this tick; next tick we allow one reconnection try
    (socket as any)._justFailed = true;
    setTimeout(() => {
      if (socket) (socket as any)._justFailed = false;
    }, 250);               // ¼ s throttle – plenty to avoid a tight loop
    socket = null;
  });

  return socket;
}


export function getSocket(): WebSocket {
  return ensureSocket();
}

export function on<T extends MsgType>(type: T, cb: Listener<T>): void {
  (listeners[type] ??= new Set()).add(cb as any);
  ensureSocket();
}

export function off<T extends MsgType>(type: T, cb: Listener<T>): void {
  listeners[type]?.delete(cb as any);
}

export function send(data: unknown): void {
  ensureSocket().send(JSON.stringify(data));
}

export function disconnect(): void {
  socket?.close();
  socket = null;
}
