import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../ui";
import type { VoteConfirmation } from "../../types";

interface VoteSuccessDisplayProps {
  voteConfirmation: VoteConfirmation;
  onClose: () => void;
}

export function VoteSuccessDisplay({
  voteConfirmation,
  onClose,
}: VoteSuccessDisplayProps) {
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [key]: true });
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const downloadVoteReceipt = () => {
    const voteReceipt = {
      voteConfirmation,
      generatedAt: new Date().toISOString(),
      instructions: {
        transactionId: "Unique identifier for your vote transaction",
        timestamp: "When your vote was recorded",
      },
    };

    const blob = new Blob([JSON.stringify(voteReceipt, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vote-receipt-${voteConfirmation.transactionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Vote Successfully Cast!
        </h2>
        <p className="text-gray-400">
          Your vote for{" "}
          <span className="text-blue-400 font-semibold">
            {voteConfirmation.candidateName}
          </span>{" "}
          has been recorded
        </p>
      </div>

      {/* Vote Receipt */}
      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">
            Vote Receipt
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Transaction ID
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-700 px-4 py-3 rounded font-mono text-green-400 text-lg">
                  {voteConfirmation.transactionId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      voteConfirmation.transactionId,
                      "transactionId"
                    )
                  }
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  {copied.transactionId ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Candidate
              </label>
              <div className="bg-gray-700 px-4 py-3 rounded">
                <span className="text-gray-300 font-semibold">
                  {voteConfirmation.candidateName}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Vote Timestamp
              </label>
              <div className="bg-gray-700 px-4 py-3 rounded">
                <span className="text-gray-300">
                  {new Date(voteConfirmation.timestamp).toLocaleDateString()} at{" "}
                  {new Date(voteConfirmation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={downloadVoteReceipt}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span>Download Receipt</span>
            </Button>

            <Button
              onClick={onClose}
              className="flex items-center justify-center space-x-2"
              variant="primary"
            >
              <span>Continue</span>
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start text-blue-400 text-sm">
            <CheckCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Your vote is secure</p>
              <p className="text-blue-300 text-xs">
                Your vote has been encrypted and recorded securely. The
                transaction ID serves as your receipt and can be used for
                verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
