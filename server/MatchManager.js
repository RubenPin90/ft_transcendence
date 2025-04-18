import { v4 as uuidv4 } from 'uuid'

export const GAME_MODES = {
  PVE: 'PVE',     // Player vs AI
  PVP: 'PVP',     // 1v1
  CUSTOM: 'CUSTOM',
}

export class MatchManager {
    static GAME_MODES = GAME_MODES;
    constructor(wss) {
      this.wss = wss
      this.rooms = new Map()
      this.userSockets = new Map();        // NEW
    }
    
    registerSocket(id, ws)  { this.userSockets.set(id, ws); }
    unregisterSocket(id)    { this.userSockets.delete(id); }

    _broadcastFor(roomId) {
      return state => {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.players.forEach(p => {
          const ws = this.userSockets.get(p.playerId);
          if (ws && ws.readyState === ws.OPEN) {      // instance constant
            ws.send(JSON.stringify({ type: 'state', state }));
          }          
        });
      };
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
    if (newRoom.players.length === newRoom.maxPlayers) {
      // Optional: ensure you really want to auto‑start for this mode
      if (mode !== GAME_MODES.CUSTOM) {      // or any condition you like
        newRoom.status = 'running'
        this.startRoomLoop(roomId)
      } else {
        newRoom.status = 'pre‑game'          // waiting for "Ready"
      }
    }
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
  
    /* ---------- one-time init ---------- */
    room.ballState = { x: 0.5, y: 0.5, vx: 0.45, vy: 0.32 }   // unit coords (0..1)
    room.players.forEach(p => (p.paddleY = 0.5))              // center paddles
  
    const broadcast = this._broadcastFor(roomId)
    const FPS       = 60
  
    room.updateInterval = setInterval(() => {
      /* -------- update physics -------- */
      const b = room.ballState
      b.x += b.vx / FPS
      b.y += b.vy / FPS
  
      // Reflect off top/bottom walls
      if (b.y < 0 || b.y > 1) b.vy *= -1
  
      // Bounce back from left/right goals (placeholder logic)
      if (b.x < 0 || b.x > 1) b.vx *= -1
  
      /* -------- broadcast snapshot -------- */
      broadcast({
        roomId,
        players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
        ball:    { x: b.x, y: b.y },
        scores:  room.scoreBoard,
        status:  room.status,
      })
    }, 1000 / FPS)
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
