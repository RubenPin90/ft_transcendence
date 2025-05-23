import type { TLobbyState } from './types.js'

let _currentTLobby: TLobbyState | null = null
let _myId: string = localStorage.getItem('playerId') ?? ''

export function getCurrentTLobby() {
  return _currentTLobby
}

export function setCurrentTLobby(TLobby: TLobbyState | null) {
  _currentTLobby = TLobby
}

export function getMyId() {
  return _myId
}

export function setMyId(id: string) {
  _myId = id
  localStorage.setItem('playerId', id)
}
