import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Navbar from './Navbar';
import Footer from './Footer';
import { Player } from '@lottiefiles/react-lottie-player';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCoverflow, Pagination } from 'swiper/modules';
import '../App.css';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import { API_BASE } from '../config/api';

const heroImages = [
  '/img/hp1.webp',
  '/img/hp2.webp',
  '/img/hp4.webp',
];
const FloatingMessengerIcon = () => {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 300;
      setShowScrollTop(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openMessenger = () => {
    window.open('https://zalo.me/0964996195', '_blank'); // Replace with your Zalo ID
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <motion.div
        className={`fb-messenger-icon ${isMinimized ? 'minimized' : ''} ${showScrollTop ? 'shifted' : ''}`}
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

        <div
          className="messenger-toggle"
          onClick={toggleMinimize}
        >
          <span className="text-white text-xs font-bold">1</span>
        </div>

        <img
          src="/img/zalo.png"
          alt="Zalo"
          width="50"
          height="50"
          style={{ objectFit: 'contain' }}
        />
      </motion.div>

      <motion.div
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        initial={{ scale: 0 }}
        animate={{ scale: showScrollTop ? 1 : 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </motion.div>
    </>
  );
};

const FloatingInstructionIcon = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stack above Zalo icon (Zalo: bottom 35px default, 110px when scroll-to-top is visible).
  // Add Zalo height (~66px) + gap (~12px) = ~78px above Zalo's bottom.
  const bottomPx = showScrollTop ? 188 : 113;

  return (
    <motion.div
      onClick={() => navigate('/instruction')}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 1.2
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      style={{ bottom: `${bottomPx}px` }}
      className="fixed right-[27px] z-[999] cursor-pointer group transition-[bottom] duration-300 ease-out"
      role="button"
      aria-label="Hướng dẫn sử dụng"
    >
      {/* Always-visible pill label (sits to the left of the circle) */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white rounded-full shadow-[0_4px_14px_rgba(43,83,86,0.25)] px-4 py-2 border border-gray-100 group-hover:shadow-[0_6px_18px_rgba(43,83,86,0.4)] transition-shadow duration-300 whitespace-nowrap">
        <span className="text-[#2b5356] font-bold text-sm">
          Hướng dẫn sử dụng
        </span>
      </div>

      {/* Circular badge with mascot */}
      <div className="relative">
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#2b5356] opacity-40 animate-ping"></span>

        <div className="relative w-[66px] h-[66px] rounded-full bg-gradient-to-br from-[#2b5356] to-[#1e3c3e] shadow-[0_4px_12px_rgba(43,83,86,0.5)] flex items-center justify-center overflow-hidden border-2 border-white">
          <img
            src="/img/logo-ielts.png"
            alt="Hướng dẫn"
            className="w-[78%] h-[78%] object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
};

// "Xem thành tích" moved out of the page body into a floating pill in the
// bottom-right corner, stacked above the "Hướng dẫn sử dụng" button (same style).
const FloatingAchievementIcon = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sit ~78px above the "Hướng dẫn sử dụng" icon (which is 113 / 188).
  const bottomPx = showScrollTop ? 266 : 191;

  return (
    <motion.div
      onClick={() => navigate('/achievements')}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1.35 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      style={{ bottom: `${bottomPx}px` }}
      className="fixed right-[27px] z-[999] cursor-pointer group transition-[bottom] duration-300 ease-out"
      role="button"
      aria-label="Xem thành tích"
    >
      {/* Always-visible pill label (sits to the left of the circle) */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white rounded-full shadow-[0_4px_14px_rgba(0,150,177,0.25)] px-4 py-2 border border-gray-100 group-hover:shadow-[0_6px_18px_rgba(0,150,177,0.4)] transition-shadow duration-300 whitespace-nowrap">
        <span className="text-[#0096b1] font-bold text-sm">
          Xem thành tích
        </span>
      </div>

      {/* Circular badge with a trophy */}
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-[#0096b1] opacity-40 animate-ping"></span>
        <div className="relative w-[66px] h-[66px] rounded-full bg-gradient-to-br from-[#0096b1] to-[#2b5356] shadow-[0_4px_12px_rgba(0,150,177,0.5)] flex items-center justify-center overflow-hidden border-2 border-white">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

// Homepage "Thông tin mới" box. Content is managed from the admin dashboard
// (/admin/announcements) and served publicly from GET /announcements.
// Important items are pinned to the top by the API ("không bị trôi").
const AnnouncementsSection = () => {
  const [items, setItems] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/announcements`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => { if (!cancelled) { setItems(Array.isArray(data) ? data : []); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Nothing published yet → don't render an empty box.
  if (loaded && items.length === 0) return null;

  const COLLAPSED_COUNT = 4;
  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hasMore = items.length > COLLAPSED_COUNT;

  const ItemInner = ({ item }) => (
    <>
      <span className="text-xl leading-none shrink-0 mt-0.5">{item.icon || '•'}</span>
      <span className={`text-gray-700 ${item.is_important ? 'font-semibold' : ''}`}>
        {item.content}
        {item.is_important && (
          <span className="ml-2 align-middle inline-flex items-center text-[11px] font-bold text-[#eb7e37] bg-[#eb7e37]/10 rounded-full px-2 py-0.5">
            📌 Quan trọng
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 relative z-10 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-lg border border-[#e9ecef] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-[#0096b1]/10 via-[#2b5356]/5 to-transparent border-b border-gray-100">
          <span className="text-2xl">📢</span>
          <h2 className="text-lg md:text-xl font-bold text-[#2b5356] tracking-wide uppercase">
            Thông tin mới
          </h2>
        </div>

        {/* List */}
        <ul className="divide-y divide-gray-100">
          {visibleItems.map(item => (
            <li key={item.announcement_id}>
              {item.link ? (
                <a
                  href={item.link}
                  className="flex items-start gap-3 px-6 py-3.5 hover:bg-[#0096b1]/5 transition-colors"
                >
                  <ItemInner item={item} />
                </a>
              ) : (
                <div className="flex items-start gap-3 px-6 py-3.5">
                  <ItemInner item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Footer / Xem tất cả */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 px-6 py-3 text-sm font-semibold text-[#0096b1] hover:bg-[#0096b1]/5 border-t border-gray-100 transition-colors"
          >
            {expanded ? 'Thu gọn' : `Xem tất cả (${items.length})`}
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </motion.div>
    </div>
  );
};

const HomePage = () => {

  // Keep your existing animation variants
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
    <div className="min-h-screen bg-white flex flex-col">

      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center">
        {/* HERO SECTION */}
        <section className="relative w-full max-w-6xl mx-auto px-3 md:py-7 overflow-hidden border-b-2">

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
                className="inline-block mt-3 mb-4 px-3 py-1 bg-gradient-to-r from-[#eb7e37] to-[#0096b1] text-white text-sm font-semibold rounded-full shadow-md"
              >
                IELTS Computer-Based Test
              </motion.div>

              <motion.h1
                variants={staggerChildren}
                className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight flex flex-col gap-3"
              >
                <motion.span variants={slideUp} className="inline-block text-[#2b5356]">Thi IELTS trên máy</motion.span>
                <motion.span variants={slideUp} className="inline-block text-4xl md:text-6xl text-[#eb7e37]">với đề thi gốc</motion.span>
                <motion.span variants={slideUp} className="inline-block relative text-[#0096b1]">
                  chuẩn quốc tế
                  <span className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-[#eb7e37] to-[#0096b1] rounded-full"></span>
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
                  <svg className="w-5 h-5 text-[#0096b1]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <span>Đề thi chuẩn quốc tế</span>
                </motion.div>
                <motion.div variants={fadeIn} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0096b1]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <span>Giao diện giống thật 100%</span>
                </motion.div>
                <motion.div variants={fadeIn} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0096b1]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <span>Chấm chữa Writing bằng AI được phát triển bởi <span className="text-[#0096b1] font-bold"><i className='text-[#eb7e37]'>IELTS</i> <i className='text-[#0096b1]'>TAJUN</i></span></span>
                </motion.div>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                variants={slideUp}
                transition={{ delay: 0.8 }}
                className="flex gap-4 mb-8"
              >
                <a href="/listening_list">

                  <button className="group relative px-8 py-4 bg-[#eb7e37] text-white font-bold text-lg rounded-xl shadow-lg overflow-hidden transform hover:translate-y-[-2px] transition-all duration-300">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Bắt đầu ngay
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </span>
                    <span className="absolute inset-0 shimmer"></span>
                  </button>
                </a>
                {/* Social proof */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-gray-50 to-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex -space-x-3">
                    <img src="/img/per4.jpg" alt="User" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
                    <img src="/img/per3.jpg" alt="User" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
                    <img src="/img/per2.jpg" alt="User" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold bg-gradient-to-r from-[#0096b1] to-[#eb7e37] bg-clip-text text-transparent">100K+</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Người tin dùng</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: floating images with enhanced water effect */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 1,
                type: "spring",
                stiffness: 50,
                damping: 20
              }}
              className="flex-1 min-w-[480px] max-w-2xl relative"
            >
              <Swiper
                modules={[Autoplay, EffectCoverflow]}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={"auto"}
                coverflowEffect={{
                  rotate: 30,
                  stretch: 0,
                  depth: 100,
                  modifier: 1,
                  slideShadows: false
                }}
                pagination={{ clickable: true }}
                autoplay={{
                  delay: 1800,
                  disableOnInteraction: false
                }}
                loop={true}
                speed={1000}
                observer={true}
                observeParents={true}
                className="rounded-2xl overflow-hidden h-full swiper-container-custom"
              >
                {heroImages.map((image, index) => (
                  <SwiperSlide key={index} className="w-[300px] h-[300px] swiper-slide-custom">
                    <div className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-500 ease-in-out slide-inner">
                      <img
                        src={image}
                        alt={`IELTS Test ${index + 1}`}
                        className="object-contain w-full h-full transition-opacity duration-500 ease-in-out"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Decorative floating bubbles */}
              <motion.div
                variants={fadeIn}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 left-1/4 w-8 h-8 bg-[#305359] rounded-full opacity-50 z-10 ripple"
              ></motion.div>
              <motion.div
                variants={fadeIn}
                transition={{ delay: 1.0 }}
                className="absolute -bottom-10 left-2/3 w-12 h-12 bg-[#eb7e37] rounded-full opacity-40 z-10 ripple"
                style={{ animationDelay: '1s' }}
              ></motion.div>
              <motion.div
                variants={fadeIn}
                transition={{ delay: 1.2 }}
                className="absolute -bottom-8 left-1/2 w-10 h-10 bg-[#0096b1] rounded-full opacity-30 z-10 ripple"
                style={{ animationDelay: '2s' }}
              ></motion.div>
            </motion.div>
          </div>
        </section>

        {/* SECOND SECTION - ASYMMETRIC BENEFITS */}
        <section className="relative w-full overflow-hidden pb-10">
          {/* Animated background */}
          <div className="absolute inset-0 bg-white z-0"></div>

          {/* SVG Blob Animation */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <svg className="absolute top-0 right-0 w-[600px] h-[600px] text-[#2b5356]/10 opacity-30 -translate-y-1/4 translate-x-1/4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" className="animated-blob" d="M24.4,-30.7C31.2,-25.3,36.1,-17.1,39.2,-7.7C42.3,1.8,43.5,12.5,39.2,20.6C34.9,28.6,25.1,34,14.5,37.9C3.9,41.8,-7.5,44.1,-17.2,41C-26.9,37.9,-34.9,29.5,-38.6,19.7C-42.3,9.9,-41.8,-1.2,-38.8,-11.2C-35.8,-21.2,-30.4,-30,-22.8,-35.2C-15.1,-40.3,-5.3,-41.9,2.1,-44.6C9.6,-47.3,17.6,-36.1,24.4,-30.7Z" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-[500px] h-[500px] text-[#0096b1]/10 opacity-30 translate-y-1/4 -translate-x-1/4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" className="animated-blob" style={{ animationDelay: "-5s" }} d="M24.4,-30.7C31.2,-25.3,36.1,-17.1,39.2,-7.7C42.3,1.8,43.5,12.5,39.2,20.6C34.9,28.6,25.1,34,14.5,37.9C3.9,41.8,-7.5,44.1,-17.2,41C-26.9,37.9,-34.9,29.5,-38.6,19.7C-42.3,9.9,-41.8,-1.2,-38.8,-11.2C-35.8,-21.2,-30.4,-30,-22.8,-35.2C-15.1,-40.3,-5.3,-41.9,2.1,-44.6C9.6,-47.3,17.6,-36.1,24.4,-30.7Z" />
            </svg>
          </div>
          {/* Floating particles */}
          <div className="floating-particle w-4 h-4 bg-[#2b5356]/40 top-[15%] left-[10%]" style={{ animationDelay: "0s" }}></div>
          <div className="floating-particle w-6 h-6 bg-[#0096b1]/40 top-[25%] right-[15%]" style={{ animationDelay: "1s" }}></div>
          <div className="floating-particle w-3 h-3 bg-[#2b5356]/30 top-[60%] left-[20%]" style={{ animationDelay: "2s" }}></div>
          <div className="floating-particle w-5 h-5 bg-[#eb7e37]/40 bottom-[20%] right-[10%]" style={{ animationDelay: "3s" }}></div>
          <div className="floating-particle w-7 h-7 bg-[#0096b1]/30 bottom-[30%] left-[30%]" style={{ animationDelay: "4s" }}></div>

          {/* Rotating shapes */}
          <div className="rotating-shape top-[30%] right-[25%]" style={{ animationDirection: "reverse" }}>
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0L61.2245 38.8909L100 50L61.2245 61.1091L50 100L38.7755 61.1091L0 50L38.7755 38.8909L50 0Z" fill="url(#gradient1)" fillOpacity="0.3" />
              <defs>
                <linearGradient id="gradient1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2b5356" />
                  <stop offset="1" stopColor="#0096b1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="rotating-shape bottom-[15%] left-[15%]">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0L93.3013 25L93.3013 75L50 100L6.69873 75L6.69873 25L50 0Z" fill="url(#gradient2)" fillOpacity="0.3" />
              <defs>
                <linearGradient id="gradient2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0096b1" />
                  <stop offset="1" stopColor="#eb7e37" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* THÔNG TIN MỚI (dynamic, managed from admin /admin/announcements) */}
          <AnnouncementsSection />

          <div className="max-w-6xl mx-auto px-4 relative z-10 py-10">

            {/* Main benefits - Staggered cards */}
            <motion.div
              className="text-center py-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-4xl font-bold inline-flex items-center gap-3 bg-gradient-to-r from-[#2b5356] via-[#0096b1] to-[#eb7e37] text-transparent bg-clip-text min-h-[3rem] leading-relaxed">
                <span className="animate-pulse text-[#2b5356]">✨</span>
                Phù hợp cho
                <span className="animate-pulse text-[#eb7e37]">✨</span>
              </h2>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInBottom}
              className="flex flex-col md:flex-row items-center gap-10 px-4 py-5 max-w-6xl mx-auto relative mb-10 mt-5 rounded-xl
                before:absolute before:inset-0 before:border-t-2 before:border-b-2 before:border-[#0096b1] before:scale-x-0 before:transition-transform before:duration-500 hover:before:scale-x-100 before:rounded-xl
                after:absolute after:inset-0 after:border-l-2 after:border-r-2 after:border-[#0096b1] after:scale-y-0 after:transition-transform after:duration-500 hover:after:scale-y-100 after:rounded-xl
                bg-gradient-to-r from-transparent via-[#0096b1]/5 to-transparent
                backdrop-blur-sm
                shadow-[0_0_15px_rgba(235,126,55,0.1)]
                hover:shadow-[0_0_25px_rgba(235,126,55,0.2)]
                transition-all duration-500"
            >

              {/* Left side - Student Image */}
              <div className="w-full md:w-1/2">
                <img
                  src="/img/hp3.webp"
                  alt="Student studying IELTS online"
                  className="rounded-lg shadow-lg w-full h-auto"
                />
              </div>

              {/* Right side - User Types */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      title: "Người mới luyện thi IELTS.",
                      desc: "Làm quen với hình thức thi, giao diện và các dạng câu hỏi thường gặp.",
                      icon: "🎯"
                    },
                    {
                      title: "Người thi lại 1 kỹ năng IELTS.",
                      desc: "Các bài thi riêng biệt cho từng kỹ năng, tập trung vào điểm yếu cần cải thiện.",
                      icon: "🔄"
                    },
                    {
                      title: "Người hướng tới tăng điểm IELTS cao nhanh chóng.",
                      desc: "Phân tích chi tiết từng câu trả lời, cung cấp mẫu câu đạt điểm cao để tham khảo.",
                      icon: "📈"
                    },
                    {
                      title: "Người muốn trúng đề thi IELTS.",
                      desc: "Làm quen với những dạng đề \"dễ được luyện chọn, nắm vững các chủ đề thường xuất hiện trong đề thi, rút gọn thời gian và công sức khi học.",
                      icon: "🎯"
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      variants={{
                        visible: { opacity: 1, y: 0 },
                        hidden: { opacity: 0, y: 20 }
                      }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative overflow-hidden rounded-lg bg-white p-3 shadow-[0_0_10px_rgba(43,83,86,0.1)] hover:shadow-[0_0_15px_rgba(43,83,86,0.2)] transition-all duration-300"
                    >
                      {/* Decorative gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2b5356]/5 via-transparent to-[#0096b1]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Content */}
                      <div className="relative flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#2b5356] to-[#0096b1] text-white text-base transform group-hover:scale-110 transition-transform duration-300">
                          {item.icon}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-semibold text-[#2b5356] text-sm group-hover:text-[#0096b1] transition-colors duration-300 truncate">
                            {item.title}
                          </h4>
                          <p className="text-gray-600 text-sm line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>


            {/* Horizontal scrolling user types */}

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                scale: {
                  type: "spring",
                  damping: 25,
                  stiffness: 100
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 mt-20 pt-10 bg-gradient-to-r from-[#2b5356]/5 to-[#0096b1]/5 rounded-2xl p-8 border-l-4 border-[#eb7e37]">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={slideRight}
                  className="md:col-span-2"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-10 text-[#2b5356]">
                    Hệ thống thi ielts trên máy được phát triển bởi đội ngũ <span className="text-[#0096b1] font-bold"><i className='text-[#eb7e37]'>IELTS</i> <i className='text-[#0096b1]'>TAJUN</i></span>
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
                    <div className="absolute inset-0 bg-gradient-to-r from-[#e49257] to-[#349caf] rounded-full blur-md transform rotate-12"></div>
                    <div className="relative z-10 py-3 px-6 bg-white rounded-full shadow-md text-lg font-semibold text-gray-700">
                      98% thí sinh cải thiện band sau <span className="text-[#0096b1]">2 tuần</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerFaster}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16"
            >
              <motion.div
                variants={scaleIn}
                className="md:col-span-4 md:col-start-1 benefit-card bg-white rounded-2xl shadow-lg p-6 md:p-8"
                style={{ "--glow-color": "rgba(43, 83, 86, 0.3)" }}
              >
                <div className="card-decoration top-[-50px] right-[-50px] w-[150px] h-[150px]" style={{ "--start-color": "#2b5356", "--end-color": "#1e3c3e" }}></div>
                <div className="card-decoration bottom-[-70px] left-[-40px] w-[170px] h-[170px]" style={{ "--start-color": "#2b5356", "--end-color": "#1e3c3e" }}></div>
                <div className="card-glow"></div>

                <div className="card-icon-container rounded-full bg-[#2b5356]/10 w-16 h-16 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-[#2b5356]/20 rounded-full opacity-50 floating-decoration" style={{ animationDelay: "0.2s" }}></div>
                  <svg className="w-8 h-8 text-[#2b5356] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 relative">
                  Thi thật tại nhà, giống kỳ thi chính thức
                  <span className="absolute -left-2 top-1/2 w-1 h-6 bg-[#2b5356] -translate-y-1/2 rounded-full"></span>
                </h3>
                <p className="text-gray-600">Trải nghiệm thi hoàn toàn giống với kỳ thi IELTS chính thức với giao diện được tái hiện chính xác, giúp bạn làm quen với môi trường thi thật.</p>

                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center text-sm font-medium text-[#2b5356]">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </motion.div>

              <motion.div
                variants={scaleIn}
                className="md:col-span-4 benefit-card bg-white rounded-2xl shadow-lg p-6 md:p-8"
                style={{ "--glow-color": "rgba(0, 150, 177, 0.3)" }}
              >
                <div className="card-decoration top-[-40px] left-[-50px] w-[150px] h-[150px]" style={{ "--start-color": "#0096b1", "--end-color": "#007a91" }}></div>
                <div className="card-decoration bottom-[-50px] right-[-70px] w-[170px] h-[170px]" style={{ "--start-color": "#0096b1", "--end-color": "#007a91" }}></div>
                <div className="card-glow"></div>

                <div className="card-icon-container rounded-full bg-[#0096b1]/10 w-16 h-16 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-[#0096b1]/20 rounded-full opacity-50 floating-decoration" style={{ animationDelay: "0.5s" }}></div>
                  <svg className="w-8 h-8 text-[#0096b1] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 relative">
                  Đề thi gốc từ ngân hàng đề chính thức
                  <span className="absolute -left-2 top-1/2 w-1 h-6 bg-[#0096b1] -translate-y-1/2 rounded-full"></span>
                </h3>
                <p className="text-gray-600">Làm quen với dạng đề thi gốc được biên soạn từ đội ngũ chuyên gia IELTS, mang đến trải nghiệm thi thật nhất có thể.</p>

                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center text-sm font-medium text-[#0096b1]">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </motion.div>

              <motion.div
                variants={scaleIn}
                className="md:col-span-4 benefit-card bg-white rounded-2xl shadow-lg p-6 md:p-8"
                style={{ "--glow-color": "rgba(235, 126, 55, 0.3)" }}
              >
                <div className="card-decoration top-[-60px] right-[-30px] w-[160px] h-[160px]" style={{ "--start-color": "#eb7e37", "--end-color": "#d86a25" }}></div>
                <div className="card-decoration bottom-[-40px] left-[-60px] w-[150px] h-[150px]" style={{ "--start-color": "#eb7e37", "--end-color": "#d86a25" }}></div>
                <div className="card-glow"></div>

                <div className="card-icon-container rounded-full bg-[#eb7e37]/10 w-16 h-16 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-[#eb7e37]/20 rounded-full opacity-50 floating-decoration" style={{ animationDelay: "0.7s" }}></div>
                  <svg className="w-8 h-8 text-[#eb7e37] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 relative">
                  Tăng khả năng trúng tủ, nâng band hiệu quả
                  <span className="absolute -left-2 top-1/2 w-1 h-6 bg-[#eb7e37] -translate-y-1/2 rounded-full"></span>
                </h3>
                <p className="text-gray-600">Làm quen với nhiều dạng đề, câu hỏi và chủ đề thường gặp, giúp bạn tăng khả năng "trúng tủ" và đạt điểm cao trong kỳ thi thật.</p>

                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center text-sm font-medium text-[#eb7e37]">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Final CTA Banner */}

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInBottom}
              className="relative bg-gradient-to-br from-[#2b5356] to-[#0096b1] text-white rounded-lg mx-4 md:mx-auto max-w-5xl overflow-hidden shadow-xl"
            >
              <div className="absolute right-0 top-0 w-1/3 h-full opacity-30">
                <svg viewBox="0 0 200 450" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                  <path d="M190,20 L180,40 L160,35 L150,60 L120,70 L110,95 L80,90 L40,110 L20,140 L40,170 L30,220 L10,250 L30,280 L20,320 L50,350 L40,380 L70,410 L100,400 L140,430 L190,410 L170,380 L200,340 L190,300 L160,290 L180,250 L170,210 L190,190 L170,150 L150,130 L170,90 L190,70 L180,40 L190,20" fill="none" stroke="rgba(235,126,55,0.6)" strokeWidth="2" />
                </svg>
              </div>

              <div className="p-8 md:p-12 flex flex-col md:flex-row items-center">
                <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Thi thử miễn phí ngay hôm nay!</h3>
                  <p className="text-white/90 mb-6">Bắt đầu hành trình chinh phục IELTS của bạn với trải nghiệm thi thử miễn phí. Không giới hạn thời gian, không cần thẻ tín dụng.</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a href="/listening_list">
                      <button className="px-6 py-3 bg-[#eb7e37] text-white font-bold rounded-lg hover:bg-[#eb7e37]/90 transition-colors shadow-lg hover:shadow-xl">Bắt đầu thi thử</button>
                    </a>
                  </div>
                </div>

                <div className="md:w-1/3 relative">
                  <div className="relative bg-white/15 backdrop-blur-sm p-4 rounded-lg border border-white/30 shadow-lg">
                    <div className="relative bg-[#2b5356] rounded-t-lg p-2 flex justify-between items-center">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#eb7e37]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#0096b1]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#2b5356]"></div>
                      </div>
                      <span className="text-xs text-gray-200">IELTS Computer Test</span>
                    </div>
                    <div className="bg-white rounded-b-lg p-3">
                      <div className="text-gray-800 text-sm font-mono mb-2">
                        <span> </span>
                        <span className="text-[#2b5356]">Your IELTS test is ready...</span>
                      </div>
                      <div className="text-gray-800 text-sm font-mono mb-2">
                        <span> </span>
                        <span className="text-[#0096b1]">Starting test...</span>
                      </div>
                      <div className="text-gray-800 text-sm font-mono">
                        <span> </span>
                        <span className="text-[#2b5356]">Time remaining: 60:00</span>
                        <span className="type-cursor inline-block w-2 h-4 ml-1 bg-[#eb7e37]"></span>
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

      {/* Floating instruction icon — links to /instruction */}
      <FloatingInstructionIcon />

      {/* Floating achievement icon — links to /achievements (moved from page body) */}
      <FloatingAchievementIcon />

    </div>
  );
};

export default HomePage;
