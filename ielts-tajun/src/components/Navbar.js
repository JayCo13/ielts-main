import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PhoneCall, User, Menu, X } from 'lucide-react';
import { logout } from '../utils/authUtils';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [userEmail, setUserEmail] = useState(localStorage.getItem('email'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const dropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

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
            const response = await fetch('http://localhost:8000/customer/vip/subscription/status', {
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
            const profileResponse = await fetch('http://localhost:8000/student/profile', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const profileData = await profileResponse.json();
            
            if (profileResponse.ok && profileData) {
                setUserEmail(profileData.email);
                setUsername(profileData.username);
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`flex justify-between items-center w-full mx-auto sticky top-0 z-50 transition-all duration-300 ${
                isScrolled ? 'py-0.5 bg-white/90 backdrop-blur-md shadow-lg' : 'py-2 bg-white'
            }`}
        >
            <div className="max-w-7xl w-full mx-auto px-4 flex justify-between items-center">
                <div className={`w-32 flex items-center transition-all duration-300 ${
                    isScrolled ? 'scale-75' : 'scale-100'
                }`}>
                    <Link to="/">
                        <img src="/img/logo-ielts.png" alt="IELTS Prep Logo" className="w-full object-contain" />
                    </Link>
                </div>
                
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center">
                    {[
                        { name: 'Trang chủ', path: '/' },
                        { name: 'Listening', path: '/listening_list' },
                        { name: 'Reading', path: '/reading_list' },
                        { name: 'Writing', path: '/writing_list' },
                        { name: 'Speaking', path: '/speaking_list' }
                    ].map((item) => (
                        <Link 
                            key={item.path}
                            to={item.path} 
                            className={`relative px-5 py-2.5 rounded-lg text-base font-medium transition-all duration-200 ${
                                isActive(item.path) 
                                    ? 'text-green-600 bg-green-50' 
                                    : 'text-gray-700 hover:text-green-600 hover:bg-green-50/50'
                            }`}
                        >
                            {item.name}
                            {isActive(item.path) && (
                                <motion.span 
                                    layoutId="navbar-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-green-600 mx-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>
                
                <div className="flex items-center space-x-4">
                    {/* User Role Badge */}
                    {username && (
                        <div className="hidden sm:flex items-center">
                            {localStorage.getItem('role') === 'student' ? (
                                <div className="bg-gradient-to-r from-green-400 to-green-600 text-white text-base font-medium px-3.5 py-1.5 rounded-full shadow-sm flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                    </svg>
                                    Student
                                </div>
                            ) : (
                                <Link to="/my-vip-package">
                                    {subscriptionStatus?.package_name ? (
                                        <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-base font-medium px-3.5 py-1.5 rounded-full shadow-sm flex items-center">
                                            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                            </svg>
                                            {subscriptionStatus.package_name}
                                        </div>
                                    ) : (
                                        <div className="bg-gradient-to-r from-gray-400 to-gray-600 text-white text-base font-medium px-3.5 py-1.5 rounded-full shadow-sm flex items-center hover:from-amber-400 hover:to-amber-600 transition-all duration-300">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Đăng Ký VIP
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
                            className={`flex items-center gap-2 cursor-pointer rounded-full p-2 transition-all duration-200 ${
                                isUserMenuOpen ? 'bg-green-50 text-green-600' : 'hover:bg-gray-100'
                            }`}
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        >
                            {username ? (
                                <>
                                    <div className="hidden sm:flex h-9 w-9 rounded-full bg-green-100 text-green-600 items-center justify-center font-medium text-base">
                                        {username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden sm:block text-base font-medium">{username}</span>
                                </>
                            ) : (
                                <User className="w-6 h-6" />
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
                                                    <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-lg">
                                                        {username.charAt(0).toUpperCase()}
                                                    </div>
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
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                                    <span>My Profile</span>
                                                </Link>
                                                
                                                {localStorage.getItem('role') !== 'student' && (
                                                    <Link
                                                        to="/my-vip-package"
                                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors"
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
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                                                </svg>
                                                <span>Login</span>
                                            </Link>
                                            <Link
                                                to="/register"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors"
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
                    
                    {/* Mobile menu button */}
                    <button
                        className="md:hidden rounded-full p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>
            
            {/* Mobile menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        ref={mobileMenuRef}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden bg-white w-full absolute top-full left-0 border-t border-gray-100 shadow-lg z-40"
                    >
                        <div className="max-w-7xl mx-auto px-4 py-2">
                            <div className="flex flex-col space-y-1">
                                {[
                                    { name: 'Trang chủ', path: '/' },
                                    { name: 'Listening', path: '/listening_list' },
                                    { name: 'Reading', path: '/reading_list' },
                                    { name: 'Writing', path: '/writing_list' },
                                    { name: 'Speaking', path: '/speaking_list' }
                                ].map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`px-4 py-3 rounded-lg text-base ${
                                            isActive(item.path)
                                                ? 'bg-green-50 text-green-600 font-medium'
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                                {!username && (
                                    <div className="pt-2 border-t border-gray-100 mt-2">
                                        <Link
                                            to="/login"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-medium"
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
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;