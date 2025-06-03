import { motion } from 'framer-motion';
import type { Candidate } from '../../types';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (candidate: Candidate) => void;
  disabled?: boolean;
}

export function CandidateCard({ candidate, isSelected, onSelect, disabled = false }: CandidateCardProps) {
  const handleClick = () => {
    if (!disabled) {
      onSelect(candidate);
    }
  };

  return (
    <motion.div
      className={`
        relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500' 
          : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
      onClick={handleClick}
      whileHover={!disabled ? { y: -5 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      layout
    >
      {/* Glass morphism effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm" />
      
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="absolute top-4 right-4 z-10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Candidate Photo */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={candidate.photo}
          alt={candidate.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default image
            e.currentTarget.src = '/assets/default-candidate.jpg';
          }}
        />
        
        {/* Photo overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Party badge */}
        {candidate.party && (
          <div className="absolute bottom-4 left-4">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-full backdrop-blur-sm">
              {candidate.party}
            </span>
          </div>
        )}
      </div>

      {/* Candidate Info */}
      <div className="relative p-6">
        <h3 className="text-xl font-semibold text-white mb-2">{candidate.name}</h3>
        
        {candidate.description && (
          <p className="text-gray-400 text-sm line-clamp-3">{candidate.description}</p>
        )}

        {/* Selection prompt */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isSelected ? 'Selected' : 'Click to select'}
          </span>
          
          {!disabled && (
            <motion.div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
              }`}
              whileHover={{ scale: 1.1 }}
            >
              {isSelected && (
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Selection glow */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
}
