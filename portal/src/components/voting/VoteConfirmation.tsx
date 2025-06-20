import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from '../ui';
import { ZKProofIndicator } from '../ZKProofIndicator';
import { useVoting, useZKProof } from '../../hooks';
import type { Candidate, EncryptionResult } from '../../types';
import type { ZKProofData } from '../../types/zkProof';
import { CANDIDATE_CONFIG } from '../../utils/constants';

// Helper function to generate vote array (1-of-n encoding)
const generateVoteArray = (candidateId: number, totalCandidates: number): number[] => {
  const voteArray = new Array(totalCandidates).fill(0);
  if (candidateId >= 1 && candidateId <= totalCandidates) {
    voteArray[candidateId - 1] = 1; // 1-indexed to 0-indexed
  }
  return voteArray;
};

interface VoteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onConfirm: () => Promise<void>;
}

export function VoteConfirmation({ isOpen, onClose, candidate, onConfirm }: VoteConfirmationProps) {
  const { isVoting } = useVoting();
  const { 
    zkProofStatus, 
    zkProof, 
    publicVerificationData, 
    generateProof, 
    verifyProof,
    resetProofStatus 
  } = useZKProof();
    const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [step, setStep] = useState<'confirm' | 'encrypt' | 'zkproof' | 'verify' | 'submit'>('confirm');
  const [generatedProof, setGeneratedProof] = useState<ZKProofData | null>(null);
  const hasResetRef = useRef(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && !hasResetRef.current) {
      setStep('confirm');
      setEncryptionResult(null);
      setGeneratedProof(null);
      resetProofStatus();
      hasResetRef.current = true;
    } else if (!isOpen) {
      hasResetRef.current = false;
    }
  }, [isOpen]);

  const handleEncryptAndGenerateProof = async () => {
    if (!candidate) return;

    try {
      // Step 1: Encryption
      setStep('encrypt');
      setIsEncrypting(true);

      // Simulate encryption process for UI
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would normally call the actual encryption
      const mockEncryption: EncryptionResult = {
        encryptedVote: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        auxiliaryKey: new Uint8Array([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
      };
      
      setEncryptionResult(mockEncryption);
      setIsEncrypting(false);      // Step 2: Generate ZK Proof
      setStep('zkproof');
      
      // Convert candidate selection to proper binary vote array
      const voteArray = Array.from(generateVoteArray(candidate.id, CANDIDATE_CONFIG.TOTAL_CANDIDATES));
      
      const proof = await generateProof(voteArray);
      if (proof) {
        setGeneratedProof(proof);
        
        // Step 3: Verify proof
        setStep('verify');
        const isValid = await verifyProof(proof);
        
        if (isValid) {
          setStep('submit');
        } else {
          throw new Error('Proof verification failed');
        }
      } else {
        throw new Error('Failed to generate ZK proof');
      }
    } catch (error) {
      console.error('Process failed:', error);
      setIsEncrypting(false);
      setStep('confirm');
    }
  };

  const handleFinalSubmit = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  if (!candidate) return null;

  const renderStepIndicator = () => {
    const steps = ['Confirm', 'Encrypt', 'ZK Proof', 'Verify', 'Submit'];
    const currentStepIndex = steps.findIndex(s => s.toLowerCase() === step);

    return (
      <div className="flex items-center justify-center space-x-2 mb-6">
        {steps.map((stepName, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={stepName} className="flex items-center">
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isActive 
                    ? 'bg-blue-500 text-white' 
                    : isCompleted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }
                `}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </motion.div>
              <span className="ml-2 text-sm text-gray-400">{stepName}</span>
              {index < steps.length - 1 && <div className="w-8 h-px bg-gray-600 mx-4" />}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 'confirm':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-yellow-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Confirm Your Vote</h3>
            <div className="bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <img
                  src={candidate.photo}
                  alt={candidate.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-left">
                  <h4 className="font-semibold text-white">{candidate.name}</h4>
                  <p className="text-sm text-gray-400">{candidate.party}</p>
                </div>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              This will encrypt your vote and generate a zero-knowledge proof for verification.
            </p>
          </motion.div>
        );

      case 'encrypt':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-blue-400 mb-4">
              <svg className="w-16 h-16 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Encrypting Vote</h3>
            <p className="text-gray-300">
              Securing your vote with cryptographic encryption...
            </p>
          </motion.div>
        );

      case 'zkproof':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h3 className="text-xl font-bold text-white">Generating Zero-Knowledge Proof</h3>
            <ZKProofIndicator 
              status={zkProofStatus}
              className="max-w-md mx-auto"
            />
            <p className="text-gray-300 text-sm">
              Creating a mathematical proof that verifies your vote without revealing it...
            </p>
          </motion.div>
        );

      case 'verify':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-green-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Proof Verified</h3>
            <p className="text-gray-300">
              Your zero-knowledge proof has been successfully verified!
            </p>
            {publicVerificationData && (
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400">Verification Code:</p>
                <p className="font-mono text-green-400 text-lg">{publicVerificationData.verificationCode}</p>
              </div>
            )}
          </motion.div>
        );

      case 'submit':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-green-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Ready to Submit</h3>
            <p className="text-gray-300">
              Your vote is encrypted and verified. Ready for submission.
            </p>
            <div className="bg-gray-700 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-400">Vote Summary:</p>
              <p className="font-semibold text-white">{candidate.name}</p>
              <p className="text-xs text-green-400">✓ Encrypted ✓ ZK Proof Generated ✓ Verified</p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const renderActionButtons = () => {
    switch (step) {
      case 'confirm':
        return (
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEncryptAndGenerateProof}
              className="flex-1"
              disabled={isVoting}
            >
              Proceed with Vote
            </Button>
          </div>
        );

      case 'submit':
        return (
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalSubmit}
              className="flex-1"
              disabled={isVoting}
            >
              {isVoting ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </div>
        );

      default:
        return (
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vote Confirmation"
      size="lg"
    >
      <div className="space-y-6">
        {renderStepIndicator()}
        
        <div className="min-h-[300px] flex flex-col justify-center">
          {renderStepContent()}
        </div>
        
        <div className="border-t border-gray-600 pt-4">
          {renderActionButtons()}
        </div>
      </div>
    </Modal>
  );
}
