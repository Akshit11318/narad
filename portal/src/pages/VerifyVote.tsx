import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/layout';
import { Button } from '../components/ui';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface VerificationResult {
  isValid: boolean;
  verificationCode: string;
  electionId: string;
  timestamp: string;
  verificationData?: any;
  error?: string;
}

export function VerifyVote() {
  const { verificationCode } = useParams<{ verificationCode: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputCode, setInputCode] = useState(verificationCode || '');

  useEffect(() => {
    if (verificationCode) {
      handleVerification(verificationCode);
    }
  }, [verificationCode]);

  const handleVerification = async (code: string) => {
    if (!code || code.length !== 16) {
      setResult({
        isValid: false,
        verificationCode: code,
        electionId: '',
        timestamp: new Date().toISOString(),
        error: 'Invalid verification code format. Code must be 16 characters.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/zkproof/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationCode: code
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult({
          isValid: data.isValid,
          verificationCode: code,
          electionId: data.verificationData?.electionId || 'Unknown',
          timestamp: data.timestamp,
          verificationData: data.verificationData
        });
      } else {
        const errorData = await response.json();
        setResult({
          isValid: false,
          verificationCode: code,
          electionId: '',
          timestamp: new Date().toISOString(),
          error: errorData.error || 'Verification failed'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setResult({
        isValid: false,
        verificationCode: code,
        electionId: '',
        timestamp: new Date().toISOString(),
        error: 'Failed to connect to verification service'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVerification = () => {
    if (inputCode.trim()) {
      navigate(`/verify/${inputCode.trim()}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Vote Verification
          </h1>
          <p className="text-xl text-gray-400">
            Verify the authenticity of a submitted vote using its verification code
          </p>
        </motion.div>

        {/* Verification Input */}
        <motion.div
          className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold text-white mb-6">Enter Verification Code</h2>
          
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter 16-character verification code"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-center tracking-wider"
              maxLength={16}
            />
            <Button
              onClick={handleManualVerification}
              disabled={!inputCode.trim() || inputCode.length !== 16 || isLoading}
              className="px-8"
            >
              Verify
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Verification codes are 16 characters long and case-insensitive
          </p>
        </motion.div>

        {/* Verification Result */}
        {isLoading && (
          <motion.div
            className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ClockIcon className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-white mb-2">Verifying...</h3>
            <p className="text-gray-400">Please wait while we verify your vote</p>
          </motion.div>
        )}

        {result && !isLoading && (
          <motion.div
            className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-center mb-6">
              {result.isValid ? (
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              )}
              
              <h3 className={`text-2xl font-bold mb-2 ${result.isValid ? 'text-green-400' : 'text-red-400'}`}>
                {result.isValid ? 'Vote Verified Successfully' : 'Verification Failed'}
              </h3>
              
              <p className="text-gray-400">
                {result.isValid 
                  ? 'This vote has been cryptographically verified and is authentic.'
                  : result.error || 'This verification code could not be validated.'
                }
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Verification Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Verification Code
                    </label>
                    <code className="block bg-gray-800 px-3 py-2 rounded font-mono text-sm text-green-400">
                      {result.verificationCode}
                    </code>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Election ID
                    </label>
                    <span className="block bg-gray-800 px-3 py-2 rounded text-sm text-gray-300">
                      {result.electionId}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Verification Time
                    </label>
                    <span className="block bg-gray-800 px-3 py-2 rounded text-sm text-gray-300">
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {result.verificationData && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Technical Details</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-xs text-gray-300 overflow-auto max-h-48">
                      {JSON.stringify(result.verificationData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-center space-x-4">
              <Button
                onClick={() => setResult(null)}
                variant="outline"
              >
                Verify Another
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="primary"
              >
                Back to Home
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
