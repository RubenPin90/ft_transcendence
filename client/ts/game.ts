// game.ts – place next to main.ts
let ws: WebSocket | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export function startGame(mode: string) {
  // Canvas & 2‑D context
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d');

  console.log('startGame → opening WS, mode =', mode);

  ws = new WebSocket(`ws://${location.host}/ws/game`);

  ws.onopen = () => {
    ws!.send(JSON.stringify({
      type: 'joinQueue',
      payload: { mode }
    }));
    console.log('WS open, joinQueue sent');
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.type === 'game_state') {
      drawFrame(msg.data);
    }
  };

  ws.onclose = () => console.log('WS closed');
}

export function stopGame() {
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
}

function drawFrame(state: any) {
  const context = ctx;           // ← fresh alias that keeps the narrowed type
  if (!context) return;          // exit if the canvas didn’t initialise

  const { canvas } = context;    // destructure once, nicer to read
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
    context.fillRect(x, toY(p.y) - 50, 15, 100);
  });
}