import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input } from '../ui';
import { useAuth } from '../../hooks';
import { validateLoginForm, formatValidationErrors } from '../../utils/validation';
import { DEMO_CREDENTIALS } from '../../utils/constants';
import type { LoginFormData } from '../../types';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    voterId: '',
    password: '',
    rememberMe: false,
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof LoginFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }

    // Clear global error
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate form
    const errors = validateLoginForm({
      voterId: formData.voterId,
      password: formData.password,
      rememberMe: formData.rememberMe,
    });

    if (errors.length > 0) {
      setValidationErrors(formatValidationErrors(errors));
      return;
    }

    try {
      await login({
        voterId: formData.voterId,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });
    } catch (error) {
      // Error is handled by the useAuth hook
      console.error('Login failed:', error);
    }
  };

  const fillDemoCredentials = () => {
    setFormData({
      voterId: DEMO_CREDENTIALS.VOTER_ID,
      password: DEMO_CREDENTIALS.PASSWORD,
      rememberMe: false,
    });
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-gray-700/50 relative">
        {/* Glass morphism effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10 rounded-xl pointer-events-none" />
        
        <div className="relative space-y-6">
          {/* Header */}
          <div className="text-center">
            <motion.div
              className="mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            >
              <div className="w-10 h-10 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </motion.div>
            
            <h2 className="text-xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Sign in to cast your vote</p>
          </div>

          {/* Demo Credentials Helper */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-blue-300">
                <div><strong>Demo:</strong> {DEMO_CREDENTIALS.VOTER_ID} / {DEMO_CREDENTIALS.PASSWORD}</div>
              </div>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Use Demo
              </button>
            </div>
          </div>

          {/* Global Error */}
          {error && (
            <motion.div
              className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Voter ID"
              type="text"
              value={formData.voterId}
              onChange={handleInputChange('voterId')}
              error={validationErrors.voterId}
              placeholder="Enter your voter ID"
              leftIcon={
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-4 0V4a2 2 0 014 0v2"
                  />
                </svg>
              }
              required
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={validationErrors.password}
              placeholder="Enter your password"
              showPasswordToggle
              leftIcon={
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
              required
            />

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleInputChange('rememberMe')}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-300">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 block mx-auto"
            >
              Forgot credentials?
            </button>
            
            {onSwitchToRegister && (
              <div>
                <span className="text-gray-400 text-sm">Don't have an account? </span>
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                >
                  Register here
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

