import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input } from "../ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  validateRegisterForm,
  formatValidationErrors,
} from "../../utils/validation";
import type { RegisterData } from "../../types";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState<RegisterData>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleInputChange =
    (field: keyof RegisterData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear validation error for this field
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({
          ...prev,
          [field]: "",
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
    const errors = validateRegisterForm(formData);

    if (errors.length > 0) {
      setValidationErrors(formatValidationErrors(errors));
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
    } catch (error) {
      // Error is handled by the useAuth hook
      console.error("Registration failed:", error);
    }
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
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <div className="w-10 h-10 mx-auto bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
            </motion.div>

            <h2 className="text-xl font-bold text-white mb-1">
              Create Account
            </h2>
            <p className="text-gray-400 text-sm">
              Register to participate in voting
            </p>
          </div>

          {/* Global Error */}
          {error && (
            <motion.div
              className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center gap-2 text-red-400">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={validationErrors.email}
              placeholder="Enter your email"
              leftIcon={
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
              required
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange("password")}
              error={validationErrors.password}
              placeholder="Create a secure password"
              showPasswordToggle
              leftIcon={
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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

            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              error={validationErrors.confirmPassword}
              placeholder="Confirm your password"
              showPasswordToggle
              leftIcon={
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              }
              required
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            {onSwitchToLogin && (
              <div>
                <span className="text-gray-400 text-sm">
                  Already have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                >
                  Sign in here
                </button>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center text-blue-400 text-xs">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Your information is encrypted and stored securely</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
