import { v4 as uuidv4 } from 'uuid'

export const GAME_MODES = {
  PVE: 'PVE',     // Player vs AI
  PVP: 'PVP',     // 1v1
  CUSTOM: 'CUSTOM',
}

export class MatchManager {
  /*───────────────────────────
    Static configuration
  ───────────────────────────*/
  static GAME_MODES = GAME_MODES
  static MAX_BOUNCE_ANGLE = Math.PI / 4 // 45°
  static TICK_RATE = 60
  static BOT_PIXELS_PER_SECOND = 300   // Desired bot speed in pixels/sec
  static BOT_MIN_REACTION_MS = 100     // Bot reaction delay range (min)
  static BOT_MAX_REACTION_MS = 200     // Bot reaction delay range (max)
  static get BOT_MAX_SPEED () {        // Normalised units per tick
    return MatchManager.BOT_PIXELS_PER_SECOND /
           MatchManager.TICK_RATE
  }
  // Throttling rules
  static MIN_HITS_AFTER_MAX = 5          // After reaching max‑speed, wait this many paddle hits …
  static BALL_BROADCAST_FRAMES = 10      // … then show ball for this many frames after each hit

  static getRandomReactionDelay () {
    return MatchManager.BOT_MIN_REACTION_MS +
           Math.random() * (MatchManager.BOT_MAX_REACTION_MS - MatchManager.BOT_MIN_REACTION_MS)
  }

  /*───────────────────────────
    Construction / bookkeeping
  ───────────────────────────*/
  constructor (wss) {
    this.wss          = wss
    this.rooms        = new Map()
    this.userSockets  = new Map()
  }

  registerSocket   (id, ws) { this.userSockets.set(id, ws) }
  unregisterSocket (id)     { this.userSockets.delete(id) }

  _broadcastFor (roomId) {
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

  /*───────────────────────────
    Room lifecycle helpers
  ───────────────────────────*/
  createRoom ({ mode = GAME_MODES.PVP, maxPlayers = 2, creatorId, botId = 'BOT' }) {
    const roomId = uuidv4()

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
      // throttling trackers
      isMaxSpeedReached: false,
      hitsSinceMaxSpeed: 0,
      ballBroadcastCountdown: 0,
    }

    if (mode === GAME_MODES.PVE) {
      newRoom.players.push({ playerId: botId, isBot: true, paddleY: 0.5 })
      newRoom.scoreBoard[botId] = 0
    }
    if (creatorId) {
      newRoom.players.push({ playerId: creatorId, isBot: false, paddleY: 0.5 })
      newRoom.scoreBoard[creatorId] = 0
    }

    this.rooms.set(roomId, newRoom)

    if (newRoom.players.length === maxPlayers) {
      newRoom.status = 'running'
      this._initBall(roomId)
      this._mainLoop(roomId)
    }
    return newRoom
  }

  joinRoom (roomId, playerId) {
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

  leaveRoom (roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.players = room.players.filter(p => p.playerId !== playerId)
    delete room.scoreBoard[playerId]
    if (room.players.length === 0) this.removeRoom(roomId)
  }

  /*───────────────────────────
    Gameplay helpers
  ───────────────────────────*/
  _updateBotPaddle (room) {
    const bot = room.players.find(p => p.isBot)
    if (!bot) return

    // Respect a random reaction delay (100‑200 ms) before each movement decision
    const now = Date.now()
    if (bot.aiNextMoveTime && now < bot.aiNextMoveTime) return

    const { y: ballY } = room.ballState
    const dy = ballY - bot.paddleY

    // Move toward the ball at a constant speed (BOT_MAX_SPEED normalised units per tick)
    if (Math.abs(dy) <= MatchManager.BOT_MAX_SPEED) {
      bot.paddleY = ballY
    } else {
      bot.paddleY += MatchManager.BOT_MAX_SPEED * Math.sign(dy)
    }

    // Clamp inside arena bounds
    bot.paddleY = Math.max(0, Math.min(1, bot.paddleY))

    // Schedule next movement decision after a random reaction delay
    bot.aiNextMoveTime = now + MatchManager.getRandomReactionDelay()
  }

  _initBall (roomId) {
    const room = this.rooms.get(roomId)
    room.ballState = {
      x : 0.5,
      y : 0.5,
      vx: (Math.random() < 0.5 ? 1 : -1) * 0.5,
      vy: (Math.random() * 2 - 1) * 0.3,
    }
    // reset throttling every new serve
    room.isMaxSpeedReached   = false
    room.hitsSinceMaxSpeed   = 0
    room.ballBroadcastCountdown = 0
  }

  /*───────────────────────────
    Main simulation loop
  ───────────────────────────*/
  _mainLoop (roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return

    const broadcast = this._broadcastFor(roomId)
    const { FPS }   = room
    const paddleSize = 0.2

    /* decide if ball should be sent this tick */
    const includeBall = () => {
      // before max‑speed or before threshold → always send ball
      if (!room.isMaxSpeedReached || room.hitsSinceMaxSpeed < MatchManager.MIN_HITS_AFTER_MAX) {
        return true
      }
      // after threshold: only within countdown window
      return room.ballBroadcastCountdown > 0
    }

    room.updateInterval = setInterval(() => {
      /* 1. AI paddle */
      if (room.mode === MatchManager.GAME_MODES.PVE && room.status === 'running') {
        this._updateBotPaddle(room)
      }

      /* 2. Move ball */
      const b = room.ballState
      b.x += b.vx / FPS
      b.y += b.vy / FPS

      /* 3. Wall collisions */
      if (b.y <= 0) { b.y = 0; b.vy *= -1 }
      if (b.y >= 1) { b.y = 1; b.vy *= -1 }

      /* 4. Paddle collisions */
      room.players.forEach((p, idx) => {
        const withinY = b.y >= p.paddleY - paddleSize/2 && b.y <= p.paddleY + paddleSize/2
        const hit = (idx === 0 && b.x <= 0.02) || (idx === 1 && b.x >= 0.98)
        if (hit && withinY) {
          // a. incoming & deflection blend
          const incomingAngle = Math.atan2(b.vy, Math.abs(b.vx))
          const relY = (b.y - p.paddleY) / (paddleSize/2)
          const deflectAngle  = relY * MatchManager.MAX_BOUNCE_ANGLE
          const spinFactor = 0.9
          const bounceAngle = incomingAngle * (1 - spinFactor) + deflectAngle * spinFactor

          // b. speed boost
          let speed = Math.hypot(b.vx, b.vy) * 1.03
          if (speed > MatchManager.MAX_BALL_SPEED) speed = MatchManager.MAX_BALL_SPEED

          const dir = idx === 0 ? 1 : -1
          b.vx = speed * Math.cos(bounceAngle) * dir
          b.vy = speed * Math.sin(bounceAngle)
          b.x  = idx === 0 ? 0.02 : 0.98 // nudge off paddle

          /*  --- throttling bookkeeping --- */
          const atMax = Math.abs(speed - MatchManager.MAX_BALL_SPEED) < 1e-6
          if (atMax) {
            if (!room.isMaxSpeedReached) {
              room.isMaxSpeedReached = true
              room.hitsSinceMaxSpeed = 0
            }
            room.hitsSinceMaxSpeed++
            if (room.hitsSinceMaxSpeed >= MatchManager.MIN_HITS_AFTER_MAX) {
              room.ballBroadcastCountdown = MatchManager.BALL_BROADCAST_FRAMES
            }
          }
        }
      })

      /* 5. Global speed clamp */
      const speed = Math.hypot(b.vx, b.vy)
      if (speed > MatchManager.MAX_BALL_SPEED) {
        const scl = MatchManager.MAX_BALL_SPEED / speed
        b.vx *= scl
        b.vy *= scl
      }

      /* 6. Goal check */
      if (b.x < 0 || b.x > 1) {
        const scorerIdx = b.x < 0 ? 1 : 0
        const scorer    = room.players[scorerIdx].playerId
        room.scoreBoard[scorer]++
        clearInterval(room.updateInterval)

        const finalState = {
          roomId,
          players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
          ball   : null,
          scores : room.scoreBoard,
          status : undefined,
        }
        if (room.scoreBoard[scorer] >= room.maxScore) {
          room.status = 'finished'
          finalState.status = room.status
          finalState.winner = scorer
        } else {
          room.status = 'paused'
          finalState.status = room.status
        }
        broadcast(finalState)

        if (room.status === 'paused') {
          room.pauseTimeout = setTimeout(() => {
            room.status = 'running'
            this._initBall(roomId)
            this._mainLoop(roomId)
          }, 1000)
        }
        return
      }

      /* 7. Regular broadcast (always) */
      const state = {
        roomId,
        players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
        ball   : includeBall() ? { x: b.x, y: b.y } : null,
        scores : room.scoreBoard,
        status : room.status,
      }
      broadcast(state)

      // count down ONLY after sending to ensure we show full 10 frames
      if (room.ballBroadcastCountdown > 0) room.ballBroadcastCountdown--

    }, 1000 / FPS)
  }

  /*───────────────────────────
    House‑keeping
  ───────────────────────────*/
  removeRoom (roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    clearInterval(room.updateInterval)
    clearTimeout(room.pauseTimeout)
    this.rooms.delete(roomId)
  }

  getAllRooms () {
    return [...this.rooms.values()]
  }
}
