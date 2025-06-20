import { useEffect, useCallback } from 'react';
import { useVotingStore } from '../store';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import type { Candidate, EncryptionResult } from '../types';

export function useVoting() {
  const votingStore = useVotingStore();
  const { user } = useAuth();

  // Load candidates on mount
  useEffect(() => {
    if (votingStore.candidates.length === 0) {
      votingStore.loadCandidates();
    }
  }, [votingStore.loadCandidates, votingStore.candidates.length]);

  // Clear errors after a delay
  useEffect(() => {
    if (votingStore.error) {
      const timer = setTimeout(() => {
        votingStore.setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [votingStore.error, votingStore.setError]);

  const selectCandidate = useCallback((candidate: Candidate) => {
    if (votingStore.hasVoted) {
      toast.error('You have already voted in this election');
      return;
    }
    
    votingStore.selectCandidate(candidate);
    toast.success(`Selected ${candidate.name}`);
  }, [votingStore.selectCandidate, votingStore.hasVoted]);

  const encryptVote = useCallback(async (): Promise<EncryptionResult | null> => {
    if (!user) {
      toast.error('User not authenticated');
      return null;
    }

    if (!votingStore.selectedCandidate) {
      toast.error('No candidate selected');
      return null;
    }

    try {
      const result = await votingStore.encryptSelectedVote(user.voterId);
      toast.success('Vote encrypted successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to encrypt vote';
      toast.error(errorMessage);
      return null;
    }
  }, [user, votingStore.selectedCandidate, votingStore.encryptSelectedVote]);

  const submitVote = useCallback(async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!votingStore.selectedCandidate) {
      toast.error('No candidate selected');
      return;
    }

    if (votingStore.hasVoted) {
      toast.error('You have already voted in this election');
      return;
    }

    try {
      await votingStore.submitVote(user.voterId);
      toast.success('Vote submitted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit vote';
      toast.error(errorMessage);
      throw error;
    }
  }, [user, votingStore.selectedCandidate, votingStore.hasVoted, votingStore.submitVote]);

  const clearSelection = useCallback(() => {
    votingStore.clearSelection();
    toast('Selection cleared');
  }, [votingStore.clearSelection]);

  const resetVoting = useCallback(() => {
    votingStore.resetVoting();
  }, [votingStore.resetVoting]);
  return {
    // State
    candidates: votingStore.candidates,
    selectedCandidate: votingStore.selectedCandidate,
    isVoting: votingStore.isVoting,
    isLoading: votingStore.isLoading,
    hasVoted: votingStore.hasVoted,
    encryptedVote: votingStore.encryptedVote,
    voteConfirmation: votingStore.voteConfirmation,
    error: votingStore.error,
    
    // Actions
    selectCandidate,
    encryptVote,
    submitVote,
    clearSelection,
    resetVoting,
    loadCandidates: votingStore.loadCandidates,
  };
}
