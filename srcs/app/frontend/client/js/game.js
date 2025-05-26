import { getSocket } from './socket.js';
let ctx = null;
let userId = null;
let currentRoomId = null;
let ws = null;
let inputHandlersRegistered = false;
let onGameEndCallback = null;
const keysPressed = {};
export function setOnGameEnd(cb) {
    onGameEndCallback = cb;
}
export function initGameCanvas() {
    const canvas = document.getElementById('game');
    if (!canvas)
        return;
    ctx = canvas.getContext('2d');
}
export function startGame(mode) {
    ws = getSocket();
    if (!currentRoomId) {
        currentRoomId = localStorage.getItem('currentGameId');
    }
    if (!userId) {
        userId = localStorage.getItem('playerId');
    }
    if (mode === 'pve') {
        const sendJoinQueue = () => ws.send(JSON.stringify({
            type: 'joinQueue',
            payload: { mode }
        }));
        if (ws.readyState === WebSocket.OPEN)
            sendJoinQueue();
        else
            ws.addEventListener('open', sendJoinQueue, { once: true });
    }
    const handleMessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'matchFound') {
            currentRoomId = msg.payload.gameId;
            userId = msg.payload.userId;
        }
        else if (msg.type === 'state') {
            drawFrame(msg.state);
            if (msg.state.status === 'finished') {
                stopGame();
                onGameEndCallback === null || onGameEndCallback === void 0 ? void 0 : onGameEndCallback(msg.state.winner);
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
export function stopGame() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'leaveGame',
            payload: { roomId: currentRoomId, userId }
        }));
    }
}
function drawFrame(state) {
    if (!ctx)
        return;
    const canvas = ctx.canvas;
    const toX = (u) => u * canvas.width;
    const toY = (u) => u * canvas.height;
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
        ctx === null || ctx === void 0 ? void 0 : ctx.fillRect(x, toY(p.y) - 50, 15, 100);
    });
    ctx.font = '20px sans-serif';
    ctx.fillText(`${state.scores[state.players[0].id] || 0}`, canvas.width * 0.25, 30);
    ctx.fillText(`${state.scores[state.players[1].id] || 0}`, canvas.width * 0.75, 30);
}
function setupInputHandlers() {
    let moveInterval = null;
    function getDirection() {
        if (keysPressed['ArrowUp'] && !keysPressed['ArrowDown'])
            return 'up';
        if (keysPressed['ArrowDown'] && !keysPressed['ArrowUp'])
            return 'down';
        return null;
    }
    function sendMovement(active) {
        if (!currentRoomId || !userId)
            return;
        const direction = getDirection();
        ws === null || ws === void 0 ? void 0 : ws.send(JSON.stringify({
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
            if (!keysPressed['ArrowUp'] && !keysPressed['ArrowDown'] && moveInterval != null) {
                clearInterval(moveInterval);
                moveInterval = null;
                sendMovement(false);
            }
            e.preventDefault();
        }
    });
}
