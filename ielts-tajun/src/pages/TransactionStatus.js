import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, Clock, CheckCircle, XCircle } from 'lucide-react';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

const TransactionStatus = () => {
    const [status, setStatus] = useState('pending');
    const [timeLeft, setTimeLeft] = useState(() => {
        const endTime = localStorage.getItem('paymentEndTime');
        if (endTime) {
            const remaining = Math.max(0, Math.floor((parseInt(endTime) - Date.now()) / 1000));
            return remaining > 0 ? remaining : 0;
        }
        const tenMinutes = 600;
        const endTimeMs = Date.now() + (tenMinutes * 1000);
        localStorage.setItem('paymentEndTime', endTimeMs.toString());
        return tenMinutes;
    });
    const [showZalo, setShowZalo] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [rejectReason, setRejectReason] = useState(''); // Add this line
    const location = useLocation();
    const navigate = useNavigate();
    const { transactionId } = location.state;

    useEffect(() => {
        let wsRetryCount = 0;
        const maxRetries = 3;
        let wsClient = null;

        const handleStatusUpdate = (data) => {
            if (data.status === 'completed') {
                setStatus('completed');
                localStorage.removeItem('paymentEndTime');
                setTimeout(() => navigate('/my-vip-package'), 3000);
            } else if (data.status === 'reject') {  // Backend sends 'reject'
                setStatus('rejected');  // Frontend uses 'rejected'
                setRejectReason(data.admin_note || 'Không có lý do được cung cấp');
                localStorage.removeItem('paymentEndTime');
            }
        };

        // Remove the useState declaration from here
        // const [rejectReason, setRejectReason] = useState('');

        const checkStatus = async () => {
            try {
                const response = await fetch(`http://localhost:8000/customer/vip/transactions/${transactionId}/status`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                handleStatusUpdate(data);
            } catch (error) {
                console.error('Error checking status:', error);
            }
        };

        const connectWebSocket = () => {
            try {
                wsClient = new W3CWebSocket(`ws://localhost:8000/ws/transactions/${transactionId}/status`);

                wsClient.onopen = () => {
                    console.log('WebSocket Connected');
                    setWsConnected(true);
                    wsRetryCount = 0;
                };

                wsClient.onclose = () => {
                    console.log('WebSocket Disconnected');
                    setWsConnected(false);
                    if (wsRetryCount < maxRetries) {
                        wsRetryCount++;
                        setTimeout(connectWebSocket, 2000);
                    }
                };

                wsClient.onerror = () => {
                    setWsConnected(false);
                };

                wsClient.onmessage = (message) => {
                    try {
                        const data = JSON.parse(message.data);
                        handleStatusUpdate(data);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
            }
        };

        checkStatus();
        connectWebSocket();

        const pollInterval = setInterval(checkStatus, 5000);

        return () => {
            if (wsClient) {
                wsClient.close();
            }
            clearInterval(pollInterval);
        };
    }, [transactionId, navigate]);

    useEffect(() => {
        let timer;
        if (status === 'pending' && timeLeft > 0) {
            if (timeLeft === 0) {
                setShowZalo(true);
            }

            timer = setInterval(() => {
                const endTime = parseInt(localStorage.getItem('paymentEndTime'));
                const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                
                if (remaining <= 0) {
                    setTimeLeft(0);
                    setShowZalo(true);
                    clearInterval(timer);
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [status]);

    useEffect(() => {
        if (status === 'completed' || status === 'rejected') {
            localStorage.removeItem('paymentEndTime');
        }
        return () => {
            if (status === 'completed' || status === 'rejected') {
                localStorage.removeItem('paymentEndTime');
            }
        };
    }, [status]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const statusConfig = {
        pending: {
            icon: () => (
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500" />
            ),
            title: 'Đang xem xét thanh toán',
            message: showZalo 
                ? 'Đã vượt quá thời gian xác minh thanh toán. Vui lòng liên hệ với quản trị viên để được hỗ trợ.'
                : `Thanh toán của bạn đang được đội ngũ của chúng tôi xác minh. Thời gian còn lại: ${formatTime(timeLeft)}`,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50'
        },
        completed: {
            icon: () => (
                <div className="relative">
                    <div className="animate-scale-check h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                </div>
            ),
            title: 'Thanh toán đã được chấp nhận!',
            message: 'Gói VIP của bạn đã được kích hoạt. Đang chuyển hướng đến trang quản lý VIP của bạn...',
            color: 'text-green-500',
            bgColor: 'bg-green-50'
        },
        rejected: {
            icon: () => (
                <div className="relative">
                    <div className="animate-bounce h-16 w-16 rounded-full bg-red-500 flex items-center justify-center">
                        <XCircle className="h-10 w-10 text-white" />
                    </div>
                </div>
            ),
            title: 'Thanh toán bị từ chối',
            message: `Thanh toán của bạn đã bị từ chối. Lý do: ${rejectReason}`,
            color: 'text-red-500',
            bgColor: 'bg-red-50'
        }
    };

    const StatusInfo = statusConfig[status];

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
            <div className="max-w-lg w-full mx-4">
                <div className={`bg-white rounded-2xl shadow-lg border p-8 text-center ${StatusInfo.bgColor}`}>
                    <div className="flex justify-center mb-6">
                        <StatusInfo.icon />
                    </div>
                    <h2 className={`text-2xl font-bold mb-2 ${StatusInfo.color}`}>
                        {StatusInfo.title}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {StatusInfo.message}
                    </p>
                    
                    {status === 'pending' && showZalo && (
                        <div className="space-y-4 max-w-sm mx-auto mt-6">
                            <a
                                href="https://zalo.me/admin-phone-number"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Liên hệ Admin qua Zalo
                            </a>
                        </div>
                    )}
                    
                    {status === 'rejected' && (
                        <div className="space-y-4 max-w-sm mx-auto">
                            <Link
                                to="/vip-packages"
                                className="block w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Thử lại
                            </Link>
                            <a
                                href="https://www.facebook.com/founder"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            >
                                Liên hệ hỗ trợ
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionStatus;