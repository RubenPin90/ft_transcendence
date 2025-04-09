wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection');
  
    ws.on('message', (rawMsg) => {
      console.log('📨 Message received:', rawMsg.toString());
  
      // 1. Parse the JSON
      const data = JSON.parse(rawMsg);
  
      // 2. Interpret by type
      switch (data.type) {
        case 'chat':
          // handle chat
          break;
        case 'move':
          // handle paddle movement
          break;
        case 'join':
          // handle new player join
          break;
        case 'leave':
          // handle player leave
          break;
        // etc.
      }
  
      // 3. Optionally broadcast or forward the message to other connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(rawMsg);
        }
      });
    });
  
    ws.on('close', () => {
      console.log('❌ WebSocket disconnected');
    });
  });
  