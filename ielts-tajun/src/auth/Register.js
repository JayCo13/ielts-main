import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import animationData from '../effect/Register.json';
import loadingAnimation from '../effect/loading.json';
// Add this import for Google login
import { startStatusPing } from '../utils/statusManager';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    // If email field changes, reset validation
    if (name === 'email') {
      setIsEmailValid(false);
    }

    // Calculate password strength if password field changes
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };

  // Verify email with the backend
  const verifyEmail = async () => {
    // Only verify if there's an email and it has a valid format
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      return;
    }

    setIsVerifyingEmail(true);
    setErrors(prev => ({ ...prev, email: '' }));

    try {
      const response = await fetch('http://localhost:8000/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.valid) {
          setIsEmailValid(true);
        } else {
          setErrors(prev => ({
            ...prev,
            email: data.message || 'Email không hợp lệ'
          }));
          setIsEmailValid(false);
        }
      } else {
        setErrors(prev => ({
          ...prev,
          email: 'Lỗi xác thực email. Vui lòng thử lại.'
        }));
        setIsEmailValid(false);
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        email: 'Lỗi kết nối. Vui lòng thử lại sau.'
      }));
      setIsEmailValid(false);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Calculate password strength on a scale of 0-100
  const calculatePasswordStrength = (password) => {
    // Start with 0 strength
    let strength = 0;
    
    if (password.length === 0) {
      setPasswordStrength(0);
      return;
    }

    // Add strength based on length (up to 30 points)
    const lengthScore = Math.min(30, Math.floor(password.length * 3));
    strength += lengthScore;
    
    // Add strength for uppercase letters (up to 20 points)
    if (/[A-Z]/.test(password)) {
      const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
      strength += Math.min(20, uppercaseCount * 5);
    }
    
    // Add strength for lowercase letters (up to 10 points)
    if (/[a-z]/.test(password)) {
      const lowercaseCount = (password.match(/[a-z]/g) || []).length;
      strength += Math.min(10, lowercaseCount * 2);
    }
    
    // Add strength for numbers (up to 20 points)
    if (/[0-9]/.test(password)) {
      const numberCount = (password.match(/[0-9]/g) || []).length;
      strength += Math.min(20, numberCount * 5);
    }
    
    // Add strength for special characters (up to 20 points)
    if (/[^A-Za-z0-9]/.test(password)) {
      const specialCount = (password.match(/[^A-Za-z0-9]/g) || []).length;
      strength += Math.min(20, specialCount * 5);
    }
    
    // Cap strength at 100
    strength = Math.min(100, strength);
    
    setPasswordStrength(strength);
  };

  // Generate a strong random password
  const generateStrongPassword = () => {
    const length = 12; // Length of the password
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    let allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    let password = '';
    
    // Ensure we have at least one of each type of character
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password to make it random
    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    
    setFormData({
      ...formData,
      password,
      confirmPassword: password
    });
    
    calculatePasswordStrength(password);
  };

  // Get the color for the strength meter
  const getStrengthColor = () => {
    if (passwordStrength < 30) return 'bg-red-600';
    if (passwordStrength < 60) return 'bg-yellow-500';
    if (passwordStrength < 80) return 'bg-lime-500';
    if (passwordStrength === 100) return 'bg-lime-500';
    return 'bg-green-600';
  };

  // Get the strength label
  const getStrengthLabel = () => {
    if (passwordStrength < 30) return 'Yếu';
    if (passwordStrength < 60) return 'Trung bình';
    if (passwordStrength < 80) return 'Mạnh';
    if (passwordStrength === 100) return 'Cực Mạnh';
    return 'Mạnh';
  };

  const validateForm = async () => {
    let isValid = true;
    const newErrors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: ''
    };

    if (!formData.username.trim()) {
      newErrors.username = 'Tên người dùng là bắt buộc';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Định dạng email không hợp lệ';
      isValid = false;
    } else if (!isEmailValid) {
      // Verify email if not already validated
      setIsVerifyingEmail(true);
      try {
        const response = await fetch('http://localhost:8000/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email
          })
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          newErrors.email = data.message || 'Email không hợp lệ';
          isValid = false;
        } else {
          setIsEmailValid(true);
        }
      } catch (error) {
        newErrors.email = 'Lỗi kết nối. Vui lòng thử lại sau.';
        isValid = false;
      } finally {
        setIsVerifyingEmail(false);
      }
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        
        // Show success message
        setRegistrationSuccess(true);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        // Handle specific error messages from the API
        if (data.detail === "Username already registered") {
          setErrors(prev => ({ ...prev, username: 'Tên người dùng đã tồn tại' }));
        } else if (data.detail === "Email already registered") {
          setErrors(prev => ({ ...prev, email: 'Email đã được đăng ký' }));
        } else {
          setErrors(prev => ({ ...prev, general: data.detail || 'Đăng ký thất bại. Vui lòng thử lại.' }));
        }
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: 'Lỗi kết nối. Vui lòng thử lại sau.' }));
    } finally {
      setIsLoading(false);
    }
  };

// Add this useEffect after your state declarations
useEffect(() => {
    // Check if this is a redirect from Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (token) {
      // Parse the JWT token to get user info
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userData = JSON.parse(jsonPayload);
        
        // Store user data in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('username', userData.username);
        
        // Start status ping
        startStatusPing();
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (e) {
        setErrors(prev => ({ ...prev, general: 'Failed to process Google login. Please try again.' }));
      }
    } else if (error) {
      setErrors(prev => ({ ...prev, general: 'Google login failed: ' + error }));
    }
  }, [navigate]);
  // Add Google login handler
  const handleGoogleLogin = async () => {
    try {
      // Redirect to the new Google auth endpoint
      window.location.href = 'http://localhost:8000/google-auth';
    } catch (error) {
      setErrors(prev => ({ ...prev, general: 'Google login failed. Please try again.' }));
    }
  };

  // Update useEffect to handle the new auth-callback format
  useEffect(() => {
    // Check if this is a redirect from Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const username = urlParams.get('username');
    const email = urlParams.get('email');
    const role = urlParams.get('role');
    const error = urlParams.get('error');
    
    if (token) {
      try {
        // Store user data directly from URL params
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        
        // Start status ping
        startStatusPing();
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (e) {
        setErrors(prev => ({ ...prev, general: 'Failed to process Google login. Please try again.' }));
      }
    } else if (error) {
      setErrors(prev => ({ ...prev, general: 'Google login failed: ' + error }));
    }
  }, [navigate]);

  // Success message component
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-teal-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-lime-100 rounded-full mx-auto flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-lime-600 mb-2">Đăng Ký Thành Công!</h2>
          <p className="text-gray-600 mb-4">Tài khoản của bạn đã được tạo thành công. Chuyển hướng đến trang đăng nhập...</p>
          <div className="w-full h-20 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <Lottie 
                animationData={loadingAnimation}
                loop={true}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                style={{ transform: 'scale(1)' }}
              />
            </div>
          </div>

          {/* Right side with registration form */}
          <div className="md:w-1/2 p-8">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-lime-500 mb-6 text-center">Tạo Tài Khoản</h1>

                {errors.general && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {errors.general}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* Username field */}
                  <div className="space-y-1">
                    <label className="block text-gray-500 font-bold mb-1">Tên người dùng</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                        errors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                    )}
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="block text-gray-500 font-bold mb-1">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={verifyEmail}
                        className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                          errors.email ? 'border-red-500' : isEmailValid ? 'border-green-500' : 'border-gray-300'
                        }`}
                      />
                      {isVerifyingEmail ? (
                        <div className="absolute right-3 top-3">
                          <svg className="animate-spin h-5 w-5 text-lime-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : isEmailValid ? (
                        <div className="absolute right-3 top-3">
                          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      ) : null}
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                    {isEmailValid && (
                      <p className="text-green-500 text-sm mt-1">Email hợp lệ</p>
                    )}
                  </div>

                  {/* Password field with strength meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-gray-500 font-bold">Mật khẩu</label>
                      <button 
                        type="button" 
                        onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                        className="text-xs text-lime-600 hover:text-lime-700"
                      >
                        {showPasswordGenerator ? 'Ẩn gợi ý' : 'Gợi ý mật khẩu mạnh'}
                      </button>
                    </div>
                    
                    {showPasswordGenerator && (
                      <div className="bg-lime-50 p-3 rounded-lg mb-3">
                        <p className="text-sm text-gray-600 mb-2">Tạo mật khẩu mạnh với các ký tự khác nhau để tăng độ an toàn.</p>
                        <button 
                          type="button" 
                          onClick={generateStrongPassword}
                          className="bg-lime-500 text-white text-sm py-1.5 px-3 rounded hover:bg-lime-600"
                        >
                          Tạo mật khẩu ngẫu nhiên
                        </button>
                      </div>
                    )}
                    
                    <div className="relative">
                      <input
                        type={passwordVisible ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {passwordVisible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      
                      {formData.password && (
                        <div className="absolute right-12 top-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getStrengthColor()}`} 
                                style={{ width: `${passwordStrength}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-16 text-right">{getStrengthLabel()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                    
                    {formData.password && (
                      <ul className="mt-2 text-xs text-gray-500 space-y-1">
                        <li className={`flex items-center ${formData.password.length >= 6 ? 'text-green-600' : ''}`}>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${formData.password.length >= 6 ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          Tối thiểu 6 ký tự
                        </li>
                        <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(formData.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          Có ít nhất 1 chữ in hoa
                        </li>
                        <li className={`flex items-center ${/[0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(formData.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          Có ít nhất 1 chữ số
                        </li>
                        <li className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${/[^A-Za-z0-9]/.test(formData.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                          Có ít nhất 1 ký tự đặc biệt
                        </li>
                      </ul>
                    )}
                  </div>

                  {/* Confirm Password field */}
                  <div className="space-y-1">
                    <label className="block text-gray-500 font-bold mb-1">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <input
                        type={confirmPasswordVisible ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {confirmPasswordVisible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 px-4 mt-4 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-colors font-medium ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                  </button>
                  
                  {/* Add Google login button */}
                  <div className="mt-6 relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full mt-6 py-3 px-4 border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                      </g>
                    </svg>
                    Đăng ký với Google
                  </button>
                  
                  <p className="mt-6 text-center text-sm text-gray-600">
                    Đã có tài khoản? <Link to="/login" className="text-lime-500 hover:text-lime-600 font-medium">Đăng nhập</Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
