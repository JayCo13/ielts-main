import React, { useEffect, useRef } from 'react';

const RevealOnScroll = ({ children, direction = 'up', delay = 0 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const getInitialStyles = () => {
    switch (direction) {
      case 'up':
        return 'translate-y-20';
      case 'down':
        return '-translate-y-20';
      case 'left':
        return 'translate-x-20';
      case 'right':
        return '-translate-x-20';
      default:
        return 'translate-y-20';
    }
  };

  return (
    <div
      ref={ref}
      className={`opacity-0 ${getInitialStyles()} transition-all duration-700 ease-out`}
      style={{ 
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default RevealOnScroll;