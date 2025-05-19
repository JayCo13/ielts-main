import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Clock, BarChart, Search, Filter, ChevronLeft, ChevronRight, User, PhoneCall, AlertTriangle, Lock } from 'lucide-react';
import Navbar from './Navbar';
import { canAccessExam } from '../utils/examAccess';

const Listening_Fe = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [testToRetake, setTestToRetake] = useState(null);
  const [isVIP, setIsVIP] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [difficulty, setDifficulty] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const dropdownRef = useRef(null);
  const testsPerPage = 6;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const currentUser = localStorage.getItem('username');
    if (currentUser) {
      setUsername(currentUser);
    }

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
console.log("vip",isVIP);
 
   // Update the fetchData function
   useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [testsResponse, subscriptionResponse] = await Promise.all([
          fetch('http://localhost:8000/student/available-listening-exams', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:8000/customer/vip/subscription/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (testsResponse.ok && subscriptionResponse.ok) {
          const [testsData, subscriptionData] = await Promise.all([
            testsResponse.json(),
            subscriptionResponse.json()
          ]);
          
          setAccountStatus(subscriptionData);
          
          // Updated VIP access logic
          const hasListeningAccess = subscriptionData.is_subscribed && (
            subscriptionData.package_type === 'all_skills' || 
            (subscriptionData.package_type === 'single_skill' && 
             subscriptionData.skill_type === 'listening')
          );
          
          setIsVIP(hasListeningAccess);
          setTests(testsData.map(exam => ({
            id: exam.exam_id,
            title: exam.title,
            created_at: exam.created_at,
            difficulty: "Medium",
            duration: exam.duration ? `${exam.duration} minutes` : "30 minutes",
            questions: 40,
            totalMarks: exam.total_marks || 40,
            isCompleted: exam.is_completed || false
          })));
        } else if (testsResponse.status === 401 || subscriptionResponse.status === 401) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleStartTest = (test) => {
    navigate(`/listening_test_room`, { state: { examId: test.id } });
  };

  const handleRetakeTest = (test) => {
    setTestToRetake(test);
    setShowConfirmDialog(true);
  };

  const confirmRetake = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/student/listening/exam/${testToRetake.id}/retake`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        navigate(`/listening_test_room`, { state: { examId: testToRetake.id } });
      } else {
        alert('Failed to reset the test. Please try again.');
      }
    } catch (error) {
      console.error('Error retaking test:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setShowConfirmDialog(false);
    }
  };

  const [sortOrder, setSortOrder] = useState('latest');

  const filteredTests = tests
    .filter(test => test.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'latest') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else {
        return new Date(a.created_at) - new Date(b.created_at);
      }
    });

  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="text-gray-500 hover:text-lime-500">
                Home
              </Link>
            </li>
            <li>
              <span className="text-gray-400 mx-2">/</span>
            </li>
            <li>
              <span className="text-lime-500 font-medium">
                Listening Tests
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm bài thi..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="latest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTests.map((test, index) => (
            <div 
              key={test.id} 
              className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow relative ${
                !isVIP && (index + indexOfFirstTest) >= 3 ? 'opacity-60' : ''
              }`}
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{test.title}</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>30 - 36 phút</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <BarChart className="w-4 h-4 mr-2" />
                    <span>{test.questions} câu hỏi</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {test.isCompleted ? (
                      <span className="text-lime-600 font-medium">Đã hoàn thành</span>
                    ) : (
                      <span>Chưa làm bài</span>
                    )}
                  </div>
                  
                  {(!isVIP && (index + indexOfFirstTest) >= 3) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50/80 to-gray-100/95 backdrop-blur-sm rounded-lg transition-all duration-300 hover:bg-gradient-to-b hover:from-gray-50/90 hover:to-gray-100/98 group">
                      <div className="text-center transform transition-transform duration-300 group-hover:scale-105">
                        <div className="relative">
                          <Lock className="w-10 h-10 text-lime-500 mx-auto mb-3 animate-bounce" />
                          <div className="absolute -inset-1 bg-lime-200 opacity-30 rounded-full blur animate-pulse"></div>
                        </div>
                        <span className="text-gray-900 font-semibold block mb-2 text-lg">
                          Nâng cấp VIP để mở khóa
                        </span>
                        <Link
                          to="/vip-packages"
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg hover:from-lime-600 hover:to-lime-700 transition-all duration-300 shadow-lg hover:shadow-lime-200 font-medium text-sm"
                        >
                          Xem gói VIP
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => test.isCompleted ? handleRetakeTest(test) : handleStartTest(test)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        test.isCompleted 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-lime-500 hover:bg-lime-600 text-white'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>{test.isCompleted ? 'Làm lại' : 'Bắt đầu'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center items-center space-x-4 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={3}/>
          </button>
          <span className="text-gray-600 font-bold">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={3}/>
          </button>
        </div>
      </div>
      
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Xác nhận làm lại</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn làm lại bài thi này? Các câu trả lời trước đó sẽ bị xóa.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmRetake}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Listening_Fe;

const ListeningTests = () => {
  const [tests, setTests] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [userStatus, setUserStatus] = useState({
    role: localStorage.getItem('role'),
    isVIP: false
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testsResponse, historyResponse, vipStatusResponse] = await Promise.all([
          fetch('http://localhost:8000/listening/tests', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('http://localhost:8000/student/my-exam-history', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('http://localhost:8000/customer/vip/subscription/status', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ]);

        const testsData = await testsResponse.json();
        const historyData = await historyResponse.json();
        const vipData = await vipStatusResponse.json();

        setTests(testsData);
        setExamHistory(historyData);
        setUserStatus(prev => ({
          ...prev,
          isVIP: vipData.is_subscribed
        }));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const renderAccessButton = (test) => {
    const { canAccess, message } = canAccessExam(
      userStatus.role,
      userStatus.isVIP,
      test.exam_access_type,
      examHistory
    );

    if (!canAccess) {
      return (
        <div className="flex items-center">
          <span className="text-red-500 text-sm mr-2">{message}</span>
          {userStatus.role === 'customer' && !userStatus.isVIP && (
            <Link
              to="/vip-packages"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Upgrade to VIP
            </Link>
          )}
        </div>
      );
    }

    return (
      <Link
        to="/listening_test_room"
        state={{ testId: test.id }}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Start Test
      </Link>
    );
  };
  // Update the rendering of tests to use renderAccessButton
};
