import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home, Crown, Star, Sparkles, Zap, BookOpen, Mic, Lightbulb, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE } from '../config/api';

const VIPPackages = () => {
    const [packages, setPackages] = useState([]);
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const [activeFilter, setActiveFilter] = useState(searchParams.get('type') || 'all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const packagesPerPage = 6;
    const navigate = useNavigate();

    const skillNames = {
        listening: 'Nghe',
        reading: 'Đọc',
        writing: 'Viết',
        speaking: 'Nói'
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_BASE}/customer/vip/packages/available`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setPackages(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (packageId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        navigate('/payment', {
            state: {
                packageId: packageId,
                package: packages.find(p => p.package_id === packageId)
            }
        });
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        const newSearchParams = new URLSearchParams(location.search);
        if (filter === 'all') {
            newSearchParams.delete('type');
        } else {
            newSearchParams.set('type', filter);
        }
        navigate({ search: newSearchParams.toString() });
    };

    // Modern filter component
    const FilterSection = () => (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 flex justify-center items-center"
        >
            <motion.div variants={item} className="flex flex-wrap gap-4 justify-center items-center">
                <motion.button
                    variants={item}
                    onClick={() => handleFilterChange('all')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300
                        ${activeFilter === 'all'
                            ? 'bg-gradient-to-r from-[#34d399] to-[#10b981] text-white shadow-lg shadow-indigo-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                    <Globe className="w-5 h-5" />
                    <span>Tất cả kỹ năng</span>
                </motion.button>
                {['listening', 'reading', 'writing', 'speaking'].map(skill => (
                    <motion.button
                        key={skill}
                        variants={item}
                        onClick={() => handleFilterChange(skill)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300
                            ${activeFilter === skill
                                ? 'bg-gradient-to-r from-[#34d399] to-[#10b981] text-white shadow-lg shadow-indigo-200'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        {skill === 'listening' && <Mic className="w-5 h-5" />}
                        {skill === 'reading' && <BookOpen className="w-5 h-5" />}
                        {skill === 'writing' && <Lightbulb className="w-5 h-5" />}
                        {skill === 'speaking' && <Star className="w-5 h-5" />}
                        <span>{skillNames[skill]}</span>
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    );

    // Modern package card
    const PackageCard = ({ pkg, index }) => {
        const getPackageStyle = () => {
            if (pkg.package_type === 'all_skills') {
                return {
                    gradient: 'from-violet-500 to-fuchsia-500',
                    icon: Globe,
                    badge: 'bg-violet-100 text-violet-600'
                };
            }
            switch (pkg.skill_type) {
                case 'listening':
                    return {
                        gradient: 'from-blue-500 to-cyan-500',
                        icon: Mic,
                        badge: 'bg-blue-100 text-blue-600'
                    };
                case 'reading':
                    return {
                        gradient: 'from-emerald-500 to-teal-500',
                        icon: BookOpen,
                        badge: 'bg-emerald-100 text-emerald-600'
                    };
                case 'writing':
                    return {
                        gradient: 'from-amber-500 to-orange-500',
                        icon: Lightbulb,
                        badge: 'bg-amber-100 text-amber-600'
                    };
                case 'speaking':
                    return {
                        gradient: 'from-rose-500 to-pink-500',
                        icon: Star,
                        badge: 'bg-rose-100 text-rose-600'
                    };
                default:
                    return {
                        gradient: 'from-gray-500 to-slate-500',
                        icon: Crown,
                        badge: 'bg-gray-100 text-gray-600'
                    };
            }
        };

        const style = getPackageStyle();
        const Icon = style.icon;

        return (
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group relative overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-300 border-2"
            >
                <div className="relative p-6 space-y-4">
                    {/* Header with Icon and Save button */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${style.gradient}`}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400">Thời hạn:</span>
                                <span className="text-sm text-gray-500">{pkg.duration_months} tháng</span>
                            </div>
                        </div>
                        <div className="text-gray-400 hover:text-gray-600 transition-colors">
                            <img
                                src="/img/logo-ielts.png"
                                alt="IELTS Logo"
                                className="w-7 h-7 object-contain"
                            />
                        </div>
                    </div>

                    {/* Package Name */}
                    <h3 className="text-2xl font-bold text-gray-900 text-center">
                        {pkg.name}
                    </h3>

                    {/* Description */}
                    <div className="space-y-3">
                        {pkg.description.split('\n').map((line, index) => (
                            <div key={index} className="flex items-start gap-3 text-gray-600 group hover:text-gray-800 transition-colors">
                                <svg
                                    className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500 group-hover:text-indigo-600 transition-colors"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span className="text-sm">{line}</span>
                            </div>
                        ))}
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500">Giá gói</span>
                            <div className={`text-2xl font-bold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>
                                {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                    maximumFractionDigits: 0
                                }).format(pkg.price)}
                            </div>
                        </div>
                        <button
                            onClick={() => handlePurchase(pkg.package_id)}
                            className={`px-8 py-3 bg-gradient-to-r ${style.gradient} text-white rounded-full font-medium hover:opacity-90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 focus:outline-none`}
                        >
                            Đăng ký ngay
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Filter packages based on type
    const filteredPackages = activeFilter === 'all'
        ? packages
        : packages.filter(pkg =>
            pkg.package_type === 'single_skill' && pkg.skill_type === activeFilter
        );

    // Calculate pagination
    const indexOfLastPackage = currentPage * packagesPerPage;
    const indexOfFirstPackage = indexOfLastPackage - packagesPerPage;
    const currentPackages = filteredPackages.slice(indexOfFirstPackage, indexOfLastPackage);
    const totalPages = Math.ceil(filteredPackages.length / packagesPerPage);

    const Pagination = () => (
        <div className="flex justify-center mt-8 gap-2 items-center">
            <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg border font-bold transition-all duration-300 ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
            >
                Về Trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                <button
                    key={number}
                    onClick={() => setCurrentPage(number)}
                    className={`px-4 py-2 rounded-lg border font-bold transition-all duration-300 ${currentPage === number
                        ? 'bg-gradient-to-r from-[#34d399] to-[#10b981] text-white shadow-lg shadow-indigo-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    {number}
                </button>
            ))}

            <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg border font-bold transition-all duration-300 ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
            >
                Tiếp theo
            </button>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gray-50"
        >
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100"
            >
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <nav className="flex items-center space-x-2 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-violet-600 flex items-center transition-colors duration-300">
                            <Home size={16} className="mr-1" />
                            Trang chủ
                        </Link>
                        <ChevronRight size={16} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">Gói VIP</span>
                    </nav>
                </div>
            </motion.div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={container}
                    className="text-center mb-12"
                >
                    <motion.div
                        variants={item}
                        whileHover={{ scale: 1.1 }}
                        className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-[#34d399] to-[#10b981] rounded-2xl shadow-lg shadow-indigo-200 mb-6"
                    >
                        <Crown className="w-8 h-8 text-white" />
                    </motion.div>
                    <motion.h1
                        variants={item}
                        className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#34d399] to-[#10b981]"
                    >
                        Gói VIP thiieltstrenmay.com
                    </motion.h1>
                    <motion.p
                        variants={item}
                        className="text-xl text-gray-500 max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
                    >
                        Chọn gói VIP phù hợp nhất cho hành trình IELTS của bạn
                    </motion.p>
                </motion.div>

                {/* Free Tier Benefits banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-8 rounded-3xl bg-emerald-50/40 border border-emerald-100/80 p-6 md:p-7"
                >
                    {/* Heading */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-100/70">
                            <Sparkles className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                            Quyền lợi tài khoản miễn phí
                        </h3>
                    </div>

                    {/* Benefit cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Speaking miễn phí */}
                        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100/70 shrink-0">
                                <Star className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-gray-700 text-sm md:text-base">
                                Miễn phí <span className="font-bold text-gray-900">Speaking</span>
                            </span>
                        </div>

                        {/* Writing miễn phí + 1 AI/ngày */}
                        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100/70 shrink-0">
                                <Lightbulb className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-700 text-sm md:text-base">
                                    Miễn phí <span className="font-bold text-gray-900">Writing</span>
                                </span>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                                    1 AI/ngày
                                </span>
                            </div>
                        </div>

                        {/* 6 bài Listening */}
                        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100/70 shrink-0">
                                <Mic className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-gray-700 text-sm md:text-base">
                                <span className="font-bold text-amber-600">6</span> bài Listening
                            </span>
                        </div>

                        {/* 6 bài Reading */}
                        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100/70 shrink-0">
                                <BookOpen className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-gray-700 text-sm md:text-base">
                                <span className="font-bold text-amber-600">6</span> bài Reading
                            </span>
                        </div>
                    </div>
                </motion.div>

                <FilterSection />

                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={container}
                    className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {currentPackages.map((pkg, index) => (
                        <PackageCard key={pkg.package_id} pkg={pkg} index={index} />
                    ))}
                </motion.div>

                {totalPages > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Pagination />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default VIPPackages;
