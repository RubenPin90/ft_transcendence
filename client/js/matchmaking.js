// matchmaking.ts
export function setupMatchmakingHandlers(navigate, socket) {
    const cancelBtn = document.getElementById('cancel-matchmaking-btn');
    let queued = false;
    // every time the route changes, check if we're on /matchmaking
    window.addEventListener('popstate', tryQueue);
    // also run once on initial load (hard‑refresh on /matchmaking)
    tryQueue();
    function tryQueue() {
        if (window.location.pathname === '/matchmaking' && !queued) {
            socket.send(JSON.stringify({
                type: 'joinQueue',
                payload: { mode: '1v1' }
            }));
            queued = true;
        }
    }
    cancelBtn.addEventListener('click', () => {
        if (queued)
            socket.send(JSON.stringify({ type: 'leaveQueue' }));
        queued = false;
        navigate('/');
    });
}
