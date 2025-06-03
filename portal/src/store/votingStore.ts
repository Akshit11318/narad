import { create } from 'zustand';
import { submitVote } from '../wasmModule';
import type { 
  Candidate, 
  VotingState, 
  VoteReceipt, 
  ElectionParams,
  EncryptionResult 
} from '../types';
import { 
  initializeElection, 
  encryptVote, 
  bytesToHex, 
  generateEncryptedPreview 
} from '../utils/crypto';
import { CANDIDATE_CONFIG, API_ENDPOINTS, ERROR_MESSAGES } from '../utils/constants';

interface VotingStore extends VotingState {
  loadCandidates: () => Promise<void>;
  selectCandidate: (candidate: Candidate) => void;
  clearSelection: () => void;
  encryptSelectedVote: (voterId: string) => Promise<EncryptionResult>;
  submitVote: (voterId: string) => Promise<void>;
  resetVoting: () => void;
  setError: (error: string | null) => void;
  initializeElectionParams: () => Promise<ElectionParams>;
}

const mockCandidates: Candidate[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    photo: '/assets/candidate1.jpg',
    party: 'Progressive Party',
    description: 'Experienced leader focused on education and healthcare reform.',
  },
  {
    id: 2,
    name: 'Bob Smith',
    photo: '/assets/candidate2.jpg',
    party: 'Unity Party',
    description: 'Business leader committed to economic growth and job creation.',
  },
  {
    id: 3,
    name: 'Carol Davis',
    photo: '/assets/candidate3.jpg',
    party: 'Green Alliance',
    description: 'Environmental advocate working for sustainable development.',
  },
  {
    id: 4,
    name: 'David Wilson',
    photo: '/assets/candidate4.jpg',
    party: 'Independent',
    description: 'Community organizer focused on local issues and transparency.',
  },
];

const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
};

export const useVotingStore = create<VotingStore>((set, get) => ({
  candidates: [],
  selectedCandidate: null,
  isVoting: false,
  hasVoted: false,
  encryptedVote: null,
  voteReceipt: null,
  error: null,
  isLoading: false,

  loadCandidates: async () => {
    set({ isLoading: true, error: null });

    try {
      // Try to fetch candidates from backend, fall back to mock data
      try {
        const response = await fetch(`${getBackendUrl()}${API_ENDPOINTS.CANDIDATES}`);
        if (response.ok) {
          const candidates = await response.json();
          set({ candidates, isLoading: false });
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch candidates from backend, using mock data');
      }

      // Use mock candidates as fallback
      set({ candidates: mockCandidates, isLoading: false });
    } catch (error) {
      set({
        error: 'Failed to load candidates',
        isLoading: false,
      });
    }
  },

  selectCandidate: (candidate: Candidate) => {
    if (get().hasVoted) {
      set({ error: ERROR_MESSAGES.ALREADY_VOTED });
      return;
    }

    set({ 
      selectedCandidate: candidate,
      error: null,
    });
    
    console.log('Selected candidate:', candidate.name);
  },

  clearSelection: () => {
    set({ 
      selectedCandidate: null,
      encryptedVote: null,
      error: null,
    });
  },

  initializeElectionParams: async (): Promise<ElectionParams> => {
    try {
      set({ isLoading: true, error: null });
      const params = await initializeElection();
      set({ isLoading: false });
      return params;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.WASM_LOAD_ERROR;
      set({ 
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  encryptSelectedVote: async (voterId: string): Promise<EncryptionResult> => {
    const { selectedCandidate } = get();
    
    if (!selectedCandidate) {
      throw new Error('No candidate selected');
    }

    set({ isLoading: true, error: null });

    try {
      // Initialize election parameters
      const electionParams = await get().initializeElectionParams();
      
      // Encrypt the vote
      const encryptionResult = await encryptVote(
        selectedCandidate.id,
        CANDIDATE_CONFIG.TOTAL_CANDIDATES,
        electionParams
      );

      set({ 
        encryptedVote: encryptionResult.encryptedVote,
        isLoading: false,
      });

      console.log('Vote encrypted successfully for candidate:', selectedCandidate.name);
      return encryptionResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.ENCRYPTION_ERROR;
      set({ 
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  submitVote: async (voterId: string) => {
    const { selectedCandidate, encryptedVote } = get();
    
    if (!selectedCandidate) {
      set({ error: 'No candidate selected' });
      return;
    }

    if (get().hasVoted) {
      set({ error: ERROR_MESSAGES.ALREADY_VOTED });
      return;
    }

    set({ isVoting: true, error: null });

    try {
      // Initialize election parameters
      const electionParams = await get().initializeElectionParams();
      
      // Submit the vote using the WASM module
      await submitVote(selectedCandidate.id, voterId, electionParams);

      // Generate receipt
      const receipt: VoteReceipt = {
        voterId,
        candidateName: selectedCandidate.name,
        timestamp: new Date(),
        transactionHash: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        encryptedVotePreview: encryptedVote ? generateEncryptedPreview(encryptedVote) : 'N/A',
      };

      set({
        isVoting: false,
        hasVoted: true,
        voteReceipt: receipt,
        error: null,
      });

      console.log('Vote submitted successfully for:', selectedCandidate.name);
      console.log('Transaction hash:', receipt.transactionHash);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.VOTE_SUBMISSION_ERROR;
      set({
        isVoting: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  resetVoting: () => {
    set({
      selectedCandidate: null,
      isVoting: false,
      hasVoted: false,
      encryptedVote: null,
      voteReceipt: null,
      error: null,
      isLoading: false,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
