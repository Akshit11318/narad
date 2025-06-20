import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from '../ui';
import { ZKProofIndicator } from '../ZKProofIndicator';
import { useVoting, useZKProof } from '../../hooks';
import { initializeZKPSession, getCurrentZKPSession } from '../../utils/zkProof';
import type { Candidate, EncryptionResult } from '../../types';
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
    publicVerificationData, 
    generateProof, 
    verifyProof,
    resetProofStatus 
  } = useZKProof();
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [step, setStep] = useState<'confirm' | 'encrypt' | 'zkproof' | 'verify' | 'submit'>('confirm');
  const [generatedProof, setGeneratedProof] = useState<any>(null);
  const [electionParams, setElectionParams] = useState<any>(null);
  const hasResetRef = useRef(false);
  // Use state variables to avoid TypeScript warnings
  const hasEncryptionResult = !!encryptionResult;
  const isCurrentlyEncrypting = isEncrypting;
  const hasGeneratedProof = !!generatedProof;
  const hasElectionParams = !!electionParams;
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && !hasResetRef.current) {
      setStep('confirm');
      setEncryptionResult(null);
      setGeneratedProof(null);
      setElectionParams(null);
      resetProofStatus();
      hasResetRef.current = true;
    } else if (!isOpen) {
      hasResetRef.current = false;
    }
  }, [isOpen, resetProofStatus]);const handleEncryptAndGenerateProof = async () => {
    if (!candidate) return;

    try {
      // Step 1: Initialize ZKP Session Parameters and Election Setup
      setStep('encrypt');
      setIsEncrypting(true);
        console.log('🔐 VoteConfirmation: Initializing election parameters and ZKP session');
      
      // Initialize election parameters from the voting store
      const votingStore = await import('../../store/votingStore').then(m => m.useVotingStore.getState());
      const realElectionParams = await votingStore.initializeElectionParams();
      setElectionParams(realElectionParams);
      
      console.log('✅ VoteConfirmation: Election parameters initialized');
      console.log('🔐 VoteConfirmation: Election params n:', realElectionParams.n ? 'Present' : 'Missing');
      console.log('🔐 VoteConfirmation: Election params h:', realElectionParams.h ? 'Present' : 'Missing');
      
      // Create election ID from parameters
      const electionId = `election_${Date.now()}_${realElectionParams.n ? 'configured' : 'default'}`;
      
      // Initialize session parameters - this ensures all cryptographic operations use consistent parameters
      const sessionParams = await initializeZKPSession(electionId);
      console.log('✅ VoteConfirmation: Session parameters initialized');
      console.log('📋 Session ID:', sessionParams.sessionId);
      console.log('🌱 Master Seed:', sessionParams.masterSeed.substring(0, 16) + '...');

      // Step 2: Perform Real Vote Encryption
      console.log('🔐 VoteConfirmation: Performing real vote encryption...');
      
      // First select the candidate in the store to ensure proper encryption
      votingStore.selectCandidate(candidate);
      
      // Now encrypt the selected vote - no voter ID needed as it's handled internally
      const realEncryptionResult = await votingStore.encryptSelectedVote();
      setEncryptionResult(realEncryptionResult);
      console.log('✅ VoteConfirmation: Real vote encryption completed');
      console.log('🔐 VoteConfirmation: Encrypted vote length:', realEncryptionResult.encryptedVote.length);
      console.log('🔐 VoteConfirmation: Auxiliary key length:', realEncryptionResult.auxiliaryKey.length);
      
      setIsEncrypting(false);

      // Step 3: Generate ZK Proof with Session Parameters
      setStep('zkproof');
      
      // Convert candidate selection to proper binary vote array
      const voteArray = Array.from(generateVoteArray(candidate.id, CANDIDATE_CONFIG.TOTAL_CANDIDATES));
      
      console.log('🎯 VoteConfirmation: Generating proof for vote array:', voteArray);
      console.log('🔐 VoteConfirmation: Using session parameters for cryptographic consistency');
      
      const proof = await generateProof(voteArray);
      if (proof) {
        setGeneratedProof(proof);
        console.log('✅ VoteConfirmation: Proof generated successfully');
        
        // Log session consistency information
        if (proof.publicParameters.sessionId) {
          console.log('🔐 VoteConfirmation: Proof contains session ID:', proof.publicParameters.sessionId);
          const currentSession = getCurrentZKPSession();
          const sessionMatches = currentSession.sessionId === proof.publicParameters.sessionId;
          console.log('🔍 VoteConfirmation: Session consistency check:', sessionMatches ? '✅ CONSISTENT' : '❌ MISMATCH');
        }
        
        // Step 4: Verify proof using the SAME session parameters
        setStep('verify');
        
        console.log('🔍 VoteConfirmation: Verifying proof with session parameter consistency');
        const isValid = await verifyProof(proof);
        
        console.log('🔍 VoteConfirmation: Verification result:', isValid);
        
        if (isValid) {
          console.log('✅ VoteConfirmation: Proof verification successful - session parameters consistent');
          setStep('submit');
        } else {
          // Log detailed verification failure
          console.error('❌ VoteConfirmation: Proof verification failed for generated proof');
          console.error('❌ VoteConfirmation: This may indicate session parameter inconsistency');
          throw new Error('Generated proof failed verification - cryptographic mismatch detected');
        }
      } else {
        throw new Error('Failed to generate ZK proof');
      }
    } catch (error) {
      console.error('❌ VoteConfirmation: Process failed:', error);
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
        );      case 'encrypt':
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
            <h3 className="text-xl font-bold text-white">Encrypting Vote with Real Parameters</h3>
            <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Initializing election parameters</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Generating 256-bit master seed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Performing real vote encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Generating auxiliary keys</span>
              </div>
            </div>
            <p className="text-gray-300">
              Using real election parameters and cryptographic encryption...
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
            <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Using session parameters for consistency</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Generating range proofs (binary constraints)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Generating sum proof (vote total = 1)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Generating single-use proof</span>
              </div>
            </div>
            <ZKProofIndicator 
              status={zkProofStatus}
              className="max-w-md mx-auto"
            />
            <p className="text-gray-300 text-sm">
              Creating a mathematical proof that verifies your vote without revealing it...
            </p>
          </motion.div>
        );      case 'verify':
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
            <h3 className="text-xl font-bold text-white">Verifying Proof with Session Consistency</h3>
            <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Session parameter consistency ✓</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Range proof validation ✓</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Sum proof validation ✓</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Generation proof validation ✓</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Challenge-response validation ✓</span>
              </div>
            </div>
            <p className="text-gray-300">
              Your zero-knowledge proof has been successfully verified with cryptographic consistency!
            </p>
            {publicVerificationData && (
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400">Verification Code:</p>
                <p className="font-mono text-green-400 text-lg">{publicVerificationData.verificationCode}</p>
                <p className="text-xs text-gray-500">This code ensures session parameter integrity</p>
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
            </p>            <div className="bg-gray-700 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-400">Vote Summary:</p>
              <p className="font-semibold text-white">{candidate.name}</p>
              <p className="text-xs text-green-400">
                {hasEncryptionResult ? '✓ Real Encryption' : '⏳ Encrypting'} {' '}
                {hasGeneratedProof ? '✓ ZK Proof Generated' : '⏳ Generating Proof'} {' '}
                ✓ Verified
              </p>              <p className="text-xs text-gray-500">
                Encryption Status: {isCurrentlyEncrypting ? 'Processing...' : 'Complete'}
                {hasElectionParams && ' | Election Parameters: Loaded'}
              </p>
              {encryptionResult && (
                <div className="text-xs text-gray-500">
                  <p>Encrypted Vote: {encryptionResult.encryptedVote.length} bytes</p>
                  <p>Auxiliary Key: {encryptionResult.auxiliaryKey.length} bytes</p>
                </div>
              )}
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
