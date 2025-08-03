import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Layout } from "../components/layout";
import { Button } from "../components/ui";
import {
  CandidateCard,
  VoteConfirmation,
  VoteSuccessDisplay,
  ElectionSelection,
} from "../components/voting";
import { useVoting, useWasm } from "../hooks";
import { useAuth } from "../contexts/AuthContext";
import { useVotingStore } from "../store";
import { ROUTES } from "../utils/constants";
import type { Candidate } from "../types";

type VotingStep =
  | "election-selection"
  | "voter-id"
  | "candidate-selection"
  | "confirmation"
  | "submitted";

export function Voting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const {
    candidates,
    selectedCandidate,
    isVoting,
    hasVoted,
    voteConfirmation,
    selectCandidate,
    submitVote,
    loadCandidates,
    isLoading: candidatesLoading,
  } = useVoting();
  const { isLoaded: wasmLoaded } = useWasm();

  const [currentStep, setCurrentStep] =
    useState<VotingStep>("election-selection");
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [voterId, setVoterId] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for election ID in URL parameters
  useEffect(() => {
    const electionIdFromUrl = searchParams.get("electionId");
    if (electionIdFromUrl) {
      setSelectedElectionId(electionIdFromUrl);
      setCurrentStep("voter-id");
      // Load candidates for this election
      loadCandidates(electionIdFromUrl);
    }
  }, [searchParams, loadCandidates]);

  useEffect(() => {
    // Redirect if user has already voted
    if (hasVoted) {
      toast.error("You have already voted in this election");
      navigate(ROUTES.DASHBOARD);
      return;
    }
  }, [hasVoted, navigate]);

  const handleElectionSelected = (electionId: string) => {
    setSelectedElectionId(electionId);
    setCurrentStep("voter-id");

    // Load candidates for this election
    loadCandidates(electionId);
  };

  // Skip election selection if election ID is already provided
  useEffect(() => {
    if (selectedElectionId && currentStep === "election-selection") {
      setCurrentStep("voter-id");
    }
  }, [selectedElectionId, currentStep]);

  const handleVoterIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterId.trim()) {
      toast.error("Please enter your Voter ID");
      return;
    }
    setCurrentStep("candidate-selection");
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    if (currentStep === "candidate-selection") {
      selectCandidate(candidate);
    }
  };

  const handleProceedToConfirmation = () => {
    if (!selectedCandidate) {
      toast.error("Please select a candidate first");
      return;
    }

    setCurrentStep("confirmation");
    setShowConfirmation(true);
  };

  const handleBackToSelection = () => {
    setCurrentStep("candidate-selection");
    setShowConfirmation(false);
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate || !voterId || !selectedElectionId) {
      toast.error("Missing required information");
      return;
    }

    if (!wasmLoaded) {
      toast.error("Encryption module not loaded. Please refresh the page.");
      return;
    }

    setIsLoading(true);
    try {
      await submitVote({
        candidateId: selectedCandidate.id.toString(),
        voterId: voterId,
        electionId: selectedElectionId,
      });

      setCurrentStep("submitted");
      setShowConfirmation(false);
      toast.success("Vote submitted successfully!");
    } catch (error) {
      console.error("Vote submission failed:", error);
      toast.error("Failed to submit vote. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Processing your vote...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">Cast Your Vote</h1>
          <p className="text-xl text-gray-400">
            {selectedElectionId
              ? `Election: ${selectedElectionId}`
              : "Select your election"}
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === "election-selection" && !selectedElectionId
                      ? "bg-blue-500 text-white"
                      : currentStep === "voter-id" ||
                        currentStep === "candidate-selection" ||
                        currentStep === "confirmation" ||
                        currentStep === "submitted"
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  1
                </div>
                <span
                  className={`font-medium ${
                    currentStep === "election-selection" && !selectedElectionId
                      ? "text-blue-400"
                      : currentStep === "voter-id" ||
                        currentStep === "candidate-selection" ||
                        currentStep === "confirmation" ||
                        currentStep === "submitted"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {selectedElectionId ? "Election Selected" : "Election Setup"}
                </span>
              </div>

              <div className="flex-1 mx-4 h-1 bg-gray-700 rounded">
                <div
                  className={`h-full bg-gradient-to-r from-blue-500 to-green-500 rounded transition-all duration-500 ${
                    selectedElectionId ||
                    currentStep === "voter-id" ||
                    currentStep === "candidate-selection" ||
                    currentStep === "confirmation" ||
                    currentStep === "submitted"
                      ? "w-1/3"
                      : "w-0"
                  }`}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === "candidate-selection"
                      ? "bg-blue-500 text-white"
                      : currentStep === "confirmation" ||
                        currentStep === "submitted"
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  2
                </div>
                <span
                  className={`font-medium ${
                    currentStep === "candidate-selection"
                      ? "text-blue-400"
                      : currentStep === "confirmation" ||
                        currentStep === "submitted"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  Select Candidate
                </span>
              </div>

              <div className="flex-1 mx-4 h-1 bg-gray-700 rounded">
                <div
                  className={`h-full bg-gradient-to-r from-blue-500 to-green-500 rounded transition-all duration-500 ${
                    currentStep === "confirmation" ||
                    currentStep === "submitted"
                      ? "w-full"
                      : "w-0"
                  }`}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === "confirmation"
                      ? "bg-blue-500 text-white"
                      : currentStep === "submitted"
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  3
                </div>
                <span
                  className={`font-medium ${
                    currentStep === "confirmation"
                      ? "text-blue-400"
                      : currentStep === "submitted"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  Confirm Vote
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {currentStep === "election-selection" && !selectedElectionId && (
            <motion.div
              key="election-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <ElectionSelection onElectionSelected={handleElectionSelected} />
            </motion.div>
          )}

          {currentStep === "voter-id" && (
            <motion.div
              key="voter-id"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl p-8 shadow-2xl border border-gray-700/50">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Enter Voter ID
                  </h2>
                  <p className="text-gray-400">
                    Please enter your voter ID for verification
                  </p>
                </div>

                <form onSubmit={handleVoterIdSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Voter ID
                    </label>
                    <input
                      type="text"
                      value={voterId}
                      onChange={(e) => setVoterId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your voter ID"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    Continue to Voting
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {currentStep === "candidate-selection" && (
            <motion.div
              key="candidate-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              {candidatesLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-400">Loading candidates...</p>
                </div>
              ) : (
                <>
                  {/* Candidates Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                    {candidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        isSelected={selectedCandidate?.id === candidate.id}
                        onSelect={handleCandidateSelect}
                        disabled={isVoting}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              {!candidatesLoading && (
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTES.DASHBOARD)}
                    disabled={isVoting}
                  >
                    Back to Dashboard
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleProceedToConfirmation}
                    disabled={!selectedCandidate || isVoting}
                    className="min-w-[200px]"
                  >
                    Proceed to Confirmation
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === "submitted" && voteConfirmation && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="py-12"
            >
              <VoteSuccessDisplay
                voteConfirmation={voteConfirmation}
                onClose={() => navigate(ROUTES.DASHBOARD)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vote Confirmation Modal */}
        <VoteConfirmation
          isOpen={showConfirmation}
          onClose={handleBackToSelection}
          candidate={selectedCandidate}
          onDone={handleVoteSubmit}
        />
      </div>
    </Layout>
  );
}
