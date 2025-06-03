import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/layout';
import { Button } from '../components/ui';
import { CandidateCard, VoteConfirmation } from '../components/voting';
import { useAuth, useVoting, useWasm } from '../hooks';
import { ROUTES } from '../utils/constants';
import type { Candidate } from '../types';

export function Voting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    candidates, 
    selectedCandidate, 
    isSubmitting, 
    hasVoted,
    loadCandidates, 
    selectCandidate, 
    submitVote 
  } = useVoting();
  const { isLoaded: wasmLoaded } = useWasm();
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'selection' | 'confirmation' | 'submitted'>('selection');

  useEffect(() => {
    // Redirect if user has already voted
    if (hasVoted) {
      toast.error('You have already voted in this election');
      navigate(ROUTES.DASHBOARD);
      return;
    }

    // Load candidates and check WASM module
    const initializeVoting = async () => {
      try {
        await loadCandidates();
        if (!wasmLoaded) {
          toast.error('Encryption module not loaded. Please refresh the page.');
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize voting:', error);
        toast.error('Failed to load voting data');
        navigate(ROUTES.DASHBOARD);
      }
    };

    initializeVoting();
  }, [hasVoted, loadCandidates, navigate, wasmLoaded]);

  const handleCandidateSelect = (candidate: Candidate) => {
    if (currentStep === 'selection') {
      selectCandidate(candidate);
    }
  };

  const handleProceedToConfirmation = () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate first');
      return;
    }
    setCurrentStep('confirmation');
    setShowConfirmation(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate || !user) {
      toast.error('Missing required data for vote submission');
      return;
    }

    try {
      await submitVote(selectedCandidate.id);
      setCurrentStep('submitted');
      
      // Show success message and redirect after delay
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD);
      }, 3000);
    } catch (error) {
      console.error('Vote submission failed:', error);
      toast.error('Failed to submit vote. Please try again.');
      setCurrentStep('selection');
      setShowConfirmation(false);
    }
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
    setShowConfirmation(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading voting interface...</p>
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
          <h1 className="text-4xl font-bold text-white mb-4">
            Cast Your Vote
          </h1>
          <p className="text-xl text-gray-400">
            General Election 2025 • Select your preferred candidate
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 'selection' ? 'bg-blue-500 text-white' : 
                  currentStep === 'confirmation' || currentStep === 'submitted' ? 'bg-green-500 text-white' : 
                  'bg-gray-700 text-gray-400'
                }`}>
                  1
                </div>
                <span className={`font-medium ${
                  currentStep === 'selection' ? 'text-blue-400' : 
                  currentStep === 'confirmation' || currentStep === 'submitted' ? 'text-green-400' : 
                  'text-gray-400'
                }`}>
                  Select Candidate
                </span>
              </div>

              <div className="flex-1 mx-4 h-1 bg-gray-700 rounded">
                <div className={`h-full bg-gradient-to-r from-blue-500 to-green-500 rounded transition-all duration-500 ${
                  currentStep === 'confirmation' || currentStep === 'submitted' ? 'w-full' : 'w-0'
                }`} />
              </div>

              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 'confirmation' ? 'bg-blue-500 text-white' : 
                  currentStep === 'submitted' ? 'bg-green-500 text-white' : 
                  'bg-gray-700 text-gray-400'
                }`}>
                  2
                </div>
                <span className={`font-medium ${
                  currentStep === 'confirmation' ? 'text-blue-400' : 
                  currentStep === 'submitted' ? 'text-green-400' : 
                  'text-gray-400'
                }`}>
                  Confirm Vote
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {currentStep === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Candidates Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={selectedCandidate?.id === candidate.id}
                    onSelect={handleCandidateSelect}
                    disabled={isSubmitting}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  disabled={isSubmitting}
                >
                  Back to Dashboard
                </Button>

                <Button
                  variant="primary"
                  onClick={handleProceedToConfirmation}
                  disabled={!selectedCandidate || isSubmitting}
                  className="min-w-[200px]"
                >
                  Proceed to Confirmation
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Vote Submitted Successfully!</h3>
                <p className="text-gray-400 mb-4">
                  Your vote has been encrypted and recorded on the blockchain.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard in a few seconds...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vote Confirmation Modal */}
        <VoteConfirmation
          isOpen={showConfirmation}
          onClose={handleBackToSelection}
          onConfirm={handleConfirmVote}
          candidate={selectedCandidate}
          isSubmitting={isSubmitting}
        />
      </div>
    </Layout>
  );
}
