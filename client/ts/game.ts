import { on, off, send, getSocket } from './socket.js';
export type GameMode = 'pve' | '1v1' | 'Tournament';

interface PlayerState {
  id: string;
  y: number;
}

export interface GameState {
  roomId: string;
  players: PlayerState[];
  ball: { x: number; y: number } | null;
  scores: Record<string, number>;
  status: 'running' | 'paused' | 'finished';
  winner?: string;
}

let ctx: CanvasRenderingContext2D | null = null;
let userId: string | null = null;
let currentRoomId: string | null = null;
let ws: WebSocket | null = null;  // Declare ws globally
let inputHandlersRegistered = false;

let onGameEndCallback: ((winnerId: string) => void) | null = null;

const keysPressed: Record<string, boolean> = {};

export function setOnGameEnd(cb: (winnerId: string) => void): void {
  onGameEndCallback = cb;
}

export function initGameCanvas(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
}

export function startGame(mode: GameMode): void {
  ws = getSocket();

  if (!currentRoomId) {
    currentRoomId = localStorage.getItem('currentGameId');
  }
  if (!userId) {
    userId = localStorage.getItem('playerId');
  }

  if (mode === 'pve') {
    const sendJoinQueue = () => ws!.send(JSON.stringify({
      type: 'joinQueue',
      payload: { mode }
    }));
    if (ws.readyState === WebSocket.OPEN) sendJoinQueue();
    else ws.addEventListener('open', sendJoinQueue, { once: true });
  }

  const handleMessage = (ev: MessageEvent) => {
    const msg = JSON.parse(ev.data) as
      | { type: 'matchFound'; payload: { gameId: string; mode: string; userId: string } }
      | { type: 'state'; state: GameState };

    if (msg.type === 'matchFound') {
      currentRoomId = msg.payload.gameId;
      userId = msg.payload.userId;
      console.log(`Match ready: room=${currentRoomId}, user=${userId}`);
    } else if (msg.type === 'state') {
      drawFrame(msg.state);
      if (msg.state.status === 'finished') {
        console.log('Game finished! Winner =', msg.state.winner);
        stopGame();
        onGameEndCallback?.(msg.state.winner!);
      }
    }
    else {
      console.error('Unknown message type:', msg);
      return;
    }
  };

  ws.addEventListener('message', handleMessage);
  if (!inputHandlersRegistered) {
    setupInputHandlers();
    inputHandlersRegistered = true;
  }
}

export function stopGame(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'leaveGame',
      payload: { roomId: currentRoomId, userId }
    }));
    ws.close();
  }
  ws = null;
}

function drawFrame(state: GameState): void {
  if (!ctx) return;
  const canvas = ctx.canvas;
  const toX = (u: number) => u * canvas.width;
  const toY = (u: number) => u * canvas.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.ball) {
    const { x, y } = state.ball;
    ctx.beginPath();
    ctx.arc(toX(x), toY(y), 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  state.players.forEach((p, i) => {
    const x = i === 0 ? 10 : canvas.width - 25;
    ctx?.fillRect(x, toY(p.y) - 50, 15, 100);
  });

  ctx.font = '20px sans-serif';
  ctx.fillText(
    `${state.scores[state.players[0].id] || 0}`,
    canvas.width * 0.25,
    30
  );
  ctx.fillText(
    `${state.scores[state.players[1].id] || 0}`,
    canvas.width * 0.75,
    30
  );
}

function setupInputHandlers(): void {
  let moveInterval: number | null = null;

  // figure out current direction from keysPressed
  function getDirection(): 'up' | 'down' | null {
    if (keysPressed['ArrowUp'] && !keysPressed['ArrowDown']) return 'up';
    if (keysPressed['ArrowDown'] && !keysPressed['ArrowUp']) return 'down';
    return null;
  }

  // send a single movePaddle packet
  function sendMovement(active: boolean): void {
    if (!currentRoomId || !userId) return;
    const direction = getDirection();
    ws?.send(JSON.stringify({
      type: 'movePaddle',
      payload: {
        roomId: currentRoomId,
        userId,
        direction: active ? direction : 'stop',
        active
      }
    }));
  }

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && userId && currentRoomId) {
      if (!keysPressed[e.key]) {
        keysPressed[e.key] = true;
        sendMovement(true);
        if (moveInterval == null) {
          moveInterval = window.setInterval(() => {
            sendMovement(true);
          }, 1000 / 60);
        }
      }
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && userId && currentRoomId) {
      if (keysPressed[e.key]) {
        keysPressed[e.key] = false;
      }

      // if neither arrow is down, stop the loop
      if (!keysPressed['ArrowUp'] && !keysPressed['ArrowDown'] && moveInterval != null) {
        clearInterval(moveInterval);
        moveInterval = null;
        sendMovement(false);   // tell server we’ve stopped
      }
      e.preventDefault();
    }
  });
}
