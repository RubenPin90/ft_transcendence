// game.ts — полностью через шину событий из socket.ts

import { on, off, send, getSocket } from './socket.js';
import type { ServerMessage } from './socket.js'; // только тип для извлечения payload
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
let ws: WebSocket | null = null;  // Только для send(); слушатели идут через on()/off()
let inputHandlersRegistered = false;

const keysPressed: Record<string, boolean> = {};

// Локальная переменная, куда сохранится callback, переданный пользователем
let gameEndCb: ((winnerId: string) => void) | null = null;

// Колбэки для off(...)
let matchFoundListener: ((msg: Extract<ServerMessage, { type: 'matchFound' }>) => void) | null = null;
let stateListener:      ((msg: Extract<ServerMessage, { type: 'state' }>)      => void) | null = null;

/**
 * setOnGameEnd сохраняет колбэк, который будет вызван,
 * когда игра завершится (status === 'finished').
 */
export function setOnGameEnd(cb: (winnerId: string) => void): void {
  gameEndCb = cb;
}

/**
 * Инициализирует canvas для игры: получает контекст 2D.
 */
export function initGameCanvas(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
}

/**
 * Запускает игру: подписывается на события matchFound и state через on().
 * Если mode === 'pve', отправляет joinQueue.
 */
export function startGame(mode: GameMode): void {
  ws = getSocket(); // нужен только для send()

  // Восстанавливаем из localStorage, если ещё не заданы
  if (!currentRoomId) {
    currentRoomId = localStorage.getItem('currentGameId');
  }
  if (!userId) {
    userId = localStorage.getItem('playerId');
  }

  if (mode === 'pve') {
    const sendJoinQueue = () =>
      send({ type: 'joinQueue', payload: { mode } });
    if (ws.readyState === WebSocket.OPEN) {
      sendJoinQueue();
    } else {
      // дождёмся открытия, потом отправим
      ws.addEventListener('open', sendJoinQueue, { once: true });
    }
  }

  // Подписываемся на matchFound, если ещё не подписаны
  if (!matchFoundListener) {
    matchFoundListener = (msg) => {
      // msg.payload содержит { gameId, mode, userId }
      currentRoomId = msg.payload.gameId;
      userId        = msg.payload.userId;
      console.log(`Match ready: room=${currentRoomId}, user=${userId}`);
    };
    on('matchFound', matchFoundListener);
  }

  // Подписываемся на state, если ещё не подписаны
  if (!stateListener) {
    stateListener = (msg) => {
      drawFrame(msg.state);
      if (msg.state.status === 'finished') {
        // Игра окончена
        stopGame();
        if (msg.state.winner != null && gameEndCb) {
          gameEndCb(msg.state.winner);
        }
      }
    };
    on('state', stateListener);
  }

  // Устанавливаем обработчики ввода (клавиши), но только один раз
  if (!inputHandlersRegistered) {
    setupInputHandlers();
    inputHandlersRegistered = true;
  }
}

/**
 * Останавливает игру: отправляет leaveGame и удаляет слушатели, чтобы
 * при перезапуске не накапливались подписки.
 */
export function stopGame(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    send({
      type: 'leaveGame',
      payload: { roomId: currentRoomId, userId }
    });
  }

  // Отписываемся от matchFound
  if (matchFoundListener) {
    off('matchFound', matchFoundListener);
    matchFoundListener = null;
  }
  // Отписываемся от state
  if (stateListener) {
    off('state', stateListener);
    stateListener = null;
  }
}

/**
 * Рисует текущее состояние игры в canvas.
 */
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

  // Рисуем мяч
  if (state.ball) {
    const { x, y } = state.ball;
    ctx.beginPath();
    ctx.arc(toX(x), toY(y), 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // Рисуем ракетки
  state.players.forEach((p, i) => {
    const x = i === 0 ? 10 : canvas.width - 25;
    ctx?.fillRect(x, toY(p.y) - 50, 15, 100);
  });

  // Рисуем счёт
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

/**
 * Устанавливает обработчики клавиш для управления ракеткой.
 * Отправляет movePaddle по WebSocket каждые 16ms, пока кнопка зажата.
 */
export function setupInputHandlers(): void {
  let moveInterval: number | null = null;

  function getDirection(): 'up' | 'down' | null {
    if (keysPressed['ArrowUp'] && !keysPressed['ArrowDown']) return 'up';
    if (keysPressed['ArrowDown'] && !keysPressed['ArrowUp']) return 'down';
    return null;
  }

  function sendMovement(active: boolean): void {
    if (!currentRoomId || !userId) return;
    const direction = getDirection();
    send({
      type: 'movePaddle',
      payload: {
        roomId: currentRoomId,
        userId,
        direction: active ? direction : 'stop',
        active
      }
    });
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
      if (!keysPressed['ArrowUp'] && !keysPressed['ArrowDown'] && moveInterval !== null) {
        clearInterval(moveInterval);
        moveInterval = null;
        sendMovement(false);
      }
      e.preventDefault();
    }
  });
}
