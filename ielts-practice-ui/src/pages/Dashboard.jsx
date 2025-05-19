import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../partials/Sidebar';
import Header from '../partials/Header';
import { UserCircle, RefreshCw, Users, Package, DollarSign, TrendingUp, Clock, AlertCircle, BookOpen, PenTool } from 'lucide-react';
import { toast } from 'react-hot-toast';

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exams, setExams] = useState([]); 
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const notificationSound = useRef(new Audio('/sounds/notification.mp3'));
  const originalTitle = useRef(document.title);
  const [statistics, setStatistics] = useState({
    total_students: 0,
    active_students: 0,
    new_students: 0,
    total_attempts: 0,
    exam_types: {},
    recent_results: [],
    average_active_time: '0h',
    total_exams: 0,
    average_score: 'N/A',
    writing_tests: 0,
    speaking_tests: 0
  });
  const [packageStats, setPackageStats] = useState({
    summary: {
      total_packages: 0,
      active_packages: 0,
      total_subscriptions: 0,
      active_subscriptions: 0
    },
    package_statistics: [],
    recent_transactions: []
  });
  const [revenueStats, setRevenueStats] = useState({
    total_revenue: 0,
    monthly_revenue: []
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkForNewData = async () => {
    try {
      const response = await fetch('http://localhost:8000/admin/dashboard/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.hasNewNotifications) {
          setHasNewNotification(true);
          // Only play sound if the tab is not focused
          if (!document.hasFocus()) {
            notificationSound.current.play().catch(err => console.log('Audio playback failed:', err));
          }
          document.title = '(1) Thông báo mới - IELTS Practice';
          
          // Browser notification
          if (Notification.permission === 'granted') {
            new Notification('Hoạt động mới', {
              body: data.message || 'Bạn có thông báo mới',
              icon: '/favicon.ico',
              silent: true // Don't play the default notification sound
            });
          }
          
          // Show toast notification
          toast.success(data.message || 'Bạn có thông báo mới', {
            duration: 5000,
            position: 'top-right'
          });
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  useEffect(() => {
    // Request notification permission when component mounts
    if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Initial check
    checkForNewData();

    // Check for new notifications every 30 seconds
    const interval = setInterval(checkForNewData, 30000);

    // Reset title when component unmounts
    return () => {
      clearInterval(interval);
      document.title = originalTitle.current;
    };
  }, []);
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
     

      // In fetchDashboardData function, add:
      const examsResponse = await fetch('http://localhost:8000/admin/dashboard/exams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!examsResponse.ok) throw new Error('Không thể tải dữ liệu bài thi');
      const examsData = await examsResponse.json();
      setExams(examsData);
      // Fetch statistics
      const statsResponse = await fetch('http://localhost:8000/admin/dashboard/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!statsResponse.ok) throw new Error('Không thể tải dữ liệu thống kê');
      const statsData = await statsResponse.json();
      setStatistics(statsData);
      
      // Fetch package statistics
      const packagesResponse = await fetch('http://localhost:8000/admin/vip/dashboard/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!packagesResponse.ok) throw new Error('Không thể tải dữ liệu thống kê gói');
      const packagesData = await packagesResponse.json();
      setPackageStats(packagesData);

      // Fetch revenue statistics
      const revenueResponse = await fetch('http://localhost:8000/admin/vip/dashboard/revenue', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!revenueResponse.ok) throw new Error('Không thể tải dữ liệu doanh thu');
      const revenueData = await revenueResponse.json();
      setRevenueStats(revenueData);
      
      // Fetch students
      const studentsResponse = await fetch('http://localhost:8000/admin/dashboard/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!studentsResponse.ok) throw new Error('Không thể tải dữ liệu học viên');
      const studentsData = await studentsResponse.json();
      setStudents(studentsData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header  sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          hasNewNotification={hasNewNotification}
          setHasNewNotification={setHasNewNotification} />

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Dashboard Header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Tổng quan Bảng điều khiển</h1>
                <p className="mt-1 text-sm text-gray-500">Theo dõi hiệu suất và số liệu của nền tảng</p>
              </div>
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới dữ liệu
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                {/* Key Metrics Row */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Revenue Card */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5">
                    <div className="flex items-center">
                      <DollarSign className="w-12 h-12 text-green-500" />
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                          {formatCurrency(revenueStats.total_revenue)}
                        </div>
                        <div className="text-sm text-gray-500">Tổng doanh thu</div>
                      </div>
                    </div>
                  </div>

                  {/* Students Card */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5">
                    <div className="flex items-center">
                      <Users className="w-12 h-12 text-blue-500" />
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                          {statistics.active_students}/{statistics.total_students}
                        </div>
                        <div className="text-sm text-gray-500">Học viên hoạt động/Tổng số</div>
                      </div>
                    </div>
                  </div>

                  {/* Exam Activity Card */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5">
                    <div className="flex items-center">
                      <BookOpen className="w-12 h-12 text-violet-500" />
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                          {statistics.total_exams}
                        </div>
                        <div className="text-sm text-gray-500">Tổng số bài thi đã làm</div>
                      </div>
                    </div>
                  </div>

                  {/* Average Score Card */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5">
                    <div className="flex items-center">
                      <PenTool className="w-12 h-12 text-amber-500" />
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                          {statistics.total_attempts}
                        </div>
                        <div className="text-sm text-gray-500">Tổng số lần thử</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="col-span-12 xl:col-span-8 space-y-6">
                  {/* Student Performance */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                      <h2 className="font-semibold text-gray-800 dark:text-white">Kết quả gần đây</h2>
                    </div>
                    <div className="p-4">
                      <table className="w-full">
                        <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="py-2 text-left">Học viên</th>
                            <th className="py-2 text-left">Bài thi</th>
                            <th className="py-2 text-center">Điểm</th>
                            <th className="py-2 text-right">Ngày hoàn thành</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {statistics.recent_results.map((result) => (
                            <tr key={result.result_id}>
                              <td className="py-2">
                                <div className="font-medium text-gray-800 dark:text-white">
                                  {result.student_name}
                                </div>
                              </td>
                              <td className="py-2">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {result.exam_title}
                                </div>
                              </td>
                              <td className="py-2 text-center">
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {result.score}
                                </span>
                              </td>
                              <td className="py-2 text-right text-sm text-gray-500">
                                {formatDate(result.completion_date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

             
                                 {/* Exam Overview Table */}
                                 <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                      <h2 className="font-semibold text-gray-800 dark:text-white">Tổng quan bài thi</h2>
                    </div>
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                            <tr>
                              <th className="py-2 text-left">Tiêu đề</th>
                              <th className="py-2 text-center">Loại</th>
                              <th className="py-2 text-center">Trạng thái</th>
                              <th className="py-2 text-center">Lần thử</th>
                              <th className="py-2 text-right">Ngày tạo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {exams.slice(0, 7).map((exam) => (
                              <tr key={exam.exam_id}>
                                <td className="py-2">
                                  <div className="font-medium text-gray-800 dark:text-white">
                                    {exam.title}
                                  </div>
                                </td>
                                <td className="py-2 text-center">
                                  <div className="text-sm text-gray-500">
                                    {exam.section_types[0]}
                                  </div>
                                </td>
                                <td className="py-2 text-center">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    exam.is_active
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                  }`}>
                                    {exam.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                  </span>
                                </td>
                                <td className="py-2 text-center text-gray-600 dark:text-gray-400">
                                  {exam.attempts}
                                </td>
                                <td className="py-2 text-right text-sm text-gray-500">
                                  {formatDate(exam.created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Content */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                  {/* Package Summary */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                      <h2 className="font-semibold text-gray-800 dark:text-white">Tổng hợp gói dịch vụ</h2>
                    </div>
                    <div className="p-4">
                      <div className="space-y-4">
                        {packageStats.package_statistics.map((pkg) => (
                          <div key={pkg.package_id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-800 dark:text-white">{pkg.name}</div>
                              <div className="text-sm text-gray-500">{formatCurrency(pkg.price)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(pkg.revenue)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {pkg.paid_subscriptions}/{pkg.total_subscriptions} đăng ký
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                      <h2 className="font-semibold text-gray-800 dark:text-white">Giao dịch gần đây</h2>
                    </div>
                    <div className="p-3">
                      <div className="overflow-y-auto max-h-[500px]">
                        {packageStats.recent_transactions.slice(0, 5).map((transaction) => (
                          <div key={transaction.transaction_id} className="p-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">{transaction.user_email}</div>
                                <div className="text-sm text-gray-500">{transaction.package_name}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-green-600 dark:text-green-400">
                                  {formatCurrency(transaction.amount)}
                                </div>
                                <div className="text-sm text-gray-500">{formatDate(transaction.created_at)}</div>
                              </div>
                            </div>
                            <div className="mt-1">
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                transaction.status === 'completed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}>
                                {transaction.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
