import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Lottie from 'lottie-react';
import animationData from '../effect/Login.json';
import { motion } from 'framer-motion';

// Password strength indicators
const PasswordStrengthMeter = ({ password }) => {
  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const strength = calculateStrength(password);
  const getColor = () => {
    switch (strength) {
      case 0: return 'bg-gray-200';
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-400';
      case 4: return 'bg-green-500';
      default: return 'bg-gray-200';
    }
  };

  const getLabel = () => {
    switch (strength) {
      case 0: return 'Chưa nhập mật khẩu';
      case 1: return 'Yếu';
      case 2: return 'Trung bình';
      case 3: return 'Khá mạnh';
      case 4: return 'Mạnh';
      default: return '';
    }
  };

  return (
    <div className="mt-2">
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
        <div 
          className={`h-2.5 rounded-full ${getColor()}`} 
          style={{ width: `${(strength / 4) * 100}%` }}></div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Độ mạnh mật khẩu:</span>
        <span className={`
          ${strength === 1 ? 'text-red-500' : ''}
          ${strength === 2 ? 'text-orange-500' : ''}
          ${strength === 3 ? 'text-yellow-600' : ''}
          ${strength === 4 ? 'text-green-600' : ''}
          font-medium
        `}>{getLabel()}</span>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
    token: '',
    general: ''
  });
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenVerificationInProgress, setTokenVerificationInProgress] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const verifyToken = async () => {
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      
      if (!token) {
        setErrors(prev => ({ ...prev, token: 'Token không hợp lệ hoặc đã hết hạn' }));
        setTokenVerificationInProgress(false);
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:8000/auth/verify-reset-token?token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setTokenValid(true);
        } else {
          const errorMsg = typeof data.detail === 'string' ? data.detail : 'Token không hợp lệ hoặc đã hết hạn';
          setErrors(prev => ({ ...prev, token: errorMsg }));
        }
      } catch (error) {
        setErrors(prev => ({ ...prev, token: 'Lỗi kết nối. Vui lòng thử lại sau.' }));
      } finally {
        setTokenVerificationInProgress(false);
      }
    };
    
    verifyToken();
  }, [location.search]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear confirm password error when password changes
    if (name === 'password' && errors.confirmPassword && formData.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: ''
      }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      password: '',
      confirmPassword: '',
      general: ''
    };
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
      valid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
      valid = false;
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
      valid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
      valid = false;
    }
    
    setErrors(prev => ({
      ...prev,
      ...newErrors
    }));
    
    return valid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      
      const response = await fetch('http://localhost:8000/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: formData.password,
          confirm_password: formData.confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetSuccess(true);
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const errorMsg = typeof data.detail === 'string' ? data.detail : 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.';
        setErrors(prev => ({ 
          ...prev, 
          general: errorMsg
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
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const generateStrongPassword = () => {
    setIsGeneratingPassword(true);
    
    // Helper function to get random character from a set
    const getRandomChar = (charSet) => {
      return charSet.charAt(Math.floor(Math.random() * charSet.length));
    };
    
    // Character sets (avoiding similar looking characters)
    const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz';
    const numberChars = '23456789';
    const specialChars = '!@#$%^&*-_=+';
    
    // Generate a 12-character password
    let password = '';
    
    // Ensure at least one of each type
    password += getRandomChar(uppercaseChars);
    password += getRandomChar(lowercaseChars);
    password += getRandomChar(numberChars);
    password += getRandomChar(specialChars);
    
    // Fill the rest randomly
    for (let i = 4; i < 12; i++) {
      const charType = Math.floor(Math.random() * 4);
      switch (charType) {
        case 0: password += getRandomChar(uppercaseChars); break;
        case 1: password += getRandomChar(lowercaseChars); break;
        case 2: password += getRandomChar(numberChars); break;
        case 3: password += getRandomChar(specialChars); break;
        default: password += getRandomChar(lowercaseChars);
      }
    }
    
    // Shuffle the password characters
    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    
    // Set the password and confirmation
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password
    }));
    
    // Clear any password-related errors
    setErrors(prev => ({
      ...prev,
      password: '',
      confirmPassword: ''
    }));
    
    setTimeout(() => {
      setIsGeneratingPassword(false);
    }, 500);
  };

  // Helper function to safely get error message as string
  const getErrorString = (errorValue) => {
    if (typeof errorValue === 'string') {
      return errorValue;
    }
    if (errorValue && typeof errorValue === 'object') {
      return JSON.stringify(errorValue);
    }
    return 'Đã xảy ra lỗi';
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

          {/* Right side with reset password form */}
          <div className="md:w-1/2 p-8">
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-lime-500 mb-6 text-center">Đặt lại mật khẩu</h1>
                
                {tokenVerificationInProgress ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500 mb-4"></div>
                    <p className="text-gray-600">Đang xác thực...</p>
                  </div>
                ) : !tokenValid ? (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
                    <h3 className="font-bold mb-2">Không thể đặt lại mật khẩu</h3>
                    <p>{getErrorString(errors.token) || 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'}</p>
                    <Link to="/login" className="mt-4 inline-block text-lime-500 hover:text-lime-600 font-medium">
                      Quay lại trang đăng nhập
                    </Link>
                  </div>
                ) : resetSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 text-green-700 p-4 rounded-lg text-center"
                  >
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="font-bold text-lg mb-2">Đặt lại mật khẩu thành công!</h3>
                    <p>Mật khẩu của bạn đã được cập nhật.</p>
                    <p className="mt-2">Đang chuyển hướng về trang đăng nhập...</p>
                  </motion.div>
                ) : (
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    {/* General error message */}
                    {errors.general && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {getErrorString(errors.general)}
                      </div>
                    )}
                    
                    <div>
                      <h2 className="text-gray-700 font-medium mb-4">Tạo mật khẩu mới</h2>
                    </div>
                    
                    {/* Password field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="password" className="block text-gray-500 font-bold">
                          Mật khẩu mới
                        </label>
                        <button
                          type="button"
                          onClick={generateStrongPassword}
                          className="text-xs bg-lime-100 text-lime-700 px-2 py-1 rounded hover:bg-lime-200 transition-colors flex items-center"
                          disabled={isGeneratingPassword}
                        >
                          {isGeneratingPassword ? (
                            <svg className="animate-spin h-3 w-3 mr-1 text-lime-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                            </svg>
                          )}
                          Tạo mật khẩu
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          aria-invalid={errors.password ? "true" : "false"}
                          aria-describedby={errors.password ? "password-error" : undefined}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={toggleShowPassword}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p id="password-error" className="text-red-500 text-sm mt-1">
                          {getErrorString(errors.password)}
                        </p>
                      )}
                      
                      {/* Password strength meter */}
                      {formData.password && <PasswordStrengthMeter password={formData.password} />}
                      
                      {/* Password requirements hint */}
                      <div className="text-xs text-gray-500 mt-1">
                        <p>Mật khẩu phải có ít nhất 8 ký tự.</p>
                        <p>Nên có chữ hoa, chữ thường, số và ký tự đặc biệt để tăng độ bảo mật.</p>
                      </div>
                    </div>
                    
                    {/* Confirm Password field */}
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-gray-500 font-bold mb-1">
                        Xác nhận mật khẩu
                      </label>
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        aria-invalid={errors.confirmPassword ? "true" : "false"}
                        aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                      />
                      {errors.confirmPassword && (
                        <p id="confirm-password-error" className="text-red-500 text-sm mt-1">
                          {getErrorString(errors.confirmPassword)}
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
                      ) : 'Đặt lại mật khẩu'}
                    </button>
                    
                    <div className="text-center mt-4">
                      <Link to="/login" className="text-lime-500 hover:text-lime-600 font-medium">
                        Quay lại trang đăng nhập
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
