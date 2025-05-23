var _a;
let _currentTLobby = null;
let _myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : '';
export function getCurrentTLobby() {
    return _currentTLobby;
}
export function setCurrentTLobby(TLobby) {
    _currentTLobby = TLobby;
}
export function getMyId() {
    return _myId;
}
export function setMyId(id) {
    _myId = id;
    localStorage.setItem('playerId', id);
}
