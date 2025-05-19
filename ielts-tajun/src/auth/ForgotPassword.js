import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Lottie from 'lottie-react';
import animationData from '../effect/Login.json';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({ email: '', general: '' });
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({ email: '', general: '' });
    
    // Validate email
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Vui lòng nhập email của bạn' }));
      return;
    }
    
    if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: 'Email không đúng định dạng' }));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRequestSent(true);
        
        // Start a 60 second countdown to prevent too many requests
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prevCount) => {
            if (prevCount <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prevCount - 1;
          });
        }, 1000);
      } else {
        setErrors(prev => ({ 
          ...prev, 
          general: data.detail || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.' 
        }));
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        general: 'Lỗi kết nối. Vui lòng thử lại sau.' 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  const handleTryAgain = () => {
    if (countdown === 0) {
      setRequestSent(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-teal-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side with animation */}
          <div className="bg-gradient-to-br from-white via-lime-50 to-lime-100 md:w-1/2 flex items-center justify-center relative p-0">
            <div className="w-full h-full">
              <Lottie 
                animationData={animationData}
                loop={true}
                zIndex={1}
                className="w-full h-full"
                style={{ transform: 'scale(1.2)' }}
              />
            </div>
          </div>

          {/* Right side with forgot password form */}
          <div className="md:w-1/2 p-8">
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-lime-500 mb-6 text-center">Quên mật khẩu</h1>
                
                {requestSent ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 text-green-700 p-6 rounded-lg text-center"
                  >
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    <h3 className="font-bold text-lg mb-2">Kiểm tra email của bạn</h3>
                    <p className="mb-4">
                      Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>. 
                      Vui lòng kiểm tra hộp thư đến và thư rác của bạn.
                    </p>
                    
                    {countdown > 0 ? (
                      <p className="text-sm text-gray-600">
                        Bạn có thể gửi lại yêu cầu sau {countdown} giây
                      </p>
                    ) : (
                      <button
                        onClick={handleTryAgain}
                        className="text-lime-600 hover:text-lime-700 font-medium"
                      >
                        Thử lại với email khác
                      </button>
                    )}
                    
                    <div className="mt-6 border-t border-green-100 pt-4">
                      <Link to="/login" className="text-lime-500 hover:text-lime-600 font-medium">
                        Quay lại trang đăng nhập
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-gray-600 mb-6">
                      Nhập địa chỉ email bạn đã dùng để đăng ký tài khoản và chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu.
                    </p>
                    
                    {errors.general && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {errors.general}
                      </div>
                    )}
                    
                    <form className="space-y-6" onSubmit={handleSubmit}>
                      <div className="space-y-2">
                        <label htmlFor="email" className="block text-gray-500 font-bold mb-1">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                          }}
                          placeholder="Nhập email của bạn"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          aria-invalid={errors.email ? "true" : "false"}
                          aria-describedby={errors.email ? "email-error" : undefined}
                          disabled={loading}
                        />
                        {errors.email && (
                          <p id="email-error" className="text-red-500 text-sm mt-1">
                            {errors.email}
                          </p>
                        )}
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 mt-6 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 ${
                          loading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang xử lý...
                          </span>
                        ) : 'Gửi liên kết đặt lại mật khẩu'}
                      </button>
                      
                      <div className="text-center mt-4">
                        <Link to="/login" className="text-lime-500 hover:text-lime-600 font-medium">
                          Quay lại trang đăng nhập
                        </Link>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 