import type { LobbyState } from './types.js'

let _currentLobby: LobbyState | null = null
let _myId: string = localStorage.getItem('playerId') ?? ''

export function getCurrentLobby() {
  return _currentLobby
}

export function setCurrentLobby(lobby: LobbyState | null) {
  _currentLobby = lobby
}

export function getMyId() {
  return _myId
}

export function setMyId(id: string) {
  _myId = id
  localStorage.setItem('playerId', id)
}
