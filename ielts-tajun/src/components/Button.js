import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  to,
  href,
  disabled = false,
  className = '',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  loadingText = 'Loading...',
  ...props
}) => {
  // Base styles
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size variations
  const sizeStyles = {
    small: 'text-xs px-2.5 py-1.5',
    medium: 'text-sm px-4 py-2',
    large: 'text-base px-6 py-3',
  };
  
  // Style variations
  const variantStyles = {
    primary: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-md focus:ring-green-500',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    accent: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md focus:ring-blue-500',
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-md focus:ring-green-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-md focus:ring-red-500',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-md focus:ring-amber-500',
    outline: 'bg-transparent border border-current text-current hover:bg-gray-50',
    ghost: 'bg-transparent text-current hover:bg-gray-100',
    link: 'bg-transparent text-blue-600 hover:underline p-0 focus:ring-0',
  };
  
  // Disabled state
  const disabledStyles = 'opacity-60 cursor-not-allowed';
  
  // Full width
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Shimmer effect for primary buttons
  const shimmerStyles = variant === 'primary' && !disabled && !isLoading ? 'overflow-hidden shimmer-effect' : '';
  
  // Combine all styles
  const buttonStyles = `
    ${baseStyles}
    ${sizeStyles[size] || sizeStyles.medium}
    ${variantStyles[variant] || variantStyles.primary}
    ${disabled ? disabledStyles : ''}
    ${widthStyles}
    ${shimmerStyles}
    ${className}
  `;
  
  // Button animations
  const buttonVariants = {
    hover: { scale: disabled ? 1 : 1.02, transition: { duration: 0.2 } },
    tap: { scale: disabled ? 1 : 0.98, transition: { duration: 0.1 } },
  };
  
  // Loading spinner
  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  // Shimmer effect
  const ShimmerEffect = () => (
    <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-translate pointer-events-none"></div>
  );

  // Content with icons and loading state
  const content = (
    <>
      {isLoading && <LoadingSpinner />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      <span>{isLoading ? loadingText : children}</span>
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      {shimmerStyles && <ShimmerEffect />}
    </>
  );

  // Render as Link if 'to' prop is provided (internal routing)
  if (to) {
    return (
      <motion.div
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        className="inline-block"
        style={fullWidth ? { width: '100%' } : undefined}
      >
        <Link to={to} className={buttonStyles} {...props}>
          {content}
        </Link>
      </motion.div>
    );
  }

  // Render as anchor if 'href' prop is provided (external link)
  if (href) {
    return (
      <motion.div
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        className="inline-block"
        style={fullWidth ? { width: '100%' } : undefined}
      >
        <a href={href} className={buttonStyles} {...props}>
          {content}
        </a>
      </motion.div>
    );
  }

  // Render as button (default)
  return (
    <motion.button
      whileHover="hover"
      whileTap="tap"
      variants={buttonVariants}
      className={buttonStyles}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </motion.button>
  );
};

// CSS for the shimmer effect (add this to your global CSS or use a styled-jsx approach)
export const ButtonCss = `
  .shimmer-effect {
    position: relative;
    overflow: hidden;
  }

  .shimmer-translate {
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

export default Button; 