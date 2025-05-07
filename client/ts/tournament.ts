export interface TourneySummary {
    id: string
    code: string
    name: string
    slots: string
    joinable: boolean
  }
  
  /**
   * Send a joinByCode message to the server using the provided WebSocket.
   * If `codeFromBtn` is omitted we read the value from #t-code-input.
   */
  export function joinByCode(socket: WebSocket, codeFromBtn?: string) {
    const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null
    const code = (codeFromBtn ?? codeInput?.value ?? '').trim()
  
    if (!code) {
      alert('Please enter a tournament code')
      return
    }
  
    socket.send(
      JSON.stringify({
        type: 'joinByCode',
        payload: { code }
      })
    )
  }
  
  /**
   * Render the given tournament summaries into the DOM.
   * The `onJoin` callback is invoked with the tournament code when the
   * user clicks a JOIN button.
   */
  export function renderTournamentList(
    list: TourneySummary[],
    onJoin: (code: string) => void
  ) {
    if (!Array.isArray(list)) return
    const box = document.getElementById('tournament-list')!
    box.innerHTML = ''
  
    list.forEach(t => {
      const card = document.createElement('div')
      card.className = 't-card'
      card.innerHTML = `
        <div>
          <div>${t.name}</div>
          <div>${t.slots}</div>
        </div>
        <button class="join-btn" ${t.joinable ? '' : 'disabled'} data-code="${t.code}">
          ${t.joinable ? 'JOIN' : 'FULL'}
        </button>`
  
      card.querySelector<HTMLButtonElement>('.join-btn')?.addEventListener('click', e => {
        const btn = e.currentTarget as HTMLButtonElement
        if (btn.disabled) return
        onJoin(btn.dataset.code!)
      })
  
      box.appendChild(card)
    })
  }
  