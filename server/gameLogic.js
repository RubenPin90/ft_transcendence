// gameLogic.js
// Example: a minimal authoritative game loop for Pong.

class GameLogic {
  constructor() {
    // --- Field settings ---
    this.fieldWidth = 800;
    this.fieldHeight = 500;

    // --- Ball settings ---
    this.ballRadius = 10;
    this.ballSpeed = 6;
    this.ball = {
      x: this.fieldWidth / 2,
      y: this.fieldHeight / 2,
      vx: this.ballSpeed,
      vy: this.ballSpeed,
    };

    // --- Paddle settings ---
    this.paddleWidth = 15;
    this.paddleHeight = 100;
    this.paddleSpeed = 7;

    // Two players (adjust as needed)
    this.players = {
      player1: {
        x: 20,
        y: (this.fieldHeight - this.paddleHeight) / 2,
        score: 0,
      },
      player2: {
        x: this.fieldWidth - 20 - this.paddleWidth,
        y: (this.fieldHeight - this.paddleHeight) / 2,
        score: 0,
      },
    };
  }

  /**
   * Main update: move the ball, detect collisions, etc.
   */
  update() {
    this.updateBall();
    // If you want to add things like game over checks, do so here.
  }

  /**
   * Move the ball and detect collisions with walls or paddles.
   */
  updateBall() {
    // Move
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Collide top/bottom
    if (this.ball.y < 0) {
      this.ball.y = 0;
      this.ball.vy = -this.ball.vy;
    } else if (this.ball.y + this.ballRadius > this.fieldHeight) {
      this.ball.y = this.fieldHeight - this.ballRadius;
      this.ball.vy = -this.ball.vy;
    }

    // Check left boundary: score for player2 if ball goes out
    if (this.ball.x < 0) {
      this.players.player2.score += 1;
      this.resetBall(true);
    }

    // Check right boundary: score for player1
    if (this.ball.x + this.ballRadius > this.fieldWidth) {
      this.players.player1.score += 1;
      this.resetBall(false);
    }

    // Collide with paddles
    this.checkPaddleCollision();
  }

  checkPaddleCollision() {
    const p1 = this.players.player1;
    const p2 = this.players.player2;

    // Left paddle
    if (
      this.ball.x <= p1.x + this.paddleWidth &&
      this.ball.x >= p1.x &&
      this.ball.y + this.ballRadius >= p1.y &&
      this.ball.y <= p1.y + this.paddleHeight
    ) {
      this.ball.x = p1.x + this.paddleWidth; // re-position
      this.ball.vx = -this.ball.vx;          // reverse direction
    }

    // Right paddle
    if (
      this.ball.x + this.ballRadius >= p2.x &&
      this.ball.x + this.ballRadius <= p2.x + this.paddleWidth &&
      this.ball.y + this.ballRadius >= p2.y &&
      this.ball.y <= p2.y + this.paddleHeight
    ) {
      this.ball.x = p2.x - this.ballRadius;  // re-position
      this.ball.vx = -this.ball.vx;          // reverse
    }
  }

  /**
   * Reset the ball to the center after a score.
   * flip indicates which side to serve from.
   */
  resetBall(flip) {
    this.ball.x = this.fieldWidth / 2;
    this.ball.y = this.fieldHeight / 2;

    // Just reverse horizontal direction. Optionally randomize vertical velocity
    this.ball.vx = this.ballSpeed * (flip ? -1 : 1);
    this.ball.vy = this.ballSpeed * (Math.random() < 0.5 ? 1 : -1);
  }

  /**
   * Accessor function to pass to your broadcast.
   */
  getState() {
    return {
      ball: { ...this.ball },
      player1: {
        x: this.players.player1.x,
        y: this.players.player1.y,
        score: this.players.player1.score,
      },
      player2: {
        x: this.players.player2.x,
        y: this.players.player2.y,
        score: this.players.player2.score,
      },
    };
  }

  /**
   * Example method if you want to let players move paddles from the server side.
   * Typically, your server receives “move” messages from the client, and calls this:
   */
  setPaddlePosition(playerSlot, newY) {
    if (!this.players[playerSlot]) return;
    const maxY = this.fieldHeight - this.paddleHeight;
    this.players[playerSlot].y = Math.max(0, Math.min(newY, maxY));
  }
}

/**
 * The function your server calls:
 *   startGameLoop(broadcastFunc)
 * Where `broadcastFunc` is something like:
 *   function broadcastFunc(state) {
 *     wss.clients.forEach(client => client.send(JSON.stringify({ type: 'state', state })))
 *   }
 */
export function startGameLoop(broadcast) {
  // Create our game instance
  const game = new GameLogic();

  // 60 FPS update loop
  setInterval(() => {
    // 1) Update the game world
    game.update();

    // 2) Broadcast the new state
    const currentState = game.getState();
    broadcast(currentState);
  }, 1000 / 60);

  // Return the game instance if you want to manipulate it from server.js
  return game;
}
