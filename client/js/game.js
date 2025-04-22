let socket = null;
let ctx = null;
const USER_ID = `cli_${Math.floor(Math.random() * 100000)}`;
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
    if (socket && socket.readyState === WebSocket.OPEN)
        return;
    socket = new WebSocket(`ws://${location.host}/ws/game`);
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
            type: 'joinQueue',
            payload: { mode, userId: USER_ID }
        }));
        setupInputHandlers();
    });
    socket.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'matchFound') {
            console.log('Match ready, id =', msg.payload.gameId);
        }
        else if (msg.type === 'state') {
            drawFrame(msg.state);
            if (msg.state.status === 'finished') {
                console.log('Game finished! Winner =', msg.state.winner);
                stopGame();
                if (onGameEndCallback && msg.state.winner) {
                    onGameEndCallback(msg.state.winner);
                }
            }
        }
    });
    socket.addEventListener('close', () => console.log('Socket closed'));
}
export function stopGame() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leaveGame', payload: { userId: USER_ID } }));
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
    // ✅ only draw if ball is non‑null
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
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            if (!keysPressed[e.key]) {
                keysPressed[e.key] = true;
                const direction = e.key === 'ArrowUp' ? 'up' : 'down';
                socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
                    type: 'movePaddle',
                    payload: { userId: USER_ID, direction, active: true }
                }));
            }
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            if (keysPressed[e.key]) {
                keysPressed[e.key] = false;
                socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
                    type: 'movePaddle',
                    payload: { userId: USER_ID, direction: 'stop', active: false }
                }));
            }
            e.preventDefault();
        }
    });
}
