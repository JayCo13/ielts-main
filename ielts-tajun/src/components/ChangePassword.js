import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../config/api';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [isSaving, setIsSaving] = useState(false);
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

  const toggleShow = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveMessage({ type: '', text: '' });

    // Client-side validation
    if (formData.new_password.length < 6) {
      setSaveMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (formData.new_password !== formData.confirm_password) {
      setSaveMessage({ type: 'error', text: 'Mật khẩu mới không khớp.' });
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
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSaveMessage({ type: 'success', text: data.message || 'Đổi mật khẩu thành công!' });
        setFormData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setSaveMessage({
          type: 'error',
          text: data.detail || 'Không thể đổi mật khẩu. Vui lòng thử lại.'
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setSaveMessage({ type: 'error', text: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
    } finally {
      setIsSaving(false);
    }
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
          disabled={isSaving}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {passwordField('Mật khẩu hiện tại', 'current_password', 'current', 'Nhập mật khẩu hiện tại')}
          {passwordField('Mật khẩu mới', 'new_password', 'next', 'Ít nhất 6 ký tự')}
          {passwordField('Xác nhận mật khẩu mới', 'confirm_password', 'confirm', 'Nhập lại mật khẩu mới')}

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
      </div>
    </div>
  );
};

export default ChangePassword;
