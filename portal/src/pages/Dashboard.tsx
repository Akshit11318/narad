import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { Button } from '../components/ui';
import { useAuth, useVoting } from '../hooks';
import { ROUTES } from '../utils/constants';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { hasVoted, voteConfirmation, loadCandidates } = useVoting();
  const navigate = useNavigate();
  useEffect(() => {
    // Load candidates when dashboard mounts
    loadCandidates();
  }, [loadCandidates]);

  // Refresh the component when vote status changes
  useEffect(() => {
    if (hasVoted) {
      console.log('Dashboard: Vote status updated - user has voted');
    }
  }, [hasVoted, voteConfirmation]);

  const handleStartVoting = () => {
    navigate(ROUTES.VOTING);
  };  const handleLogout = () => {
    logout();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome, {user?.name}!
          </h1>
          <p className="text-xl text-gray-400">
            General Election 2025 • Secure Blockchain Voting
          </p>
        </motion.div>

        {/* Voting Status */}
        <motion.div
          className="grid md:grid-cols-2 gap-8 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Voting Status Card */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Voting Status</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                hasVoted 
                  ? 'bg-green-900 text-green-400 border border-green-500' 
                  : 'bg-yellow-900 text-yellow-400 border border-yellow-500'
              }`}>
                {hasVoted ? 'Completed' : 'Pending'}
              </div>
            </div>

            {hasVoted ? (
              <div className="space-y-4">
                <div className="flex items-center text-green-400">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Vote Successfully Submitted</span>
                </div>                <p className="text-gray-400 text-sm">
                  Your vote has been encrypted and processed with zero-knowledge proof verification. Thank you for participating in the democratic process.
                </p>                {voteConfirmation && (
                  <div className="mt-4 space-y-3">
                    {/* ZKP Code Display */}
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-sm font-medium text-white">Zero-Knowledge Proof</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-400">ZK Proof ID:</span>
                          <code className="block text-xs text-blue-400 font-mono break-all bg-gray-700/50 p-2 rounded">{voteConfirmation.zkProofId}</code>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-400">Verification Code:</span>
                          <code className="block text-xs text-green-400 font-mono break-all bg-gray-700/50 p-2 rounded">{voteConfirmation.verificationCode}</code>
                        </div>
                        
                        {voteConfirmation.zkProofSummary && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-2">Proof Validations:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center space-x-1">
                                <span className={voteConfirmation.zkProofSummary.rangeProofValid ? 'text-green-400' : 'text-red-400'}>
                                  {voteConfirmation.zkProofSummary.rangeProofValid ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-300">Range Proof</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className={voteConfirmation.zkProofSummary.sumProofValid ? 'text-green-400' : 'text-red-400'}>
                                  {voteConfirmation.zkProofSummary.sumProofValid ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-300">Sum Proof</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className={voteConfirmation.zkProofSummary.generationProofValid ? 'text-green-400' : 'text-red-400'}>
                                  {voteConfirmation.zkProofSummary.generationProofValid ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-300">Generation Proof</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className={voteConfirmation.zkProofSummary.mathematicallySound ? 'text-green-400' : 'text-red-400'}>
                                  {voteConfirmation.zkProofSummary.mathematicallySound ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-300">Mathematically Sound</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleLogout}
                        className="min-w-[120px]"
                      >
                        🚪 Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center text-yellow-400">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Ready to Vote</span>
                </div>
                <p className="text-gray-400 text-sm">
                  You haven't cast your vote yet. Click below to view candidates and make your selection.
                </p>
                
                <Button
                  variant="primary"
                  onClick={handleStartVoting}
                  className="w-full mt-4"
                >
                  Start Voting Process
                </Button>
              </div>
            )}
          </div>

          {/* Election Info Card */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Election Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Election Type</label>
                <p className="text-white font-medium">General Election 2025</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total Candidates</label>
                <p className="text-white font-medium">4 Candidates</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Voting Method</label>
                <p className="text-white font-medium">Blockchain-based Encryption</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Voter ID</label>
                <p className="text-white font-medium font-mono">{user?.voterId}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Information */}
        <motion.div
          className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Secure Voting Process</h3>
              <p className="text-gray-400 text-sm mb-4">
                Your vote is protected by advanced cryptographic encryption and recorded on an immutable blockchain. 
                This ensures complete privacy while maintaining verifiable transparency.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  End-to-end encryption
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Zero-knowledge proof validation
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Immutable blockchain storage
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
