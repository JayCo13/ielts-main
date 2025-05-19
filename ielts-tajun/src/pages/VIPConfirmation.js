import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const VIPConfirmation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const subscription = location.state?.subscription;

    if (!subscription) {
        navigate('/vip-packages');
        return null;
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
                        <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Chào mừng đến với VIP!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Gói VIP của bạn đã được kích hoạt thành công
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="border-t border-b border-gray-200 py-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Gói:</span>
                            <span className="font-medium text-gray-900">
                                {subscription.package_name}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-600">Ngày bắt đầu:</span>
                            <span className="font-medium text-gray-900">
                                {formatDate(subscription.start_date)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-600">Ngày kết thúc:</span>
                            <span className="font-medium text-gray-900">
                                {formatDate(subscription.end_date)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 transition-all duration-200"
                    >
                        Bắt đầu khám phá tính năng VIP
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VIPConfirmation;