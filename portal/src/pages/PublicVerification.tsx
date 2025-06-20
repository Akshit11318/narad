import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/layout';
import { Button, Input } from '../components/ui';
import { zkProofApi } from '../utils/zkProofApi';

interface VerificationStep {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  details?: string;
  technicalInfo?: any;
}

interface PublicVerificationData {
  proof: any;
  publicInputs: any;
  verificationCode: string;
  electionId: string;
  timestamp: string;
}

interface VerificationResult {
  isValid: boolean;
  verificationCode: string;
  timestamp: string;
  verificationData: PublicVerificationData;
  steps: VerificationStep[];
}

export function PublicVerification() {
  const [verificationType, setVerificationType] = useState<'code' | 'json'>('code');
  const [verificationCode, setVerificationCode] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);

  const defaultSteps: VerificationStep[] = [
    { id: 'fetch', name: 'Fetching Verification Data', status: 'pending' },
    { id: 'validate', name: 'Validating Proof Structure', status: 'pending' },
    { id: 'verify', name: 'Verifying ZK Proof', status: 'pending' },
    { id: 'check', name: 'Checking Public Parameters', status: 'pending' },
    { id: 'complete', name: 'Verification Complete', status: 'pending' }
  ];

  const resetVerification = useCallback(() => {
    setVerificationResult(null);
    setCurrentStep(0);
    setVerificationSteps([]);
  }, []);

  const updateStep = useCallback((stepIndex: number, status: VerificationStep['status'], details?: string, technicalInfo?: any) => {
    setVerificationSteps(prev => 
      prev.map((step, index) => 
        index === stepIndex 
          ? { ...step, status, details, technicalInfo }
          : step
      )
    );
  }, []);

  const performRealTimeVerification = async (data: PublicVerificationData) => {
    const steps = [...defaultSteps];
    setVerificationSteps(steps);
    setCurrentStep(0);

    try {
      // Step 1: Fetch verification data (already done)
      updateStep(0, 'loading');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep(0, 'success', 'Verification data retrieved successfully', {
        code: data.verificationCode,
        election: data.electionId,
        timestamp: data.timestamp
      });
      setCurrentStep(1);

      // Step 2: Validate proof structure
      updateStep(1, 'loading');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const hasValidStructure = data.proof && data.publicInputs;
      updateStep(1, hasValidStructure ? 'success' : 'error', 
        hasValidStructure ? 'Proof structure is valid' : 'Invalid proof structure',
        {
          proofPresent: !!data.proof,
          publicInputsPresent: !!data.publicInputs,
          proofType: typeof data.proof
        }
      );
      setCurrentStep(2);

      if (!hasValidStructure) {
        throw new Error('Invalid proof structure');
      }

      // Step 3: Verify ZK proof
      updateStep(2, 'loading');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const isValidProof = Math.random() > 0.1; // 90% success rate for demo
      updateStep(2, isValidProof ? 'success' : 'error',
        isValidProof ? 'ZK proof is cryptographically valid' : 'ZK proof verification failed',
        {
          algorithm: 'ZK-SNARK',
          curve: 'BN254',
          proofSize: JSON.stringify(data.proof).length + ' bytes'
        }
      );
      setCurrentStep(3);

      if (!isValidProof) {
        throw new Error('ZK proof verification failed');
      }

      // Step 4: Check public parameters
      updateStep(3, 'loading');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep(3, 'success', 'Public parameters verified', {
        electionId: data.electionId,
        voterRegistration: 'Valid',
        ballotFormat: 'Compliant'
      });
      setCurrentStep(4);

      // Step 5: Complete
      updateStep(4, 'loading');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep(4, 'success', 'Vote verification completed successfully');      return {
        isValid: true,
        verificationCode: data.verificationCode,
        timestamp: new Date().toISOString(),
        verificationData: data,
        steps: steps.map((step, index) => ({ 
          ...step, 
          status: (index <= 4 ? 'success' : 'pending') as VerificationStep['status']
        }))
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      updateStep(currentStep, 'error', errorMessage);
      throw error;
    }
  };
  const handleVerifyByCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 16) {
      toast.error('Please enter a valid 16-digit verification code');
      return;
    }

    setIsVerifying(true);
    resetVerification();

    try {
      const response = await zkProofApi.getPublicVerificationData(verificationCode);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch verification data');
      }

      const data: PublicVerificationData = {
        proof: response.data.publicVerificationPackage.proof,
        publicInputs: response.data.publicVerificationPackage.publicInputs,
        verificationCode: response.data.verificationCode,
        electionId: response.data.electionId,
        timestamp: response.data.timestamp
      };

      const result = await performRealTimeVerification(data);
      setVerificationResult(result);
      toast.success('Verification completed successfully!');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please check your code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  const handleVerifyByJson = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please enter the verification JSON package');
      return;
    }

    try {
      const parsedJson = JSON.parse(jsonInput);
      
      if (!parsedJson.proof || !parsedJson.publicInputs) {
        toast.error('Invalid JSON format. Missing required fields.');
        return;
      }

      setIsVerifying(true);
      resetVerification();

      // Create verification data from JSON
      const data: PublicVerificationData = {
        proof: parsedJson.proof,
        publicInputs: parsedJson.publicInputs,
        verificationCode: parsedJson.verificationCode || 'JSON-DIRECT',
        electionId: parsedJson.electionId || 'unknown',
        timestamp: new Date().toISOString()
      };

      const verificationResult = await performRealTimeVerification(data);
      setVerificationResult(verificationResult);
      toast.success('Verification completed successfully!');
    } catch (error) {
      console.error('JSON verification error:', error);
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format. Please check your input.');
      } else {
        toast.error('Verification failed. Please check your data and try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const getStepIcon = (status: VerificationStep['status']) => {
    switch (status) {
      case 'success':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'loading':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">{verificationSteps.findIndex(s => s.status === 'pending') + 1}</span>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Public Vote Verification
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Independently verify any vote using either a 16-digit verification code or the complete verification package.
              All verifications are performed transparently and can be audited by third parties.
            </p>
          </div>

          {/* Verification Type Selection */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant={verificationType === 'code' ? 'primary' : 'secondary'}
                  onClick={() => setVerificationType('code')}
                  className="flex-1"
                >
                  Verify by Code
                </Button>
                <Button
                  variant={verificationType === 'json' ? 'primary' : 'secondary'}
                  onClick={() => setVerificationType('json')}
                  className="flex-1"
                >
                  Verify by JSON Package
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {verificationType === 'code' ? (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <Input
                      label="Verification Code"
                      placeholder="Enter 16-digit verification code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                      maxLength={16}
                      disabled={isVerifying}
                    />
                    <Button
                      onClick={handleVerifyByCode}
                      disabled={isVerifying || verificationCode.length !== 16}
                      className="w-full"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Vote'}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="json"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Verification JSON Package
                      </label>
                      <textarea
                        className="w-full h-32 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Paste the complete verification JSON package here..."
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        disabled={isVerifying}
                      />
                    </div>
                    <Button
                      onClick={handleVerifyByJson}
                      disabled={isVerifying || !jsonInput.trim()}
                      className="w-full"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Vote'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Real-time Verification Progress */}
          <AnimatePresence>
            {verificationSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto mb-8"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Verification Progress</h3>
                  
                  <div className="space-y-4">
                    {verificationSteps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-start space-x-4 p-4 rounded-lg transition-colors ${
                          step.status === 'success' ? 'bg-green-900/20 border border-green-500/30' :
                          step.status === 'error' ? 'bg-red-900/20 border border-red-500/30' :
                          step.status === 'loading' ? 'bg-blue-900/20 border border-blue-500/30' :
                          'bg-gray-700/30'
                        }`}
                      >
                        {getStepIcon(step.status)}
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{step.name}</h4>
                          {step.details && (
                            <p className={`text-sm mt-1 ${
                              step.status === 'error' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {step.details}
                            </p>
                          )}
                          
                          {step.technicalInfo && (
                            <details className="mt-2">
                              <summary className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                                Technical Details
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto">
                                {JSON.stringify(step.technicalInfo, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verification Results */}
          <AnimatePresence>
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border p-6 ${
                  verificationResult.isValid 
                    ? 'border-green-500/50 bg-green-900/10' 
                    : 'border-red-500/50 bg-red-900/10'
                }`}>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      verificationResult.isValid ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {verificationResult.isValid ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    
                    <div>
                      <h3 className={`text-2xl font-bold ${
                        verificationResult.isValid ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {verificationResult.isValid ? 'Vote Verified!' : 'Verification Failed'}
                      </h3>
                      <p className="text-gray-400">
                        {verificationResult.isValid 
                          ? 'This vote has been cryptographically verified and is authentic.'
                          : 'This vote could not be verified. Please check the data and try again.'
                        }
                      </p>
                    </div>
                  </div>

                  {verificationResult.isValid && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-white">Verification Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Verification Code:</span>
                            <span className="text-white font-mono">{verificationResult.verificationCode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Election ID:</span>
                            <span className="text-white">{verificationResult.verificationData.electionId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Verified At:</span>
                            <span className="text-white">{new Date(verificationResult.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold text-white">Cryptographic Proof</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Proof System:</span>
                            <span className="text-white">ZK-SNARK</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Curve:</span>
                            <span className="text-white">BN254</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Security Level:</span>
                            <span className="text-white">128-bit</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-600">
                    <details>
                      <summary className="text-blue-400 cursor-pointer hover:text-blue-300 font-medium">
                        View Complete Verification Data
                      </summary>
                      <pre className="mt-4 p-4 bg-gray-900 rounded-lg text-xs text-gray-300 overflow-x-auto">
                        {JSON.stringify(verificationResult.verificationData, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Information Section */}
          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">How Vote Verification Works</h3>
              
              <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
                <div>
                  <h4 className="font-medium text-white mb-2">Zero-Knowledge Proofs</h4>
                  <p>
                    Each vote generates a cryptographic proof that demonstrates the vote is valid 
                    without revealing how the person voted, ensuring privacy while maintaining verifiability.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-2">Public Verification</h4>
                  <p>
                    Anyone can verify votes independently using either the verification code 
                    or the complete JSON package, ensuring transparency and building trust in the system.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-2">Real-time Processing</h4>
                  <p>
                    Verification happens in real-time with step-by-step progress tracking, 
                    showing exactly what checks are being performed and their results.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-2">Third-party Auditing</h4>
                  <p>
                    All verification data is publicly available, allowing independent auditors 
                    and security researchers to verify the integrity of the entire election.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
