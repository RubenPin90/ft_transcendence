import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { SocketRegistry } from '../socketRegistry.js';

import {
  create_match,
  update_match,
  show_matches
} from '../../database/db_matches.js';

export const GAME_MODES = {
  PVE: 'PVE',
  PVP: 'PVP',
}

export class MatchManager extends EventEmitter {
  static GAME_MODES = GAME_MODES
  static MAX_BOUNCE_ANGLE = Math.PI / 4
  static TICK_RATE = 60
  static BOT_PIXELS_PER_SECOND = 300
  static BOT_MIN_REACTION_MS = 100
  static BOT_MAX_REACTION_MS = 200
  static get BOT_MAX_SPEED () {
    return MatchManager.BOT_PIXELS_PER_SECOND /
           MatchManager.TICK_RATE
  }

  static GAME_MODES           = GAME_MODES
  static MAX_BOUNCE_ANGLE     = Math.PI / 4
  static TICK_RATE            = 60
  static MAX_BALL_SPEED       = 0.7


  static MIN_HITS_AFTER_MAX   = 5
  static BALL_BROADCAST_FRAMES= 10

  static getRandomReactionDelay () {
    return MatchManager.BOT_MIN_REACTION_MS +
           Math.random() * (MatchManager.BOT_MAX_REACTION_MS - MatchManager.BOT_MIN_REACTION_MS)
  }

  constructor(socketRegistry) {
    super();
    this.socketRegistry = socketRegistry;
    this.rooms = new Map();
    this.queues = { PVP: [] };
  }

   registerSocket   (id, ws) { this.socketRegistry.add(id, ws) }
   unregisterSocket (id)     { this.socketRegistry.remove(id) }
   
  _broadcastFor (roomId) {
    return state => {
      const room = this.rooms.get(roomId)
      if (!room) return
      room.players.forEach(p => {
        const ws = this.socketRegistry.get(p.playerId)
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'state', state }))
        }
      })
    }
  }

  createRoom(options = {}) {
    const {
      roomId     = uuidv4(),
      mode       = GAME_MODES.PVP,
      maxPlayers = 2,
      creatorId,
      botId      = 'BOT',
      tournamentId = null,
    } = options;
  
    const newRoom = {
      roomId,
      mode,
      maxPlayers,
      players   : [],
      ballState : null,
      scoreBoard: {},
      status    : 'waiting',
      updateInterval: null,
      pauseTimeout  : null,
      FPS       : MatchManager.TICK_RATE,
      maxScore  : 5,
      isMaxSpeedReached   : false,
      hitsSinceMaxSpeed   : 0,
      ballBroadcastCountdown: 0,
      tournamentId,
    };
  
    const maybeAddPlayer = (id, isBot) => {
      if (!id) return;
      newRoom.players.push({ playerId: id, isBot, paddleY: 0.5 });
      newRoom.scoreBoard[id] = 0;
    };
  
    if (mode === GAME_MODES.PVE) maybeAddPlayer(botId, true);
    maybeAddPlayer(creatorId, false);
  
    this.rooms.set(roomId, newRoom);
  
    if (newRoom.players.length === maxPlayers) {
      newRoom.status = 'running';
      this._recordMatchStart(newRoom).catch(console.error);
      this._initBall(roomId);
      this._mainLoop(roomId);
    }
  
    return newRoom;
  }
  

  joinRoom (roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length >= room.maxPlayers) return null
    if (room.players.some(p => p.playerId === playerId)) return room
    room.players.push({ playerId, isBot: false, paddleY: 0.5 })
    room.scoreBoard[playerId] = 0
    if (room.players.length === room.maxPlayers) {
      room.status = 'running'
      this._recordMatchStart(room).catch(console.error);
      this._initBall(roomId)
      this._mainLoop(roomId)
    }
    return room
  }

  removeFromQueue(userId) {
    const q      = this.queues[MatchManager.GAME_MODES.PVP];
    const before = q.length;
    this.queues[MatchManager.GAME_MODES.PVP] =
    q.filter(entry => entry.userId !== userId);
    const after  = this.queues[MatchManager.GAME_MODES.PVP].length;
  }

  leaveRoom (roomId, playerId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.players = room.players.filter(p => p.playerId !== playerId)
    delete room.scoreBoard[playerId]
    if ( room.status !== 'finished') {
      this._forfeitMatch(roomId, playerId)
      return
    }
    if (room.mode === GAME_MODES.PVE || room.players.length === 0) {
      this.removeRoom(roomId)
    }
  }

  _forfeitMatch (roomId, leaverId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    clearInterval(room.updateInterval)
    clearTimeout(room.pauseTimeout)
    const winner = room.players.find(p => p.playerId !== leaverId)
    room.status  = 'finished'

    this._endMatch(roomId, winner?.playerId ?? null, 'opponent_disconnect')
  }

  async _recordMatchStart(room) {
    if (room.mode === GAME_MODES.PVE) return;

    const pointsStr = JSON.stringify(room.scoreBoard);
    const [p1, p2] = room.players.map(p => p.playerId);

    const rc = await create_match(pointsStr, p1, p2, room.roomId);

    if (rc === -1) {
      console.warn(`[${room.roomId}] DB: player not in settings - skipping create_match`);
    }
    // console.log(await show_matches());
  }

  async _recordMatchUpdate(room) {
    if (room.mode === GAME_MODES.PVE) return;

    const pointsStr = JSON.stringify(room.scoreBoard);
    await update_match('points', pointsStr, room.roomId);
  }

  async _recordMatchEnd(room, winnerId) {
    if (room.mode === GAME_MODES.PVE) return;

    const pointsStr = JSON.stringify(room.scoreBoard);
    await update_match('points', pointsStr, room.roomId);
    await update_match('winner', winnerId, room.roomId);
    // console.log(await show_matches());
  }

  async _endMatch(roomId, winnerId, reason = 'normal') {
    const room = this.rooms.get(roomId);
    if (!room) return;
  
    clearInterval(room.updateInterval);
    clearTimeout(room.pauseTimeout);
    room.status = 'finished';
  
    await this._recordMatchEnd(room, winnerId).catch(console.error);
  
    this._broadcastFor(roomId)({
      roomId,
      winner: winnerId,
      status: 'finished'
    });
  
  
    this.emit('matchFinished', {
      roomId,
      winnerId,
      reason,
      tournamentId: room.tournamentId || null // emit null if not a tournament
    });
  
    await update_match('winner', winnerId, roomId);
  
    setTimeout(() => this.removeRoom(roomId), 500);
  }
  

  _updateBotPaddle (room) {
    const bot = room.players.find(p => p.isBot)
    if (!bot) return
    const now = Date.now()
    if (bot.aiNextMoveTime && now < bot.aiNextMoveTime) return
    const { y: ballY } = room.ballState
    const dy = ballY - bot.paddleY
    if (Math.abs(dy) <= MatchManager.BOT_MAX_SPEED) {
      bot.paddleY = ballY
    } else {
      bot.paddleY += MatchManager.BOT_MAX_SPEED * Math.sign(dy)
    }
    bot.paddleY = Math.max(0, Math.min(1, bot.paddleY))
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
    room.isMaxSpeedReached      = false
    room.hitsSinceMaxSpeed      = 0
    room.ballBroadcastCountdown = 0
  }

  _mainLoop(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
  
    const broadcast = this._broadcastFor(roomId);
    const { FPS } = room;
    const paddleSize = 0.2;
    const halfPaddle = paddleSize / 2;
  
    const includeBall = () => {
      if (!room.isMaxSpeedReached || room.hitsSinceMaxSpeed < MatchManager.MIN_HITS_AFTER_MAX)
        return true;
      return room.ballBroadcastCountdown > 0;
    };
  
    room.updateInterval = setInterval(() => {
      if (room.mode === MatchManager.GAME_MODES.PVE && room.status === 'running') {
        this._updateBotPaddle(room);
      }
  
      for (const p of room.players) {
        p.paddleY = Math.max(halfPaddle, Math.min(1 - halfPaddle, p.paddleY));
      }
  
      const b = room.ballState;
      b.x += b.vx / FPS;
      b.y += b.vy / FPS;
  
      if (b.y <= 0) { b.y = 0; b.vy *= -1; }
      if (b.y >= 1) { b.y = 1; b.vy *= -1; }
  
      room.players.forEach((p, idx) => {
        const hit =
          (idx === 0 && b.x <= 0.02) ||
          (idx === 1 && b.x >= 0.98);
        const withinY = b.y >= p.paddleY - halfPaddle && b.y <= p.paddleY + halfPaddle;
  
        if (hit && withinY) {
          const incomingAngle = Math.atan2(b.vy, Math.abs(b.vx));
          const relY = (b.y - p.paddleY) / halfPaddle;
          const deflectAngle = relY * MatchManager.MAX_BOUNCE_ANGLE;
          const bounceAngle = incomingAngle * 0.1 + deflectAngle * 0.9;
  
          let speed = Math.hypot(b.vx, b.vy) * 1.03;
          if (speed > MatchManager.MAX_BALL_SPEED) speed = MatchManager.MAX_BALL_SPEED;
  
          const dir = idx === 0 ? 1 : -1;
          b.vx = speed * Math.cos(bounceAngle) * dir;
          b.vy = speed * Math.sin(bounceAngle);
          b.x = idx === 0 ? 0.02 : 0.98;
  
          const atMax = Math.abs(speed - MatchManager.MAX_BALL_SPEED) < 1e-6;
          if (atMax) {
            if (!room.isMaxSpeedReached) {
              room.isMaxSpeedReached = true;
              room.hitsSinceMaxSpeed = 0;
            }
            room.hitsSinceMaxSpeed++;
            if (room.hitsSinceMaxSpeed >= MatchManager.MIN_HITS_AFTER_MAX) {
              room.ballBroadcastCountdown = MatchManager.BALL_BROADCAST_FRAMES;
            }
          }
        }
      });
  
      const currentSpeed = Math.hypot(b.vx, b.vy);
      if (currentSpeed > MatchManager.MAX_BALL_SPEED) {
        const scale = MatchManager.MAX_BALL_SPEED / currentSpeed;
        b.vx *= scale;
        b.vy *= scale;
      }
  
      if (b.x < 0 || b.x > 1) {
        const scorerIdx = b.x < 0 ? 1 : 0;
  
        if (scorerIdx >= room.players.length) {
          const leaverIdx = scorerIdx === 0 ? 1 : 0;
          const leaverId = room.players[leaverIdx]?.playerId;
          this._forfeitMatch(roomId, leaverId);
          return;
        }
  
        const scorerId = room.players[scorerIdx].playerId;
        room.scoreBoard[scorerId]++;
        clearInterval(room.updateInterval);
  
        const finalState = {
          roomId,
          players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
          ball: null,
          scores: room.scoreBoard,
          status: undefined,
        };
  
        if (room.scoreBoard[scorerId] >= room.maxScore) {
          this._endMatch(roomId, scorerId, 'normal');
          return;
        } else {
          room.status = 'paused';
          finalState.status = 'paused';
        }
  
        broadcast(finalState);
  
        room.pauseTimeout = setTimeout(() => {
          room.status = 'running';
          this._initBall(roomId);
          this._mainLoop(roomId);
        }, 1000);
  
        return;
      }
  
      const state = {
        roomId,
        players: room.players.map(p => ({ id: p.playerId, y: p.paddleY })),
        ball: includeBall() ? { x: b.x, y: b.y } : null,
        scores: room.scoreBoard,
        status: room.status,
      };
      broadcast(state);
  
      if (room.ballBroadcastCountdown > 0) {
        room.ballBroadcastCountdown--;
      }
  
    }, 1000 / FPS);
  }
  

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
