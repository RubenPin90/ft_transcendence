export type GameMode = 'pve' | '1v1' | 'Customgame'

interface PlayerState {
  id: string
  y: number
}

interface GameState {
  roomId: string
  players: PlayerState[]
  ball: { x: number; y: number } | null
  scores: Record<string, number>
  status: 'running' | 'paused' | 'finished'
  winner?: string
}

let socket: WebSocket | null = null
let ctx: CanvasRenderingContext2D | null = null
const USER_ID = `cli_${Math.floor(Math.random() * 100000)}`
let onGameEndCallback: ((winnerId: string) => void) | null = null

const keysPressed: Record<string, boolean> = {}

export function setOnGameEnd(cb: (winnerId: string) => void): void {
  onGameEndCallback = cb
}

export function initGameCanvas(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null
  if (!canvas) return
  ctx = canvas.getContext('2d')
}

export function startGame(mode: GameMode): void {
  if (socket && socket.readyState === WebSocket.OPEN) return

  socket = new WebSocket(`ws://${location.host}/ws/game`)

  socket.addEventListener('open', () => {
    socket!.send(JSON.stringify({
      type: 'joinQueue',
      payload: { mode, userId: USER_ID }
    }))
    setupInputHandlers()
  })

  socket.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data) as
      | { type: 'matchFound'; payload: { gameId: string } }
      | { type: 'state'; state: GameState }

    if (msg.type === 'matchFound') {
      console.log('Match ready, id =', msg.payload.gameId)
    } else if (msg.type === 'state') {
      drawFrame(msg.state)

      if (msg.state.status === 'finished') {
        console.log('Game finished! Winner =', msg.state.winner)
        stopGame()
        if (onGameEndCallback && msg.state.winner) {
          onGameEndCallback(msg.state.winner)
        }
      }
    }
  })

  socket.addEventListener('close', () => console.log('Socket closed'))
}

export function stopGame(): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'leaveGame', payload: { userId: USER_ID } }))
    socket.close()
  }
  socket = null
}

function drawFrame(state: GameState): void {
  if (!ctx) return
  const canvas = ctx.canvas
  const toX = (u: number) => u * canvas.width
  const toY = (u: number) => u * canvas.height

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // ✅ only draw if ball is non‑null
  if (state.ball) {
    const { x, y } = state.ball
    ctx.beginPath()
    ctx.arc(toX(x), toY(y), 8, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
  }

  state.players.forEach((p, i) => {
    const x = i === 0 ? 10 : canvas.width - 25
    ctx?.fillRect(x, toY(p.y) - 50, 15, 100)
  })

  ctx.font = '20px sans-serif'
  ctx.fillText(
    `${state.scores[state.players[0].id] || 0}`,
    canvas.width * 0.25,
    30
  )
  ctx.fillText(
    `${state.scores[state.players[1].id] || 0}`,
    canvas.width * 0.75,
    30
  )
}

function setupInputHandlers(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!keysPressed[e.key]) {
        keysPressed[e.key] = true
        const direction = e.key === 'ArrowUp' ? 'up' : 'down'
        socket?.send(JSON.stringify({
          type: 'movePaddle',
          payload: { userId: USER_ID, direction, active: true }
        }))
      }
      e.preventDefault()
    }
  })

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (keysPressed[e.key]) {
        keysPressed[e.key] = false
        socket?.send(JSON.stringify({
          type: 'movePaddle',
          payload: { userId: USER_ID, direction: 'stop', active: false }
        }))
      }
      e.preventDefault()
    }
  })
}
