import React from 'react';
import { motion } from 'framer-motion';

const Card = ({
  children,
  variant = 'default',
  colorAccent = 'green',
  hover = true,
  className = '',
  decoration = false,
  onClick = null,
  ...props
}) => {
  // Base styles
  const baseStyles = 'bg-white rounded-2xl shadow-sm overflow-hidden relative';
  
  // Color accent variants
  const colorAccents = {
    green: { light: 'bg-green-50', medium: 'bg-green-100', dark: 'bg-green-500' },
    blue: { light: 'bg-blue-50', medium: 'bg-blue-100', dark: 'bg-blue-500' },
    purple: { light: 'bg-purple-50', medium: 'bg-purple-100', dark: 'bg-purple-500' },
    amber: { light: 'bg-amber-50', medium: 'bg-amber-100', dark: 'bg-amber-500' },
    red: { light: 'bg-red-50', medium: 'bg-red-100', dark: 'bg-red-500' },
    gray: { light: 'bg-gray-50', medium: 'bg-gray-100', dark: 'bg-gray-500' },
  };
  
  // Get the current accent color or default to green
  const accentColor = colorAccents[colorAccent] || colorAccents.green;
  
  // Card variants
  const variants = {
    default: '',
    outlined: 'border border-gray-200',
    elevated: 'shadow-md',
    soft: `${accentColor.light} border border-${colorAccent}-200`,
    accent: '',
  };

  // Animation variants
  const motionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: hover ? { y: -8, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' } : {},
    tap: hover ? { y: -4, scale: 0.98 } : {}
  };

  // Combined styles
  const cardStyles = `
    ${baseStyles}
    ${variants[variant] || variants.default}
    ${className}
  `;

  return (
    <motion.div
      className={cardStyles}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      variants={motionVariants}
      onClick={onClick}
      {...props}
    >
      {/* Accent stripe for accent variant */}
      {variant === 'accent' && (
        <div className={`h-2 w-full ${accentColor.dark}`}></div>
      )}

      {/* Card content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Optional decorative elements */}
      {decoration && (
        <>
          <div className={`absolute top-[-40px] right-[-40px] w-[100px] h-[100px] rounded-full ${accentColor.medium} opacity-20`}></div>
          <div className={`absolute bottom-[-50px] left-[-50px] w-[120px] h-[120px] rounded-full ${accentColor.medium} opacity-10`}></div>
        </>
      )}

      {/* Background shimmer effect on hover */}
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer-effect opacity-0 group-hover:opacity-100"></div>
      )}
    </motion.div>
  );
};

// Card.Header component
Card.Header = ({ children, className = '', divider = false, ...props }) => (
  <div 
    className={`px-6 pt-6 pb-4 ${divider ? 'border-b border-gray-100' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Card.Body component
Card.Body = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

// Card.Footer component
Card.Footer = ({ children, className = '', divider = false, ...props }) => (
  <div 
    className={`px-6 pt-4 pb-6 ${divider ? 'border-t border-gray-100' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Card.Image component
Card.Image = ({ src, alt = '', className = '', objectFit = 'cover', aspectRatio = 'aspect-video', ...props }) => (
  <div className={`w-full ${aspectRatio} overflow-hidden ${className}`}>
    <img 
      src={src} 
      alt={alt} 
      className={`w-full h-full object-${objectFit}`}
      {...props}
    />
  </div>
);

// Card.Title component
Card.Title = ({ children, className = '', ...props }) => (
  <h3 className={`text-xl font-bold text-gray-800 ${className}`} {...props}>
    {children}
  </h3>
);

// Card.Subtitle component
Card.Subtitle = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-gray-500 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

// Card.Badge component
Card.Badge = ({ children, color = 'green', className = '', ...props }) => {
  // Badge color variants
  const badgeColors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColors[color] || badgeColors.green} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Card; 