declare const socket: WebSocket;

export function startGame(mode: string) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'black';
  ctx.font = '30px Arial';
  ctx.fillText(`AI MODE ACTIVE`, 250, 300);
}


socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'state') {
      // Update game state and render
      updateGame(data.state);
    }
  });
  
  function updateGame(state: any) {
    // Implement the rendering logic to update the canvas based on the new game state
    console.log("Game state received", state);
  }
  
// Example: Detect when ArrowDown is pressed and send a move message
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      // Construct the JSON object
      const msg = {
        type: 'move',
        payload: {
          playerId: 'user123',  // or however you track the current user
          direction: 'down'
        }
      };
  
      // Send over WebSocket
      socket.send(JSON.stringify(msg));
    }
  });
  