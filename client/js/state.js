var _a;
let _currentLobby = null;
let _myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : '';
export function getCurrentLobby() {
    return _currentLobby;
}
export function setCurrentLobby(lobby) {
    _currentLobby = lobby;
}
export function getMyId() {
    return _myId;
}
export function setMyId(id) {
    _myId = id;
    localStorage.setItem('playerId', id);
}
