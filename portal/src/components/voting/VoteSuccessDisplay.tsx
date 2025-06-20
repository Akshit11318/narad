import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, DocumentDuplicateIcon, QrCodeIcon, LinkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui';
import type { VoteConfirmation, PublicVerificationData } from '../../types';

interface VoteSuccessDisplayProps {
  voteConfirmation: VoteConfirmation;
  publicVerificationData?: PublicVerificationData | null;
  onClose: () => void;
}

export function VoteSuccessDisplay({ 
  voteConfirmation, 
  publicVerificationData, 
  onClose 
}: VoteSuccessDisplayProps) {
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [key]: true });
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const verifyProofOnline = () => {
    if (publicVerificationData?.verificationUrl) {
      window.open(publicVerificationData.verificationUrl, '_blank');
    } else {
      // Create a basic verification URL
      const verificationUrl = `${window.location.origin}/verify/${voteConfirmation.verificationCode}`;
      window.open(verificationUrl, '_blank');
    }
  };

  const downloadVerificationData = () => {
    const verificationPackage = {
      voteConfirmation,
      publicVerificationData,
      generatedAt: new Date().toISOString(),
      instructions: {
        verificationCode: 'Use this code to verify your vote publicly',
        transactionHash: 'Unique identifier for your vote transaction',
        zkProofSummary: 'Zero-knowledge proof validation results'
      }
    };

    const blob = new Blob([JSON.stringify(verificationPackage, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vote-verification-${voteConfirmation.verificationCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendToBackendVerification = async () => {
    try {
      const verificationPayload = {
        verificationCode: voteConfirmation.verificationCode,
        publicVerificationPackage: publicVerificationData,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('http://localhost:3000/api/zkproof/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationPayload)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Backend verification successful: ${result.isValid ? 'VALID' : 'INVALID'}`);
      } else {
        const error = await response.text();
        alert(`Backend verification failed: ${error}`);
      }
    } catch (error) {
      console.error('Backend verification error:', error);
      alert('Failed to connect to verification backend');
    }
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
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">Vote Successfully Cast!</h2>
        <p className="text-gray-400">
          Your vote for <span className="text-blue-400 font-semibold">{voteConfirmation.candidateName}</span> has been recorded
        </p>
      </div>

      {/* ZK Proof Verification Token */}
      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <QrCodeIcon className="w-5 h-5 mr-2" />
            ZK Proof Verification Token
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Verification Code
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-700 px-4 py-3 rounded font-mono text-green-400 text-lg">
                  {voteConfirmation.verificationCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(voteConfirmation.verificationCode, 'verificationCode')}
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  {copied.verificationCode ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Transaction Hash
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-700 px-4 py-3 rounded font-mono text-blue-400 text-sm">
                  {voteConfirmation.transactionHash}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(voteConfirmation.transactionHash, 'transactionHash')}
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  {copied.transactionHash ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Vote Timestamp
              </label>
              <div className="bg-gray-700 px-4 py-3 rounded">
                <span className="text-gray-300">
                  {voteConfirmation.timestamp.toLocaleDateString()} at {voteConfirmation.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ZK Proof Status */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">
            Zero-Knowledge Proof Status
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Range Proof:</span>
              <span className={`font-semibold ${voteConfirmation.zkProofSummary.rangeProofValid ? 'text-green-400' : 'text-red-400'}`}>
                {voteConfirmation.zkProofSummary.rangeProofValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Sum Proof:</span>
              <span className={`font-semibold ${voteConfirmation.zkProofSummary.sumProofValid ? 'text-green-400' : 'text-red-400'}`}>
                {voteConfirmation.zkProofSummary.sumProofValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Generation Proof:</span>
              <span className={`font-semibold ${voteConfirmation.zkProofSummary.generationProofValid ? 'text-green-400' : 'text-red-400'}`}>
                {voteConfirmation.zkProofSummary.generationProofValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Overall Status:</span>
              <span className={`font-semibold ${voteConfirmation.zkProofSummary.mathematicallySound ? 'text-green-400' : 'text-red-400'}`}>
                {voteConfirmation.zkProofSummary.mathematicallySound ? '✅ Sound' : '❌ Invalid'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Actions */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">
            Verification Actions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={verifyProofOnline}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Verify Online</span>
            </Button>
            
            <Button
              onClick={downloadVerificationData}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span>Download Proof</span>
            </Button>
            
            <Button
              onClick={sendToBackendVerification}
              className="flex items-center justify-center space-x-2"
              variant="primary"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Verify on Backend</span>
            </Button>
            
            <Button
              onClick={onClose}
              className="flex items-center justify-center space-x-2"
              variant="secondary"
            >
              <span>Continue</span>
            </Button>
          </div>
        </div>

        {/* Public Verification Data (if available) */}
        {publicVerificationData && (
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">
              Public Verification Data
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Election ID
                </label>
                <span className="text-gray-300">{publicVerificationData.electionId}</span>
              </div>
              
              {publicVerificationData.verificationUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Public Verification URL
                  </label>
                  <a 
                    href={publicVerificationData.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {publicVerificationData.verificationUrl}
                  </a>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  WASM Verified
                </label>
                <span className={`font-semibold ${publicVerificationData.wasmVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {publicVerificationData.wasmVerified ? '✅ Yes' : '⚠️ No'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
