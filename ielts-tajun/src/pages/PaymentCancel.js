import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, Home, RefreshCw } from 'lucide-react';

const PaymentCancel = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-red-100 rounded-full p-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán đã bị hủy</h1>
                    <p className="text-gray-500 mb-6">
                        Giao dịch chưa hoàn tất. Bạn có thể thử lại bất cứ lúc nào.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/vip-packages')}
                            className="w-full py-3 px-6 bg-gradient-to-r from-lime-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-lime-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Thử lại
                        </button>
                        <Link
                            to="/"
                            className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Về trang chủ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancel;
