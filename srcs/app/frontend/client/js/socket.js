const listeners = {};
let socket = null;
function createSocket() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
    ws.addEventListener('message', ev => {
        var _a;
        const data = JSON.parse(ev.data);
        if (data.type != 'tournamentList' && data.type != 'state')
            console.log(`[socket] ← ${data.type}`, data);
        (_a = listeners[data.type]) === null || _a === void 0 ? void 0 : _a.forEach(cb => cb(data));
    });
    ws.addEventListener('close', () => {
        socket = null;
    });
    return ws;
}
function ensureSocket() {
    return socket && socket.readyState <= WebSocket.OPEN ? socket : (socket = createSocket());
}
export function getSocket() {
    return ensureSocket();
}
export function on(type, cb) {
    var _a;
    ((_a = listeners[type]) !== null && _a !== void 0 ? _a : (listeners[type] = new Set())).add(cb);
    ensureSocket();
}
export function off(type, cb) {
    var _a;
    (_a = listeners[type]) === null || _a === void 0 ? void 0 : _a.delete(cb);
}
export function send(data) {
    ensureSocket().send(JSON.stringify(data));
}
export function disconnect() {
    socket === null || socket === void 0 ? void 0 : socket.close();
    socket = null;
}
