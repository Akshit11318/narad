import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationCircleIcon, 
  XCircleIcon, 
  ChevronDownIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

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

interface PublicVerificationDisplayProps {
  verificationResult: VerificationResult;
  verificationSteps: VerificationStep[];
  currentStep: number;
  isVerifying: boolean;
}

export function PublicVerificationDisplay({
  verificationResult,
  verificationSteps,
  currentStep,
  isVerifying
}: PublicVerificationDisplayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const toggleStepExpansion = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };
  const getStatusIcon = (status: VerificationStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'loading':
        return <ClockIcon className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: VerificationStep['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-400 bg-green-400/10';
      case 'loading':
        return 'border-blue-400 bg-blue-400/10';
      case 'error':
        return 'border-red-400 bg-red-400/10';
      default:
        return 'border-gray-600 bg-gray-800/50';
    }
  };

  if (!isVerifying && !verificationResult) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Verification Progress */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          Verification Progress
        </h3>
        
        <div className="space-y-4">
          {verificationSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(step.status)}
                  <span className="font-medium text-white">{step.name}</span>
                  {index === currentStep && step.status === 'loading' && (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
                
                {step.details && (
                  <button
                    onClick={() => toggleStepExpansion(index)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >                    {expandedSteps.has(index) ? (
                      <ChevronDownIcon className="w-5 h-5" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {expandedSteps.has(index) && step.details && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-gray-600"
                  >
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 p-3 rounded overflow-x-auto">
                      {step.details}
                    </pre>
                    
                    {step.technicalInfo && showTechnicalDetails && (
                      <div className="mt-3 p-3 bg-gray-900/50 rounded">
                        <h5 className="text-sm font-medium text-gray-400 mb-2">Technical Details:</h5>
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                          {JSON.stringify(step.technicalInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        
        {verificationSteps.some(step => step.technicalInfo) && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
            </button>
          </div>
        )}
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`border rounded-lg p-6 ${
            verificationResult.isValid
              ? 'border-green-400 bg-green-400/10'
              : 'border-red-400 bg-red-400/10'
          }`}
        >          <div className="flex items-center space-x-3 mb-4">
            {verificationResult.isValid ? (
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
            ) : (
              <XCircleIcon className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h3 className="text-xl font-semibold text-white">
                {verificationResult.isValid ? 'Verification Successful' : 'Verification Failed'}
              </h3>
              <p className="text-gray-400">
                Code: {verificationResult.verificationCode} • {new Date(verificationResult.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {verificationResult.isValid && (
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Verification Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Election ID:</span>
                  <span className="text-white ml-2">{verificationResult.verificationData.electionId}</span>
                </div>
                <div>
                  <span className="text-gray-400">Verification Code:</span>
                  <span className="text-white ml-2 font-mono">{verificationResult.verificationCode}</span>
                </div>
                <div>
                  <span className="text-gray-400">Timestamp:</span>
                  <span className="text-white ml-2">{new Date(verificationResult.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 ml-2">✓ Cryptographically Verified</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Security Notice */}
      <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="font-medium text-blue-300 mb-2">Security Notice</h4>
        <p className="text-sm text-blue-200">
          This verification uses zero-knowledge proofs and WASM-backed cryptographic operations to ensure 
          mathematical certainty. All computations are performed transparently and can be independently audited.
        </p>
      </div>
    </div>
  );
}
