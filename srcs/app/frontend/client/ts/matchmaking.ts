let queued = false; 

export function setupMatchmakingHandlers(
  navigate: (path: string) => void,
  socket: WebSocket,
) {

  window.addEventListener('popstate', tryQueue);

  function tryQueue() {
    if (window.location.pathname === '/matchmaking' && !queued) {
      socket.send(JSON.stringify({
        type: 'joinQueue',
        payload: { mode: '1v1' }
      }));
      queued = true;
    }
  }

  return {
    markQueued: (v: boolean) => { queued = v; }
  };
}