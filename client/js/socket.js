// socket.ts
let socket = null;
export function getSocket() {
    if (socket === null ||
        socket.readyState === WebSocket.CLOSED ||
        socket.readyState === WebSocket.CLOSING) {
        socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
    }
    return socket;
}
