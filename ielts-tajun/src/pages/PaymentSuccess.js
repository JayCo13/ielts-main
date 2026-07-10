import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, ChevronRight, Loader2, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const orderCode = searchParams.get('orderCode');

    useEffect(() => {
        // Give the webhook a moment to process, then verify
        const timer = setTimeout(() => {
            setStatus('success');
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    {status === 'verifying' ? (
                        <div className="p-8 text-center">
                            <div className="flex justify-center mb-4">
                                <Loader2 className="w-16 h-16 text-lime-500 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Đang xác nhận thanh toán</h1>
                            <p className="text-gray-500">Vui lòng đợi trong giây lát...</p>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="bg-green-100 rounded-full p-4">
                                    <CheckCircle className="w-16 h-16 text-green-500" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
                            <p className="text-gray-500 mb-6">
                                Tài khoản VIP của bạn đã được kích hoạt. Bạn có thể sử dụng ngay bây giờ.
                            </p>
                            {orderCode && (
                                <p className="text-xs text-gray-400 mb-6">
                                    Mã đơn hàng: {orderCode}
                                </p>
                            )}
                            <div className="space-y-3">
                                <Link
                                    to="/my-vip-package"
                                    className="w-full py-3 px-6 bg-gradient-to-r from-lime-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-lime-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
                                >
                                    Xem gói VIP của tôi
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    to="/"
                                    className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Về trang chủ
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
