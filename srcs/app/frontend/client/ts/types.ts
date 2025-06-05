export let onGameEndCallback: ((winnerId: string) => void) | null = null;

export interface TLobbyState {
    id: string
    code: string
    slots: number
    players: { id: string; name: string; ready: boolean }[]
    hostId: string
    displaySlots: number
    status?: 'pending' | 'bracket' | 'running' | 'finished';
  }

export interface matchAssignedMsg {
  type: 'matchAssigned';
  payload: {
    tournamentId: string;
    matchId: string;
    players: { id: string; name: string }[];
  };
}

export interface TourneySummary {
  id: string;
  code: string;
  name: string;
  slots: string;
  joinable: boolean;
}

export interface PlayerStub {
  id: string;
  name: string;
}

export interface MatchStub {
  matchId: string;
  players: (PlayerStub | null | { pendingMatchId: string })[];
}

export type BracketRounds = MatchStub[][];


export interface TournamentBracketMsg {
  type: 'tournamentBracketMsg';
  payload: {
    tournamentId: string;
    rounds: BracketRounds;
  };
}

export interface TournamentBracketPayload {
  tournamentId: string;
  rounds: MatchStub[][] | MatchStub[];
}

export interface EliminatedMsg {
  type: 'eliminated';
  payload: {
    tournamentId: string;
    matchId: string;
    winnerId: string;
    reason: 'lostMatch'; // you can use a string literal or `string` if you have more reasons later
  };
}