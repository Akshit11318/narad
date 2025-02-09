export interface User {
  email: string;
  role: 'manager' | 'voter';
}

export interface Election {
  id: string;
  stage: 'application' | 'voting' | 'closed';
  totalVotes: number;
  totalCandidates: number;
  candidateWhitelist: string[];
  voterWhitelist?: string[];
}

export interface Candidate {
  name: string;
  voteCount: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ElectionState {
  currentElection: Election | null;
  candidates: Candidate[];
  isLoading: boolean;
  error: string | null;
}