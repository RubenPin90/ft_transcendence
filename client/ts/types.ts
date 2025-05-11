export interface TLobbyState {
    id: string
    code: string
    slots: number
    players: { id: string; name: string; ready: boolean }[]
    hostId: string
  }