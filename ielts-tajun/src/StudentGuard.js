import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const StudentGuard = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const studentId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      // If no token or role, just render children (public access)
      if (!token || !role) {
        console.log('StudentGuard: No token or role found, allowing public access');
        setLoading(false);
        return;
      }

      try {
        let endpoint = '';
        if (role === 'student') {
          // Only proceed if we have a valid studentId
          if (!studentId) {
            console.log('StudentGuard: No studentId found');
            setLoading(false);
            return;
          }
          endpoint = `http://localhost:8000/students/student-side/${studentId}`;
        } else if (role === 'customer') {
          endpoint = 'http://localhost:8000/customer/vip/subscription/status';
        }

        if (!endpoint) {
          console.log('StudentGuard: No valid endpoint for role:', role);
          setLoading(false);
          return;
        }

        console.log('StudentGuard: Checking access at endpoint:', endpoint);
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`StudentGuard: ${endpoint} response status:`, response.status);

        if (response.status === 403) {
          console.log('StudentGuard: Access forbidden');
          setStatus({ is_active: false });
        } else {
          const data = await response.json();
          console.log('StudentGuard: Response data:', data);
          
          // For student role, check is_active
          if (role === 'student') {
            console.log('StudentGuard: Student status:', {
              is_active: data.is_active,
              is_active_student: data.is_active_student
            });
            setStatus(data);
          } 
          // For customer role, check is_active
          else if (role === 'customer') {
            console.log('StudentGuard: Customer status:', {
              is_active: data.is_active,
              payment_status: data.payment_status,
              package_name: data.package_name
            });
            setStatus(data);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
    // Optionally, poll every 10 seconds to check for status changes
    const interval = setInterval(checkAccess, 10000);
    return () => clearInterval(interval);
  }, [studentId, token, role]);

  // Persist countdown across reloads
  useEffect(() => {
    if (
      ((role === 'student' || role === 'customer') && status) &&
      (status.is_active === false || status.is_active === 'false')
    ) {
      let endTime = localStorage.getItem('revoked_end_time');
      if (!endTime) {
        endTime = Date.now() + 30000;
        localStorage.setItem('revoked_end_time', endTime);
      } else {
        endTime = Number(endTime);
      }
      const updateCountdown = () => {
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        setCountdown(remaining > 0 ? remaining : 0);
        if (remaining <= 0) {
          localStorage.clear();
          localStorage.removeItem('revoked_end_time');
          navigate('/login', { replace: true });
        }
      };
      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    } else {
      // If not revoked, clean up
      localStorage.removeItem('revoked_end_time');
    }
  }, [status, role, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-bold mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  // If no token or role, allow access (public routes)
  if (!token || !role) {
    return <Outlet />;
  }

  // Debug log before revoked dialog check
  if (role === 'student' && status) {
    console.log('StudentGuard: status before dialog', status);
    console.log('StudentGuard: typeof is_active', typeof status.is_active, status.is_active);
    console.log('StudentGuard: typeof is_active_student', typeof status.is_active_student, status.is_active_student);
  }
  
  // Debug log for customer role
  if (role === 'customer' && status) {
    console.log('StudentGuard: customer status before dialog', status);
    console.log('StudentGuard: typeof is_active', typeof status.is_active, status.is_active);
  }
  
  // Show revoked access dialog for students
  if (
    role === 'student' &&
    status &&
    (status.is_active === false || status.is_active === 'false')
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-bold mb-4 text-red-600">Access Revoked</h2>
          <p className="mb-4">
            Your access has been revoked by the administrator.<br />
            You will be logged out in <span className="font-bold text-red-600">{countdown}</span> seconds.
          </p>
        </div>
      </div>
    );
  }
  
  // Show inactive subscription dialog for customers
  if (
    role === 'customer' &&
    status &&
    (status.is_active === false || status.is_active === 'false')
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-600">Tài khoản đã bị vô hiệu hoá</h2>
          <p className="mb-4">
           Tài khoản của bạn đã bị đội ngũ kiểm duyệt vô hiệu hoá do vi phạm quy tắc của Ieltstrenmay.com
          </p>
          <div className="flex justify-center gap-4">
            <button
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-lime-600 transition-colors"
              onClick={() => navigate('/vip-packages')}
            >
              Liên hệ hỗ trợ
            </button>
            <button
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() => navigate('/')}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show activation dialog only for students who haven't activated their account
  if (role === 'student' && status && (status.is_active_student === false || status.is_active_student === 'false')) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-bold mb-4">Xác nhận tài khoản</h2>
          <p className="mb-4">Bạn cần xác nhận tài khoản để tiếp tục sử dụng hệ thống.</p>
          <button
            className="px-6 py-2 bg-lime-500 text-white rounded-lg"
            onClick={async () => {
              await fetch('http://localhost:8000/student/activate-account', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              });
              window.location.reload();
            }}
          >
            Xác nhận tài khoản
          </button>
        </div>
      </div>
    );
  }
  
  // Show payment status dialog for customers with pending payments
  if (role === 'customer' && status && status.payment_status === 'pending') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-xl font-bold mb-4 text-yellow-600">Thanh toán đang chờ xác nhận</h2>
          <p className="mb-4">
            Gói VIP <span className="font-semibold">{status.package_name}</span> của bạn đang chờ xác nhận thanh toán.
            Vui lòng đợi trong khi quản trị viên xác minh thanh toán của bạn.
          </p>
          <button
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            onClick={() => navigate('/transaction-status', { 
              state: { 
                transactionId: status.transaction_id || 'unknown',
                status: 'pending'
              }
            })}
          >
            Kiểm tra trạng thái
          </button>
        </div>
      </div>
    );
  }

  // If passed all checks, render nested routes!
  return <Outlet />;
};

export default StudentGuard; 