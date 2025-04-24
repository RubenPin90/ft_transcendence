import { v4 as uuidv4 } from 'uuid'

export const GAME_MODES = {
  PVE: 'PVE',     // Player vs AI
  PVP: 'PVP',     // 1v1
  CUSTOM: 'CUSTOM',
}

export class MatchManager {
  static GAME_MODES = GAME_MODES;
  static TICK_RATE = 60

  constructor(wss) {
    this.wss = wss
    this.rooms = new Map()
    this.userSockets = new Map()
  }

  registerSocket(id, ws)  { this.userSockets.set(id, ws) }
  unregisterSocket(id)    { this.userSockets.delete(id) }

  _broadcastFor(roomId) {
    return state => {
      const room = this.rooms.get(roomId)
      if (!room) return
      room.players.forEach(p => {
        const ws = this.userSockets.get(p.playerId)
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'state', state }))
        }
      })
    }
  }

  createRoom({ mode = GAME_MODES.PVP, maxPlayers = 2, creatorId, botId = 'BOT' }) {
    const roomId = uuidv4();

    const newRoom = {
      roomId,
      mode,
      maxPlayers,
      players: [],
      ballState: null,
      scoreBoard: {},
      status: 'waiting',
      updateInterval: null,
      pauseTimeout: null,
      FPS: MatchManager.TICK_RATE,
      maxScore: 5,
    };

    if (mode === GAME_MODES.PVE) {
      console.log('Creating PVE room with botId:', botId);
      newRoom.players.push({ playerId: botId, isBot: true, paddleY: 0.5 });
      newRoom.scoreBoard[botId] = 0;
    }

    if (creatorId) {
      newRoom.players.push({ playerId: creatorId, isBot: false, paddleY: 0.5 });
      newRoom.scoreBoard[creatorId] = 0;
    }

    this.rooms.set(roomId, newRoom);

    if (newRoom.players.length === maxPlayers) {
      newRoom.status = 'running';
      this._initBall(roomId);
      this._mainLoop(roomId);
    }

    return newRoom;
  }
  joinRoom(roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length >= room.maxPlayers) return null
    if (room.players.some(p => p.playerId === playerId)) return room

    room.players.push({ playerId, isBot: false, paddleY: 0.5 })
    room.scoreBoard[playerId] = 0

    if (room.players.length === room.maxPlayers) {
      room.status = 'running'
      this._initBall(roomId)
      this._mainLoop(roomId)
    }

    return room
  }

  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.players = room.players.filter(p => p.playerId !== playerId)
    delete room.scoreBoard[playerId]
    if (room.players.length === 0) this.removeRoom(roomId)
  }

  _updateBotPaddle(room) {
    const bot = room.players.find(p => p.isBot);
    if (!bot) return;
  
    const { y: ballY } = room.ballState;         // 0 → top, 1 → bottom
    const speed        = 0.02;                   // units per tick
  
    // chase the ball, but cap the step by `speed`
    if (Math.abs(ballY - bot.paddleY) > speed) {
      bot.paddleY += speed * Math.sign(ballY - bot.paddleY);
      bot.paddleY = Math.max(0, Math.min(1, bot.paddleY)); // clamp 0-1
    }
  }

  _initBall(roomId) {
    const room = this.rooms.get(roomId)
    room.ballState = {
      x: 0.5,
      y: 0.5,
      vx: (Math.random() < 0.5 ? 1 : -1) * 0.5,
      vy: (Math.random() * 2 - 1) * 0.3,
    }
  }

  _mainLoop(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    const broadcast = this._broadcastFor(roomId)
    const FPS = room.FPS
    const paddleSize = 0.2

    room.updateInterval = setInterval(() => {
      if (room.mode === MatchManager.GAME_MODES.PVE &&
                  room.status === 'running') {
                this._updateBotPaddle(room);
      }
      const b = room.ballState
      b.x += b.vx / FPS
      b.y += b.vy / FPS

      if (b.y <= 0) { b.y = 0; b.vy *= -1 }
      if (b.y >= 1) { b.y = 1; b.vy *= -1 }

      room.players.forEach((p, idx) => {
        const withinY = b.y >= p.paddleY - paddleSize/2 && b.y <= p.paddleY + paddleSize/2
        const hit = (idx === 0 && b.x <= 0.02) || (idx === 1 && b.x >= 0.98)
        if (hit && withinY) {
          b.vx *= -1.03
          b.x = idx === 0 ? 0.02 : 0.98
        }
      })

      // Goal scored
      if (b.x < 0 || b.x > 1) {
        const scorerIdx = b.x < 0 ? 1 : 0
        const scorer = room.players[scorerIdx].playerId
        room.scoreBoard[scorer]++

        clearInterval(room.updateInterval)
        if (room.scoreBoard[scorer] >= room.maxScore) {
          room.status = 'finished'
          broadcast({
            roomId,
            players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
            ball: null,
            scores: room.scoreBoard,
            status: room.status,
            winner: scorer,
          })
        } else {
          room.status = 'paused'
          broadcast({
            roomId,
            players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
            ball: null,
            scores: room.scoreBoard,
            status: room.status,
          })
          room.pauseTimeout = setTimeout(() => {
            room.status = 'running'
            this._initBall(roomId)
            this._mainLoop(roomId)
          }, 1000)
        }
        return
      }

      // Regular update
      broadcast({
        roomId,
        players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
        ball: { x: b.x, y: b.y },
        scores: room.scoreBoard,
        status: room.status,
      })
    }, 1000/FPS)
  }

  removeRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    clearInterval(room.updateInterval)
    clearTimeout(room.pauseTimeout)
    this.rooms.delete(roomId)
    console.log(`Room ${roomId} removed`)
  }

  getAllRooms() {
    return Array.from(this.rooms.values())
  }
}
