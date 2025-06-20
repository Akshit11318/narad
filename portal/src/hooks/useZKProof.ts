import { useCallback } from 'react';
import { useVotingStore } from '../store';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import type { ZKProofData, PublicVerificationData } from '../types/zkProof';

export function useZKProof() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const zkProofStatus = useVotingStore(state => state.zkProofStatus);
  const zkProof = useVotingStore(state => state.zkProof);
  const publicVerificationData = useVotingStore(state => state.publicVerificationData);
  const setZKProofStatus = useVotingStore(state => state.setZKProofStatus);
  const generateVoteZKProof = useVotingStore(state => state.generateVoteZKProof);
  const verifyOwnProof = useVotingStore(state => state.verifyOwnProof);
  const getPublicVerificationData = useVotingStore(state => state.getPublicVerificationData);
  
  const { user } = useAuth();
  const generateProof = useCallback(async (vote: number[]): Promise<ZKProofData | null> => {
    if (!user) {
      toast.error('User not authenticated');
      return null;
    }

    try {      setZKProofStatus({
        status: 'generating',
        progress: 0,
        currentStep: 'Initializing proof generation...',
        wasmStatus: 'computing'
      });

      const proof = await generateVoteZKProof(vote, user.voterId);
        setZKProofStatus({
        status: 'completed',
        progress: 100,
        currentStep: 'Proof generation completed',
        wasmStatus: 'ready'
      });

      toast.success('Zero-knowledge proof generated successfully!');
      return proof;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate proof';
        setZKProofStatus({
        status: 'error',
        progress: 0,
        currentStep: 'Proof generation failed',
        error: errorMessage,
        wasmStatus: 'error'
      });

      toast.error(`Proof generation failed: ${errorMessage}`);
      return null;
    }
  }, [user, setZKProofStatus, generateVoteZKProof]);
  const verifyProof = useCallback(async (proof: ZKProofData): Promise<boolean> => {
    try {
      const isValid = await verifyOwnProof(proof);
      
      if (isValid) {
        toast.success('Proof verification successful!');
      } else {
        toast.error('Proof verification failed!');
      }
      
      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      toast.error(`Proof verification error: ${errorMessage}`);
      return false;
    }
  }, [verifyOwnProof]);

  const getVerificationData = useCallback((): PublicVerificationData | null => {
    return getPublicVerificationData();
  }, [getPublicVerificationData]);

  const resetProofStatus = useCallback(() => {    setZKProofStatus({
      status: 'idle',
      progress: 0,
      currentStep: 'Ready to generate proof',
      wasmStatus: 'ready'
    });
  }, [setZKProofStatus]);

  return {
    // State
    zkProofStatus,
    zkProof,
    publicVerificationData,
    
    // Actions
    generateProof,
    verifyProof,
    getVerificationData,
    resetProofStatus,
  };
}
