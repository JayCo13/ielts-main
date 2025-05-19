import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const MyVIPPackage = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const response = await fetch('http://localhost:8000/customer/vip/subscription/history', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Không thể tải thông tin gói VIP');
            }

            setSubscriptions(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
            </div>
        );
    }
    const statusConfig = {
        completed: {
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            icon: (
                <svg className="flex-shrink-0 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        pending: {
            color: 'text-lime-600',
            bgColor: 'bg-lime-100',
            icon: (
                <svg className="flex-shrink-0 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        rejected: {
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            icon: (
                <svg className="flex-shrink-0 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    };
    return (
        <div className="min-h-screen bg-teal-50/50">
            {/* Breadcrumb - Sticky */}
            <div className="bg-white border-b sticky top-0 z-10 backdrop-blur-sm bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <nav className="flex items-center space-x-2 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-lime-600 flex items-center">
                            <Home size={16} className="mr-1" />
                            Trang chủ
                        </Link>
                        <ChevronRight size={16} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">Gói VIP của tôi</span>
                    </nav>
                </div>
            </div>

            {/* Main Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="rounded-2xl p-8 mb-8">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center p-2 bg-lime-100 rounded-full mb-4 animate-fade-in">
                            <svg className="w-6 h-6 text-lime-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </div>
                        <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-lime-600 to-lime-400">
                            Gói VIP của tôi
                        </h2>
                        <div className="mt-6 max-w-2xl mx-auto">
                            <p className="text-xl text-gray-600 leading-relaxed">
                                Quản lý và theo dõi hành trình thành viên cao cấp của bạn với lịch sử gói VIP toàn diện <br/>
                                Bạn muốn đăng ký gói VIP? Chọn loại gói:
                                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                                    <Link 
                                        to="/vip-packages?type=all" 
                                        className="inline-flex items-center px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg transition-colors"
                                    >
                                        Gói tất cả kỹ năng
                                    </Link>
                                    <Link 
                                        to="/vip-packages?type=reading" 
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        Gói Reading
                                    </Link>
                                    <Link 
                                        to="/vip-packages?type=writing" 
                                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                    >
                                        Gói Writing
                                    </Link>
                                    <Link 
                                        to="/vip-packages?type=listening" 
                                        className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                    >
                                        Gói Listening
                                    </Link>
                                </div>
                            </p>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-lime-100/50">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">Hoạt động từ</dt>
                                <dd className="mt-1 text-2xl font-semibold text-lime-600">
                                    {subscriptions[0]?.start_date ? formatDate(subscriptions[0].start_date) : 'Chưa có'}
                                </dd>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-lime-100/50">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">Tổng số gói</dt>
                                <dd className="mt-1 text-2xl font-semibold text-lime-600">{subscriptions.length}</dd>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-lime-100/50">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500">Gói đang hoạt động</dt>
                                <dd className="mt-1 text-2xl font-semibold text-lime-600">
                                    {subscriptions.filter(sub => sub.is_active).length}
                                </dd>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-8 text-center text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                        {error}
                    </div>
                )}

                {/* Subscription Cards */}
                <div className="grid gap-6">
                    {subscriptions.length > 0 ? (
                        subscriptions.map((subscription) => {
                            const packageStyles = {
                                'Vip 1': {
                                    container: 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200',
                                    badge: 'bg-sky-100 text-sky-600',
                                    icon: 'text-sky-400',
                                },
                                'Vip 2': {
                                    container: 'bg-gradient-to-br from-lime-50 to-lime-100 border-lime-200',
                                    badge: 'bg-lime-100 text-lime-600',
                                    icon: 'text-lime-400',
                                },
                                'Vip 3': {
                                    container: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
                                    badge: 'bg-purple-100 text-purple-600',
                                    icon: 'text-purple-400',
                                }
                            };

                            const style = packageStyles[subscription.package_name] || packageStyles['Vip 1'];

                            return (
                                <div
                                    key={subscription.subscription_id}
                                    className={`${style.container} rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300`}
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`p-2.5 rounded-xl ${style.badge}`}>
                                                        <svg className={`h-6 w-6 ${style.icon}`} fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-xl font-semibold text-gray-900">
                                                        {subscription.package_name}
                                                    </h3>
                                                    <div className={`ml-auto flex-shrink-0 ${subscription.is_active ? `${style.badge}` : 'text-gray-600 bg-gray-100'
                                                        } rounded-full px-4 py-1 text-sm font-medium`}>
                                                        {subscription.is_active ? 'Đang hoạt động' : 'Hết hạn'}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <svg className={`flex-shrink-0 mr-2 h-5 w-5 ${style.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                                                    </div>
                                                    <div className="flex items-center text-sm">
                                                        <div className={`flex items-center px-3 py-1 rounded-full ${statusConfig[subscription.payment_status.toLowerCase()]?.bgColor || 'bg-gray-100'
                                                            } ${statusConfig[subscription.payment_status.toLowerCase()]?.color || 'text-gray-600'
                                                            }`}>
                                                            {statusConfig[subscription.payment_status.toLowerCase()]?.icon || (
                                                                <svg className="flex-shrink-0 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            )}
                                                            Trạng thái: 
                                                            {subscription.payment_status === 'completed' ? ' Đã thanh toán' : 
                                                             subscription.payment_status === 'pending' ? ' Đang xử lý' : 
                                                             subscription.payment_status === 'rejected' ? ' Bị từ chối' : 
                                                             ' ' + subscription.payment_status}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center bg-white rounded-xl shadow-sm p-8 border">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Không có gói VIP</h3>
                            <p className="mt-2 text-gray-600">Bạn chưa đăng ký bất kỳ gói VIP nào.</p>
                            <Link
                                to="/vip-packages"
                                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700"
                            >
                                Xem các gói hiện có
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyVIPPackage;
