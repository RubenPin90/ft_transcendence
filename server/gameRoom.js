// /server/GameRoom.js
import { v4 as uuidv4 } from 'uuid'

export default class GameRoom {
  constructor({ mode, maxPlayers }) {
    this.roomId      = uuidv4()
    this.mode        = mode          // PVE | PVP | CUSTOM
    this.maxPlayers  = maxPlayers
    this.players     = []            // { playerId, isBot, paddleY }
    this.ball        = { x: 0.5, y: 0.5, vx: 0.48, vy: 0.32 } // unit coords 0‑1
    this.scoreBoard  = {}            // playerId → score
    this.status      = 'waiting'     // waiting | running | finished
    this.interval    = null          // setInterval handle
    this.FPS         = 60            // You can crank this later
  }

  /* ---------------------------------------------------------------- *
   *  Player management
   * ---------------------------------------------------------------- */
  addPlayer(playerId, isBot = false) {
    if (this.players.length >= this.maxPlayers) return false
    if (this.players.some(p => p.playerId === playerId)) return true

    this.players.push({ playerId, isBot, paddleY: 0.5 })
    this.scoreBoard[playerId] = 0
    return true
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.playerId !== playerId)
    delete this.scoreBoard[playerId]
  }

  /* ---------------------------------------------------------------- *
   *  Game loop helpers
   * ---------------------------------------------------------------- */
  tick(dt) {
    // 1. move ball
    this.ball.x += this.ball.vx * dt
    this.ball.y += this.ball.vy * dt

    // 2. top / bottom wall bounce
    if (this.ball.y < 0 || this.ball.y > 1) this.ball.vy *= -1

    // 3. left / right paddle collision OR score
    const left  = this.players[0]      // safe because you only start when full
    const right = this.players[this.players.length - 1]

    if (this.ball.x < 0) this._score(right.playerId)
    if (this.ball.x > 1) this._score(left.playerId)

    // 4. bot AI (if any). Simple: move paddle toward ball with capped speed.
    if (this.mode === 'PVE') this._botStep(dt)
  }

  _score(winnerId) {
    this.scoreBoard[winnerId]++
    this._resetBall()
  }

  _resetBall() {
    this.ball = { x: 0.5, y: 0.5, vx: (Math.random() > 0.5 ? 1 : -1) * 0.48, vy: 0.32 }
  }

  _botStep(dt) {
    const bot = this.players.find(p => p.isBot)
    if (!bot) return
    const speed = 0.7      // paddle‑per‑second (tune later)
    const dir = Math.sign(this.ball.y - bot.paddleY)
    bot.paddleY += dir * speed * dt
    bot.paddleY = Math.max(0, Math.min(1, bot.paddleY))
  }

  /* ---------------------------------------------------------------- *
   *  Lifecycle
   * ---------------------------------------------------------------- */
  start(broadcast) {
    if (this.status === 'running') return
    this.status = 'running'
    let last = Date.now()
    this.interval = setInterval(() => {
      const now = Date.now()
      const dt  = (now - last) / 1000   // seconds
      last      = now

      this.tick(dt)
      broadcast(this.snapshot())
    }, 1000 / this.FPS)
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
    this.status = 'finished'
  }

  snapshot() {
    return {
      roomId: this.roomId,
      mode:   this.mode,
      players: this.players.map(p => ({ id: p.playerId, y: p.paddleY })),
      ball:   this.ball,
      scores: this.scoreBoard,
      status: this.status,
    }
  }
}
