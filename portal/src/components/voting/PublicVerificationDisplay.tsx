import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button } from '../ui';
import { ZKProofIndicator } from '../ZKProofIndicator';
import type { PublicVerificationData, ZKProofGenerationStatus } from '../../types/zkProof';

interface PublicVerificationDisplayProps {
  verificationData: PublicVerificationData;
  className?: string;
}

export function PublicVerificationDisplay({ verificationData, className = '' }: PublicVerificationDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  // Safety check for required data
  if (!verificationData || !verificationData.verificationCode) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Verification Data</h2>
          <p className="text-gray-600">
            The verification data is incomplete or invalid.
          </p>
        </div>
      </div>
    );
  }
  const handleCopyVerificationCode = async () => {
    try {
      await navigator.clipboard.writeText(verificationData.verificationCode);
      toast.success('Verification code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy verification code:', error);
      toast.error('Failed to copy verification code');
    }
  };
  const handleShareVerificationUrl = async () => {
    try {
      await navigator.clipboard.writeText(verificationData.verificationUrl);
      toast.success('Verification URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy verification URL:', error);
      toast.error('Failed to copy verification URL');
    }
  };

  const handleVerifyPublicly = async () => {
    setIsVerifying(true);
    try {
      // Open verification URL in new tab
      window.open(verificationData.verificationUrl, '_blank');
    } catch (error) {
      console.error('Failed to open verification URL:', error);
    } finally {
      setIsVerifying(false);
    }
  };
  // Generate QR code data URL for display
  const getQRCodeDataUrl = () => {
    if (!verificationData.qrCode) return null;
    
    // If qrCode is already a data URL or image URL, use it directly
    if (typeof verificationData.qrCode === 'string' && 
        (verificationData.qrCode.startsWith('data:') || verificationData.qrCode.startsWith('http'))) {
      return verificationData.qrCode;
    }
    
    // If qrCode is an object with URL, use that
    if (typeof verificationData.qrCode === 'object' && verificationData.qrCode && 'url' in verificationData.qrCode) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((verificationData.qrCode as any).url)}`;
    }
    
    // Generate QR code URL for the verification URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationData.verificationUrl)}`;
  };
  const completedStatus: ZKProofGenerationStatus = {
    status: 'completed',
    progress: 100,
    currentStep: 'Vote successfully submitted with ZK proof',
    wasmStatus: 'ready'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-lg p-6 space-y-6 ${className}`}
    >
      {/* Success Header */}
      <div className="text-center">
        <div className="text-green-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Successfully Submitted!</h2>
        <p className="text-gray-600">
          Your vote has been securely recorded with zero-knowledge proof verification.
        </p>
      </div>

      {/* ZK Proof Status */}
      <ZKProofIndicator 
        status={completedStatus}
        verificationCode={verificationData.verificationCode}
        className="bg-green-50 border-green-200"
      />

      {/* Verification Code Display */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Verification Code</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyVerificationCode}
          >
            Copy Code
          </Button>
        </div>
        <div className="bg-white rounded border p-3">
          <p className="font-mono text-xl text-center text-blue-600 tracking-wider">
            {verificationData.verificationCode}
          </p>
        </div>
        <p className="text-sm text-gray-600">
          Save this code to verify your vote publicly at any time.
        </p>
      </div>

      {/* Verification Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Verification Details</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Election ID</label>
                <p className="text-sm text-gray-900 font-mono">{verificationData.electionId}</p>
              </div>              <div>
                <label className="text-sm font-medium text-gray-700">Timestamp</label>
                <p className="text-sm text-gray-900">
                  {verificationData.timestamp ? new Date(verificationData.timestamp).toLocaleString() : 'Not available'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Public Verification URL</label>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-900 font-mono flex-1 truncate">
                    {verificationData.verificationUrl}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareVerificationUrl}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button
          onClick={handleVerifyPublicly}
          disabled={isVerifying}
          className="flex-1"
        >
          {isVerifying ? 'Opening...' : 'Verify Publicly'}
        </Button>        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="flex-1"
        >
          Return to Dashboard
        </Button>
      </div>      {/* QR Code Section */}
      {verificationData.qrCode && (
        <div className="text-center pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">QR Code for Mobile Verification</h3>
          <div className="inline-block p-4 bg-white border rounded-lg">
            <img
              src={getQRCodeDataUrl() || undefined}
              alt="Verification QR Code"
              className="w-32 h-32"
              onError={(e) => {
                // Fallback to a default QR code generator if image fails to load
                e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationData.verificationUrl)}`;
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Scan with your mobile device to verify your vote
          </p>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Zero-Knowledge Privacy Protection
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Your vote is protected by zero-knowledge proofs. This means:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Your vote choice remains completely private</li>
                <li>The verification code proves your vote was counted</li>
                <li>No one can determine how you voted from the verification</li>
                <li>The mathematical proof ensures election integrity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
