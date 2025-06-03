import { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onSubmit?: (event: React.FormEvent<HTMLButtonElement>) => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      type = 'button',
      onClick,
      onSubmit,
    },
    ref
  ) => {
    const baseClasses = `
      inline-flex items-center justify-center font-medium rounded-lg
      transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden
    `;

    const variantClasses = {
      primary: `
        bg-gradient-to-r from-blue-600 to-purple-600 text-white
        hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500
        shadow-lg hover:shadow-xl
      `,
      secondary: `
        bg-gray-800 text-white border border-gray-700
        hover:bg-gray-700 focus:ring-gray-500
      `,
      outline: `
        border border-blue-500 text-blue-500 bg-transparent
        hover:bg-blue-50 hover:bg-opacity-10 focus:ring-blue-500
      `,
      ghost: `
        text-gray-300 hover:text-white hover:bg-gray-800
        focus:ring-gray-500
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-red-700 text-white
        hover:from-red-700 hover:to-red-800 focus:ring-red-500
        shadow-lg hover:shadow-xl
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const isDisabled = disabled || isLoading;    return (
      <motion.button
        ref={ref}
        type={type}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={isDisabled}
        onClick={onClick}
        onSubmit={onSubmit}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={{ duration: 0.1 }}
      >
        {/* Loading spinner */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-inherit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}

        {/* Content */}
        <div className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>

        {/* Glow effect for primary and danger variants */}
        {(variant === 'primary' || variant === 'danger') && !isDisabled && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
            whileHover={{ 
              opacity: [0, 0.1, 0],
              x: [-100, 100],
            }}
            transition={{ duration: 0.6 }}
          />
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
