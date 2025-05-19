import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import EditProfile from './EditProfile';
import ExamHistory from './ExamHistory';
import Navbar from './Navbar';
import { User, Edit, History, ChevronLeft, ChevronRight, BarChart, Headphones, PenTool, ArrowLeft, ArrowRight } from 'lucide-react';

const ProfilePage = () => {
  // Add accountStatus state
  const [profileData, setProfileData] = useState(null);
  const [testStats, setTestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('profile'); // 'profile', 'edit', 'history'
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [statsSection, setStatsSection] = useState(0); // 0 for overview, 1 for detailed stats
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [accountStatus, setAccountStatus] = useState(null);
  const [vipInfo, setVipInfo] = useState(null);

  // Update fetchData to also get account status
  const fetchData = useCallback(async () => {
    try {
      // Fetch profile data
      const profileResponse = await fetch('http://localhost:8000/student/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Fetch test statistics
      const statsResponse = await fetch('http://localhost:8000/student/my-test-statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Fetch account status for students
      if (localStorage.getItem('role') === 'student') {
        const accountResponse = await fetch('http://localhost:8000/account-status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          setAccountStatus(accountData);
        }
      }

      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setProfileData(data);
        // Update timestamp to force image refresh
        setImageTimestamp(Date.now());
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTestStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add an effect to refresh data when switching back to profile view
  useEffect(() => {
    if (activeView === 'profile') {
      fetchData();
    }
  }, [activeView, fetchData]);

  // Fetch VIP info for customers
  useEffect(() => {
    if (localStorage.getItem('role') === 'customer') {
      fetch('http://localhost:8000/customer/vip/remaining-days', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(res => res.json())
        .then(data => setVipInfo(data));
    }
  }, []);

  const renderMainContent = () => {
    switch (activeView) {
      case 'edit':
        return <EditProfile onProfileUpdate={fetchData} />;
      case 'history':
        return <ExamHistory />;
      default:
        return (
          <div className="flex-1">
            <div className="flex items-center gap-6 mb-8">
              <img
                src={profileData?.image_url ? `${profileData.image_url}?t=${imageTimestamp}` : "/default-avatar.jpg"}
                alt={profileData?.username}
                className="w-20 h-20 rounded-2xl object-cover"
                key={imageTimestamp} // Force re-render when timestamp changes
              />
              <div>
                <h1 className="text-2xl font-semibold">{profileData?.username}</h1>
                <p className="text-gray-500 text-sm">{profileData?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Đang hoạt động
                  </div>
                  
                  {localStorage.getItem('role') === 'student' && accountStatus && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {accountStatus.is_active ? (
                        <span>Thời gian hoạt động còn {accountStatus.remaining_days} ngày</span>
                      ) : accountStatus.activated_at === null ? (
                        <span>Chưa kích hoạt</span>
                      ) : (
                        <span>Đã hết hạn</span>
                      )}
                    </div>
                  )}
                  {/* VIP badge for customer role */}
                  {localStorage.getItem('role') === 'customer' && vipInfo && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {vipInfo.has_active_subscription
                        ? <>Gói VIP: còn {vipInfo.remaining_days} ngày ({vipInfo.package_name})</>
                        : <>Chưa có gói VIP</>
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative min-h-[400px]">
              {/* Section navigation */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {statsSection === 0 ? "Tổng quan thống kê" : "Thống kê chi tiết"}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setStatsSection(0)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      statsSection === 0 
                        ? 'bg-lime-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Tổng quan
                  </button>
                  <button 
                    onClick={() => setStatsSection(1)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      statsSection === 1 
                        ? 'bg-lime-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Chi tiết
                  </button>
                </div>
              </div>

              {/* Navigation arrows */}
              {statsSection === 0 && (
                <button 
                  onClick={() => setStatsSection(1)}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 z-10"
                  aria-label="Xem thống kê chi tiết"
                >
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                </button>
              )}
              
              {statsSection === 1 && (
                <button 
                  onClick={() => setStatsSection(0)}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 z-10"
                  aria-label="Quay lại tổng quan"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}

              {/* Section 1: Overview Statistics */}
              <div className={`transition-all duration-300 w-full ${
                statsSection === 0 ? 'block' : 'hidden'
              }`}>
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Tổng số bài thi</h3>
                    <p className="text-3xl font-bold text-gray-900">{testStats?.total_exams_completed || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Bài nghe đã hoàn thành</h3>
                    <p className="text-3xl font-bold text-gray-900">{testStats?.listening_statistics?.exams_completed || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Bài viết đã làm</h3>
                    <p className="text-3xl font-bold text-gray-900">{testStats?.writing_statistics?.tasks_completed || 0}</p>
                  </div>
                </div>

                {testStats?.latest_test && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Bài thi gần nhất</h2>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-lg line-clamp-1">Tên bài thi: {testStats.latest_test.exam_title}</h4>
                          <p className="text-sm text-gray-500 mt-1">Ngày hoàn thành: {new Date(testStats.latest_test.completion_date).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}</p>
                        </div>
                        <div className="text-right">
                        <span className="text-2xl font-bold text-lime-500">{testStats.latest_test.total_score}</span>
                        <span className="text-sm text-gray-500 ml-1">Điểm</span>
                      </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Link 
                        to={`/exam-result/${testStats.latest_test.result_id}`}
                        className="text-sm text-lime-500 hover:text-lime-600 font-medium inline-flex items-center"
                      >
                        Xem chi tiết
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Detailed Statistics */}
              <div className={`transition-all duration-300 w-full ${
                statsSection === 1 ? 'block' : 'hidden'
              }`}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Headphones className="w-5 h-5 text-lime-500" />
                      <h2 className="text-xl font-semibold">Thống kê bài nghe</h2>
                    </div>
                    
                    {testStats?.listening_statistics?.exams_completed > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-gray-500 text-xs font-medium mb-1">Độ chính xác trung bình</h3>
                            <p className="text-xl font-bold text-gray-900">{testStats.listening_statistics.average_accuracy}%</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-gray-500 text-xs font-medium mb-1">Điểm trung bình</h3>
                            <p className="text-xl font-bold text-gray-900">{testStats.listening_statistics.average_score}</p>
                          </div>
                        </div>
                        
                        {testStats.listening_statistics.exams.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Bài thi gần đây</h3>
                            {testStats.listening_statistics.exams.slice(0, 2).map((exam, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div>
                                  <h4 className="font-medium text-sm">{exam.exam_title}</h4>
                                  <p className="text-xs text-gray-500">{new Date(exam.completion_date).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div className="text-right">
                                  <span className="font-medium text-lime-500">{exam.accuracy.toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Chưa có bài nghe nào được hoàn thành</p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <PenTool className="w-5 h-5 text-lime-500" />
                      <h2 className="text-xl font-semibold">Thống kê bài viết</h2>
                    </div>
                    
                    {testStats?.writing_statistics?.tests_attempted > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-gray-500 text-xs font-medium mb-1">Bài thi đã thử</h3>
                            <p className="text-xl font-bold text-gray-900">{testStats.writing_statistics.tests_attempted}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-gray-500 text-xs font-medium mb-1">Phần đã hoàn thành</h3>
                            <p className="text-xl font-bold text-gray-900">{testStats.writing_statistics.tasks_completed}</p>
                          </div>
                        </div>
                        
                        {testStats.writing_statistics.tests.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Bài thi gần đây</h3>
                            {testStats.writing_statistics.tests.slice(0, 2).map((test, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div>
                                  <h4 className="font-medium text-sm">{test.title}</h4>
                                  <p className="text-xs text-gray-500">{new Date(test.latest_update).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    test.is_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {test.is_completed ? 'Hoàn thành' : `${test.parts_completed}/${test.total_parts}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Chưa có bài viết nào được thử</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Add this function to handle account activation
  const handleActivateAccount = async () => {
    try {
      const response = await fetch('http://localhost:8000/student/activate-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccountStatus(data);
      }
    } catch (error) {
      console.error('Error activating account:', error);
    }
  };

  // Then in the UI, add this below the status badges:
  {localStorage.getItem('role') === 'student' && 
   accountStatus && 
   accountStatus.is_active === 'inactive' && (
    <button
      onClick={handleActivateAccount}
      className="ml-2 text-xs px-2 py-1 bg-lime-500 text-white rounded-md hover:bg-lime-600 transition-colors"
    >
      Kích hoạt
    </button>
  )}

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-lg p-6 mx-auto">
          <div className="flex gap-6">
            <div className={`${menuCollapsed ? 'w-16' : 'w-64'} border-r border-gray-100 pr-6 transition-all duration-300`}>
              <div className="flex items-center justify-center gap-2 mb-8 relative">
                {!menuCollapsed && <span className="font-medium font-bold">Hồ sơ học viên</span>}
                <button 
                  onClick={() => setMenuCollapsed(!menuCollapsed)} 
                  className="absolute right-0 p-1 hover:bg-gray-100 rounded-full font-bold"
                  aria-label={menuCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
                >
                  {menuCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
              <hr/>
              <nav className="space-y-4 mt-3">
                <div 
                  className={`flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-gray-50 ${
                    activeView === 'profile' ? 'text-lime-500 bg-lime-50' : 'text-gray-600'
                  }`}
                  onClick={() => setActiveView('profile')}
                  title={menuCollapsed ? "Tổng quan hồ sơ" : ""}
                >
                  <User className="w-5 h-5 min-w-5" />
                  {!menuCollapsed && <span>Tổng quan hồ sơ</span>}
                </div>
                <div 
                  className={`flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-gray-50 ${
                    activeView === 'edit' ? 'text-lime-500 bg-lime-50' : 'text-gray-600'
                  }`}
                  onClick={() => setActiveView('edit')}
                  title={menuCollapsed ? "Chỉnh sửa hồ sơ" : ""}
                >
                  <Edit className="w-5 h-5 min-w-5" />
                  {!menuCollapsed && <span>Chỉnh sửa hồ sơ</span>}
                </div>
                <div 
                  className={`flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-gray-50 ${
                    activeView === 'history' ? 'text-lime-500 bg-lime-50' : 'text-gray-600'
                  }`}
                  onClick={() => setActiveView('history')}
                  title={menuCollapsed ? "Lịch sử bài thi" : ""}
                >
                  <History className="w-5 h-5 min-w-5" />
                  {!menuCollapsed && <span>Lịch sử bài thi</span>}
                </div>
              </nav>
            </div>

            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
