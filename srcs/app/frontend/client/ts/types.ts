export interface TLobbyState {
    id: string
    code: string
    slots: number
    players: { id: string; name: string; ready: boolean }[]
    hostId: string
    displaySlots: number
  }

export interface MatchAssignedMsg {
  type: 'matchAssigned';
  payload: {
    tournamentId: string;
    matchId: string;
    players: { id: string; name: string }[];
  };
}

export interface TournamentBracketMsg {
  type: 'tournamentBracket';
  payload: {
    tournamentId: string;
    rounds: {
      matchId: string;
      players: { id: string; name: string }[];
    }[];
  };
}