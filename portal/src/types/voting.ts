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
  encryptedVote: string;
  auxiliaryKey: string;
  timestamp: Date;
  transactionHash?: string;
  zkProofId?: string; // Reference to ZK proof
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
  encryptedVote: Uint8Array | null;  voteConfirmation: VoteConfirmation | null;
  error: string | null;
  isLoading: boolean;
}

// Vote confirmation with ZK proof validation
export interface VoteConfirmation {
  voterId: string;
  candidateName: string;
  timestamp: Date;
  transactionHash: string;
  zkProofId: string;
  verificationCode: string;
  isZKProofValid: boolean;
  zkProofSummary: {
    rangeProofValid: boolean;
    sumProofValid: boolean;
    generationProofValid: boolean;
    mathematicallySound: boolean;
  };
}

export interface ElectionParams {
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}

export interface VoteConfirmationData {
  candidate: Candidate;
  encryptedVotePreview: string;
  auxiliaryKey: string;
}

export interface VotingContextType {
  votingState: VotingState;
  selectCandidate: (candidate: Candidate) => void;
  submitVote: (voterId: string, electionParams: ElectionParams) => Promise<void>;
  clearSelection: () => void;
  resetVoting: () => void;
}

export interface EncryptionResult {
  encryptedVote: Uint8Array;
  auxiliaryKey: Uint8Array;
}

export interface VoteSubmissionPayload {
  voterId: string;
  ci: string; // encrypted vote in hex
  auxi: string; // auxiliary key in hex
}
