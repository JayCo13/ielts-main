import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PhoneCall, User, Menu, X, Lock } from 'lucide-react';
import { logout } from '../utils/authUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config/api';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [userEmail, setUserEmail] = useState(localStorage.getItem('email'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [menuMaxHeight, setMenuMaxHeight] = useState('80vh');
    const dropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const navRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [isSpeakingOpen, setIsSpeakingOpen] = useState(false);
    const [isWritingOpen, setIsWritingOpen] = useState(false);
    const [isListeningOpen, setIsListeningOpen] = useState(false);
    const [isReadingOpen, setIsReadingOpen] = useState(false);
    const [isVocabularyOpen, setIsVocabularyOpen] = useState(false);

    useEffect(() => {
        if (username) {
            fetchSubscriptionStatus();
        }
    }, [username]);

    useEffect(() => {
        const storedEmail = localStorage.getItem('email');
        if (storedEmail) {
            setUserEmail(storedEmail);
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchSubscriptionStatus = async () => {
        try {
            const response = await fetch(`${API_BASE}/customer/vip/subscription/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Raw API response:', data);

            if (response.ok && data) {
                console.log('Setting subscription status:', {
                    is_active: data.is_active,
                    package_name: data.package_name,
                    payment_status: data.payment_status
                });
                setSubscriptionStatus(data);
            } else {
                console.error('Invalid response:', data);
                setSubscriptionStatus(null);
            }
        } catch (error) {
            console.error('Error fetching subscription status:', error);
            setSubscriptionStatus(null);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const profileResponse = await fetch(`${API_BASE}/student/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const profileData = await profileResponse.json();

            if (profileResponse.ok && profileData) {
                setUserEmail(profileData.email);
                setUsername(profileData.username);
                setAvatarUrl(profileData.image_url || null);
                // Sync role from server to localStorage to prevent tampering
                if (profileData.role) {
                    localStorage.setItem('role', profileData.role);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    useEffect(() => {
        if (localStorage.getItem('token')) {
            fetchUserProfile();
            fetchSubscriptionStatus();
        }
    }, []);

    // Size the open mobile menu to exactly the space below the navbar so its
    // last item (Sign out) is always reachable, regardless of navbar height or
    // mobile browser chrome.
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const computeMenuHeight = () => {
            const navEl = navRef.current;
            if (!navEl) return;
            const bottom = navEl.getBoundingClientRect().bottom;
            setMenuMaxHeight(`${Math.max(160, window.innerHeight - bottom - 8)}px`);
        };
        computeMenuHeight();
        window.addEventListener('resize', computeMenuHeight);
        return () => window.removeEventListener('resize', computeMenuHeight);
    }, [isMobileMenuOpen]);

    const handleSignOut = () => {
        localStorage.removeItem('email');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('token');
        setUserEmail(null);
        setUsername(null);
        logout();
        navigate('/');
    };

    // Check if the current path matches the link path
    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    return (
        <motion.nav
            ref={navRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`flex justify-between items-center w-full mx-auto sticky top-0 transition-all duration-300 ${isMobileMenuOpen ? 'z-[1000]' : 'z-50'
                } ${isScrolled ? 'py-0.5 bg-[#0096b1]/80 backdrop-blur-md shadow-lg' : 'py-2 bg-[#0096b1]'
                }`}
        >
            <div className="max-w-7xl w-full mx-auto px-4 flex justify-between items-center relative z-50">
                <div className={`w-20 md:w-32 flex items-center transition-all duration-300 ${isScrolled ? 'scale-90 md:scale-75' : 'scale-100'
                    }`}>
                    <Link to="/">
                        <img src="/img/logo-ielts.png" alt="IELTS Prep Logo" className="w-full object-contain" />
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center">
                    {[
                        { name: 'Trang chủ', path: '/' },
                    ].map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`relative px-5 py-2.5 rounded-lg text-lg font-bold transition-all duration-200 ${isActive(item.path)
                                ? 'text-[#ffffff] bg-[#ffffff]/50'
                                : 'text-[#ffffff] hover:text-[#ffffff]/700 hover:bg-[#ffffff]/10'
                                }`}
                        >
                            {item.name}
                            {isActive(item.path) && (
                                <motion.span
                                    layoutId="navbar-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffffff] mx-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                        </Link>
                    ))}

                    <div
                        className="relative"
                        onMouseEnter={() => setIsReadingOpen(true)}
                        onMouseLeave={() => setIsReadingOpen(false)}
                    >
                        <button
                            className={`px-5 py-2.5 rounded-lg text-lg font-bold text-white hover:bg-white/10 transition-all duration-200 ${isActive('/reading_list') ? 'bg-white/50' : ''}`}
                        >
                            Reading
                        </button>
                        <AnimatePresence>
                            {isReadingOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                                >
                                    <Link
                                        to="/reading_list"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsReadingOpen(false)}
                                    >
                                        Full Test
                                    </Link>
                                    <Link
                                        to="/reading_forecast"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsReadingOpen(false)}
                                    >
                                        Forecast
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div
                        className="relative"
                        onMouseEnter={() => setIsListeningOpen(true)}
                        onMouseLeave={() => setIsListeningOpen(false)}
                    >
                        <button
                            className={`px-5 py-2.5 rounded-lg text-lg font-bold text-white hover:bg-white/10 transition-all duration-200 ${isActive('/listening_list') ? 'bg-white/50' : ''}`}
                        >
                            Listening
                        </button>
                        <AnimatePresence>
                            {isListeningOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                                >
                                    <Link
                                        to="/listening_list"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsListeningOpen(false)}
                                    >
                                        Full Test
                                    </Link>
                                    <Link
                                        to="/listening_forecast"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsListeningOpen(false)}
                                    >
                                        Forecast
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div
                        className="relative"
                        onMouseEnter={() => setIsWritingOpen(true)}
                        onMouseLeave={() => setIsWritingOpen(false)}
                    >
                        <button
                            className={`px-5 py-2.5 rounded-lg text-lg font-bold text-white hover:bg-white/10 transition-all duration-200 ${isActive('/writing_list') ? 'bg-white/50' : ''}`}
                        >
                            Writing
                        </button>
                        <AnimatePresence>
                            {isWritingOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                                >
                                    <Link
                                        to="/writing_list"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsWritingOpen(false)}
                                    >
                                        Writing Full Test
                                    </Link>
                                    <Link
                                        to="/writing_forecast?part=part1"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsWritingOpen(false)}
                                    >
                                        Writing Forecast Task 1
                                    </Link>
                                    <Link
                                        to="/writing_forecast?part=part2"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsWritingOpen(false)}
                                    >
                                        Writing Forecast Task 2
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Link
                        to="/speaking_list?part=part1"
                        className={`px-5 py-2.5 rounded-lg text-lg font-bold text-white hover:bg-white/10 transition-all duration-200 ${isActive('/speaking_list') ? 'bg-white/50' : ''}`}
                    >
                        Speaking
                    </Link>

                    <div
                        className="relative"
                        onMouseEnter={() => setIsVocabularyOpen(true)}
                        onMouseLeave={() => setIsVocabularyOpen(false)}
                    >
                        <button
                            className={`px-5 py-2.5 rounded-lg text-lg font-bold text-white hover:bg-white/10 transition-all duration-200 ${isActive('/dictation') || isActive('/new-vocabulary') ? 'bg-white/50' : ''}`}
                        >
                            Vocabulary
                        </button>
                        <AnimatePresence>
                            {isVocabularyOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                                >
                                    <Link
                                        to="/new-vocabulary"
                                        className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                        onClick={() => setIsVocabularyOpen(false)}
                                    >
                                        New Words
                                    </Link>
                                    {localStorage.getItem('role') === 'student' ? (
                                        <Link
                                            to="/dictation"
                                            className="flex items-center px-4 py-3 text-md font-bold text-gray-700 rounded-lg hover:bg-[#0096b1]/10 hover:text-[#0096b1] transition-all duration-200"
                                            onClick={() => setIsVocabularyOpen(false)}
                                        >
                                            <span className="flex-1">Student Only</span>
                                        </Link>
                                    ) : (
                                        <div
                                            className="flex items-center justify-between px-4 py-3 text-md font-bold text-gray-400 bg-gray-100/50 rounded-lg cursor-not-allowed border border-transparent hover:border-gray-200 transition-all duration-200 group"
                                            title="Tính năng dành riêng cho học viên"
                                        >
                                            <span>Student Only</span>
                                            <div className="bg-gray-200 p-1.5 rounded-md group-hover:bg-gray-300 transition-colors">
                                                <Lock className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {/* User Role Badge */}
                    {username && (
                        <div className="hidden sm:flex items-center">
                            {localStorage.getItem('role') === 'student' ? (
                                <div className="bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/20">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                    </svg>
                                    <span>Student</span>
                                </div>
                            ) : (
                                <Link to="/my-vip-package" className="group relative">
                                    {subscriptionStatus?.is_subscribed ? (
                                        <div className="relative flex items-center justify-center transition-transform duration-300 hover:scale-110">
                                            {/* Hexagon Badge SVG */}
                                            <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg filter">
                                                <defs>
                                                    <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#FBbf24" /> {/* Amber 400 */}
                                                        <stop offset="50%" stopColor="#F59E0B" /> {/* Amber 500 */}
                                                        <stop offset="100%" stopColor="#D97706" /> {/* Amber 600 */}
                                                    </linearGradient>
                                                    <filter id="glow">
                                                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                                        <feMerge>
                                                            <feMergeNode in="coloredBlur" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                </defs>

                                                {/* Ribbons */}
                                                <path d="M20 75 L10 95 L30 85 L50 95 L40 75 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" transform="translate(-5, 0) rotate(-15 40 75)" />
                                                <path d="M80 75 L90 95 L70 85 L50 95 L60 75 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" transform="translate(5, 0) rotate(15 60 75)" />

                                                {/* Hexagon Body */}
                                                <path d="M50 5 L90 25 L90 65 L50 85 L10 65 L10 25 Z" fill="url(#badgeGradient)" stroke="#FFF" strokeWidth="2" />

                                                {/* Inner Detail */}
                                                <path d="M50 12 L82 28 L82 60 L50 76 L18 60 L18 28 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

                                                {/* Letter */}
                                                <text x="50" y="52" dominantBaseline="central" textAnchor="middle" fill="white" fontFamily="serif" fontSize="26" fontWeight="bold" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                                                    VIP
                                                </text>
                                            </svg>

                                            {/* Hover info for remaining days */}
                                            <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                                {subscriptionStatus.days_remaining} ngày còn lại
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg border border-white/20 hover:bg-amber-500 hover:border-amber-500 transition-all duration-200">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1z" />
                                            </svg>
                                            <span className="text-sm font-medium">Nâng cấp VIP</span>
                                        </div>
                                    )}
                                </Link>
                            )}
                        </div>
                    )}

                    {/* User Menu */}
                    <div ref={dropdownRef} className="relative">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex items-center gap-2 cursor-pointer rounded-full p-2 transition-all duration-200 ${isUserMenuOpen ? 'bg-[#ffffff]/16 text-white' : 'hover:bg-[#ffffff]/15'
                                }`}
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        >
                            {username ? (
                                <>
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={username}
                                            onError={() => setAvatarUrl(null)}
                                            className="hidden sm:block h-11 w-11 lg:h-12 lg:w-12 rounded-full object-cover border border-white/30"
                                        />
                                    ) : (
                                        <div className="hidden sm:flex h-11 w-11 lg:h-12 lg:w-12 rounded-full bg-[#ffffff]/15 text-white items-center justify-center font-medium text-lg">
                                            {username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="hidden sm:block text-base font-medium text-white">{username}</span>
                                </>
                            ) : (
                                <User className="w-7 h-7 text-white" strokeWidth={2} />
                            )}
                        </motion.div>

                        <AnimatePresence>
                            {isUserMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                                >
                                    {/* User dropdown content */}
                                    {username ? (
                                        <>
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    {avatarUrl ? (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={username}
                                                            onError={() => setAvatarUrl(null)}
                                                            className="h-12 w-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 rounded-full bg-[#0096b1]/5 text-[#0096b1] flex items-center justify-center font-bold text-lg">
                                                            {username.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-800">{username}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {localStorage.getItem('role') === 'student' ? 'Student Account' : userEmail}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="py-1 px-2">
                                                <Link
                                                    to="/profile"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-[#0096b1]/10 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                                    <span>My Profile</span>
                                                </Link>
                                                <Link
                                                    to="/exam-history"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-[#0096b1]/10 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                    <span>Lịch sử bài làm</span>
                                                </Link>
                                                {localStorage.getItem('role') !== 'student' && (
                                                    <Link
                                                        to="/my-vip-package"
                                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-[#0096b1]/10 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                                        </svg>
                                                        <span>My VIP Package</span>
                                                    </Link>
                                                )}
                                            </div>

                                            <div className="border-t border-gray-100 mt-1 pt-1 px-2">
                                                <button
                                                    onClick={handleSignOut}
                                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                                    </svg>
                                                    <span>Sign out</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                to="/login"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#0096b1]/10 transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                                                </svg>
                                                <span>Login</span>
                                            </Link>
                                            <Link
                                                to="/register"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#0096b1]/10 transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                                                </svg>
                                                <span>Register</span>
                                            </Link>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile menu buttons */}
                    <div className="flex md:hidden items-center gap-2">                        {/* Mobile menu button */}
                        <button
                            className="rounded-full p-2 text-white hover:bg-gray-400 transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={25} strokeWidth={2.5} /> : <Menu size={25} strokeWidth={2.5} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop: dims + blocks everything below the navbar (floating icons, ads) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden fixed inset-0 top-0 bg-black/40 z-40"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            ref={mobileMenuRef}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            style={{ maxHeight: menuMaxHeight }}
                            className="md:hidden bg-white w-full absolute top-full left-0 border-t border-gray-100 shadow-lg z-50 overflow-y-auto overscroll-contain"
                        >
                        <div className="max-w-7xl mx-auto px-4 py-2">
                            <div className="flex flex-col space-y-1">
                                {[
                                    { name: 'Trang chủ', path: '/' },
                                    { name: 'Listening – Full Test', path: '/listening_list' },
                                    { name: 'Listening – Forecast', path: '/listening_forecast' },
                                    { name: 'Reading – Full Test', path: '/reading_list' },
                                    { name: 'Reading – Forecast', path: '/reading_forecast' },
                                    { name: 'Writing – Full Test', path: '/writing_list' },
                                    { name: 'Writing – Forecast Task 1', path: '/writing_forecast?part=part1' },
                                    { name: 'Writing – Forecast Task 2', path: '/writing_forecast?part=part2' },
                                    { name: 'Speaking', path: '/speaking_list?part=part1' },
                                    // Chép chính tả: students only — hide for customer/anonymous accounts
                                    ...(localStorage.getItem('role') === 'student'
                                        ? [{ name: 'Chép chính tả', path: '/dictation' }]
                                        : []),
                                    { name: 'Từ vựng mới', path: '/new-vocabulary' }
                                ].map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`px-4 py-2.5 rounded-lg text-base ${isActive(item.path)
                                            ? 'bg-[#0096b1]/5 text-[#0096b1] font-medium'
                                            : 'text-gray-700 hover:bg-[#0096b1]/5'}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.name}
                                    </Link>
                                ))}

                                {/* User options for logged-in users */}
                                {username && (
                                    <div className="pt-2 border-t border-gray-100 mt-2">
                                        <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg mb-2">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={username}
                                                    onError={() => setAvatarUrl(null)}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 bg-[#0096b1] rounded-full flex items-center justify-center">
                                                    <User size={16} className="text-white" />
                                                </div>
                                            )}
                                            <span className="font-medium">{username}</span>
                                        </div>

                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#0096b1]/10 rounded-lg transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            <span>My Profile</span>
                                        </Link>

                                        <Link
                                            to="/exam-history"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#0096b1]/10 rounded-lg transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            <span>Lịch sử bài làm</span>
                                        </Link>

                                        <Link
                                            to="/vip-package"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#0096b1]/10 rounded-lg transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                                            </svg>
                                            <span>My VIP Package</span>
                                        </Link>

                                        <button
                                            onClick={() => {
                                                handleSignOut();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
                                        >
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                                            </svg>
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                )}

                                {/* Login/Register for non-logged-in users */}
                                {!username && (
                                    <div className="pt-2 border-t border-gray-100 mt-2">
                                        <Link
                                            to="/login"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 text-gray-700 bg-[#0096b1]/90 hover:bg-[#0096b1]/80 rounded-lg font-medium"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                                            </svg>
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 text-gray-700 border border-gray-300 rounded-lg font-medium"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                                            </svg>
                                            Register
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
