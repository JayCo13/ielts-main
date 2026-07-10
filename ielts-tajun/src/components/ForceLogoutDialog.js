import React from 'react';

const DEFAULT_TOTAL = 40;

const ForceLogoutDialog = ({ isOpen, message, secondsRemaining }) => {
  if (!isOpen) return null;
  const total = DEFAULT_TOTAL;
  const sec = Number.isFinite(secondsRemaining) ? secondsRemaining : total;
  const percent = Math.max(0, Math.min(100, Math.round(((total - sec) / total) * 100)));

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.25" />
              <rect x="11" y="6" width="2" height="8" fill="currentColor" />
              <rect x="11" y="16" width="2" height="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Phát hiện đăng nhập bất thường!</h2>
            <p className="text-sm text-gray-500">Cảnh báo bảo mật</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="text-gray-700 space-y-2">
            <p>• Hệ thống phát hiện tài khoản của bạn đang được đăng nhập trên nhiều thiết bị.</p>
            <p>• Vui lòng chỉ sử dụng một tài khoản trên một thiết bị và một trình duyệt tại cùng một thời điểm.</p>
            <p>• Vui lòng không chia sẻ tài khoản để tránh sự cố tương tự.</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">Tự động đăng xuất sau</span>
              <span className="text-base font-semibold text-red-600">{sec} giây</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-red-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-red-500">
            Hệ thống sẽ tự động cho phép đăng nhập sau khi hết thời gian chờ.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForceLogoutDialog;
