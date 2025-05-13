export function setupMatchmakingHandlers(navigate) {
    const cancelBtn = document.getElementById('cancel-matchmaking-btn');
    let controller = null;
    // when we hit /matchmaking, start the request:
    if (window.location.pathname === '/matchmaking') {
        controller = new AbortController();
        fetch('/api/matchmaking/1v1', {
            method: 'POST',
            signal: controller.signal
        })
            .then(r => r.json())
            .then(({ matchId }) => {
            navigate(`/game/1v1/${matchId}`);
        })
            .catch(err => {
            // on abort or error, just go back to main menu
            console.warn('matchmaking aborted or failed', err);
            navigate('/');
        });
    }
    cancelBtn.addEventListener('click', () => {
        if (controller) {
            controller.abort();
            controller = null;
        }
        navigate('/');
    });
}
