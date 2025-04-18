// gameLogic.js
// An expanded example of an "authoritative" Pong game loop.

class GameLogic {
  constructor({ hasBot = false, maxScore = 5 } = {}) {
    // Dimensions
    this.fieldWidth = 800;
    this.fieldHeight = 500;

    // Ball
    this.ballRadius = 10;
    this.ballSpeed = 6;
    this.ball = {
      x: this.fieldWidth / 2,
      y: this.fieldHeight / 2,
      vx: this.ballSpeed,
      vy: this.ballSpeed,
    };

    // Paddles
    this.paddleWidth = 15;
    this.paddleHeight = 100;
    this.paddleSpeed = 7;  // for human players

    // Whether player2 is a bot
    this.hasBot = hasBot;
    // If the bot is slower/faster, you can define a separate speed:
    this.botSpeed = 6;

    // Score limit for an optional "game over" scenario
    this.maxScore = maxScore;
    this.isGameOver = false;

    // Store player objects. In 2-player Pong:
    this.players = {
      player1: {
        x: 20,
        y: (this.fieldHeight - this.paddleHeight) / 2,
        score: 0,
        isBot: false,
      },
      player2: {
        x: this.fieldWidth - 20 - this.paddleWidth,
        y: (this.fieldHeight - this.paddleHeight) / 2,
        score: 0,
        // If the second slot is a bot, we toggle this:
        isBot: this.hasBot, 
      },
    };
  }

  /**
   * Called every "tick" (e.g. ~60 times/sec).
   */
  update() {
    // If the game ended, skip updates (or you could keep the ball stopped).
    if (this.isGameOver) return;

    // 1) If player2 is a bot, update its paddle
    this.updateBotPaddle();

    // 2) Move and collide the ball
    this.updateBall();

    // 3) Check if someone reached maxScore
    this.checkWinCondition();
  }

  /**
   * If player2 is a bot, this tries to move the paddle toward the ball.
   * For example, it sees the ball's Y position and tries to center the paddle on it.
   */
  updateBotPaddle() {
    const p2 = this.players.player2;
    if (!p2.isBot) return;

    // Simple logic: move the paddle center toward the ball's y.
    // The center of p2's paddle is p2.y + this.paddleHeight/2
    const paddleCenterY = p2.y + this.paddleHeight / 2;
    const dy = this.ball.y - paddleCenterY;

    // The bot only moves vertically by up to "this.botSpeed" each tick
    if (Math.abs(dy) > 2) {
      // Move up or down
      if (dy > 0) {
        // move down
        p2.y += Math.min(this.botSpeed, dy);
      } else {
        // move up
        p2.y += Math.max(-this.botSpeed, dy);
      }
    }

    // Ensure the bot paddle remains within field bounds
    const maxY = this.fieldHeight - this.paddleHeight;
    if (p2.y < 0) p2.y = 0;
    else if (p2.y > maxY) p2.y = maxY;
  }

  /**
   * Moves the ball and detects collisions with walls, paddles, scoring, etc.
   */
  updateBall() {
    // Move
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Collide top/bottom
    if (this.ball.y < 0) {
      this.ball.y = 0;
      this.ball.vy = -this.ball.vy;
    } 
    else if (this.ball.y + this.ballRadius > this.fieldHeight) {
      this.ball.y = this.fieldHeight - this.ballRadius;
      this.ball.vy = -this.ball.vy;
    }

    // Check left boundary (score for player2)
    if (this.ball.x < 0) {
      this.players.player2.score += 1;
      this.resetBall(true);
    }

    // Check right boundary (score for player1)
    if (this.ball.x + this.ballRadius > this.fieldWidth) {
      this.players.player1.score += 1;
      this.resetBall(false);
    }

    // Collide with paddles
    this.checkPaddleCollision();
  }

  /**
   * If the ball overlaps with a paddle, reverse vx and adjust position.
   */
  checkPaddleCollision() {
    const p1 = this.players.player1;
    const p2 = this.players.player2;

    // For convenience
    const ballLeft = this.ball.x;
    const ballRight = this.ball.x + this.ballRadius;
    const ballTop = this.ball.y;
    const ballBottom = this.ball.y + this.ballRadius;

    // Left paddle (Player1)
    const p1Right = p1.x + this.paddleWidth;
    const p1Bottom = p1.y + this.paddleHeight;

    // Check if horizontally overlapped and vertically overlapped
    if (
      ballRight >= p1.x &&
      ballLeft <= p1Right &&
      ballBottom >= p1.y &&
      ballTop <= p1Bottom
    ) {
      // Re-position the ball outside the paddle
      this.ball.x = p1Right;
      // Reverse horizontal direction
      this.ball.vx = Math.abs(this.ball.vx);
    }

    // Right paddle (Player2)
    const p2Left = p2.x;
    const p2Bottom = p2.y + this.paddleHeight;

    if (
      ballLeft <= p2Left + this.paddleWidth &&
      ballRight >= p2Left &&
      ballBottom >= p2.y &&
      ballTop <= p2Bottom
    ) {
      // Re-position
      this.ball.x = p2Left - this.ballRadius;
      // Reverse horizontal
      this.ball.vx = -Math.abs(this.ball.vx);
    }
  }

  /**
   * Reset the ball to center after a score. 
   * If flip=true, the ball starts heading left, otherwise it starts heading right.
   */
  resetBall(flip) {
    this.ball.x = this.fieldWidth / 2;
    this.ball.y = this.fieldHeight / 2;

    // Reverse horizontal direction if flip is set
    this.ball.vx = this.ballSpeed * (flip ? 1 : -1);
    // Randomize vertical
    this.ball.vy = this.ballSpeed * (Math.random() < 0.5 ? 1 : -1);
  }

  /**
   * If a player reaches maxScore, mark game over.
   */
  checkWinCondition() {
    const p1Score = this.players.player1.score;
    const p2Score = this.players.player2.score;

    if (p1Score >= this.maxScore || p2Score >= this.maxScore) {
      this.isGameOver = true;
    }
  }

  /**
   * Used by the server to broadcast the current state to clients
   */
  getState() {
    return {
      isGameOver: this.isGameOver,
      ball: { ...this.ball },
      player1: {
        x: this.players.player1.x,
        y: this.players.player1.y,
        score: this.players.player1.score,
        isBot: this.players.player1.isBot,
      },
      player2: {
        x: this.players.player2.x,
        y: this.players.player2.y,
        score: this.players.player2.score,
        isBot: this.players.player2.isBot,
      },
    };
  }

  /**
   * Let the server set a paddle Y position. Typically you'd do this
   * when a client sends "movePaddle" events.
   */
  setPaddlePosition(playerSlot, newY) {
    if (!this.players[playerSlot]) return;
    const maxY = this.fieldHeight - this.paddleHeight;
    this.players[playerSlot].y = Math.max(0, Math.min(newY, maxY));
  }

  /**
   * Optionally let the server toggle whether player2 is a bot.
   */
  setBotForPlayer2(isBot) {
    this.hasBot = isBot;
    this.players.player2.isBot = isBot;
  }
}

/**
 * The function your server calls: startGameLoop(broadcastFunc).
 * Typically, broadcastFunc looks like:
 *    (state) => { wss.clients.forEach(c => c.send(JSON.stringify({ type: 'state', state }))) }
 */
export function startGameLoop(broadcast) {
  // Create our game instance. 
  // If you want a bot in this "global" game, pass { hasBot: true }:
  const game = new GameLogic({ hasBot: false, maxScore: 5 });

  // 60 FPS update loop
  const updateInterval = setInterval(() => {
    // 1) Update the game world
    game.update();

    // 2) Broadcast the new state
    const currentState = game.getState();
    console.log("Broadcasting game state:", currentState);
    broadcast(currentState);

    // If the game ended, you can clear interval or continue as you like:
    if (currentState.isGameOver) {
      clearInterval(updateInterval);
      // Optionally broadcast a "gameOver" message
      console.log("Game Over: final scores => p1:", currentState.player1.score, " p2:", currentState.player2.score);
    }

  }, 1000 / 60);

  // Return the game instance if you want to manipulate it from server.js
  return game;
}
