import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui";
import { VALIDATION_RULES } from "../../utils/constants";

interface ElectionIdInputProps {
  onSubmit: (electionId: string) => void;
  isLoading?: boolean;
}

export function ElectionIdInput({
  onSubmit,
  isLoading = false,
}: ElectionIdInputProps) {
  const [electionId, setElectionId] = useState("");
  const [error, setError] = useState("");

  const validateElectionId = (value: string): boolean => {
    if (!value.trim()) {
      setError("Election ID is required");
      return false;
    }

    if (value.length < VALIDATION_RULES.ELECTION_ID.MIN_LENGTH) {
      setError(
        `Election ID must be at least ${VALIDATION_RULES.ELECTION_ID.MIN_LENGTH} characters`
      );
      return false;
    }

    if (value.length > VALIDATION_RULES.ELECTION_ID.MAX_LENGTH) {
      setError(
        `Election ID must be at most ${VALIDATION_RULES.ELECTION_ID.MAX_LENGTH} characters`
      );
      return false;
    }

    if (!VALIDATION_RULES.ELECTION_ID.PATTERN.test(value)) {
      setError(
        "Election ID can only contain letters, numbers, hyphens, and underscores"
      );
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateElectionId(electionId)) {
      onSubmit(electionId);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setElectionId(value);
    if (error) {
      validateElectionId(value);
    }
  };

  return (
    <motion.div
      className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">
          Enter Election ID
        </h3>
        <p className="text-gray-400 text-sm">
          Please enter the Election ID to view available candidates and start
          voting
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="electionId"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Election ID
          </label>
          <input
            id="electionId"
            type="text"
            value={electionId}
            onChange={handleInputChange}
            placeholder="Enter election ID (e.g., election-2025)"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={isLoading}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !electionId.trim()}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            "Proceed to Vote"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
