import { getSocket } from './socket.js';
let socket = null;
let ctx = null;
let userId = null;
let currentRoomId = null;
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
    socket = getSocket();
    // Send joinQueue exactly once
    const sendJoinQueue = () => socket.send(JSON.stringify({
        type: 'joinQueue',
        payload: { mode }
    }));
    if (socket.readyState === WebSocket.OPEN) {
        sendJoinQueue();
    }
    else {
        socket.addEventListener('open', sendJoinQueue, { once: true });
    }
    const handleMessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'matchFound') {
            currentRoomId = msg.payload.gameId;
            userId = msg.payload.userId;
            console.log(`Match ready: room=${currentRoomId}, user=${userId}`);
        }
        else if (msg.type === 'state') {
            drawFrame(msg.state);
            if (msg.state.status === 'finished') {
                console.log('Game finished! Winner =', msg.state.winner);
                stopGame();
                onGameEndCallback === null || onGameEndCallback === void 0 ? void 0 : onGameEndCallback(msg.state.winner);
            }
        }
    };
    socket.addEventListener('message', handleMessage);
    // Make sure we clean up when the game page is left
    function stopGame() {
        socket === null || socket === void 0 ? void 0 : socket.removeEventListener('message', handleMessage);
        // …whatever else stopGame used to do…
    }
}
export function stopGame() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'leaveGame',
            payload: { roomId: currentRoomId, userId }
        }));
        socket.close();
    }
    socket = null;
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
    // figure out current direction from keysPressed
    function getDirection() {
        if (keysPressed['ArrowUp'] && !keysPressed['ArrowDown'])
            return 'up';
        if (keysPressed['ArrowDown'] && !keysPressed['ArrowUp'])
            return 'down';
        return null;
    }
    // send a single movePaddle packet
    function sendMovement(active) {
        const direction = getDirection();
        socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
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
                // send one immediately…
                sendMovement(true);
                // …then start a 60 fps loop if not already running
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
                sendMovement(false); // tell server we’ve stopped
            }
            e.preventDefault();
        }
    });
}
