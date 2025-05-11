export interface LobbyState {
    id: string
    code: string
    slots: number
    players: { id: string; name: string; ready: boolean }[]
    hostId: string
  }