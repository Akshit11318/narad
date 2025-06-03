import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function Skeleton({ className = '', width, height, rounded = true }: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-800 to-gray-700 ${
        rounded ? 'rounded' : ''
      } ${className}`}
      style={style}
      animate={{
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function CandidateCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Photo skeleton */}
      <Skeleton height={192} rounded={false} />
      
      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        {/* Name */}
        <Skeleton height={24} width="80%" />
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton height={16} width="100%" />
          <Skeleton height={16} width="75%" />
          <Skeleton height={16} width="60%" />
        </div>
        
        {/* Action area */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton height={16} width="40%" />
          <Skeleton height={24} width={24} className="rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="text-center mb-12">
        <Skeleton height={48} width="60%" className="mx-auto mb-4" />
        <Skeleton height={24} width="40%" className="mx-auto" />
      </div>

      {/* Cards skeleton */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Voting status card */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton height={24} width="40%" />
            <Skeleton height={28} width="80px" className="rounded-full" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <Skeleton height={24} width={24} className="rounded-full mr-2" />
              <Skeleton height={20} width="60%" />
            </div>
            <Skeleton height={16} width="100%" />
            <Skeleton height={16} width="80%" />
            <Skeleton height={40} width="100%" />
          </div>
        </div>

        {/* Election info card */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6">
          <Skeleton height={24} width="50%" className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton height={16} width="30%" className="mb-1" />
                <Skeleton height={20} width="70%" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security info skeleton */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Skeleton height={48} width={48} className="rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <Skeleton height={24} width="40%" className="mb-2" />
            <Skeleton height={16} width="100%" className="mb-1" />
            <Skeleton height={16} width="90%" className="mb-4" />
            <div className="grid md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={16} width="80%" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VotingPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <Skeleton height={48} width="50%" className="mx-auto mb-4" />
        <Skeleton height={24} width="60%" className="mx-auto" />
      </div>

      {/* Progress indicator skeleton */}
      <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton height={32} width={32} className="rounded-full" />
            <Skeleton height={20} width="120px" />
          </div>
          <div className="flex-1 mx-4">
            <Skeleton height={4} width="100%" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton height={32} width={32} className="rounded-full" />
            <Skeleton height={20} width="120px" />
          </div>
        </div>
      </div>

      {/* Candidates grid skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <CandidateCardSkeleton key={i} />
        ))}
      </div>

      {/* Action buttons skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton height={44} width="150px" />
        <Skeleton height={44} width="200px" />
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Skeleton height={32} width="60%" className="mx-auto mb-2" />
            <Skeleton height={20} width="80%" className="mx-auto" />
          </div>

          {/* Form fields */}
          <div className="space-y-6">
            <div>
              <Skeleton height={16} width="30%" className="mb-2" />
              <Skeleton height={44} width="100%" />
            </div>
            <div>
              <Skeleton height={16} width="25%" className="mb-2" />
              <Skeleton height={44} width="100%" />
            </div>
            
            {/* Remember me */}
            <div className="flex items-center">
              <Skeleton height={16} width={16} className="rounded mr-2" />
              <Skeleton height={16} width="40%" />
            </div>

            {/* Submit button */}
            <Skeleton height={44} width="100%" />
          </div>
        </div>
      </div>
    </div>
  );
}
