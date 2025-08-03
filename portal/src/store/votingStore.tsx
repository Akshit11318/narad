import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  Candidate,
  VotingState,
  VoteConfirmation,
  ElectionParams,
  EncryptionResult,
} from "../types";
import { loadWasmModule } from "../wasmModule";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../utils/constants";

interface VotingContextType extends VotingState {
  // Basic voting methods
  loadCandidates: (electionId?: string) => Promise<void>;
  selectCandidate: (candidate: Candidate) => void;
  clearSelection: () => void;
  resetVoting: () => void;
  setError: (error: string | null) => void;

  // Cryptographic methods
  initializeElectionParams: () => Promise<ElectionParams>;
  encryptSelectedVote: () => Promise<EncryptionResult>;
  submitVote: (voteData: {
    candidateId: string;
    voterId: string;
    electionId: string;
  }) => Promise<void>;

  // Vote confirmation methods
  setVoteConfirmation: (confirmation: VoteConfirmation) => void;
  setHasVoted: (hasVoted: boolean) => void;
  setIsVoting: (isVoting: boolean) => void;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
};

// Helper to generate vote array for a specific candidate
const generateVoteArray = (
  candidateId: number,
  totalCandidates: number
): number[] => {
  const voteArray = new Array(totalCandidates).fill(0);
  if (candidateId >= 1 && candidateId <= totalCandidates) {
    voteArray[candidateId - 1] = 1; // 1-indexed to 0-indexed
  }
  return voteArray;
};

const encryptVote = async (
  candidateId: number,
  totalCandidates: number,
  electionParams: ElectionParams,
  _voterId: string
): Promise<EncryptionResult> => {
  try {
    await loadWasmModule();

    const voteArray = generateVoteArray(candidateId, totalCandidates);
    console.log(
      "🔐 VotingStore: Encrypting vote for candidate",
      candidateId,
      "using WASM encryption"
    );

    const {
      encryptVotePaillier,
      computeAuxiliaryKey,
      getAuxiliaryKey,
      generateSecretKey,
      computeAggregatorPublicKey,
    } = await import("../wasmModule");

    console.log("🔑 VotingStore: Initializing cryptographic parameters...");

    const secretKeyResult = await generateSecretKey(electionParams.n);
    if (secretKeyResult !== 0) {
      throw new Error(`Failed to generate secret key: ${secretKeyResult}`);
    }

    const ska = electionParams.ska || new Uint8Array(32);
    const aggregatorResult = await computeAggregatorPublicKey(
      electionParams.h,
      ska,
      electionParams.n
    );
    if (aggregatorResult !== 0) {
      throw new Error(
        `Failed to compute aggregator public key: ${aggregatorResult}`
      );
    }

    const auxResult = await computeAuxiliaryKey(electionParams.n);
    if (auxResult !== 0) {
      throw new Error(`Failed to compute auxiliary key: ${auxResult}`);
    }

    const voteUint32 = new Uint32Array(voteArray);
    const encryptedVote = await encryptVotePaillier(
      voteUint32,
      electionParams.h,
      electionParams.n
    );
    const auxiliaryKey = await getAuxiliaryKey();

    console.log("✅ VotingStore: Vote encrypted successfully using WASM");
    return { encryptedVote, auxiliaryKey };
  } catch (error) {
    throw new Error(
      `Vote encryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

const submitEncryptedVote = async (
  candidateId: number,
  encryptedVote: Uint8Array,
  auxiliaryKey: Uint8Array,
  voterId: string,
  electionId: string
): Promise<void> => {
  try {
    console.log(
      "🎯 VotingStore: Submitting encrypted vote to backend for candidate",
      candidateId
    );

    const { uint8ArrayToHex } = await import("../wasmModule");
    const encryptedVoteHex = await uint8ArrayToHex(encryptedVote);
    const auxiliaryKeyHex = await uint8ArrayToHex(auxiliaryKey);

    const response = await fetch(
      `${getBackendUrl()}${API_ENDPOINTS.SUBMIT_VOTE}/${electionId}/vote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          voterId,
          voterCi: encryptedVoteHex,
          auxi: auxiliaryKeyHex,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to submit vote");
    }

    console.log("✅ VotingStore: Vote successfully submitted to backend");
  } catch (error) {
    throw new Error(
      `Vote submission failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export function VotingProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [encryptedVote, setEncryptedVote] = useState<Uint8Array | null>(null);
  const [voteConfirmation, setVoteConfirmation] =
    useState<VoteConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCandidates = useCallback(
    async (electionId?: string) => {
      if (isLoading || candidates.length > 0) {
        console.log(
          "🛑 VotingStore: Candidates already loaded or loading in progress, skipping duplicate load"
        );
        return;
      }

      if (!electionId) {
        setError("Election ID is required to load candidates");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      console.log(
        "🎯 VotingStore: Loading candidates for election:",
        electionId
      );

      try {
        const response = await fetch(
          `${getBackendUrl()}${
            API_ENDPOINTS.CANDIDATES
          }/${electionId}/candidates`
        );

        if (response.ok) {
          const result = await response.json();
          const candidates = result.data || [];
          setCandidates(candidates);
          setIsLoading(false);
          console.log(
            "✅ VotingStore: Successfully loaded",
            candidates.length,
            "candidates for election",
            electionId
          );
        } else {
          throw new Error(`Failed to fetch candidates: ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to load candidates:", error);
        setError("Failed to load candidates. Please try again.");
        setIsLoading(false);
      }
    },
    [candidates.length, isLoading]
  );

  const selectCandidate = useCallback(
    (candidate: Candidate) => {
      if (hasVoted) {
        // Don't set error - just silently ignore selection after voting
        console.log("Vote already cast, ignoring candidate selection");
        return;
      }
      setSelectedCandidate(candidate);
      setError(null);
      console.log("Selected candidate:", candidate.name);
    },
    [hasVoted]
  );

  const clearSelection = useCallback(() => {
    setSelectedCandidate(null);
    setEncryptedVote(null);
    setError(null);
  }, []);

  const initializeElectionParams =
    useCallback(async (): Promise<ElectionParams> => {
      try {
        setIsLoading(true);
        setError(null);

        const { setupElection } = await import("../wasmModule");
        const params = await setupElection();

        setIsLoading(false);
        return params;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.WASM_LOAD_ERROR;
        setError(errorMessage);
        setIsLoading(false);
        throw error;
      }
    }, []);

  const encryptSelectedVote =
    useCallback(async (): Promise<EncryptionResult> => {
      if (!selectedCandidate) {
        throw new Error("No candidate selected");
      }

      setIsLoading(true);
      setError(null);

      try {
        const electionParams = await initializeElectionParams();
        const encryptionResult = await encryptVote(
          selectedCandidate.id,
          candidates.length,
          electionParams,
          "voter"
        );

        setEncryptedVote(encryptionResult.encryptedVote);
        setIsLoading(false);
        console.log(
          "Vote encrypted successfully for candidate:",
          selectedCandidate.name
        );
        return encryptionResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.ENCRYPTION_ERROR;
        setError(errorMessage);
        setIsLoading(false);
        throw error;
      }
    }, [selectedCandidate, initializeElectionParams]);

  const submitVote = useCallback(
    async (voteData: {
      candidateId: string;
      voterId: string;
      electionId: string;
    }) => {
      if (!selectedCandidate) {
        setError("No candidate selected");
        return;
      }

      if (hasVoted) {
        setError(ERROR_MESSAGES.ALREADY_VOTED);
        return;
      }

      if (isVoting) {
        console.log(
          "🛑 VotingStore: Vote submission already in progress, ignoring duplicate call"
        );
        return;
      }

      setIsVoting(true);
      setError(null);
      console.log(
        "🎯 VotingStore: Starting vote submission for:",
        selectedCandidate.name
      );

      try {
        const electionParams = await initializeElectionParams();
        const encryptionResult = await encryptVote(
          selectedCandidate.id,
          candidates.length,
          electionParams,
          voteData.voterId
        );

        await submitEncryptedVote(
          selectedCandidate.id,
          encryptionResult.encryptedVote,
          encryptionResult.auxiliaryKey,
          voteData.voterId,
          voteData.electionId
        );

        const confirmation: VoteConfirmation = {
          candidateId: selectedCandidate.id.toString(),
          candidateName: selectedCandidate.name,
          timestamp: new Date().toISOString(),
          transactionId: `tx_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        };

        // Set hasVoted FIRST to prevent race conditions
        setHasVoted(true);
        setIsVoting(false);
        setVoteConfirmation(confirmation);
        setError(null);

        console.log(
          "✅ VotingStore: Vote submitted successfully for:",
          selectedCandidate.name
        );
        console.log("📄 Transaction ID:", confirmation.transactionId);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.VOTE_SUBMISSION_ERROR;
        setIsVoting(false);
        setError(errorMessage);
        throw error;
      }
    },
    [selectedCandidate, hasVoted, isVoting, initializeElectionParams]
  );

  const resetVoting = useCallback(() => {
    setSelectedCandidate(null);
    setIsVoting(false);
    setHasVoted(false);
    setEncryptedVote(null);
    setVoteConfirmation(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const setVoteConfirmationCallback = useCallback(
    (confirmation: VoteConfirmation) => {
      setVoteConfirmation(confirmation);
    },
    []
  );

  const setHasVotedCallback = useCallback((hasVoted: boolean) => {
    setHasVoted(hasVoted);
  }, []);

  const setIsVotingCallback = useCallback((isVoting: boolean) => {
    setIsVoting(isVoting);
  }, []);

  const setErrorCallback = useCallback((error: string | null) => {
    setError(error);
  }, []);

  const value: VotingContextType = {
    // State
    candidates,
    selectedCandidate,
    isVoting,
    hasVoted,
    encryptedVote,
    voteConfirmation,
    error,
    isLoading,

    // Actions
    loadCandidates,
    selectCandidate,
    clearSelection,
    resetVoting,
    setError: setErrorCallback,
    initializeElectionParams,
    encryptSelectedVote,
    submitVote,
    setVoteConfirmation: setVoteConfirmationCallback,
    setHasVoted: setHasVotedCallback,
    setIsVoting: setIsVotingCallback,
  };

  return (
    <VotingContext.Provider value={value}>{children}</VotingContext.Provider>
  );
}

export function useVotingStore() {
  const context = useContext(VotingContext);
  if (context === undefined) {
    throw new Error("useVotingStore must be used within a VotingProvider");
  }
  return context;
}
