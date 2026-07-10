import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, Shield, ShieldCheck, Lock, Loader2, AlertCircle, Crown } from 'lucide-react';
import { checkTokenExpiration, logout } from '../utils/authUtils';
import { API_BASE } from '../config/api';

const Payment = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const isPaymentInProgress = React.useRef(false);

    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { packageId, package: selectedPackage } = location.state || {};

    // Redirect if no package selected
    useEffect(() => {
        if (!packageId || !selectedPackage) {
            navigate('/vip-packages');
            return;
        }
    }, [packageId, selectedPackage, navigate]);

    // Token validation
    const validateTokenAndRedirect = () => {
        const tokenCheck = checkTokenExpiration();
        if (!tokenCheck.isValid) {
            logout();
            navigate('/login', {
                state: {
                    message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                    redirectFrom: 'payment'
                }
            });
            return false;
        }
        return true;
    };

    useEffect(() => {
        validateTokenAndRedirect();
    }, []);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);


    const handlePayment = async () => {
        if (!validateTokenAndRedirect()) return;
        if (isPaymentInProgress.current || cooldown > 0) return; // Synchronous lock — blocks rapid clicks

        isPaymentInProgress.current = true;
        setIsSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            }

            const response = await fetch(`${API_BASE}/customer/vip/packages/${packageId}/purchase`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    navigate('/login', {
                        state: {
                            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                            redirectFrom: 'payment'
                        }
                    });
                    return;
                } else if (response.status === 429) {
                    throw new Error(responseData.detail || 'Bạn đã tạo quá nhiều yêu cầu. Vui lòng thử lại sau.');
                } else {
                    throw new Error(responseData.detail || 'Thanh toán thất bại. Vui lòng thử lại.');
                }
            }

            // Redirect to PayOS checkout page — keep button disabled
            if (responseData.checkoutUrl) {
                setCooldown(5);
                window.location.href = responseData.checkoutUrl;
                return; // Don't reset isSubmitting — we're navigating away
            } else {
                throw new Error('Không nhận được liên kết thanh toán.');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.message);
            isPaymentInProgress.current = false;
            setIsSubmitting(false);
            setCooldown(5);
        }
    };

    if (!selectedPackage) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Breadcrumb */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <nav className="flex items-center space-x-2 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-lime-600 transition-colors">
                            <Home size={16} className="inline mr-1" />
                            Trang chủ
                        </Link>
                        <ChevronRight size={16} className="text-gray-400" />
                        <Link to="/my-vip-package" className="text-gray-500 hover:text-lime-600 transition-colors">
                            Gói VIP
                        </Link>
                        <ChevronRight size={16} className="text-gray-400" />
                        <span className="text-lime-600 font-medium">Thanh toán</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Package Info Card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-lime-500 to-emerald-500 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-full p-2">
                                <Crown className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Xác nhận thanh toán</h2>
                                <p className="text-white/80 text-sm">Bạn đang mua gói VIP</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{selectedPackage.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Thời hạn: {selectedPackage.duration_months} tháng
                                </p>
                                {selectedPackage.description && (
                                    <p className="text-sm text-gray-600 mt-2">{selectedPackage.description}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-extrabold text-lime-600">
                                    {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                        maximumFractionDigits: 0
                                    }).format(selectedPackage.price)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Steps */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-lime-600" />
                        Quy trình thanh toán
                    </h3>
                    <div className="space-y-4">
                        {[
                            { step: 1, text: 'Nhấn "Thanh toán ngay" bên dưới' },
                            { step: 2, text: 'Quét mã QR hoặc chuyển khoản (khuyến khích quét QR để nhanh hơn)' },
                            { step: 3, text: 'Tài khoản VIP sẽ được kích hoạt tự động sau khi thanh toán thành công' },
                        ].map(({ step, text }) => (
                            <div key={step} className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center font-bold text-sm">
                                    {step}
                                </div>
                                <p className="text-sm text-gray-700">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Payment Button */}
                <button
                    onClick={handlePayment}
                    disabled={isSubmitting || cooldown > 0}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2
                        ${(isSubmitting || cooldown > 0)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-lime-500 to-emerald-500 text-white hover:from-lime-600 hover:to-emerald-600 shadow-lg hover:shadow-xl active:scale-[0.98]'
                        }`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Đang tạo liên kết thanh toán...
                        </>
                    ) : cooldown > 0 ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Vui lòng chờ {cooldown}s
                        </>
                    ) : (
                        <>
                            <Shield className="w-5 h-5" />
                            Thanh toán ngay — {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                maximumFractionDigits: 0
                            }).format(selectedPackage.price)}
                        </>
                    )}
                </button>

                {/* Footer */}
                <div className="mt-6 flex justify-center">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Lock className="w-4 h-4 text-lime-600" />
                        <span>Bảo mật bởi PayOS • SSL Encrypted</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
