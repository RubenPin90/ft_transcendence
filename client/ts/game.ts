// client/game.ts
let socket: WebSocket | null = null;
let ctx: CanvasRenderingContext2D | null = null;

/* -------------------------------------------------- initialise canvas */
export function initGameCanvas() {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (canvas && !ctx) {
    ctx = canvas.getContext('2d');
  }
}

/* -------------------------------------------------- start & stop  */
export function startGame(mode: string) {
  if (socket && socket.readyState === WebSocket.OPEN) return;    // already running

  socket = new WebSocket(`ws://${location.host}/ws/game`);

  socket.addEventListener('open', () => {
    socket!.send(JSON.stringify({
      type: 'joinQueue',
      payload: { mode, userId: `cli_${Math.floor(Math.random() * 9999)}` },
    }));
  });

  socket.addEventListener('message', ev => {
    const { type, payload, state } = JSON.parse(ev.data);

    if (type === 'matchFound') {
      console.log('Match ready, id =', payload.gameId);
    } else if (type === 'state') {
      drawFrame(state);
    }
  });

  socket.addEventListener('close', () =>
    console.log('Socket closed'),
  );
}

export function stopGame() {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  socket = null;
}

/* -------------------------------------------------- rendering */
function drawFrame(state: any) {
  if (!ctx) return;                       // <-- guarantees it’s non‑null
  const context = ctx;                    //      narrowed type

  const { canvas } = context;
  const toX = (u: number) => u * canvas.width;
  const toY = (u: number) => u * canvas.height;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // ball
  context.beginPath();
  context.arc(toX(state.ball.x), toY(state.ball.y), 8, 0, 2 * Math.PI);
  context.fillStyle = '#fff';
  context.fill();

  // paddles
  state.players.forEach((p: any, idx: number) => {
    const x = idx === 0 ? 10 : canvas.width - 25;
    context.fillRect(x, toY(p.y) - 50, 15, 100);   // <- use `context`
  });
}