import { on, off, send, getSocket } from './socket.js';
import type { ServerMessage } from './socket.js';
export type GameMode = 'pve' | '1v1' | 'Tournament';

interface PlayerState {
  id: string;
  y: number;
}

let searchingForMatch = false;


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
let ws: WebSocket | null = null;
let inputHandlersRegistered = false;

const keysPressed: Record<string, boolean> = {};

let gameEndCb: ((winnerId: string) => void) | null = null;

let matchFoundListener: ((msg: Extract<ServerMessage, { type: 'matchFound' }>) => void) | null = null;
let stateListener:      ((msg: Extract<ServerMessage, { type: 'state' }>)      => void) | null = null;


export function setOnGameEnd(cb: (winnerId: string) => void): void {
  gameEndCb = cb;
}


export function initGameCanvas(): void {
  const main_div = document.getElementById('game-main-container')!.classList.replace('field', 'game_field');

  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    alert("GAME CANVAS NOT FOUND");
    return;
  }
  ctx = canvas.getContext('2d');
  setInterval(() => {
    return ;
  }, 5000);
}


export function startGame(mode: GameMode): void {
  ws = getSocket();
  // console.log('[startGame] called, ws readyState:', ws?.readyState, 'mode:', mode);
  userId        = localStorage.getItem('playerId');
  currentRoomId = localStorage.getItem('currentGameId');
  if (!userId) {
    userId = localStorage.getItem('playerId');
  }
  if (!currentRoomId) {
    currentRoomId = localStorage.getItem('currentGameId');
  }

  if (mode === 'pve') {
    if (searchingForMatch) return;
    searchingForMatch = true;
    const sendJoinQueue = () =>{
      // console.log('[startGame] sending joinQueue for mode:', mode);
      send({ type: 'joinQueue', payload: { mode } });
    }
  
    if (ws.readyState === WebSocket.OPEN) {
      sendJoinQueue();
    } else {
      ws.addEventListener('open', sendJoinQueue, { once: true });
    }
  }
  

  if (!matchFoundListener) {
    matchFoundListener = (msg) => {
      searchingForMatch = false;
      currentRoomId = msg.payload.gameId;
      userId        = msg.payload.userId;
      localStorage.setItem('currentGameId', currentRoomId);
      // console.log(`Match ready: room=${currentRoomId}, user=${userId}`);
    };
    on('matchFound', matchFoundListener);
  }

  if (!stateListener) {
    stateListener = (msg) => {
      drawFrame(msg.state);
      if (msg.state.status === 'finished') {
        stopGame();
        if (msg.state.winner != null && gameEndCb) {
          gameEndCb(msg.state.winner);
        }
      }
    };
    on('state', stateListener);
  }

  if (!inputHandlersRegistered) {
    setupInputHandlers();
    inputHandlersRegistered = true;
  }
}

export function stopGame(): void {
  searchingForMatch = false;
  if (ws && ws.readyState === WebSocket.OPEN && currentRoomId !== null) {
    // const main_div = document.getElementById('game-main-container')!.classList.replace('game_field', 'field');
    // alert("LEFT GAME");
    send({ type: 'leaveGame', payload: { roomId: currentRoomId, userId } });
  }

  if (matchFoundListener) {
    off('matchFound', matchFoundListener);
    matchFoundListener = null;
  }
  if (stateListener) {
    off('state', stateListener);
    stateListener = null;
  }
  currentRoomId = null;
  inputHandlersRegistered = false;
  localStorage.removeItem('currentGameId');
}

export function drawFrame(state: GameState): void {
  if (
    state == null ||
    typeof state !== 'object' ||
    !Array.isArray(state.players) ||
    state.players.length !== 2
  ) {
    return;
  }

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

export function setupInputHandlers(): () => void {
  let moveInterval: number | null = null;

  function getDirection(): 'up' | 'down' | null {
    if (keysPressed['ArrowUp'] && !keysPressed['ArrowDown']) return 'up';
    if (keysPressed['ArrowDown'] && !keysPressed['ArrowUp']) return 'down';
    return null;
  }

  function sendMovement(active: boolean): void {
    if (!currentRoomId || !userId) return;
    send({
      type: 'movePaddle',
      payload: {
        roomId: currentRoomId,
        userId,
        direction: active ? getDirection() : 'stop',
        active
      }
    });
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && userId && currentRoomId) {
      if (!keysPressed[e.key]) {
        keysPressed[e.key] = true;
        sendMovement(true);
        if (moveInterval == null) {
          moveInterval = window.setInterval(() => sendMovement(true), 1000 / 60);
        }
      }
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && userId && currentRoomId) {
      keysPressed[e.key] = false;
      if (!keysPressed['ArrowUp'] && !keysPressed['ArrowDown'] && moveInterval !== null) {
        clearInterval(moveInterval);
        moveInterval = null;
        sendMovement(false);
      }
      e.preventDefault();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);


  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    if (moveInterval !== null) clearInterval(moveInterval);
  };
}
