/**
 * Send a joinByCode message to the server using the provided WebSocket.
 * If `codeFromBtn` is omitted we read the value from #t-code-input.
 */
export function joinByCode(socket, codeFromBtn) {
    var _a;
    const codeInput = document.getElementById('t-code-input');
    const code = ((_a = codeFromBtn !== null && codeFromBtn !== void 0 ? codeFromBtn : codeInput === null || codeInput === void 0 ? void 0 : codeInput.value) !== null && _a !== void 0 ? _a : '').trim();
    if (!code) {
        alert('Please enter a tournament code');
        return;
    }
    socket.send(JSON.stringify({
        type: 'joinByCode',
        payload: { code }
    }));
}
/**
 * Render the given tournament summaries into the DOM.
 * The `onJoin` callback is invoked with the tournament code when the
 * user clicks a JOIN button.
 */
export function renderTournamentList(list, onJoin) {
    if (!Array.isArray(list))
        return;
    const box = document.getElementById('tournament-list');
    box.innerHTML = '';
    list.forEach(t => {
        var _a;
        const card = document.createElement('div');
        card.className = 't-card';
        card.innerHTML = `
        <div>
          <div>${t.name}</div>
          <div>${t.slots}</div>
        </div>
        <button class="join-btn" ${t.joinable ? '' : 'disabled'} data-code="${t.code}">
          ${t.joinable ? 'JOIN' : 'FULL'}
        </button>`;
        (_a = card.querySelector('.join-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', e => {
            const btn = e.currentTarget;
            if (btn.disabled)
                return;
            onJoin(btn.dataset.code);
        });
        box.appendChild(card);
    });
}
