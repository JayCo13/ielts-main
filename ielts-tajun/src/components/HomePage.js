import React from 'react';
import { Link } from "react-router-dom";
import Navbar from './Navbar';
import Footer from './Footer';
import { Player } from '@lottiefiles/react-lottie-player';
import { motion } from 'framer-motion';

// Add CSS for enhanced animations and effects
const marketingStyles = `
  @keyframes float1 {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(2deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  
  @keyframes float2 {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-12px) rotate(-2deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  
  @keyframes float3 {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-18px) rotate(2.5deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  
  @keyframes float4 {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(-1.5deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  
  @keyframes ripple {
    0% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 0.3; }
    100% { transform: scale(0.8); opacity: 0.5; }
  }
  
  @keyframes pulse {
    0% { opacity: 0.4; }
    50% { opacity: 0.8; }
    100% { opacity: 0.4; }
  }
  
  @keyframes shimmer {
    0% { background-position: -100% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .float-1 {
    animation: float1 6s ease-in-out infinite;
  }
  
  .float-2 {
    animation: float2 7s ease-in-out infinite;
    animation-delay: 0.5s;
  }
  
  .float-3 {
    animation: float3 8s ease-in-out infinite;
    animation-delay: 1s;
  }
  
  .float-4 {
    animation: float4 6.5s ease-in-out infinite;
    animation-delay: 1.5s;
  }
  
  .pulse {
    animation: pulse 3s ease-in-out infinite;
  }
  
  .ripple {
    animation: ripple 4s ease-in-out infinite;
  }
  
  .shimmer {
    background: linear-gradient(90deg, 
      rgba(255,255,255,0) 0%, 
      rgba(255,255,255,0.3) 50%, 
      rgba(255,255,255,0) 100%);
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }
  
  .spin-slow {
    animation: spin-slow 12s linear infinite;
  }
  
  .highlight-text {
    background: linear-gradient(120deg, #34d399 0%, #10b981 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    position: relative;
    display: inline-block;
  }
  
  .floating-container::before {
    content: '';
    position: absolute;
    width: 120%;
    height: 15px;
    bottom: -8px;
    left: -10%;
    background: linear-gradient(90deg, rgba(173,216,230,0.2) 0%, rgba(173,216,230,0.5) 50%, rgba(173,216,230,0.2) 100%);
    border-radius: 50%;
    filter: blur(5px);
    z-index: -1;
  }
  
  .circular-text {
    position: absolute;
    width: 100%;
    height: 100%;
    animation: spin-slow 20s linear infinite;
    transform-origin: center center;
  }
  
  /* Second section animations */
  .benefit-card {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }
  
  .benefit-card:hover {
    transform: translateY(-12px) scale(1.03);
    box-shadow: 0 20px 30px rgba(0, 0, 0, 0.08);
  }
  
  .benefit-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 70%);
    background-size: 200% 100%;
    transform: translateX(-100%);
    transition: transform 0.7s ease;
    z-index: 1;
    pointer-events: none;
  }
  
  .benefit-card:hover::before {
    transform: translateX(100%);
  }
  
  .card-icon-container {
    position: relative;
    z-index: 2;
    transition: all 0.5s ease;
  }
  
  .benefit-card:hover .card-icon-container {
    transform: scale(1.1) rotate(10deg);
  }
  
  .card-decoration {
    position: absolute;
    background: linear-gradient(120deg, var(--start-color), var(--end-color));
    border-radius: 50%;
    opacity: 0.15;
    transition: all 0.5s ease;
  }
  
  .benefit-card:hover .card-decoration {
    transform: scale(1.2);
  }
  
  @keyframes float-decoration {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-5px) scale(1.05); }
  }
  
  .floating-decoration {
    animation: float-decoration 3s ease-in-out infinite;
  }
  
  .card-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, var(--glow-color), transparent 70%);
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
  
  .benefit-card:hover .card-glow {
    opacity: 0.15;
  }
  
  .horizontal-scroll {
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .horizontal-scroll::-webkit-scrollbar {
    display: none;
  }
  
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .animated-gradient {
    background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #10b981);
    background-size: 300% 100%;
    animation: gradient-shift 8s ease infinite;
  }
  
  @keyframes type-cursor {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  .type-cursor {
    animation: type-cursor 1s step-end infinite;
  }

  .floating-bg-text {
    position: absolute;
    font-family: sans-serif;
    font-weight: bold;
    opacity: 0.05;
    pointer-events: none;
  }

  .floating-bg-text-1 {
    animation: float1 15s ease-in-out infinite;
  }

  .floating-bg-text-2 {
    animation: float2 18s ease-in-out infinite;
  }

  .floating-bg-text-3 {
    animation: float3 20s ease-in-out infinite;
  }

  /* Background animation effects */
  @keyframes float-particle {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(10px, -10px); }
    50% { transform: translate(15px, 5px); }
    75% { transform: translate(-5px, 8px); }
  }

  @keyframes pulse-opacity {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  @keyframes rotate-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes move-path {
    0%, 100% { 
      d: path("M24.4,-30.7C31.2,-25.3,36.1,-17.1,39.2,-7.7C42.3,1.8,43.5,12.5,39.2,20.6C34.9,28.6,25.1,34,14.5,37.9C3.9,41.8,-7.5,44.1,-17.2,41C-26.9,37.9,-34.9,29.5,-38.6,19.7C-42.3,9.9,-41.8,-1.2,-38.8,-11.2C-35.8,-21.2,-30.4,-30,-22.8,-35.2C-15.1,-40.3,-5.3,-41.9,2.1,-44.6C9.6,-47.3,17.6,-36.1,24.4,-30.7Z"); 
    }
    33% { 
      d: path("M24.3,-31.5C31.3,-27.1,36.8,-19.3,39.7,-10.3C42.6,-1.3,42.9,8.9,38.7,16.6C34.5,24.4,25.7,29.8,16.2,32.9C6.8,36.1,-3.3,37,-13.7,35.5C-24.1,34,-35,30.1,-38.7,22.1C-42.4,14.1,-39,2.1,-37.9,-11.3C-36.8,-24.7,-37.9,-39.6,-31.4,-44C-24.9,-48.4,-10.6,-42.5,-0.5,-41.8C9.5,-41.2,17.3,-36,24.3,-31.5Z");
    }
    66% { 
      d: path("M15.6,-22.8C20.5,-14.7,25.1,-11.5,32,-3.7C38.9,4.1,48.3,16.4,46.3,25C44.4,33.6,31.2,38.4,18.7,40.2C6.2,41.9,-5.5,40.5,-15.8,36.5C-26.1,32.5,-35,25.9,-40.5,16.6C-46,7.2,-48.1,-4.8,-44.1,-13.8C-40,-22.8,-30,-28.8,-20.5,-35.3C-11.1,-41.8,-2.2,-48.7,2.3,-51.7C6.8,-54.7,10.7,-30.9,15.6,-22.8Z");
    }
  }

  .animated-blob {
    animation: move-path 15s infinite ease-in-out;
  }

  .floating-particle {
    position: absolute;
    border-radius: 50%;
    filter: blur(1px);
    z-index: 0;
    opacity: 0.5;
    animation: float-particle 8s infinite ease-in-out, pulse-opacity 6s infinite ease-in-out;
  }

  .rotating-shape {
    position: absolute;
    z-index: 0;
    opacity: 0.6;
    animation: rotate-slow 15s linear infinite;
  }

  .fb-messenger-icon {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(to bottom, #00C6FF, #0078FF);
    box-shadow: 0 4px 12px rgba(0, 120, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .fb-messenger-icon.minimized {
    width: 44px;
    height: 44px;
    opacity: 0.8;
    bottom: 16px;
    right: 16px;
  }
  
  .fb-messenger-icon:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow: 0 8px 16px rgba(0, 120, 255, 0.4);
    opacity: 1;
  }
  
  .fb-messenger-icon::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(to bottom, #00C6FF, #0078FF);
    opacity: 0.6;
    transform: scale(0);
    animation: pulse-ring 2s infinite;
  }
  
  .messenger-toggle {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #ff4154;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  }
  
  .messenger-toggle:hover {
    transform: scale(1.1);
    background-color: #e63346;
  }
  
  .notification-dot {
    position: absolute;
    top: 0;
    right: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #ff4154;
    border: 2px solid white;
    z-index: 1001;
  }
  
  @keyframes pulse-ring {
    0% {
      transform: scale(0.8);
      opacity: 0.6;
    }
    70% {
      transform: scale(1.2);
      opacity: 0;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
  }
  
  .fb-messenger-tooltip {
    position: absolute;
    top: -40px;
    right: 0;
    background-color: #fff;
    color: #333;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    opacity: 0;
    transform: translateY(10px);
    pointer-events: none;
    transition: all 0.3s ease;
    white-space: nowrap;
  }
  
  .fb-messenger-icon:hover .fb-messenger-tooltip {
    opacity: 1;
    transform: translateY(0);
  }
`;

const heroImages = [
  '/img/hp1.jpeg',
  '/img/hp2.jpeg',
  '/img/hp3.jpeg',
  '/img/hp4.jpeg',
];

const HeroLottieBackground = () => (
  <div className="absolute inset-0 pointer-events-none z-0">
    {/* Lottie background effects */}
    <Player
      autoplay
      loop
      src="/edu3.json"
      className="absolute left-0 top-0 w-[520px] h-[550px] opacity-30 blur-[2px]"
      background="transparent"
      speed={0.7}
    />
    <Player
      autoplay
      loop
      src="/edu.json"
      className="absolute right-0 top-10 w-[450px] h-[350px] opacity-20 blur-[1.5px]"
      background="transparent"
      speed={0.8}
    />
    <Player
      autoplay
      loop
      src="/edu2.json"
      className="absolute left-1/3 bottom-0 w-[300px] h-[300px] opacity-20 blur-[1.5px]"
      background="transparent"
      speed={0.6}
    />
  </div>
);

const FloatingMessengerIcon = () => {
  const [isMinimized, setIsMinimized] = React.useState(false);

  const openMessenger = () => {
    // Open Facebook Messenger with your page ID
    window.open('https://m.me/ieltstrenmay', '_blank');
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  return (
    <motion.div
      className={`fb-messenger-icon ${isMinimized ? 'minimized' : ''}`}
      onClick={openMessenger}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 1.5
      }}
      whileHover={{ scale: isMinimized ? 1.05 : 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {!isMinimized && <div className="fb-messenger-tooltip">Liên hệ ngay</div>}

      {/* Close button */}
      <div
        className="messenger-toggle"
        onClick={toggleMinimize}
      >
        <span className="text-white text-xs font-bold">1</span>
      </div>

      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2.33334C7.54838 2.33334 2.33334 7.16637 2.33334 13.1308C2.33334 16.4891 3.95321 19.4924 6.5181 21.4573V25.6667L10.6583 23.5964C11.7125 23.9087 12.8333 24.0764 14 24.0764C20.4516 24.0764 25.6667 19.2433 25.6667 13.279C25.6667 7.31462 20.4516 2.33334 14 2.33334Z" fill="white" />
        <path d="M15.1748 16.9404L12.1581 13.6657L6.30481 16.9404L12.7431 10.0834L15.842 13.3581L21.6131 10.0834L15.1748 16.9404Z" fill="#0078FF" />
      </svg>
    </motion.div>
  );
};

const HomePage = () => {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  };

  const slideUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const slideRight = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } }
  };

  // New variants for second section
  const staggerFaster = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const slideInRight = {
    hidden: { x: 100, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  const slideInBottom = {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf5ef] to-[#e0f2ff] flex flex-col">
      <style>{marketingStyles}</style>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center">
        {/* HERO SECTION */}
        <section className="relative w-full max-w-6xl mx-auto px-4 md:py-20 overflow-hidden border-b-2">
          <HeroLottieBackground />

          {/* Decorative large circles in background */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="absolute top-20 right-20 w-72 h-72 rounded-full bg-gradient-to-br from-green-200/20 to-blue-200/20 blur-xl"
          />
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.3 }}
            className="absolute bottom-10 left-10 w-60 h-60 rounded-full bg-gradient-to-tr from-purple-200/20 to-pink-200/20 blur-xl"
          />

          {/* Decorative design elements */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.5 }}
            className="absolute top-5 left-1/3 w-40 h-40 opacity-50 pointer-events-none"
          >
            <div className="circular-text">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <path id="circle" d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                </defs>
                <text fontSize="9" fill="#10b981">
                  <textPath xlinkHref="#circle">
                    thiieltstrenmay.com • thiieltstrenmay.com • thiieltstrenmay.com •
                  </textPath>
                </text>
              </svg>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.7 }}
            className="absolute bottom-10 right-1/4 w-32 h-32 opacity-40 pointer-events-none"
          >
            <div className="circular-text" style={{ animationDirection: 'reverse' }}>
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <path id="circle2" d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                </defs>
                <text fontSize="8" fill="#8b5cf6">
                  <textPath xlinkHref="#circle2">
                    thiieltstrenmay.com • thiieltstrenmay.com • thiieltstrenmay.com •
                  </textPath>
                </text>
              </svg>
            </div>
          </motion.div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Left: Marketing headline with visual highlights */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerChildren}
              className="flex-1 max-w-xl text-left md:pt-8"
            >
              {/* IELTS Badge */}
              <motion.div
                variants={slideRight}
                className="inline-block mb-4 px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-full shadow-md"
              >
                IELTS Computer-Based Test
              </motion.div>

              <motion.h1
                variants={staggerChildren}
                className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight flex flex-col gap-3"
              >
                <motion.span variants={slideUp} className="inline-block">Thi IELTS trên máy</motion.span>
                <motion.span variants={slideUp} className="inline-block highlight-text text-4xl md:text-6xl font-black">với đề thi gốc</motion.span>
                <motion.span variants={slideUp} className="inline-block relative">
                  chuẩn quốc tế
                  <span className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></span>
                </motion.span>
              </motion.h1>

              <motion.p
                variants={slideUp}
                className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl"
              >
                Trải nghiệm thi thử IELTS trên máy tính với đề thi thật, giao diện chuẩn, chấm điểm tự động và phân tích chi tiết giúp bạn nâng band hiệu quả.
              </motion.p>

              {/* Trust indicators */}
              <motion.div
                variants={staggerChildren}
                className="flex flex-wrap gap-6 mb-6 text-gray-500"
              >
                <motion.div variants={fadeIn} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <span>Đề thi chuẩn quốc tế</span>
                </motion.div>
                <motion.div variants={fadeIn} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <span>Giao diện giống thật 100%</span>
                </motion.div>
                <motion.div variants={fadeIn} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <span>Chấm chữa Writing bằng AI được phát triển bởi <span className="text-green-600">ieltstrenmay.com</span></span>
                </motion.div>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                variants={slideUp}
                transition={{ delay: 0.8 }}
                className="flex gap-4 mb-8"
              >
                <a href="/listening_list">
                  Đăng ký ngay

                  <button className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg rounded-xl shadow-lg overflow-hidden transform hover:translate-y-[-2px] transition-all duration-300">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Bắt đầu ngay
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </span>
                    <span className="absolute inset-0 shimmer"></span>
                  </button>
                </a>
                {/* Social proof */}
                <div className="flex flex-col justify-center">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">+5k</div>
                  </div>
                  <span className="text-sm text-gray-500 mt-1">Người tin dùng</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: floating images with enhanced water effect */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerChildren}
              className="flex-1 grid grid-cols-2 grid-rows-2 gap-8 min-w-[320px] max-w-lg relative"
            >
              {/* Water surface effect */}
              <motion.div
                variants={fadeIn}
                className="absolute -bottom-8 left-0 w-full h-16 bg-gradient-to-t from-blue-100/40 to-transparent rounded-[50%] blur-xl z-0"
              ></motion.div>

              {/* Enhanced image containers with decorative elements */}
              <motion.div
                variants={scaleIn}
                className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200/80 flex items-center justify-center aspect-square overflow-hidden relative floating-container shadow-lg border border-blue-200/50"
              >
                <div className="w-full h-full float-1">
                  <img src={heroImages[0]} alt="IELTS Test 1" className="object-cover w-full h-full rounded-2xl" />
                </div>

                <span className="absolute bottom-0 w-full h-4 bg-blue-300 opacity-60 rounded-full blur-md"></span>
              </motion.div>
              <motion.div
                variants={scaleIn}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200/80 flex items-center justify-center aspect-square overflow-hidden relative floating-container shadow-lg border border-purple-200/50"
              >
                <div className="w-full h-full float-2">
                  <img src={heroImages[1]} alt="IELTS Test 2" className="object-cover w-full h-full rounded-2xl" />
                </div>

                <span className="absolute bottom-0 w-full h-4 bg-purple-300 opacity-60 rounded-full blur-md"></span>
              </motion.div>
              <motion.div
                variants={scaleIn}
                transition={{ delay: 0.4 }}
                className="rounded-2xl bg-gradient-to-br from-green-100 to-green-200/80 flex items-center justify-center aspect-square overflow-hidden relative floating-container shadow-lg border border-green-200/50"
              >
                <div className="w-full h-full float-3">
                  <img src={heroImages[2]} alt="IELTS Test 3" className="object-cover w-full h-full rounded-2xl" />
                </div>

                <span className="absolute bottom-0 w-full h-4 bg-green-300 opacity-60 rounded-full blur-md"></span>
              </motion.div>
              <motion.div
                variants={scaleIn}
                transition={{ delay: 0.6 }}
                className="rounded-2xl bg-gradient-to-br from-pink-100 to-pink-200/80 flex items-center justify-center aspect-square overflow-hidden relative floating-container shadow-lg border border-pink-200/50"
              >
                <div className="w-full h-full float-4">
                  <img src={heroImages[3]} alt="IELTS Test 4" className="object-cover w-full h-full rounded-2xl" />
                </div>

                <span className="absolute bottom-0 w-full h-4 bg-pink-300 opacity-60 rounded-full blur-md"></span>
              </motion.div>

              {/* Decorative floating bubbles */}
              <motion.div
                variants={fadeIn}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 left-1/4 w-8 h-8 bg-blue-300 rounded-full opacity-50 z-10 ripple"
              ></motion.div>
              <motion.div
                variants={fadeIn}
                transition={{ delay: 1.0 }}
                className="absolute -bottom-10 left-2/3 w-12 h-12 bg-green-200 rounded-full opacity-40 z-10 ripple"
                style={{ animationDelay: '1s' }}
              ></motion.div>
              <motion.div
                variants={fadeIn}
                transition={{ delay: 1.2 }}
                className="absolute -bottom-8 left-1/2 w-10 h-10 bg-purple-200 rounded-full opacity-30 z-10 ripple"
                style={{ animationDelay: '2s' }}
              ></motion.div>
            </motion.div>
          </div>
        </section>

        {/* SECOND SECTION - ASYMMETRIC BENEFITS */}
        <section className="relative w-full overflow-hidden pb-10">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-b z-0"></div>

          {/* SVG Blob Animation */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <svg className="absolute top-0 right-0 w-[600px] h-[600px] text-green-100 opacity-30 -translate-y-1/4 translate-x-1/4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" className="animated-blob" d="M24.4,-30.7C31.2,-25.3,36.1,-17.1,39.2,-7.7C42.3,1.8,43.5,12.5,39.2,20.6C34.9,28.6,25.1,34,14.5,37.9C3.9,41.8,-7.5,44.1,-17.2,41C-26.9,37.9,-34.9,29.5,-38.6,19.7C-42.3,9.9,-41.8,-1.2,-38.8,-11.2C-35.8,-21.2,-30.4,-30,-22.8,-35.2C-15.1,-40.3,-5.3,-41.9,2.1,-44.6C9.6,-47.3,17.6,-36.1,24.4,-30.7Z" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-[500px] h-[500px] text-blue-100 opacity-30 translate-y-1/4 -translate-x-1/4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" className="animated-blob" style={{ animationDelay: "-5s" }} d="M24.4,-30.7C31.2,-25.3,36.1,-17.1,39.2,-7.7C42.3,1.8,43.5,12.5,39.2,20.6C34.9,28.6,25.1,34,14.5,37.9C3.9,41.8,-7.5,44.1,-17.2,41C-26.9,37.9,-34.9,29.5,-38.6,19.7C-42.3,9.9,-41.8,-1.2,-38.8,-11.2C-35.8,-21.2,-30.4,-30,-22.8,-35.2C-15.1,-40.3,-5.3,-41.9,2.1,-44.6C9.6,-47.3,17.6,-36.1,24.4,-30.7Z" />
            </svg>
          </div>

          {/* Floating particles */}
          <div className="floating-particle w-4 h-4 bg-green-300 top-[15%] left-[10%]" style={{ animationDelay: "0s" }}></div>
          <div className="floating-particle w-6 h-6 bg-blue-300 top-[25%] right-[15%]" style={{ animationDelay: "1s" }}></div>
          <div className="floating-particle w-3 h-3 bg-purple-300 top-[60%] left-[20%]" style={{ animationDelay: "2s" }}></div>
          <div className="floating-particle w-5 h-5 bg-yellow-300 bottom-[20%] right-[10%]" style={{ animationDelay: "3s" }}></div>
          <div className="floating-particle w-7 h-7 bg-pink-300 bottom-[30%] left-[30%]" style={{ animationDelay: "4s" }}></div>

          {/* Rotating shapes */}
          <div className="rotating-shape top-[30%] right-[25%]" style={{ animationDirection: "reverse" }}>
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0L61.2245 38.8909L100 50L61.2245 61.1091L50 100L38.7755 61.1091L0 50L38.7755 38.8909L50 0Z" fill="url(#gradient1)" fillOpacity="0.3" />
              <defs>
                <linearGradient id="gradient1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#16A34A" />
                  <stop offset="1" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="rotating-shape bottom-[15%] left-[15%]">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0L93.3013 25L93.3013 75L50 100L6.69873 75L6.69873 25L50 0Z" fill="url(#gradient2)" fillOpacity="0.3" />
              <defs>
                <linearGradient id="gradient2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8B5CF6" />
                  <stop offset="1" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Floating background text */}
          <div className="floating-bg-text floating-bg-text-1 top-[10%] left-[5%] text-6xl md:text-8xl text-green-500">
            ieltstrenmay.com
          </div>
          <div className="floating-bg-text floating-bg-text-2 top-[40%] right-[5%] text-7xl md:text-9xl text-blue-500">
            ieltstrenmay.com
          </div>
          <div className="floating-bg-text floating-bg-text-3 bottom-[15%] left-[15%] text-6xl md:text-8xl text-purple-500">
            ieltstrenmay.com
          </div>

          <div className="max-w-6xl mx-auto px-4 relative z-10">
            {/* Asymmetric header section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 pt-20">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={slideRight}
                className="md:col-span-2"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                  Hệ thống thi ielts trên máy được phát triển bởi đội ngũ <span className="text-green-600">ieltstrenmay.com</span>
                </h2>
                <p className="text-lg text-gray-600 mb-4 max-w-2xl">
                  Chúng tôi cung cấp nền tảng giúp bạn luyện thi IELTS trên máy tính với đề thi gốc,
                  tái hiện chính xác môi trường thi thật, giúp bạn tự tin đạt được điểm số mong muốn.
                </p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeIn}
                className="flex justify-center md:justify-end items-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-blue-200 rounded-full blur-md transform rotate-12"></div>
                  <div className="relative z-10 py-3 px-6 bg-white rounded-full shadow-md text-lg font-semibold text-gray-700">
                    98% thí sinh cải thiện band sau <span className="text-green-600">2 tuần</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Main benefits - Staggered cards */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerFaster}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16"
            >
              <motion.div
                variants={scaleIn}
                className="md:col-span-5 md:col-start-1 benefit-card bg-white rounded-2xl shadow-lg p-6 md:p-8 transform md:translate-y-8"
                style={{ "--glow-color": "rgba(16, 185, 129, 0.3)" }}
              >
                <div className="card-decoration top-[-50px] right-[-50px] w-[150px] h-[150px]" style={{ "--start-color": "#34d399", "--end-color": "#10b981" }}></div>
                <div className="card-decoration bottom-[-70px] left-[-40px] w-[170px] h-[170px]" style={{ "--start-color": "#10b981", "--end-color": "#059669" }}></div>
                <div className="card-glow"></div>

                <div className="card-icon-container rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-green-200 rounded-full opacity-50 floating-decoration" style={{ animationDelay: "0.2s" }}></div>
                  <svg className="w-8 h-8 text-green-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 relative">
                  Thi thật tại nhà, giống kỳ thi chính thức
                  <span className="absolute -left-2 top-1/2 w-1 h-6 bg-green-500 -translate-y-1/2 rounded-full"></span>
                </h3>
                <p className="text-gray-600">Trải nghiệm thi hoàn toàn giống với kỳ thi IELTS chính thức với giao diện được tái hiện chính xác, giúp bạn làm quen với môi trường thi thật.</p>

                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center text-sm font-medium text-green-600">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </motion.div>

              <motion.div
                variants={scaleIn}
                className="md:col-span-5 md:col-start-7 benefit-card bg-white rounded-2xl shadow-lg p-6 md:p-8"
                style={{ "--glow-color": "rgba(59, 130, 246, 0.3)" }}
              >
                <div className="card-decoration top-[-40px] left-[-50px] w-[150px] h-[150px]" style={{ "--start-color": "#60a5fa", "--end-color": "#3b82f6" }}></div>
                <div className="card-decoration bottom-[-50px] right-[-70px] w-[170px] h-[170px]" style={{ "--start-color": "#3b82f6", "--end-color": "#2563eb" }}></div>
                <div className="card-glow"></div>

                <div className="card-icon-container rounded-full bg-blue-100 w-16 h-16 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-blue-200 rounded-full opacity-50 floating-decoration" style={{ animationDelay: "0.5s" }}></div>
                  <svg className="w-8 h-8 text-blue-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 relative">
                  Đề thi gốc từ ngân hàng đề chính thức
                  <span className="absolute -left-2 top-1/2 w-1 h-6 bg-blue-500 -translate-y-1/2 rounded-full"></span>
                </h3>
                <p className="text-gray-600">Làm quen với dạng đề thi gốc được biên soạn từ đội ngũ chuyên gia IELTS, mang đến trải nghiệm thi thật nhất có thể.</p>

                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center text-sm font-medium text-blue-600">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </motion.div>

              <motion.div
                variants={scaleIn}
                className="md:col-span-6 md:col-start-4 md:mt-8 benefit-card bg-white rounded-2xl shadow-lg p-6 md:p-8 transform md:translate-y-4"
                style={{ "--glow-color": "rgba(139, 92, 246, 0.3)" }}
              >
                <div className="card-decoration top-[-60px] right-[-30px] w-[160px] h-[160px]" style={{ "--start-color": "#a78bfa", "--end-color": "#8b5cf6" }}></div>
                <div className="card-decoration bottom-[-40px] left-[-60px] w-[150px] h-[150px]" style={{ "--start-color": "#8b5cf6", "--end-color": "#7c3aed" }}></div>
                <div className="card-glow"></div>

                <div className="card-icon-container rounded-full bg-purple-100 w-16 h-16 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-purple-200 rounded-full opacity-50 floating-decoration" style={{ animationDelay: "0.7s" }}></div>
                  <svg className="w-8 h-8 text-purple-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 relative">
                  Tăng khả năng trúng tủ, nâng band hiệu quả
                  <span className="absolute -left-2 top-1/2 w-1 h-6 bg-purple-500 -translate-y-1/2 rounded-full"></span>
                </h3>
                <p className="text-gray-600">Làm quen với nhiều dạng đề, câu hỏi và chủ đề thường gặp, giúp bạn tăng khả năng "trúng tủ" và đạt điểm cao trong kỳ thi thật.</p>

                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center text-sm font-medium text-purple-600">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Horizontal scrolling user types */}
            <div className="mb-16">
              <motion.h3
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="text-xl font-semibold mb-6 text-gray-700"
              >
                Phù hợp cho
              </motion.h3>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerChildren}
                className="horizontal-scroll flex gap-4 pb-4"
              >
                <motion.div variants={slideInRight} className="flex-shrink-0 w-64 p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Người mới luyện thi</h4>
                  <p className="text-sm text-gray-600">Làm quen với hình thức thi, giao diện và các dạng câu hỏi thường gặp.</p>
                </motion.div>

                <motion.div variants={slideInRight} className="flex-shrink-0 w-64 p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Người thi lại 1 kỹ năng</h4>
                  <p className="text-sm text-gray-600">Các bài thi riêng biệt cho từng kỹ năng, tập trung vào điểm yếu cần cải thiện.</p>
                </motion.div>

                <motion.div variants={slideInRight} className="flex-shrink-0 w-64 p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Người muốn trúng tủ</h4>
                  <p className="text-sm text-gray-600">Làm quen với nhiều dạng đề, nắm vững các chủ đề thường xuất hiện trong đề thi.</p>
                </motion.div>

                <motion.div variants={slideInRight} className="flex-shrink-0 w-64 p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                  <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Người hướng tới band cao</h4>
                  <p className="text-sm text-gray-600">Phân tích chi tiết từng câu trả lời, cung cấp mẫu câu đạt điểm cao để tham khảo.</p>
                </motion.div>
              </motion.div>
            </div>

            {/* Final CTA Banner */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInBottom}
              className="relative animated-gradient text-white rounded-lg mx-4 md:mx-auto max-w-5xl overflow-hidden shadow-xl"
            >
              <div className="absolute right-0 top-0 w-1/3 h-full opacity-20">
                <svg viewBox="0 0 200 450" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                  <path d="M190,20 L180,40 L160,35 L150,60 L120,70 L110,95 L80,90 L40,110 L20,140 L40,170 L30,220 L10,250 L30,280 L20,320 L50,350 L40,380 L70,410 L100,400 L140,430 L190,410 L170,380 L200,340 L190,300 L160,290 L180,250 L170,210 L190,190 L170,150 L150,130 L170,90 L190,70 L180,40 L190,20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                </svg>
              </div>

              <div className="p-8 md:p-12 flex flex-col md:flex-row items-center">
                <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Thi thử miễn phí ngay hôm nay!</h3>
                  <p className="text-white/80 mb-6">Bắt đầu hành trình chinh phục IELTS của bạn với trải nghiệm thi thử miễn phí. Không giới hạn thời gian, không cần thẻ tín dụng.</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a href="/writing_test">
                    <button className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors">Bắt đầu thi thử</button>
                    </a>
                  </div>
                </div>

                <div className="md:w-1/3 relative">
                  <div className="relative bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                    <div className="relative bg-gray-800 rounded-t-lg p-2 flex justify-between items-center">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <span className="text-xs text-gray-300">IELTS Computer Test</span>
                    </div>
                    <div className="bg-white rounded-b-lg p-3">
                      <div className="text-gray-800 text-sm font-mono mb-2">
                        <span> </span>
                        <span className="text-green-600">Your IELTS test is ready...</span>
                      </div>
                      <div className="text-gray-800 text-sm font-mono mb-2">
                        <span> </span>
                        <span className="text-blue-600">Starting test...</span>
                      </div>
                      <div className="text-gray-800 text-sm font-mono">
                        <span> </span>
                        <span className="text-gray-800">Time remaining: 60:00</span>
                        <span className="type-cursor inline-block w-2 h-4 ml-1 bg-gray-800"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Add the floating messenger icon */}
      <FloatingMessengerIcon />
    </div>
  );
};

export default HomePage;