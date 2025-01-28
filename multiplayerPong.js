/*******************************
 * Basic Settings & Variables
 *******************************/

// Get canvas & context
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// Number of players (2 to 8)
let numberOfPlayers = 6;  // Example: 6 players -> hexagon

// Ball
let ballRadius = 10;
let ballX = canvas.width / 2; 
let ballY = canvas.height / 2; 
let dx = 3; // horizontal velocity
let dy = -3; // vertical velocity

// Paddles array
let paddles = []; // Will hold Paddle objects for each side

// Keyboard states (expand as needed)
let keyState = {};


/*******************************
 * Utility: Regular Polygon
 *******************************/
/**
 * Returns an array of vertices (x, y) for a regular N-gon
 * centered at (cx, cy) with a given radius.
 *
 * @param {number} n      Number of sides
 * @param {number} cx     Center x
 * @param {number} cy     Center y
 * @param {number} radius Radius of the polygon
 * @returns {Array}       Array of vertices [ {x, y}, ... ]
 */
function getRegularPolygonVertices(n, cx, cy, radius) {
  const vertices = [];
  const angleStep = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const angle = i * angleStep - Math.PI / 2; 
    // ^ -Math.PI/2 rotates the polygon so one side might be at the top, 
    //   adjust as you like
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    vertices.push({ x, y });
  }
  return vertices;
}


/*******************************
 * Paddle Object / Class
 *******************************/
class Paddle {
  /**
   * @param {Object} p1 - {x, y} start point of the side
   * @param {Object} p2 - {x, y} end point of the side
   * @param {number} length - how large the paddle is along that side
   * @param {string} upKey - key to move "up" on that side
   * @param {string} downKey - key to move "down" on that side
   */
  constructor(p1, p2, length, upKey, downKey) {
    this.p1 = p1;        // start of the polygon side
    this.p2 = p2;        // end of the polygon side
    this.length = length; // portion along the side used as the paddle
    this.param = 0.5;    // parametric position (0 to 1) along that side
    this.upKey = upKey;
    this.downKey = downKey;
    this.speed = 0.01;   // speed of movement along the side
  }

  update() {
    // Move “up” or “down” along the line if keys are pressed
    if (keyState[this.upKey]) {
      this.param = Math.max(0, this.param - this.speed);
    }
    if (keyState[this.downKey]) {
      this.param = Math.min(1, this.param + this.speed);
    }
}

  /**
   * Return the endpoints of the paddle segment on this side
   * in (x, y) coordinates.
   */
  getSegment() {
    // Full side vector
    const sideVecX = this.p2.x - this.p1.x;
    const sideVecY = this.p2.y - this.p1.y;
    const sideLength = Math.hypot(sideVecX, sideVecY);

    // The actual paddle length in terms of param along the side
    // e.g. if sideLength=200, and this.length=50,
    // the param range for the paddle is 50/200 = 0.25
    const paddleParamSpan = this.length / sideLength;

    // Start param
    const startParam = this.param - paddleParamSpan / 2;
    // End param
    const endParam = this.param + paddleParamSpan / 2;

    // Make sure they are within [0,1]
    const clampedStart = Math.max(0, startParam);
    const clampedEnd = Math.min(1, endParam);

    // Convert param to actual x, y
    const x1 = this.p1.x + sideVecX * clampedStart;
    const y1 = this.p1.y + sideVecY * clampedStart;
    const x2 = this.p1.x + sideVecX * clampedEnd;
    const y2 = this.p1.y + sideVecY * clampedEnd;

    return { x1, y1, x2, y2 };
  }

  draw(ctx) {
    // Draw the paddle line segment
    const seg = this.getSegment();
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
    ctx.closePath();
  }
}


/*******************************
 * Create the Arena & Paddles
 *******************************/
function createArena(numPlayers) {
  paddles = []; // reset

  if (numPlayers <= 4) {
    // -- 1 to 4 Players: Use a rectangle
    //    For example, treat it like standard Pong but
    //    distribute paddles around the rectangle edges if needed.

    // Define corners (square or rectangle)
    const margin = 30;
    const left   = margin;
    const right  = canvas.width - margin;
    const top    = margin;
    const bottom = canvas.height - margin;

    // We can store these corners in an array
    const rectVertices = [
      { x: left,  y: top    },
      { x: right, y: top    },
      { x: right, y: bottom },
      { x: left,  y: bottom }
    ];

    // Now depending on the number of players, create paddles for each side
    // Example: 2 players -> left and right sides
    //          3 players -> left, right, bottom
    //          4 players -> left, right, top, bottom
    // This logic is up to you; here's a simple example for 4 players:
    if (numPlayers === 2) {
      // Just left & right
      paddles.push(new Paddle(rectVertices[0], rectVertices[3], 100, 'w', 's')); // left side
      paddles.push(new Paddle(rectVertices[1], rectVertices[2], 100, 'ArrowUp', 'ArrowDown')); // right side
    } else if (numPlayers === 3) {
      paddles.push(new Paddle(rectVertices[0], rectVertices[3], 100, 'w', 's')); 
      paddles.push(new Paddle(rectVertices[1], rectVertices[2], 100, 'ArrowUp', 'ArrowDown'));
      paddles.push(new Paddle(rectVertices[2], rectVertices[3], 100, 'u', 'j')); // bottom side
    } else {
      // 4 players
      paddles.push(new Paddle(rectVertices[0], rectVertices[3], 100, 'w', 's')); 
      paddles.push(new Paddle(rectVertices[1], rectVertices[2], 100, 'ArrowUp', 'ArrowDown'));
      paddles.push(new Paddle(rectVertices[0], rectVertices[1], 100, 'a', 'z')); // top side
      paddles.push(new Paddle(rectVertices[3], rectVertices[2], 100, 'k', 'm')); // bottom side
    }

    return rectVertices;
    
  } else {
    // -- 5 to 8 players: use a regular N-gon
    //    e.g. 6 players -> hexagon, 7 -> heptagon, 8 -> octagon
    const radius = Math.min(canvas.width, canvas.height) / 2 - 30;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Retrieve the polygon vertices
    const polygonVertices = getRegularPolygonVertices(
      numPlayers,
      centerX,
      centerY,
      radius
    );

    // For each side, create a paddle
    // Key assignment is arbitrary here, you need to define your own scheme
    // or add gamepad / network controls, etc.
    const keys = [
      ['w','s'], ['ArrowUp','ArrowDown'], ['a','z'], ['k','m'],
      ['t','g'], ['i','k'], ['f','v'], ['n','b']
    ];
    // Just an example up to 8 sets of keys

    for (let i = 0; i < numPlayers; i++) {
      const p1 = polygonVertices[i];
      const p2 = polygonVertices[(i + 1) % numPlayers]; // next vertex
      const paddleLength = 80; // or define differently
      paddles.push(
        new Paddle(p1, p2, paddleLength, keys[i][0], keys[i][1])
      );
    }
    
    return polygonVertices;
  }
}

// Create the arena based on the numberOfPlayers
let arenaVertices = createArena(numberOfPlayers);


/*******************************
 * Draw the Arena
 *******************************/
function drawArenaEdges(vertices) {
  ctx.beginPath();
  ctx.strokeStyle = "lightgray";
  ctx.lineWidth = 2;

  // Draw lines between each pair of vertices
  for (let i = 0; i < vertices.length; i++) {
    let next = (i + 1) % vertices.length;
    ctx.moveTo(vertices[i].x, vertices[i].y);
    ctx.lineTo(vertices[next].x, vertices[next].y);
  }
  ctx.stroke();
  ctx.closePath();
}

/**
 * Update ball position, check collisions, and reflect or bounce as needed.
*/

/**
 * Update ball position, check collisions, and reflect or bounce as needed.
 */
function updateBall() {
  // 1) Move the ball by its current velocity
  ballX += dx;
  ballY += dy;

  if (numberOfPlayers <= 4) {
    /***************************************
     * Rectangle collisions (simpler case)
     ***************************************/
    const margin = 30;

    // Top boundary
    if (ballY - ballRadius < margin) {
      ballY = margin + ballRadius; // push ball back in bounds
      dy = -dy;
    }
    // Bottom boundary
    if (ballY + ballRadius > canvas.height - margin) {
      ballY = canvas.height - margin - ballRadius;
      dy = -dy;
    }
    // Left boundary
    if (ballX - ballRadius < margin) {
      ballX = margin + ballRadius;
      dx = -dx;
    }
    // Right boundary
    if (ballX + ballRadius > canvas.width - margin) {
      ballX = canvas.width - margin - ballRadius;
      dx = -dx;
    }

  } else {
    /***************************************
     * Polygon collisions (N-gon, N = 5..8)
     ***************************************/
    // For each side of the polygon, check if the ball is colliding
    for (let i = 0; i < arenaVertices.length; i++) {
      let p1 = arenaVertices[i];
      let p2 = arenaVertices[(i + 1) % arenaVertices.length];

      // 1) Check the distance from the ball center to this side
      const distInfo = getLineCollisionInfo(ballX, ballY, p1, p2);
      const distToLine = distInfo.distance;
      const lineParam  = distInfo.t;
      // distInfo.normal is the outward normal if we want to reflect

      // 2) If distance <= ballRadius, there's a collision with the infinite line;
      //    But we must also check if it's within the segment range (0 <= t <= 1) 
      //    if you want to treat each edge as a segment. 
      //    However, for a closed polygon, we generally consider each edge fully:
      if (distToLine <= ballRadius && lineParam >= 0 && lineParam <= 1) {
        // We have a collision. Reflect velocity across the side's normal.
        const { nx, ny } = distInfo.normal; // outward normal from side p1->p2

        // Reflect velocity
        const reflected = reflect(dx, dy, nx, ny);
        dx = reflected.dx;
        dy = reflected.dy;

        // Optionally, also nudge the ball so it's not "stuck" inside the boundary.
        // We move it outward so that distToLine == ballRadius.
        const overlap = ballRadius - distToLine;
        // Move in direction of normal by 'overlap'
        ballX += nx * overlap;
        ballY += ny * overlap;

        // Because the ball could theoretically collide with more than one 
        // side in a single frame (corner case), you could break here 
        // or let it check the other edges. Usually, you'd break if you 
        // assume only one collision at a time:
        // break;
      }
    }
  }

  /***********************************************
   * Check collision with each paddle
   ***********************************************/
  paddles.forEach((paddle) => {
    const seg = paddle.getSegment(); // { x1, y1, x2, y2 }
    // If the ball is within radius of the paddle segment, it collides
    if (checkBallPaddleCollision(ballX, ballY, ballRadius, seg)) {
      // For a more accurate reflection, you'd do a line-normal reflection
      // just like with the polygon edges. For simplicity, invert both:
      dx = -dx;
      dy = -dy;
    }
  });
}


/**
 * Basic function to check if the ball is colliding
 * with a line segment (x1,y1)->(x2,y2).
 */
function checkBallPaddleCollision(cx, cy, r, seg) {
  // Dist from (cx,cy) to line segment
  // If <= r, collision
  const dist = pointToSegmentDistance(cx, cy, seg.x1, seg.y1, seg.x2, seg.y2);
  return dist <= r;
}

/**
 * Distance from point (px,py) to segment (x1,y1)->(x2,y2)
 */
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  // Segment length squared
  const segLenSq = (x2 - x1)**2 + (y2 - y1)**2;
  if (segLenSq === 0) {
    // p1 and p2 are the same
    return Math.hypot(px - x1, py - y1);
  }
  // Project point onto the line (param t)
  let t = ((px - x1) * (x2 - x1) + (py - y1)*(y2 - y1)) / segLenSq;
  // Clamp 0..1
  t = Math.max(0, Math.min(1, t));
  // Find projection
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.hypot(px - projX, py - projY);
}


/*******************************
 * Main Draw Loop
 *******************************/
function draw() {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the arena edges
  drawArenaEdges(arenaVertices);

  // Update & draw paddles
  paddles.forEach(paddle => {
    paddle.update();
    paddle.draw(ctx);
  });

  // Draw the ball
  drawBall();

  // Update ball (move + collisions)
  updateBall();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();
  ctx.closePath();
}

// 60fps
setInterval(draw, 16);


/*******************************
 * Key Handlers
 *******************************/
document.addEventListener("keydown", (e) => {
  keyState[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  keyState[e.key] = false;
});
