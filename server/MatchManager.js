import { v4 as uuidv4 } from 'uuid'

export const GAME_MODES = {
  PVE: 'PVE',     // Player vs AI
  PVP: 'PVP',     // 1v1
  CUSTOM: 'CUSTOM',
}

export class MatchManager {
  constructor() {
    // Store all active rooms
    this.rooms = new Map()
  }

  createRoom(options) {
    const {
      mode = GAME_MODES.PVP,
      maxPlayers = 2,
      creatorId,
    } = options

    const roomId = uuidv4()

    const newRoom = {
      roomId,
      mode,
      maxPlayers,
      players: [],        // { playerId, isBot } objects
      ballState: null,
      scoreBoard: {},
      status: 'waiting',  // or 'running', 'finished' ...
      updateInterval: null,
    }

    // If it’s PVE mode, push a BOT right away
    if (mode === GAME_MODES.PVE) {
      newRoom.players.push({ playerId: 'BOT', isBot: true })
    }

    // If the room creator is known, add them
    if (creatorId) {
      newRoom.players.push({ playerId: creatorId, isBot: false })
    }

    this.rooms.set(roomId, newRoom)
    console.log(`Created new room: ${roomId}, mode=${mode}, maxPlayers=${maxPlayers}`)
    return newRoom
  }

  joinRoom(roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room) {
      console.warn(`joinRoom failed: room ${roomId} not found.`)
      return null
    }

    // If already full, return null
    if (room.players.length >= room.maxPlayers) {
      console.warn(`joinRoom failed: room ${roomId} is full.`)
      return null
    }

    // Check if player is already in there
    const alreadyJoined = room.players.some(p => p.playerId === playerId)
    if (alreadyJoined) {
      // Possibly no-op or return the room
      return room
    }

    // Add them
    room.players.push({ playerId, isBot: false })
    console.log(`${playerId} joined room ${roomId}`)

    // If we’ve now reached maxPlayers, start the game loop
    if (room.players.length === room.maxPlayers) {
      room.status = 'running'
      this.startRoomLoop(roomId)
    }

    return room
  }

  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.players = room.players.filter(p => p.playerId !== playerId)

    if (room.players.length === 0) {
      // No one left, remove the room
      this.removeRoom(roomId)
    }
  }

  startRoomLoop(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return

    console.log(`Starting server loop for room ${roomId} in mode=${room.mode}`)

    // Example: run game updates at ~60 fps
    room.updateInterval = setInterval(() => {
      // Game logic here: move ball, check collisions, update scores, broadcast state to clients, etc.
      // If mode = PVE, you can move the BOT paddle here as well.

    }, 1000 / 60)
  }

  removeRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return

    if (room.updateInterval) {
      clearInterval(room.updateInterval)
    }

    this.rooms.delete(roomId)
    console.log(`Room ${roomId} removed from manager.`)
  }

  getAllRooms() {
    return Array.from(this.rooms.values())
  }
}
