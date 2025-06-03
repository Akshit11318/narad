import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button, Input } from '../components/ui';
import { validateEmail, validateVoterId, validatePassword, validateName, validatePhone } from '../utils/validation';
import { ROUTES } from '../utils/constants';

interface RegistrationForm {
  voterId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface FormErrors {
  voterId?: string;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agreeToTerms?: string;
}

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationForm>({
    voterId: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof RegistrationForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Voter ID validation
    const voterIdError = validateVoterId(form.voterId);
    if (voterIdError) newErrors.voterId = voterIdError;

    // Name validation
    const nameError = validateName(form.name);
    if (nameError) newErrors.name = nameError;

    // Email validation
    const emailError = validateEmail(form.email);
    if (emailError) newErrors.email = emailError;

    // Phone validation
    const phoneError = validatePhone(form.phone);
    if (phoneError) newErrors.phone = phoneError;

    // Password validation
    const passwordError = validatePassword(form.password);
    if (passwordError) newErrors.password = passwordError;

    // Confirm password validation
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms agreement validation
    if (!form.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please correct the errors and try again');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Note: This would normally make an API call to register the user
      // For now, we'll simulate the registration process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Registration successful! Please login with your credentials.');
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4 py-8">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Glass morphism container */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
              <p className="text-gray-400">
                Register to participate in secure elections
              </p>
            </motion.div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Voter ID */}
            <div>
              <Input
                label="Voter ID"
                type="text"
                value={form.voterId}
                onChange={handleInputChange('voterId')}
                error={errors.voterId}
                placeholder="Enter your voter ID"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Full Name */}
            <div>
              <Input
                label="Full Name"
                type="text"
                value={form.name}
                onChange={handleInputChange('name')}
                error={errors.name}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Email */}
            <div>
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={handleInputChange('email')}
                error={errors.email}
                placeholder="Enter your email address"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <Input
                label="Phone Number"
                type="tel"
                value={form.phone}
                onChange={handleInputChange('phone')}
                error={errors.phone}
                placeholder="Enter your phone number"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Password */}
            <div>
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                placeholder="Create a secure password"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <Input
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={form.agreeToTerms}
                onChange={handleInputChange('agreeToTerms')}
                disabled={isSubmitting}
                className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300 underline">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300 underline">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-red-400 text-sm">{errors.agreeToTerms}</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Sign in here
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center text-blue-400 text-sm">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>
                Your information is encrypted and stored securely. We never share your personal data.
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
