// server/gameLogic.js

class GameState {
    constructor() {
      // Initial positions and velocities
      this.ball = { x: 400, y: 300, vx: 5, vy: 3 };
      this.paddleLeft = { y: 250 };
      this.paddleRight = { y: 250 };
      this.score = { left: 0, right: 0 };
    }
  
    update() {
      // Basic physics: update ball position
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;
  
      // Collision with top and bottom walls
      if (this.ball.y <= 0 || this.ball.y >= 600) {
        this.ball.vy *= -1;
      }
  
      // Add paddle collision logic and scoring here...
    }
  
    getState() {
      return this;
    }
  }
  
  const gameState = new GameState();
  
  // Start the game loop and periodically call the broadcast callback
  function startGameLoop(broadcast) {
    setInterval(() => {
      gameState.update();
      broadcast(gameState.getState());
    }, 1000 / 60); // 60 FPS
  }
  
  export { startGameLoop, gameState };
  