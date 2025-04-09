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
  