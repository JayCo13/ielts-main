import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home, Crown, ChevronLeft, ChevronDown, Star, Sparkles, Zap, BookOpen, Mic, Lightbulb, Globe } from 'lucide-react';

const VIPPackages = () => {
    const [packages, setPackages] = useState([]);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('all');
    const packagesPerPage = 6;
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchData();

        // Parse query params to filter by package type
        const queryParams = new URLSearchParams(location.search);
        const type = queryParams.get('type');
        if (type) {
            setActiveFilter(type);
        }
    }, [location.search]);

    const fetchData = async () => {
        try {
            const [packagesResponse, statusResponse] = await Promise.all([
                fetch('http://localhost:8000/customer/vip/packages/available', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }),
                fetch('http://localhost:8000/customer/vip/subscription/status', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            ]);

            const packagesData = await packagesResponse.json();
            const statusData = await statusResponse.json();

            if (!packagesResponse.ok) {
                throw new Error(packagesData.detail || 'Không thể tải gói VIP');
            }

            setPackages(packagesData);
            setSubscriptionStatus(statusData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (packageId) => {
        // Check for authentication token first
        const token = localStorage.getItem('token');
        if (!token) {
            // If no token, redirect to login page
            navigate('/login');
            return; // Stop further execution
        }

        // If token exists, proceed to payment page
        try {
            navigate('/payment', {
                state: {
                    packageId: packageId,
                    package: packages.find(p => p.package_id === packageId)
                }
            });
        } catch (err) {
            setError(err.message);
        }
    };

    // Filter packages by type
    const filteredPackages = activeFilter === 'all' 
        ? packages 
        : packages.filter(pkg => {
            // This is a placeholder - you'll need to adjust based on your actual package structure
            // Assuming each package has a 'type' field like 'all', 'reading', 'writing', etc.
            return pkg.type === activeFilter;
        });

    // Calculate pagination
    const indexOfLastPackage = currentPage * packagesPerPage;
    const indexOfFirstPackage = indexOfLastPackage - packagesPerPage;
    const currentPackages = filteredPackages.slice(indexOfFirstPackage, indexOfLastPackage);
    const totalPages = Math.ceil(filteredPackages.length / packagesPerPage);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Helper to determine package type decoration
    const getPackageTypeStyle = (packageType) => {
        switch(packageType) {
            case 'all':
                return {
                    container: 'border-lime-200 border-2',
                    gradient: 'from-lime-500 to-green-600',
                    badge: 'bg-lime-100 text-lime-600',
                    icon: <Globe className="w-6 h-6" />,
                    label: 'Tất cả kỹ năng',
                    description: 'Gói toàn diện bao gồm tất cả kỹ năng IELTS'
                };
            case 'reading':
                return {
                    container: 'border-blue-200 border-2',
                    gradient: 'from-blue-500 to-indigo-600',
                    badge: 'bg-blue-100 text-blue-600',
                    icon: <BookOpen className="w-6 h-6" />,
                    label: 'Reading',
                    description: 'Tập trung vào kỹ năng đọc hiểu IELTS'
                };
            case 'listening':
                return {
                    container: 'border-purple-200 border-2',
                    gradient: 'from-purple-500 to-violet-600',
                    badge: 'bg-purple-100 text-purple-600',
                    icon: <Mic className="w-6 h-6" />,
                    label: 'Listening',
                    description: 'Tập trung vào kỹ năng nghe hiểu IELTS'
                };
            case 'writing':
                return {
                    container: 'border-amber-200 border-2',
                    gradient: 'from-amber-500 to-orange-600',
                    badge: 'bg-amber-100 text-amber-600',
                    icon: <Lightbulb className="w-6 h-6" />,
                    label: 'Writing',
                    description: 'Tập trung vào kỹ năng viết IELTS'
                };
            default:
                return {
                    container: 'border-gray-200 border-2',
                    gradient: 'from-gray-500 to-gray-600',
                    badge: 'bg-gray-100 text-gray-600',
                    icon: <Crown className="w-6 h-6" />,
                    label: 'VIP',
                    description: 'Gói VIP của IELTS TaJun'
                };
        }
    };

    // Package Icons - based on VIP level
    const PackageIcon = ({ name }) => {
        switch (name) {
            case 'Vip 1':
                return <Star className="w-6 h-6" />;
            case 'Vip 2':
                return <Sparkles className="w-6 h-6" />;
            case 'Vip 3':
                return <Zap className="w-6 h-6" />;
            default:
                return <Crown className="w-6 h-6" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-teal-50/50 flex flex-col">
            <div className="bg-white border-b sticky top-0 z-10 backdrop-blur-sm bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <nav className="flex items-center space-x-2 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-lime-600 flex items-center">
                            <Home size={16} className="mr-1" />
                            Trang chủ
                        </Link>
                        <ChevronRight size={16} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">Gói VIP</span>
                    </nav>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                <div className="bg-gradient-to-r from-lime-50/50 to-white rounded-2xl p-6 mb-6">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center p-2 bg-lime-100 rounded-full mb-3">
                            <Crown className="w-5 h-6 text-lime-600" />
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-lime-600 to-lime-400 pb-1 leading-tight">
                            Gói VIP IELTS TaJun
                        </h2>
                        <div className="mt-4 max-w-2xl mx-auto">
                            <p className="text-lg text-gray-600">
                                Chọn gói VIP phù hợp nhất cho hành trình IELTS của bạn
                            </p>
                        </div>
                    </div>

                    {/* Filter by package type */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <Link 
                            to="/vip-packages"
                            className={`px-4 py-2 rounded-full transition-all ${
                                activeFilter === 'all' 
                                    ? 'bg-lime-500 text-white font-medium shadow-md' 
                                    : 'bg-white text-gray-700 hover:bg-lime-50 border border-gray-200'
                            }`}
                        >
                            Tất cả
                        </Link>
                        <Link 
                            to="/vip-packages?type=reading"
                            className={`px-4 py-2 rounded-full transition-all ${
                                activeFilter === 'reading' 
                                    ? 'bg-blue-500 text-white font-medium shadow-md' 
                                    : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
                            }`}
                        >
                            <BookOpen size={16} className="inline mr-1" />
                            Reading
                        </Link>
                        <Link 
                            to="/vip-packages?type=writing"
                            className={`px-4 py-2 rounded-full transition-all ${
                                activeFilter === 'writing' 
                                    ? 'bg-amber-500 text-white font-medium shadow-md' 
                                    : 'bg-white text-gray-700 hover:bg-amber-50 border border-gray-200'
                            }`}
                        >
                            <Lightbulb size={16} className="inline mr-1" />
                            Writing
                        </Link>
                        <Link 
                            to="/vip-packages?type=listening"
                            className={`px-4 py-2 rounded-full transition-all ${
                                activeFilter === 'listening' 
                                    ? 'bg-purple-500 text-white font-medium shadow-md' 
                                    : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                            }`}
                        >
                            <Mic size={16} className="inline mr-1" />
                            Listening
                        </Link>
                    </div>

                    {subscriptionStatus?.is_subscribed && (
                        <div className="mt-6 bg-white border border-lime-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-lime-700">
                                        Gói VIP Đang Hoạt Động
                                    </h3>
                                    <p className="text-sm text-lime-600 mt-1">
                                        {subscriptionStatus.package_name} - còn {subscriptionStatus.days_remaining} ngày
                                    </p>
                                </div>
                                <div className="bg-lime-100 px-4 py-2 rounded-full">
                                    <span className="text-sm font-medium text-lime-700">
                                        Hoạt động đến {new Date(subscriptionStatus.end_date).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 text-center text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                        {error}
                    </div>
                )}

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto mb-8">
                    {currentPackages.map((pkg) => {
                        // Determine package type - for the example, we'll randomly assign types
                        // In a real scenario, you'd use pkg.type or some other attribute
                        // This is just for demonstration
                        const packageTypes = ['all', 'reading', 'writing', 'listening'];
                        const packageType = packageTypes[Math.floor(Math.random() * packageTypes.length)];
                        const typeStyle = getPackageTypeStyle(packageType);
                        
                        const packageStyles = {
                            'Vip 1': {
                                container: 'border-blue-200',
                                gradient: 'from-blue-500 to-indigo-600',
                                hover: 'hover:border-blue-300 hover:scale-[1.02]',
                                badge: 'bg-blue-100 text-blue-600',
                                price: 'text-blue-600',
                                shadow: 'shadow-blue-100',
                                icon: <Star className="w-7 h-7 text-blue-500" />
                            },
                            'Vip 2': {
                                container: 'border-lime-200',
                                gradient: 'from-lime-500 to-green-600',
                                hover: 'hover:border-lime-300 hover:scale-[1.02]',
                                badge: 'bg-lime-100 text-lime-600',
                                price: 'text-lime-600',
                                shadow: 'shadow-lime-100',
                                icon: <Sparkles className="w-7 h-7 text-lime-500" />
                            },
                            'Vip 3': {
                                container: 'border-purple-200',
                                gradient: 'from-violet-500 to-purple-600',
                                hover: 'hover:border-purple-300 hover:scale-[1.02]',
                                badge: 'bg-purple-100 text-purple-600',
                                price: 'text-purple-600',
                                shadow: 'shadow-purple-100',
                                icon: <Zap className="w-7 h-7 text-purple-500" />
                            }
                        };

                        const style = packageStyles[pkg.name] || packageStyles['Vip 1'];
                        
                        // Labels in Vietnamese
                        const packageLabels = {
                            'Vip 1': 'Cơ Bản',
                            'Vip 2': 'Phổ Biến Nhất',
                            'Vip 3': 'Cao Cấp'
                        };

                        // Special ribbon for "All Skills" packages
                        const hasAllSkillsRibbon = packageType === 'all';

                        return (
                            <div
                                key={pkg.package_id}
                                className={`bg-white rounded-xl border-2 ${typeStyle.container} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${style.hover} relative`}
                            >
                                {pkg.name === 'Vip 2' && (
                                    <div className="absolute -top-1 -right-14 w-40 transform rotate-45 bg-lime-500 text-white text-center text-xs py-1 font-semibold shadow-md">
                                        Phổ biến nhất
                                    </div>
                                )}
                                
                                {hasAllSkillsRibbon && (
                                    <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-lime-500 to-green-500 text-white text-xs py-1 text-center font-medium">
                                        Trọn bộ kỹ năng IELTS
                                    </div>
                                )}
                                
                                <div className={`p-4 ${hasAllSkillsRibbon ? 'pt-6' : ''}`}>
                                    <div className={`bg-gradient-to-r ${packageType === 'all' ? 'from-lime-500 to-green-600' : style.gradient} -mt-4 -mx-4 mb-4 py-6 text-center relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent)] group-hover:opacity-75 transition-opacity"></div>
                                        
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPHBhdHRlcm4gaWQ9InN0YXJzIiB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxjaXJjbGUgY3g9IjUiIGN5PSI1IiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMykiIC8+CiAgICA8L3BhdHRlcm4+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc3RhcnMpIiAvPgo8L3N2Zz4=')] opacity-25 mix-blend-overlay"></div>

                                        <div className="flex justify-center mb-2">
                                            {packageType === 'all' ? typeStyle.icon : style.icon}
                                        </div>
                                        
                                        <div className={`${packageType === 'all' ? typeStyle.badge : style.badge} w-fit mx-auto px-3 py-1 rounded-full text-xs font-medium mb-2 shadow-sm`}>
                                            {packageType === 'all' ? 'Tất cả kỹ năng' : packageLabels[pkg.name] || 'Gói VIP'}
                                        </div>
                                        <h3 className="text-xl font-bold text-white relative z-10 drop-shadow-md">{pkg.name}</h3>
                                        
                                        {packageType !== 'all' && (
                                            <div className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-1">
                                                {typeStyle.icon}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="text-center mb-4">
                                        <span className={`text-3xl font-bold ${packageType === 'all' ? 'text-lime-600' : style.price}`}>
                                            {new Intl.NumberFormat('vi-VN', { 
                                                style: 'currency', 
                                                currency: 'VND',
                                                maximumFractionDigits: 0 
                                            }).format(pkg.price)}
                                        </span>
                                        <span className="text-gray-600 ml-2 text-sm">
                                            / {pkg.duration_months} tháng
                                        </span>
                                    </div>
                                    
                                    {/* Package type tag */}
                                    <div className="mb-3 flex items-center justify-center">
                                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeStyle.badge}`}>
                                            {typeStyle.icon} 
                                            <span className="ml-1">{typeStyle.label}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 mb-6 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent px-1 pr-2">
                                        {/* Add a special highlight for 'all' packages */}
                                        {packageType === 'all' && (
                                            <div className="flex items-start text-lime-700 font-medium text-sm bg-lime-50 p-2 rounded-lg">
                                                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="leading-tight">Bao gồm tất cả kỹ năng IELTS</span>
                                            </div>
                                        )}
                                        
                                        {(pkg.description || '').split('\n').map((feature, index) => (
                                            <div key={index} className="flex items-start text-gray-700 text-sm">
                                                <svg className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${packageType === 'all' ? 'text-lime-600' : style.price}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="leading-tight whitespace-pre-line">{feature.trim()}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button
                                        onClick={() => handlePurchase(pkg.package_id)}
                                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-sm
                                            bg-gradient-to-r ${packageType === 'all' ? 'from-lime-500 to-green-600' : style.gradient} text-white hover:shadow-xl ${style.shadow} transform hover:translate-y-[-2px]`}
                                    >
                                        {localStorage.getItem('token') ? 'Đăng Ký Ngay' : 'Đăng Nhập Để Đăng Ký'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center mt-8 space-x-2">
                        <button
                            onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 rounded-md flex items-center ${
                                currentPage === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-lime-600 hover:bg-lime-50 border border-lime-200'
                            }`}
                        >
                            <ChevronLeft size={16} className="mr-1" />
                            Trước
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => paginate(i + 1)}
                                className={`px-3 py-1 rounded-md ${
                                    currentPage === i + 1
                                        ? 'bg-lime-500 text-white'
                                        : 'bg-white text-gray-700 hover:bg-lime-50 border border-gray-200'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        
                        <button
                            onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 rounded-md flex items-center ${
                                currentPage === totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-lime-600 hover:bg-lime-50 border border-lime-200'
                            }`}
                        >
                            Tiếp
                            <ChevronRight size={16} className="ml-1" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VIPPackages;