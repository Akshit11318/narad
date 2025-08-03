import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Modal } from "../ui";
import type { Candidate } from "../../types";

interface VoteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onDone: () => void;
}

export function VoteConfirmation({
  isOpen,
  onClose,
  candidate,
  onDone,
}: VoteConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmVote = async () => {
    if (!candidate) return;

    setIsSubmitting(true);
    try {
      // Call the onDone function which handles the vote submission
      await onDone();
    } catch (error) {
      console.error("Vote confirmation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!candidate) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-gray-700/50 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Confirm Your Vote
            </h2>
            <p className="text-gray-400">
              Please review your selection before submitting
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-600">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {candidate.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {candidate.name}
                </h3>
                {candidate.party && (
                  <p className="text-gray-400 text-sm">{candidate.party}</p>
                )}
                {candidate.description && (
                  <p className="text-gray-500 text-xs mt-1">
                    {candidate.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start text-yellow-400 text-sm">
              <div className="flex-shrink-0 mr-2 mt-0.5">⚠️</div>
              <div>
                <p className="font-medium mb-1">Important Notice</p>
                <p className="text-yellow-300 text-xs">
                  Once you submit your vote, it cannot be changed. Your vote
                  will be encrypted and securely recorded.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmVote}
              variant="primary"
              size="lg"
              className="flex-1"
              isLoading={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm Vote"}
            </Button>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
}
