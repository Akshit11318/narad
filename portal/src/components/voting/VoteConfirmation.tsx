import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from '../ui';
import { useVoting } from '../../hooks';
import { generateEncryptedPreview } from '../../utils/crypto';
import type { Candidate, EncryptionResult } from '../../types';

interface VoteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onConfirm: () => Promise<void>;
}

export function VoteConfirmation({ isOpen, onClose, candidate, onConfirm }: VoteConfirmationProps) {
  const { isVoting } = useVoting();
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [step, setStep] = useState<'confirm' | 'encrypt' | 'submit'>('confirm');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setEncryptionResult(null);
    }
  }, [isOpen]);

  const handleEncryptAndConfirm = async () => {
    if (!candidate) return;

    try {
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
      setIsEncrypting(false);
      setStep('submit');
    } catch (error) {
      console.error('Encryption failed:', error);
      setIsEncrypting(false);
      setStep('confirm');
    }
  };

  const handleFinalSubmit = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Vote submission failed:', error);
    }
  };

  if (!candidate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Your Vote"
      size="md"
      closeOnOverlayClick={!isVoting && !isEncrypting}
      closeOnEscape={!isVoting && !isEncrypting}
    >
      <div className="space-y-6">
        {/* Candidate Summary */}
        <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
          <img
            src={candidate.photo}
            alt={candidate.name}
            className="w-16 h-16 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/assets/default-candidate.jpg';
            }}
          />
          <div>
            <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
            {candidate.party && (
              <p className="text-blue-400 text-sm">{candidate.party}</p>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4">
          {['Confirm', 'Encrypt', 'Submit'].map((stepName, index) => {
            const stepNumber = index + 1;
            const isActive = 
              (step === 'confirm' && stepNumber === 1) ||
              (step === 'encrypt' && stepNumber === 2) ||
              (step === 'submit' && stepNumber === 3);
            const isCompleted = 
              (step === 'encrypt' && stepNumber === 1) ||
              (step === 'submit' && stepNumber <= 2);

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
                    stepNumber
                  )}
                </motion.div>
                <span className="ml-2 text-sm text-gray-400">{stepName}</span>
                {index < 2 && <div className="w-8 h-px bg-gray-600 mx-4" />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[200px] flex flex-col justify-center">
          {step === 'confirm' && (
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
              <h3 className="text-xl font-semibold text-white">
                Are you sure you want to vote for {candidate.name}?
              </h3>
              <p className="text-gray-400">
                This action cannot be undone. Your vote will be encrypted and submitted to the blockchain.
              </p>
            </motion.div>
          )}

          {step === 'encrypt' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="text-blue-400 mb-4">
                {isEncrypting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </motion.div>
                ) : (
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-semibold text-white">
                {isEncrypting ? 'Encrypting Your Vote...' : 'Vote Encrypted Successfully'}
              </h3>
              <p className="text-gray-400">
                {isEncrypting 
                  ? 'Please wait while we secure your vote using cryptographic encryption.'
                  : 'Your vote has been encrypted and is ready for submission.'
                }
              </p>
            </motion.div>
          )}

          {step === 'submit' && encryptionResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-white text-center">Encrypted Vote Preview</h3>
              
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Encrypted Vote</label>
                  <div className="p-2 bg-gray-900 rounded text-green-400 font-mono text-sm break-all">
                    {generateEncryptedPreview(encryptionResult.encryptedVote)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Auxiliary Key</label>
                  <div className="p-2 bg-gray-900 rounded text-blue-400 font-mono text-sm break-all">
                    {generateEncryptedPreview(encryptionResult.auxiliaryKey)}
                  </div>
                </div>
              </div>

              <p className="text-center text-gray-400 text-sm">
                Your vote is encrypted and ready for secure submission to the blockchain.
              </p>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isVoting || isEncrypting}
            className="flex-1"
          >
            Cancel
          </Button>
          
          {step === 'confirm' && (
            <Button
              variant="primary"
              onClick={handleEncryptAndConfirm}
              disabled={isEncrypting}
              className="flex-1"
            >
              Encrypt & Continue
            </Button>
          )}
          
          {step === 'submit' && (
            <Button
              variant="primary"
              onClick={handleFinalSubmit}
              isLoading={isVoting}
              className="flex-1"
            >
              Submit Vote
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
