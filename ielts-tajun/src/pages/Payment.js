import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, Upload, AlertCircle, Shield, ShieldCheck, Lock, CheckCircle, Copy, Check, X } from 'lucide-react';

const Payment = () => {
    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [bankDescription, setBankDescription] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [userData, setUserData] = useState(null);
    const [copied, setCopied] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { packageId, package: selectedPackage } = location.state;
    const [transactionCode, setTransactionCode] = useState('');

    // Fetch user data when component mounts
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log('Fetching user profile data...');
                const response = await fetch('http://localhost:8000/student/profile', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                
                const data = await response.json();
                console.log('User profile data:', data);
                setUserData(data);
                
                // Generate transaction code
                const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
                const generatedCode = `IELTS-${data.user_id}-${selectedPackage.package_id}-${timestamp}-${randomString}`;
                
                setTransactionCode(generatedCode);
                // Chỉ hiển thị mã giao dịch
                const autoDescription = `MÃ GIAO DỊCH: ${generatedCode}`;
                setBankDescription(autoDescription);
                
            } catch (err) {
                console.error('Error fetching user data:', err);
            }
        };
        
        fetchUserData();
    }, [selectedPackage]);

    const handleCopyClick = () => {
        navigator.clipboard.writeText(bankDescription);
        setCopied(true);
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Kích thước tệp phải nhỏ hơn 5MB');
                return;
            }
            setUploadedFile(file);
            
            // Create a preview URL for the uploaded image
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
            
            setError(null);
        }
    };
    
    const handleRemoveImage = () => {
        setUploadedFile(null);
        
        // Clean up the object URL to avoid memory leaks
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
    };

    // Clean up object URL when component unmounts
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleSubmit = async () => {
        if (!uploadedFile) {
            setError('Vui lòng tải lên bằng chứng thanh toán');
            return;
        }
    
        setIsSubmitting(true);
        setError(null);
    
        const formData = new FormData();
        formData.append('payment_method', paymentMethod);
        formData.append('bank_description', bankDescription);
        formData.append('bank_transfer_image', uploadedFile);
        formData.append('transaction_code', transactionCode);  // Sử dụng mã từ state
    
        try {
            const response = await fetch(`http://localhost:8000/customer/vip/packages/${packageId}/purchase`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
    
            const responseData = await response.json();
    
            if (!response.ok) {
                throw new Error(responseData.detail || 'Thanh toán thất bại');
            }
    
            // Redirect to transaction status page
            navigate('/transaction-status', { 
                state: { 
                    transactionId: responseData.transaction_id,
                    status: responseData.status,
                    transactionCode: responseData.transaction_code
                }
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
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

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Package Info - Always at the top */}
                <div className="bg-white rounded-2xl shadow-md border border-lime-100 p-6 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-2xl font-bold text-gray-900">Chi tiết thanh toán</h2>
                        <div className="bg-lime-50 rounded-xl p-3 border border-lime-200">
                            <h3 className="font-medium text-lime-700 text-sm">Gói đã chọn</h3>
                            <p className="font-semibold text-lime-800">{selectedPackage.name} - {selectedPackage.price}₫</p>
                        </div>
                    </div>
                </div>

                {/* Security Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 mb-6 flex items-center gap-3 border border-blue-200">
                    <ShieldCheck className="text-blue-500 h-6 w-6 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                        Thanh toán của bạn được bảo mật. Thông tin của bạn không được chia sẻ với bên thứ ba.
                    </p>
                </div>

                {/* Main content - Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Payment Method and QR */}
                    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <Lock className="w-5 h-5 mr-2 text-lime-600" />
                                Phương thức thanh toán
                            </h3>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Payment Method Selection */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3 text-sm">Chọn phương thức thanh toán</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        className={`p-4 border rounded-xl flex items-center transition-all ${paymentMethod === 'momo'
                                            ? 'border-purple-500 bg-purple-50 shadow-sm' 
                                            : 'hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setPaymentMethod('momo')}
                                    >
                                        <img src="/img/momo.jpeg" alt="MoMo" className="h-8 w-8 mr-3 rounded-md" />
                                        <span className="font-medium">MoMo</span>
                                    </button>

                                    <button
                                        className={`p-4 border rounded-xl flex items-center transition-all ${paymentMethod === 'tpbank'
                                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                            : 'hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setPaymentMethod('tpbank')}
                                    >
                                        <img src="/img/tpbank.jpeg" alt="TPBank" className="h-8 w-8 mr-3 rounded-md" />
                                        <span className="font-medium">TPBank</span>
                                    </button>
                                </div>
                            </div>

                            {/* QR Code Display */}
                            {paymentMethod && (
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="font-medium text-gray-700 mb-4 text-sm">Quét mã QR để thanh toán</h4>
                                    <div className="flex flex-col items-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <img 
                                            src={qrCodeConfig[paymentMethod].qrImage}
                                            alt={`${paymentMethod.toUpperCase()} QR Code`}
                                            className="w-64 h-64 object-contain mb-4 border p-2 rounded-lg bg-white"
                                        />
                                        <p className="text-sm text-gray-600">
                                            {qrCodeConfig[paymentMethod].description}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Form Fields */}
                    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <Shield className="w-5 h-5 mr-2 text-lime-600" />
                                Xác nhận thanh toán
                            </h3>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Bank Description Field */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3 text-sm">
                                    Mô tả giao dịch
                                    <span className="ml-2 text-xs text-lime-600 font-normal">
                                        (Vui lòng sao chép và dùng làm nội dung chuyển khoản)
                                    </span>
                                </h4>
                                <div className="mt-1">
                                    <textarea
                                        id="bankDescription"
                                        value={bankDescription}
                                        onChange={(e) => setBankDescription(e.target.value)}
                                        placeholder="Nhập mô tả chuyển khoản hoặc mã tham chiếu thanh toán"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all font-sans text-md font-bold h-36 resize-none bg-lime-50/30"
                                        spellCheck="false"
                                    />
                                    {userData ? (
                                        <div className="flex mt-2 justify-between items-center">
                                            <p className="text-xs text-red-500">
                                              * LƯU Ý: Vui lòng sử dụng nội dung trên khi chuyển khoản
                                            </p>
                                            <button 
                                                onClick={handleCopyClick}
                                                className={`relative text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded border transition-all duration-300 ${
                                                    copied 
                                                        ? 'bg-green-100 text-green-700 border-green-300' 
                                                        : 'bg-lime-50 text-lime-600 hover:text-lime-700 border-lime-200 hover:bg-lime-100'
                                                }`}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span>Đã sao chép!</span>
                                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4" />
                                                        <span>Sao chép</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Đang tải thông tin của bạn...
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Payment Proof Upload */}
                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="font-medium text-gray-700 mb-3 text-sm">Tải lên bằng chứng thanh toán</h4>
                                
                                {!imagePreview ? (
                                    <div className="mt-2">
                                        <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-lime-100 border-dashed rounded-xl bg-lime-50/50 hover:bg-lime-50 transition-colors">
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-lime-400" />
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-lime-600 hover:text-lime-500 px-3 py-1 shadow-sm border border-lime-200">
                                                        <span>Tải lên tệp</span>
                                                        <input 
                                                            type="file" 
                                                            className="sr-only" 
                                                            accept="image/*"
                                                            onChange={handleFileUpload}
                                                        />
                                                    </label>
                                                    <p className="pl-1 flex items-center">hoặc kéo và thả</p>
                                                </div>
                                                <p className="text-xs text-gray-500">PNG, JPG, GIF tối đa 5MB</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 border rounded-xl overflow-hidden bg-gray-50">
                                        <div className="relative">
                                            <img 
                                                src={imagePreview} 
                                                alt="Bằng chứng thanh toán" 
                                                className="w-full object-contain max-h-[300px]"
                                            />
                                            <div className="absolute top-0 right-0 p-2">
                                                <button 
                                                    onClick={handleRemoveImage}
                                                    className="bg-red-100 text-red-500 rounded-full p-1 hover:bg-red-200 transition-colors"
                                                    title="Xóa hình ảnh"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3 border-t bg-white">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center">
                                                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                                    <p className="text-sm text-gray-700 font-medium truncate">
                                                        {uploadedFile?.name}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {Math.round(uploadedFile?.size / 1024)} KB
                                                </span>
                                            </div>
                                            <div className="mt-2">
                                                <label className="relative cursor-pointer w-full inline-block">
                                                    <input 
                                                        type="file" 
                                                        className="sr-only" 
                                                        accept="image/*"
                                                        onChange={handleFileUpload}
                                                    />
                                                    <span className="text-xs text-lime-600 hover:text-lime-700 font-medium cursor-pointer">
                                                        Thay thế bằng hình ảnh khác
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !uploadedFile}
                                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 
                                    ${isSubmitting || !uploadedFile
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-lime-600 text-white hover:bg-lime-700 shadow-md hover:shadow-lg'
                                    }`}
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Gửi bằng chứng thanh toán'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer security badge */}
                <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Lock className="w-4 h-4 text-lime-600" />
                        <span>Bảo mật bởi IELTS TaJun • SSL Encrypted • PCI DSS Compliant</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;

const qrCodeConfig = {
    momo: {
        qrImage: '/img/momo.png',
        description: 'Quét bằng ứng dụng MoMo'
    },
    tpbank: {
        qrImage: '/img/tp-bank.png',
        description: 'Quét bằng ứng dụng TPBank hoặc bất kỳ ứng dụng ngân hàng nào'
    }
};