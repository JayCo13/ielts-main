import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'medium', color = 'green', className = '' }) => {
  // Size mappings
  const sizes = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16'
  };

  // Color mappings
  const colors = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    amber: 'text-amber-500',
    gray: 'text-gray-500'
  };

  // Animation variants
  const containerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1.5,
        ease: "linear",
        repeat: Infinity
      }
    }
  };

  const circleVariants = {
    initial: { opacity: 0.2 },
    animate: ([delay, opacity]) => ({
      opacity: [opacity, 1, opacity],
      transition: {
        duration: 1.2,
        ease: "easeInOut",
        delay,
        repeat: Infinity
      }
    })
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <motion.div
        className={`${sizes[size] || sizes.medium} relative`}
        animate="animate"
        variants={containerVariants}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = i * 60;
          const x = 45 * Math.cos((angle * Math.PI) / 180);
          const y = 45 * Math.sin((angle * Math.PI) / 180);
          
          return (
            <motion.div
              key={i}
              className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full ${colors[color] || colors.green}`}
              style={{
                x: `calc(${x}% - 4px)`,
                y: `calc(${y}% - 4px)`
              }}
              initial="initial"
              animate="animate"
              custom={[i * 0.2, 0.4]}
              variants={circleVariants}
            />
          );
        })}
      </motion.div>
    </div>
  );
};

// Full-page loading overlay
export const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-600 font-medium">{message}</p>
    </div>
  );
};

export default LoadingSpinner; 