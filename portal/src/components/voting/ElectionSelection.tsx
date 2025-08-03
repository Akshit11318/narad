import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input } from "../ui";
import { useAuth } from "../../contexts/AuthContext";
import { VALIDATION_RULES } from "../../utils/constants";

interface ElectionSelectionProps {
  onElectionSelected: (electionId: string) => void;
}

export function ElectionSelection({
  onElectionSelected,
}: ElectionSelectionProps) {
  const { isAuthenticated } = useAuth();
  const [electionId, setElectionId] = useState("");
  const [error, setError] = useState("");

  const handleElectionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setElectionId(value);

    // Clear error when user types
    if (error) {
      setError("");
    }
  };

  const validateElectionId = (id: string): string => {
    if (!id.trim()) {
      return "Election ID is required";
    }

    if (id.length < VALIDATION_RULES.ELECTION_ID.MIN_LENGTH) {
      return `Election ID must be at least ${VALIDATION_RULES.ELECTION_ID.MIN_LENGTH} characters`;
    }

    if (id.length > VALIDATION_RULES.ELECTION_ID.MAX_LENGTH) {
      return `Election ID must be no more than ${VALIDATION_RULES.ELECTION_ID.MAX_LENGTH} characters`;
    }

    if (!VALIDATION_RULES.ELECTION_ID.PATTERN.test(id)) {
      return "Election ID can only contain letters, numbers, hyphens, and underscores";
    }

    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateElectionId(electionId);
    if (validationError) {
      setError(validationError);
      return;
    }

    onElectionSelected(electionId.trim());
  };

  return (
    <motion.div
      className="max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl p-8 shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Select Election
          </h2>
          <p className="text-gray-400">
            Welcome back, <span className="text-blue-400">Voter</span>
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Enter the election ID you want to participate in
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            className="mb-6 p-3 bg-red-900/50 border border-red-500/50 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2 text-red-400">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Election ID"
            type="text"
            value={electionId}
            onChange={handleElectionIdChange}
            error={error}
            placeholder="e.g., election2024, general-election-2025"
            leftIcon={
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            required
          />

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Continue to Voting
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start text-blue-400 text-sm">
            <svg
              className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium mb-1">Need help?</p>
              <p className="text-blue-300 text-xs">
                Contact your election administrator to get the correct election
                ID. The election ID is usually provided in your voter
                registration materials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
