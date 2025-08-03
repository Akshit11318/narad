import { useEffect, useCallback } from "react";
import { useVotingStore } from "../store/votingStore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import type { Candidate, EncryptionResult } from "../types";

interface VoteSubmissionData {
  candidateId: string;
  voterId: string;
  electionId: string;
}

export function useVoting() {
  const votingStore = useVotingStore();
  const { isAuthenticated } = useAuth();

  // Load candidates on mount
  useEffect(() => {
    if (votingStore.candidates.length === 0) {
      // Note: electionId will be passed when available from the voting flow
      votingStore.loadCandidates();
    }
  }, [votingStore.candidates.length, votingStore.loadCandidates]);

  // Clear errors after a delay
  useEffect(() => {
    if (votingStore.error) {
      const timer = setTimeout(() => {
        votingStore.setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [votingStore.error, votingStore.setError]);

  const selectCandidate = useCallback(
    (candidate: Candidate) => {
      if (votingStore.hasVoted) {
        // Don't show error toast - just silently ignore selection after voting
        console.log("Vote already cast, ignoring candidate selection");
        return;
      }

      votingStore.selectCandidate(candidate);
      toast.success(`Selected ${candidate.name}`);
    },
    [votingStore.selectCandidate, votingStore.hasVoted]
  );

  const encryptVote =
    useCallback(async (): Promise<EncryptionResult | null> => {
      if (!isAuthenticated) {
        toast.error("User not authenticated");
        return null;
      }

      if (!votingStore.selectedCandidate) {
        toast.error("No candidate selected");
        return null;
      }

      try {
        const result = await votingStore.encryptSelectedVote();
        toast.success("Vote encrypted successfully");
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to encrypt vote";
        toast.error(errorMessage);
        return null;
      }
    }, [
      isAuthenticated,
      votingStore.selectedCandidate,
      votingStore.encryptSelectedVote,
    ]);

  const submitVote = useCallback(
    async (voteData: VoteSubmissionData) => {
      if (!isAuthenticated) {
        toast.error("User not authenticated");
        return;
      }

      if (!votingStore.selectedCandidate) {
        toast.error("No candidate selected");
        return;
      }

      if (votingStore.hasVoted) {
        toast.error("You have already voted in this election");
        return;
      }

      if (votingStore.isVoting) {
        console.log(
          "🛑 useVoting: Vote submission already in progress, ignoring duplicate call"
        );
        return;
      }

      try {
        console.log(
          "🎯 useVoting: Starting vote submission with WASM encryption..."
        );
        await votingStore.submitVote(voteData);
        // Success toast is handled by the component, not here
        console.log("✅ useVoting: Vote submission completed successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to submit vote";
        toast.error(errorMessage);
        console.error("❌ useVoting: Vote submission failed:", error);
        throw error;
      }
    },
    [
      isAuthenticated,
      votingStore.selectedCandidate,
      votingStore.hasVoted,
      votingStore.isVoting,
      votingStore.submitVote,
    ]
  );

  const clearSelection = useCallback(() => {
    votingStore.clearSelection();
    toast("Selection cleared");
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
