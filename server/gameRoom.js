// MatchManager.js
import GameRoom from './GameRoom.js'

export const GAME_MODES = {
  PVE: 'pve',
  PVP: 'pvp',
  DEATHMATCH: 'deathmatch',
}

export class MatchManager {
  constructor() {
    this.rooms = new Map()
    this.userSockets = new Map() // Optional: userId → WebSocket
  }

  registerSocket(userId, ws) {
    this.userSockets.set(userId, ws)
  }

  unregisterSocket(userId) {
    this.userSockets.delete(userId)
  }

  createRoom({ mode, maxPlayers, creatorId }) {
    const game = new GameRoom({ mode, maxPlayers })

    if (mode === GAME_MODES.PVE) game.addPlayer('BOT', true)
    if (creatorId) game.addPlayer(creatorId, false)

    this.rooms.set(game.roomId, game)
    return game
  }

  joinRoom(roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (!room.addPlayer(playerId)) return null

    if (room.players.length === room.maxPlayers) {
      this.startRoomLoop(roomId)
    }

    return room
  }

  startRoomLoop(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.start(this._broadcastFor(roomId))
  }

  _broadcastFor(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return () => {}

    return (state) => {
      for (const player of room.players) {
        const ws = this.userSockets.get(player.id)
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'game_state', data: state }))
        }
      }
    }
  }

  removeRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.stop() // Assuming GameRoom has a stop() method to clear intervals etc.
    this.rooms.delete(roomId)
    return true
  }

  getAllRooms() {
    return Array.from(this.rooms.values())
  }
}

export default MatchManager
