let socket: WebSocket;

export function startGame(mode: string) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  socket = new WebSocket(`ws://${window.location.host}/ws/game`);

  socket.addEventListener('open', () => {
    const userId = 'user_' + Math.floor(Math.random() * 10000); // временно
    socket.send(JSON.stringify({
      type: 'joinQueue',
      payload: {
        userId,
        mode
      }
    }));
  });

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'matchFound') {
      console.log('🟢 Match found:', msg.payload);
      // можно отрисовать "Match starting..."
    } else if (msg.type === 'state') {
      updateGame(ctx, msg.state);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      socket.send(JSON.stringify({
        type: 'move',
        payload: {
          direction: event.key === 'ArrowUp' ? 'up' : 'down'
        }
      }));
    }
  });
}

function updateGame(ctx: CanvasRenderingContext2D, state: any) {
  ctx.clearRect(0, 0, 800, 600);

  // Draw ball
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Draw players
  state.players.forEach((p: any) => {
    ctx.fillRect(p.x, p.y, p.width, p.height);
  });

  // Draw score
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${state.score[0]} - ${state.score[1]}`, 330, 40);
}
