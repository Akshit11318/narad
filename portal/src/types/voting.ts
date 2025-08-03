export interface Candidate {
  id: number;
  name: string;
  photo: string;
  party?: string;
  description?: string;
}

export interface Vote {
  candidateId: number;
  voterId: string;
  electionId: string;
  timestamp: Date;
  transactionId?: string;
}

export interface VoteArray {
  votes: Uint32Array;
  selectedCandidateIndex: number;
}

export interface VotingState {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  isVoting: boolean;
  hasVoted: boolean;
  encryptedVote: Uint8Array | null;
  voteConfirmation: VoteConfirmation | null;
  error: string | null;
  isLoading: boolean;
}

// Simplified vote confirmation
export interface VoteConfirmation {
  candidateId: string;
  candidateName: string;
  timestamp: string;
  transactionId: string;
}

export interface VoteSubmissionData {
  candidateId: string;
  voterId: string;
  electionId: string;
}

export interface VotingContextType {
  votingState: VotingState;
  selectCandidate: (candidate: Candidate) => void;
  submitVote: (voteData: VoteSubmissionData) => Promise<void>;
  clearSelection: () => void;
  resetVoting: () => void;
}

// Cryptographic types
export interface ElectionParams {
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}

export interface EncryptionResult {
  encryptedVote: Uint8Array;
  auxiliaryKey: Uint8Array;
}
