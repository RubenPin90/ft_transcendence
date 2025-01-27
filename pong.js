// Get the canvas and its context
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// Paddle dimensions
const paddleWidth = 10;
const paddleHeight = 75;
const paddleSpeed = 7;

// Paddle positions (moved a bit inward)
const leftPaddleX = 20;
let leftPaddleY = (canvas.height - paddleHeight) / 2;

const rightPaddleX = canvas.width - paddleWidth - 20;
let rightPaddleY = (canvas.height - paddleHeight) / 2;

// Ball settings
let ballRadius = 10;
let x = canvas.width / 2; // Ball x
let y = canvas.height / 2; // Ball y
let dx = 4; // Ball velocity x
let dy = -4; // Ball velocity y

// Key controls
let wPressed = false;
let sPressed = false;
let upPressed = false;
let downPressed = false;

// Listen for key presses
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

function keyDownHandler(e) {
  if (e.key === 'w' || e.key === 'W') {
    wPressed = true;
  }
  if (e.key === 's' || e.key === 'S') {
    sPressed = true;
  }
  if (e.key === 'ArrowUp') {
    upPressed = true;
  }
  if (e.key === 'ArrowDown') {
    downPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === 'w' || e.key === 'W') {
    wPressed = false;
  }
  if (e.key === 's' || e.key === 'S') {
    sPressed = false;
  }
  if (e.key === 'ArrowUp') {
    upPressed = false;
  }
  if (e.key === 'ArrowDown') {
    downPressed = false;
  }
}

// Draw a paddle at (paddleX, paddleY)
function drawPaddle(paddleX, paddleY) {
  ctx.beginPath();
  ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.closePath();
}

// Draw the ball
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.closePath();
}

// Move paddles based on key inputs
function movePaddles() {
  if (wPressed && leftPaddleY > 0) {
    leftPaddleY -= paddleSpeed;
  } else if (sPressed && leftPaddleY < canvas.height - paddleHeight) {
    leftPaddleY += paddleSpeed;
  }

  if (upPressed && rightPaddleY > 0) {
    rightPaddleY -= paddleSpeed;
  } else if (downPressed && rightPaddleY < canvas.height - paddleHeight) {
    rightPaddleY += paddleSpeed;
  }
}

// Update ball's position and handle collisions
function updateBall() {
  x += dx;
  y += dy;

  // Collide with top or bottom walls
  if (y + dy < ballRadius || y + dy > canvas.height - ballRadius) {
    dy = -dy;
  }

  // Collide with left paddle
  if ((x - ballRadius) <= (leftPaddleX + paddleWidth)) {
    // Check if ball is within paddle's vertical bounds
    if (y > leftPaddleY && y < leftPaddleY + paddleHeight) {
      dx = -dx; // bounce
    }
    // else, do nothing here—allow it to pass
  }

  // Collide with right paddle
  if ((x + ballRadius) >= rightPaddleX) {
    // Check if ball is within paddle's vertical bounds
    if (y > rightPaddleY && y < rightPaddleY + paddleHeight) {
      dx = -dx; // bounce
    }
    // else, do nothing here—allow it to pass
  }

  // Reset ball if it goes off the left or right boundaries
  if (x - ballRadius < 0 || x + ballRadius > canvas.width) {
    resetBall();
  }
}

// Reset ball to center
function resetBall() {
  x = canvas.width / 2;
  y = canvas.height / 2;
  // Reverse direction for a simple effect
  dx = -dx;
  dy = -dy;
}

// Main draw function
function draw() {
  // Clear the entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw paddles
  drawPaddle(leftPaddleX, leftPaddleY);
  drawPaddle(rightPaddleX, rightPaddleY);

  // Draw ball
  drawBall();

  // Move paddles and update ball
  movePaddles();
  updateBall();
}

// Run the game loop (roughly 60 FPS)
setInterval(draw, 8);
