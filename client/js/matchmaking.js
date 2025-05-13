let queued = false;
export function setupMatchmakingHandlers(navigate, socket) {
    const cancelBtn = document.getElementById('cancel-matchmaking-btn');
    // popstate still lets us queue again when user clicks browser Back
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
    cancelBtn.addEventListener('click', () => {
        if (queued)
            socket.send(JSON.stringify({ type: 'leaveQueue' }));
        queued = false;
        navigate('/');
    });
    // expose a way for main.ts to mark that we already queued
    return {
        markQueued: (v) => { queued = v; }
    };
}
