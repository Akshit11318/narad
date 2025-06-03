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
  voteReceipt: VoteReceipt | null;
  error: string | null;
  isLoading: boolean;
}

export interface VoteReceipt {
  voterId: string;
  candidateName: string;
  timestamp: Date;
  transactionHash: string;
  encryptedVotePreview: string;
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
