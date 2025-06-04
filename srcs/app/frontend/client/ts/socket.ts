// socket.ts – singleton WebSocket + type‑safe message bus

import type { GameState } from './game.js';
import type { TLobbyState, TourneySummary } from './types.js';

export type ServerMessage =
  | { type: 'error';                payload: { message: string } }
  | { type: 'welcome';              payload: { userId: string } }
  | { type: 'matchFound';           payload: { gameId: string; mode: string; userId: string } }
  | { type: 'state';                state:   GameState }
  | { type: 'tournamentList';       payload: TourneySummary[] }
  | { type: 'joinedTLobby';         payload: { playerId: string; TLobby?: TLobbyState } }
  | { type: 'tournamentCreated';    payload: TLobbyState }
  | { type: 'tournamentUpdated';    payload: TLobbyState }
  | { type: 'tLobbyState';          payload: TLobbyState }
  | { type: 'matchAssigned';        payload: { tournamentId: string; matchId: string; players: { id: string; name: string }[] } }
  | { type: 'TournamentBracket';    payload: { tournamentId: string; rounds: { matchId: string; players: { id: string; name: string }[] }[] } }
  | { type: 'eliminated';           payload: { tournamentId: string; matchId: string; winnerId: string; reason: 'lostMatch' } }
  | { type: 'tournamentFinished';   payload: { tournamentId: string; winnerId: string } }
  | { type: "roundStarted", payload: { tournamentId: string, roundNumber: number } }
  | { type: 'tournamentBracketMsg'; payload: { tournamentId: string; rounds: { matchId: string; players: { id: string; name: string }[] }[] } };



export type MsgType = ServerMessage['type'];

type Listener<T extends MsgType> = (msg: Extract<ServerMessage, { type: T }>) => void;

const listeners: { [K in MsgType]?: Set<Listener<any>> } = {};

let socket: CustomWebSocket | null = null;

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

// let socket: CustomWebSocket | null = null;

interface CustomWebSocket extends WebSocket {
  _justFailed?: boolean;
}

function ensureSocket(): WebSocket {
  if (socket && socket.readyState <= WebSocket.OPEN) return socket;

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


export function getSocket(): WebSocket {
  return ensureSocket();
}

export function on<T extends MsgType>(type: T, cb: Listener<T>): void {
  (listeners[type] ??= new Set()).add(cb as any);
  // ensureSocket();
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
