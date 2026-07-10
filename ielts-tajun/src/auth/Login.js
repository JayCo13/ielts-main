import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Lottie from 'lottie-react';
import animationData from '../effect/Login.json';
import { motion, AnimatePresence } from 'framer-motion';
import secureStorage from '../utils/secureStorage';

// Add this import at the top of the file
import { startStatusPing } from '../utils/statusManager';
import { API_BASE } from '../config/api';

// Warning Dialog Component
const WarningDialog = ({ message, isOpen, onClose, countdownTime = 30 }) => {
  const [timer, setTimer] = useState(countdownTime);

  // Reset timer when dialog opens with new countdownTime
  useEffect(() => {
    if (isOpen) {
      setTimer(countdownTime);
    }
  }, [isOpen, countdownTime]);

  // Handle countdown logic
  useEffect(() => {
    let countdown;
    if (isOpen && timer > 0) {
      countdown = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0 && isOpen) {
      onClose();
    }

    return () => {
      if (countdown) {
        clearInterval(countdown);
      }
    };
  }, [isOpen, timer, onClose]);

  if (!isOpen) return null;

  // Format message for better display
  const formatMessage = (msg) => {
    return msg.split('\n').map((line, index) => {
      if (line.trim() === '') {
        return <br key={index} />;
      }

      // Check if line starts with emoji or bullet point
      if (line.startsWith('⚠️') || line.startsWith('🚫')) {
        return (
          <div key={index} className="text-lg font-bold text-red-600 mb-3">
            {line}
          </div>
        );
      } else if (line.startsWith('•')) {
        return (
          <div key={index} className="text-sm text-gray-700 mb-1 ml-4">
            {line}
          </div>
        );
      } else if (line.includes('@') || line.includes('📧') || line.includes('📞')) {
        return (
          <div key={index} className="text-sm text-blue-600 font-medium mb-1">
            {line}
          </div>
        );
      } else {
        return (
          <div key={index} className="text-gray-700 mb-2">
            {line}
          </div>
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
      >
        <div className="bg-red-500 py-4 px-6">
          <h3 className="text-white font-bold text-lg">Cảnh báo bảo mật</h3>
        </div>
        <div className="p-6">
          <div className="mb-6 max-h-96 overflow-y-auto">
            {formatMessage(message)}
          </div>
          <div className="flex justify-between items-center border-t pt-4">
            <div className="text-sm text-gray-500">
              Tự động đóng sau {timer} giây
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    account: ''
  });
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningCountdownTime, setWarningCountdownTime] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Update Google login handler to use the new endpoint
  const handleGoogleLogin = async () => {
    try {
      // Redirect to the new Google auth endpoint
      window.location.href = `${API_BASE}/google-auth`;
    } catch (error) {
      setErrors(prev => ({ ...prev, account: 'Google login failed. Please try again.' }));
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
        localStorage.setItem('role', role); // Store role for badge display
        localStorage.setItem('email', email); // Store email
        secureStorage.setItem('username', username);
        secureStorage.setItem('email', email);

        // Start status ping
        startStatusPing();

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redirect to dashboard
        navigate('/');
      } catch (e) {
        setErrors(prev => ({ ...prev, account: 'Failed to process Google login. Please try again.' }));
      }
    } else if (error) {
      setErrors(prev => ({ ...prev, account: 'Google login failed: ' + error }));
    }
  }, [navigate]);



  const closeWarningDialog = () => {
    setShowWarning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ username: '', password: '', account: '' });

    const formBody = new URLSearchParams();
    formBody.append('username', formData.username);
    formBody.append('password', formData.password);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody
      });

      const data = await response.json();

      if (response.ok) {
        // Reset login attempts on successful login
        setLoginAttempts(0);

        // Store user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role); // Store role for badge display
        localStorage.setItem('email', data.email); // Store email
        secureStorage.setItem('username', data.username);
        secureStorage.setItem('user_id', data.user_id);

        // Store unique session ID for session tracking
        if (data.unique_session_id) {
          secureStorage.setItem('unique_session_id', data.unique_session_id);
        }

        // Start status ping when user logs in
        startStatusPing();

        navigate('/');
      } else {
        // Handle specific HTTP status codes first
        if (response.status === 409) {
          // Account sharing detected (Multiple sessions)
          setWarningMessage('Cảnh báo bảo mật\n\n• Vui lòng chỉ sử dụng một tài khoản trên một thiết bị và một trình duyệt tại cùng một thời điểm.\n\nHãy thử đăng nhập lại sau 10 giây.');
          setWarningCountdownTime(10);
          setShowWarning(true);
          return;
        } else if (response.status === 403) {
          // Account temporarily restricted (should rarely occur with new 60-second system)
          setWarningMessage('Tài khoản của bạn hiện đang trong thời gian chờ do đăng nhập trên nhiều thiết bị. Thời gian chờ còn lại:\n\nVui lòng đợi hết thời gian chờ trước khi thử lại\nVui lòng chỉ sử dụng một tài khoản trên một thiết bị và một trình duyệt tại cùng một thời điểm.\nHệ thống sẽ tự động cho phép đăng nhập sau khi hết thời gian chờ.');
          setWarningCountdownTime(10);
          setShowWarning(true);
          return;
        } else if (response.status === 429) {
          // Account in cooldown due to violations
          const cooldownMatch = data.detail && data.detail.match(/DEVICE_IN_COOLDOWN:(\d+)/);
          const remainingTime = cooldownMatch ? parseInt(cooldownMatch[1]) : 60;

          setWarningMessage(`Tài khoản của bạn hiện đang trong thời gian chờ do đăng nhập trên nhiều thiết bị. Thời gian chờ còn lại: ${remainingTime} giây\n\nVui lòng đợi hết thời gian chờ trước khi thử lại\nVui lòng chỉ sử dụng một tài khoản trên một thiết bị và một trình duyệt tại cùng một thời điểm.\nHệ thống sẽ tự động cho phép đăng nhập sau khi hết thời gian chờ.`);
          setWarningCountdownTime(remainingTime);
          setShowWarning(true);
          return;
        }

        // Increment login attempts for other errors
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        // Handle different error messages
        if (data.detail === "Username does not exist") {
          setErrors(prev => ({ ...prev, username: 'Tên đăng nhập không tồn tại' }));
        } else if (data.detail === "Incorrect password") {
          setErrors(prev => ({ ...prev, password: 'Mật khẩu không chính xác' }));
        } else if (data.detail === "This account has been blocked") {
          setWarningMessage('Tài khoản không hợp lệ.');
          setShowWarning(true);
          return;
        }
        // Check if this is the third attempt
        if (newAttempts === 3) {
          setWarningMessage('Đây là lần cuối cùng đăng nhập. Vui lòng nhập đúng thông tin để tránh bị khóa tài khoản.');
          setShowWarning(true);
        }
        // If more than 3 attempts, show warning message
        else if (newAttempts > 3) {
          setWarningMessage('Tài khoản đã bị khóa tạm thời do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.');
          setWarningCountdownTime(60);
          setShowWarning(true);
        }

        // Clear error messages after 5 seconds
        setTimeout(() => {
          setErrors(prev => ({
            username: prev.username ? '' : prev.username,
            password: prev.password ? '' : prev.password,
            account: ''
          }));
        }, 5000);
      }
    } catch (error) {
      setErrors({ username: 'Lỗi kết nối. Vui lòng thử lại sau.', password: '', account: '' });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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

          {/* Right side with login form */}
          <div className="md:w-1/2 p-8">
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-lime-500 mb-8 text-center">Đăng Nhập Thiieltstrenmay.com</h1>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Username field */}
                  <div className="space-y-2">
                    <label className="block text-gray-500 font-bold mb-1">Tên đăng nhập</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${errors.username ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                    )}
                  </div>

                  {/* Password field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-gray-500 font-bold">Mật khẩu</label>
                      <Link
                        to="/forgot-password"
                        className="text-sm text-lime-500 hover:text-lime-600 font-medium"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all ${errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>

                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                  </div>

                  {/* Account status error message */}
                  {errors.account && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {errors.account}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 mt-6 rounded-lg font-medium transition-colors bg-lime-500 text-white hover:bg-lime-600"
                  >
                    Đăng nhập
                  </button>

                  {/* Add Google login button */}
                  <div className="mt-6 relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Hoặc đăng nhập với</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full mt-6 py-3 px-4 border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                      </g>
                    </svg>
                    Đăng nhập với Google
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                  Chưa có tài khoản? <Link to="/register" className="text-lime-500 hover:text-lime-600 font-medium">Đăng ký</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Dialog */}
      <AnimatePresence>
        {showWarning && (
          <WarningDialog
            message={warningMessage}
            isOpen={showWarning}
            onClose={closeWarningDialog}
            countdownTime={warningCountdownTime}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginForm;

