let gameState = {
    ball: { x: 400, y: 300, dx: 3, dy: 3 },
    players: [
      { x: 20, y: 250, width: 10, height: 100 },
      { x: 770, y: 250, width: 10, height: 100 }
    ],
    score: [0, 0],
  };
  
  export function startGameLoop(broadcastState) {
    setInterval(() => {
      const ball = gameState.ball;
  
      ball.x += ball.dx;
      ball.y += ball.dy;
  
      // Bounce off top and bottom
      if (ball.y <= 0 || ball.y >= 600) ball.dy *= -1;
  
      // Bounce off paddles — пример
      // TODO: добавить логику столкновения
  
      // Reset if out of bounds
      if (ball.x < 0 || ball.x > 800) {
        gameState.ball = { x: 400, y: 300, dx: 3, dy: 3 };
        gameState.score[ball.x < 0 ? 1 : 0]++;
      }
  
      broadcastState(gameState);
    }, 1000 / 60);
  }
  