import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/layout';
import { Button, Input } from '../components/ui';
import { ZKProofIndicator } from '../components/ZKProofIndicator';
import { zkProofApi } from '../utils/zkProofApi';
import type { ZKProofGenerationStatus } from '../types/zkProof';

interface VerificationResult {
  isValid: boolean;
  electionId: string;
  timestamp: string;
  proofDetails?: {
    commitment: string;
    challenge: string;
    response: string;
  };
  error?: string;
}

export function PublicVerification() {
  const { verificationCode } = useParams<{ verificationCode?: string }>();
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState(verificationCode || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (verificationCode) {
      handleVerify();
    }
  }, [verificationCode]);
  const handleVerify = async () => {
    if (!inputCode.trim()) {
      toast.error('Please enter a verification code');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);    try {
      // Call backend verification API
      const result = await zkProofApi.verifyProof({
        verificationCode: inputCode.trim()
      });

      if (result.success && result.data) {
        const verificationData: VerificationResult = {
          isValid: result.data.isValid,
          electionId: result.data.electionId,
          timestamp: result.data.timestamp,
          proofDetails: result.data.proofDetails
        };

        setVerificationResult(verificationData);
        
        if (verificationData.isValid) {
          toast.success('Vote verification successful!');
        } else {
          toast.error('Vote verification failed!');
        }
      } else {
        setVerificationResult({
          isValid: false,
          electionId: '',
          timestamp: '',
          error: result.message || 'Verification failed'
        });
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        isValid: false,
        electionId: '',
        timestamp: '',
        error: 'Verification service is currently unavailable'
      });
      toast.error('Verification service unavailable');
    } finally {
      setIsVerifying(false);
    }
  };

  const getVerificationStatus = (): ZKProofGenerationStatus => {
    if (isVerifying) {      return {
        status: 'generating',
        progress: 50,
        currentStep: 'Verifying proof...',
        wasmStatus: 'computing'
      };
    }
    
    if (verificationResult) {      return {
        status: verificationResult.isValid ? 'completed' : 'error',
        progress: 100,
        currentStep: verificationResult.isValid ? 'Verification completed' : 'Verification failed',
        error: verificationResult.error,
        wasmStatus: verificationResult.isValid ? 'ready' : 'error'
      };
    }    return {
      status: 'idle',
      progress: 0,
      currentStep: 'Ready to verify',
      wasmStatus: 'ready'
    };
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-12">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-4">Public Vote Verification</h1>
            <p className="text-gray-300 text-lg">
              Verify your vote using your zero-knowledge proof verification code
            </p>
          </motion.div>

          {/* Verification Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Enter Verification Code</h2>
            <div className="space-y-4">
              <Input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter your verification code"
                className="font-mono text-lg"
                disabled={isVerifying}
              />
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !inputCode.trim()}
                className="w-full"
              >
                {isVerifying ? 'Verifying...' : 'Verify Vote'}
              </Button>
            </div>
          </motion.div>

          {/* Verification Status */}
          {(isVerifying || verificationResult) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <ZKProofIndicator 
                status={getVerificationStatus()}
                verificationCode={verificationResult?.isValid ? inputCode : undefined}
              />
            </motion.div>
          )}

          {/* Verification Results */}
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {verificationResult.isValid ? (
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-green-400">Vote Verified Successfully</h3>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400">Election ID:</span>
                        <p className="text-white font-mono">{verificationResult.electionId}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Verified At:</span>
                        <p className="text-white">{new Date(verificationResult.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-green-500/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-green-400 hover:text-green-300"
                      >
                        {showDetails ? 'Hide' : 'Show'} Technical Details
                      </Button>
                    </div>

                    {showDetails && verificationResult.proofDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 space-y-3 bg-black/20 rounded-lg p-4"
                      >
                        <h4 className="text-green-400 font-medium">Zero-Knowledge Proof Components:</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-400 text-xs">Commitment:</span>
                            <p className="text-white font-mono text-xs break-all">{verificationResult.proofDetails.commitment}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Challenge:</span>
                            <p className="text-white font-mono text-xs break-all">{verificationResult.proofDetails.challenge}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Response:</span>
                            <p className="text-white font-mono text-xs break-all">{verificationResult.proofDetails.response}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-red-400">Verification Failed</h3>
                  </div>
                  <p className="text-gray-300">
                    {verificationResult.error || 'The verification code is invalid or the proof has been tampered with.'}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-6 mt-8"
          >
            <h3 className="text-lg font-semibold text-white mb-4">How Vote Verification Works</h3>
            <div className="space-y-3 text-gray-300 text-sm">
              <p>
                <span className="text-blue-400 font-medium">Zero-Knowledge Proofs:</span> Your vote verification uses 
                advanced cryptographic proofs that confirm your vote was counted without revealing how you voted.
              </p>
              <p>
                <span className="text-green-400 font-medium">Privacy Protection:</span> The verification process 
                maintains complete ballot secrecy while ensuring election integrity.
              </p>
              <p>
                <span className="text-purple-400 font-medium">Public Verification:</span> Anyone can verify that 
                votes were properly counted, but no one can determine individual vote choices.
              </p>
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Back to Home
            </Button>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
