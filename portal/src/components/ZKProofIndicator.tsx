import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import type { ZKProofGenerationStatus } from '../types/zkProof';

interface ZKProofIndicatorProps {
  status: ZKProofGenerationStatus;
  verificationCode?: string;
  onShowDetails?: () => void;
  className?: string;
}

export function ZKProofIndicator({ status, verificationCode, onShowDetails, className = '' }: ZKProofIndicatorProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'generating':
        return <ClockIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'generating':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'completed':
        return 'Proof Generated Successfully';
      case 'error':
        return 'Proof Generation Failed';
      case 'generating':
        return `Generating Proof... (${status.progress}%)`;
      default:
        return 'Ready to Generate Proof';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${getStatusColor()} ${className}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Zero-Knowledge Proof Status
          </h3>
          <p className="text-sm text-gray-600">
            {getStatusText()}
          </p>
          {status.status === 'generating' && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">
                Current step: {status.currentStep}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            </div>
          )}
          {status.status === 'error' && status.error && (
            <p className="text-xs text-red-600 mt-1">
              Error: {status.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
