import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../config/api';

const ChangePassword = () => {
  const [step, setStep] = useState('form'); // 'form' -> 'code'
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [code, setCode] = useState('');
  const [sentToEmail, setSentToEmail] = useState('');
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveMessage.type === 'success') {
      const timer = setTimeout(() => {
        setSaveMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const toggleShow = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePasswords = () => {
    if (!formData.current_password) {
      setSaveMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return false;
    }
    if (formData.new_password.length < 6) {
      setSaveMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return false;
    }
    if (formData.new_password !== formData.confirm_password) {
      setSaveMessage({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return false;
    }
    return true;
  };

  // Step 1: request the OTP (also verifies current password server-side)
  const requestCode = useCallback(async () => {
    setSaveMessage({ type: '', text: '' });
    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE}/auth/change-password/request-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ current_password: formData.current_password })
      });
      const data = await response.json();
      if (response.ok) {
        setSentToEmail(data.email || '');
        setStep('code');
        setResendCountdown(60);
        setSaveMessage({ type: 'success', text: data.message || 'Đã gửi mã xác thực tới email của bạn.' });
      } else {
        setSaveMessage({ type: 'error', text: data.detail || 'Không gửi được mã xác thực. Vui lòng thử lại.' });
      }
    } catch (error) {
      console.error('Error requesting change-password code:', error);
      setSaveMessage({ type: 'error', text: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
    } finally {
      setIsSending(false);
    }
  }, [formData.current_password]);

  const handleSendCode = (e) => {
    e.preventDefault();
    if (!validatePasswords()) return;
    requestCode();
  };

  // Step 2: confirm with the OTP
  const handleConfirm = async (e) => {
    e.preventDefault();
    setSaveMessage({ type: '', text: '' });
    if (!code.trim()) {
      setSaveMessage({ type: 'error', text: 'Vui lòng nhập mã xác thực.' });
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, code: code.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setSaveMessage({ type: 'success', text: data.message || 'Đổi mật khẩu thành công!' });
        // Reset everything back to the initial form
        setFormData({ current_password: '', new_password: '', confirm_password: '' });
        setCode('');
        setSentToEmail('');
        setStep('form');
      } else {
        setSaveMessage({ type: 'error', text: data.detail || 'Không thể đổi mật khẩu. Vui lòng thử lại.' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setSaveMessage({ type: 'error', text: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
    } finally {
      setIsSaving(false);
    }
  };

  const backToForm = () => {
    setStep('form');
    setCode('');
    setSaveMessage({ type: '', text: '' });
  };

  const passwordField = (label, name, showKey, placeholder) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={showPassword[showKey] ? 'text' : 'password'}
          value={formData[name]}
          onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
          className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#0096b1] focus:border-[#0096b1]"
          placeholder={placeholder}
          disabled={isSending}
          autoComplete={showKey === 'current' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={() => toggleShow(showKey)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={showPassword[showKey] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {showPassword[showKey] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h2 className="text-2xl text-center font-bold mb-6">Đổi Mật Khẩu</h2>

        {saveMessage.text && (
          <div className={`mb-6 p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
            {saveMessage.text}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            {passwordField('Mật khẩu hiện tại', 'current_password', 'current', 'Nhập mật khẩu hiện tại')}
            {passwordField('Mật khẩu mới', 'new_password', 'next', 'Ít nhất 6 ký tự')}
            {passwordField('Xác nhận mật khẩu mới', 'confirm_password', 'confirm', 'Nhập lại mật khẩu mới')}

            <p className="text-sm text-gray-500">
              Vì lý do bảo mật, chúng tôi sẽ gửi một mã xác thực về email của bạn để xác nhận việc đổi mật khẩu.
            </p>

            <button
              type="submit"
              disabled={isSending}
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors
                ${isSending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#0096b1]/80 hover:bg-[#0096b1]/100'}`} >
              {isSending ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-6">
            <button
              type="button"
              onClick={backToForm}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </button>

            <p className="text-sm text-gray-600">
              Nhập mã xác thực gồm 6 chữ số đã gửi tới
              {sentToEmail ? <span className="font-medium"> {sentToEmail}</span> : ' email của bạn'}.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mã xác thực</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border rounded-lg tracking-[0.5em] text-center text-lg font-semibold focus:ring-2 focus:ring-[#0096b1] focus:border-[#0096b1]"
                placeholder="______"
                disabled={isSaving}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Chưa nhận được mã?</span>
              <button
                type="button"
                onClick={requestCode}
                disabled={resendCountdown > 0 || isSending}
                className={`font-medium ${resendCountdown > 0 || isSending
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-[#0096b1] hover:underline'}`}
              >
                {resendCountdown > 0 ? `Gửi lại sau ${resendCountdown}s` : (isSending ? 'Đang gửi...' : 'Gửi lại mã')}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors
                ${isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#0096b1]/80 hover:bg-[#0096b1]/100'}`} >
              {isSaving ? 'Đang Lưu...' : 'Đổi Mật Khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
