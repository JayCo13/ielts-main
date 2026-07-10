import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Clock, BarChart, Search, Filter, ChevronLeft, ChevronRight, User, PhoneCall, AlertTriangle, Lock, ChevronDown, History, CheckCircle2 } from 'lucide-react';

import Navbar from './Navbar';
import { canAccessExam } from '../utils/examAccess';
import { checkTokenExpiration } from '../utils/authUtils';
import secureStorage from '../utils/secureStorage';
import { API_BASE } from '../config/api';

const Listening_Fe = () => {
  // Helper to strip HTML tags from part titles (they may contain rich text HTML)
  const stripHtmlTags = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [testToRetake, setTestToRetake] = useState(null);
  const [isVIP, setIsVIP] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);

  const navigate = useNavigate();
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [difficulty, setDifficulty] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [username, setUsername] = useState('');
  const dropdownRef = useRef(null);
  const [examHistoryDropdowns, setExamHistoryDropdowns] = useState({});
  const [examHistories, setExamHistories] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});
  const examHistoryRefs = useRef({});
  const testsPerPage = 6;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }

      // Check if click is outside any exam history dropdown
      const clickedOutsideHistory = Object.keys(examHistoryRefs.current).every(examId => {
        const ref = examHistoryRefs.current[examId];
        return !ref || !ref.contains(event.target);
      });

      if (clickedOutsideHistory) {
        setExamHistoryDropdowns({});
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
  console.log("vip", isVIP);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem('token');
      // Try to get user_id from secureStorage first, then fall back to localStorage
      let userId = secureStorage.getItem('user_id');
      if (!userId) {
        userId = localStorage.getItem('user_id');
      }

      if (!token || !userId) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/student/user-role/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        } else if (response.status === 401) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [navigate]);

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
          fetch(`${API_BASE}/student/available-listening-exams`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/customer/vip/subscription/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (testsResponse.ok && subscriptionResponse.ok) {
          const [testsData, subscriptionData] = await Promise.all([
            testsResponse.json(),
            subscriptionResponse.json()
          ]);

          setAccountStatus(subscriptionData);

          // Use the new skill-specific access flag (supports multiple subscriptions)
          const hasListeningAccess = subscriptionData.has_listening_access || false;

          setIsVIP(hasListeningAccess);
          setTests(testsData.map(exam => ({
            id: exam.exam_id,
            title: exam.title,
            created_at: exam.created_at,
            difficulty: "Medium",
            duration: exam.duration ? `${exam.duration} minutes` : "30 minutes",
            questions: 40,
            totalMarks: exam.total_score,
            isCompleted: exam.is_completed || false,
            correctAnswers: exam.is_completed ? correctAnswers : 0,
            partTitles: exam.part_titles || {},
            questionTypes: exam.question_types || []
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

  // Deep-link from the public SEO landing pages: /listening_list?open=<exam_id>
  // auto-launches that full test once the access-filtered list has loaded.
  // No match (no access / VIP-only) => normal list + VIP gating, untouched.
  const autoOpenHandledRef = useRef(false);
  useEffect(() => {
    if (loading || autoOpenHandledRef.current || !tests.length) return;
    const openId = parseInt(new URLSearchParams(window.location.search).get('open'), 10);
    if (!openId) return;
    const target = tests.find(t => t.id === openId);
    if (target) {
      autoOpenHandledRef.current = true;
      navigate('/listening_test_room', { state: { examId: target.id } });
    }
  }, [tests, loading, navigate]);

  const handleStartTest = (test) => {
    checkTokenExpiration();
    navigate(`/listening_test_room`, { state: { examId: test.id } });
  };

  const handleRetakeTest = (test) => {

    setTestToRetake(test);
    setShowConfirmDialog(true);
  };

  const confirmRetake = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student/listening/exam/${testToRetake.id}/retake`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Clear highlights and notes from previous attempt
        localStorage.removeItem('ielts-highlights');
        localStorage.removeItem('ielts-notes');
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

  const calculateBandScore = (totalScore) => {
    // IELTS band score calculation logic (same as backend)
    const bandScore = (totalScore / 40) * 9;
    return Math.round(bandScore * 2) / 2; // Rounds to nearest 0.5
  };

  const fetchExamHistory = async (examId) => {
    if (examHistories[examId]) {
      return; // Already fetched
    }

    setLoadingHistory(prev => ({ ...prev, [examId]: true }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student/my-exam-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const allResults = await response.json();
        // Filter results for this specific exam and exclude forecast attempts
        const nonForecast = allResults.filter(r => r.exam_id === examId && !r.is_forecast);
        const examResults = nonForecast.map((result, index, array) => ({
          ...result,
          band_score: calculateBandScore(result.total_score),
          attempt_number: array.length - index
        }));
        setExamHistories(prev => ({ ...prev, [examId]: examResults }));
      } else {
        console.error('Failed to fetch exam history');
        setExamHistories(prev => ({ ...prev, [examId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching exam history:', error);
      setExamHistories(prev => ({ ...prev, [examId]: [] }));
    } finally {
      setLoadingHistory(prev => ({ ...prev, [examId]: false }));
    }
  };

  const toggleExamHistoryDropdown = (examId) => {
    const isCurrentlyOpen = examHistoryDropdowns[examId];

    // Close all dropdowns first
    setExamHistoryDropdowns({});

    if (!isCurrentlyOpen) {
      setExamHistoryDropdowns({ [examId]: true });
      fetchExamHistory(examId);
    }
  };

  const handleViewPreviousExam = (examId, resultId) => {
    navigate(`/listening_test_room`, {
      state: {
        examId: examId,
        fromResultReview: true,
        resultId: resultId
      }
    });
  };


  const [sortOrder, setSortOrder] = useState('alphabet', 'latest', 'oldest');

  const filteredTests = tests
    .filter(test => {
      const query = searchQuery.toLowerCase();
      if (!query) return true;
      if (test.title.toLowerCase().includes(query)) return true;
      // Also search in part titles
      if (test.partTitles) {
        return Object.values(test.partTitles).some(pt => pt && stripHtmlTags(pt).toLowerCase().includes(query));
      }
      return false;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'alphabet':
          return a.title.split(/([0-9]+)/).map((item, index) => {
            // If this part is a number, convert it to a padded string
            return isNaN(item) ? item : item.padStart(10, '0');
          }).join('').localeCompare(
            b.title.split(/([0-9]+)/).map((item, index) => {
              return isNaN(item) ? item : item.padStart(10, '0');
            }).join('')
          );
        case 'latest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        default:
          return a.title.localeCompare(b.title);
      }
    });
  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white shadow-lg">
          <div className="relative w-20 h-20 mb-6">
            {/* Spinning circles animation */}
            <div className="absolute inset-0 border-4 border-t-green-500 border-r-green-400 border-b-green-300 border-l-green-200 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-t-green-400 border-r-green-300 border-b-green-200 border-l-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 border-4 border-t-green-300 border-r-green-200 border-b-transparent border-l-green-400 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
          </div>

          <div className="text-xl font-medium text-gray-700 mb-2">Loading listening tests...</div>

          <div className="flex space-x-1.5 mt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <div className="mt-4 text-sm text-gray-500 max-w-xs text-center">
            Đang tải các bài kiểm tra IELTS Listening. Vui lòng đợi trong giây lát...
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="text-gray-500 hover:text-[#0096b1]">
                Home
              </Link>
            </li>
            <li>
              <span className="text-gray-400 mx-2">/</span>
            </li>
            <li>
              <span className="text-[#0096b1] font-medium">
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
              placeholder={!isVIP && userRole === 'customer' ? "Tìm kiếm chỉ dành cho VIP..." : "Tìm kiếm bài thi..."}
              className={`w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 ${!isVIP && userRole === 'customer' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              value={searchQuery}
              onChange={(e) => {
                if (isVIP || userRole !== 'customer') {
                  setSearchQuery(e.target.value);
                }
              }}
              disabled={!isVIP && userRole === 'customer'}
            />
            {!isVIP && userRole === 'customer' && (
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            )}
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="alphabet">Theo Alphabet</option>
            {(isVIP || userRole === 'student') && (
              <>
                <option value="latest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </>
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTests.map((test, index) => (
            <div
              key={test.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-lime-200 transition-all duration-300 flex flex-col relative ${examHistoryDropdowns[test.id] ? 'z-50' : 'z-10'} ${!isVIP && userRole === 'customer' && (index + indexOfFirstTest) >= 6 ? 'opacity-80' : ''
                }`}
            >
              {/* Card Body */}
              <div className="p-5 flex-grow flex flex-col">
                {/* Header Area */}
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="text-xl font-bold text-gray-900 leading-snug line-clamp-2">
                    {test.title}
                  </h3>
                  {/* History Dropdown */}
                  {test.isCompleted && (isVIP || userRole !== 'customer' || (index + indexOfFirstTest) < 6) && (
                    <div className="relative z-20 shrink-0" ref={el => examHistoryRefs.current[test.id] = el}>
                      <button
                        onClick={() => toggleExamHistoryDropdown(test.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg transition-colors border border-gray-200"
                        title="Lịch sử bài thi"
                      >
                        <span>Lịch sử</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${examHistoryDropdowns[test.id] ? 'rotate-90' : ''}`} />
                      </button>

                      {examHistoryDropdowns[test.id] && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden text-left origin-top-right">
                          <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                            <h4 className="text-sm font-semibold text-gray-700">Lịch sử bài thi</h4>
                          </div>
                          <div className="max-h-56 overflow-y-auto">
                            {loadingHistory[test.id] ? (
                              <div className="p-6 text-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-500 mx-auto"></div>
                              </div>
                            ) : examHistories[test.id] && examHistories[test.id].length > 0 ? (
                              <>
                                {examHistories[test.id].slice(0, 2).map((result, idx) => (
                                  <button
                                    key={result.result_id}
                                    onClick={() => handleViewPreviousExam(test.id, result.result_id)}
                                    className="w-full p-3 text-left hover:bg-lime-50/50 border-b border-gray-50 transition-colors group"
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm font-semibold text-gray-700 group-hover:text-lime-700">
                                        Lần {result.attempt_number}
                                      </span>
                                      <span className="text-base font-bold text-lime-600 bg-lime-50 px-2.5 py-1 rounded text-center min-w-[3rem]">
                                        {result.total_score}/40
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                                      <span>
                                        {new Date(result.completion_date).toLocaleDateString('vi-VN')}
                                      </span>
                                      <span>Band {result.band_score}</span>
                                    </div>
                                  </button>
                                ))}
                                {examHistories[test.id].length > 2 && (
                                  <Link
                                    to="/exam-history"
                                    className="w-full text-center p-3 block text-sm font-semibold text-lime-600 hover:text-lime-700 hover:bg-lime-50 transition-colors"
                                  >
                                    Xem tất cả lịch sử
                                  </Link>
                                )}
                              </>
                            ) : (
                              <div className="p-4 text-center text-gray-500 text-base">
                                Không có dữ liệu
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Part Titles */}
                <div className="flex flex-col gap-2 mb-2 mt-2">
                  {[1, 2, 3, 4].map((partNum) => {
                    const rawTitle = (test.partTitles && test.partTitles[partNum]) ? test.partTitles[partNum] : '';
                    const title = stripHtmlTags(rawTitle) || 'Tiêu đề trống';
                    return (
                      <div
                        key={partNum}
                        className="group flex flex-row items-center bg-white border border-gray-100 shadow-sm rounded-lg p-2.5 transition-all hover:border-lime-200 hover:bg-lime-50/50"
                        title={title}
                      >
                        <div className="shrink-0 font-bold bg-lime-100 text-lime-700 px-2.5 py-1 rounded text-xs mr-3 uppercase tracking-wider group-hover:bg-lime-200 transition-colors">
                          Part {partNum}
                        </div>
                        <span className={`text-sm font-medium text-gray-700 line-clamp-1 leading-relaxed ${(!isVIP && userRole === 'customer' && (index + indexOfFirstTest) >= 6) ? 'blur-[4px] select-none' : ''}`}>
                          {title}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto"></div>
              </div>

              {/* Card Footer */}
              {(!isVIP && userRole === 'customer' && (index + indexOfFirstTest) >= 6) ? (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl relative overflow-hidden group">
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Lock className="w-5 h-5 text-[#0096b1]" />
                      <span className="text-base font-semibold">VIP cần nâng cấp để truy cập</span>
                    </div>
                    <Link
                      to="/vip-packages"
                      className="inline-flex items-center px-4 py-2 bg-white border border-[#0096b1] text-[#0096b1] rounded-lg hover:bg-[#0096b1] hover:text-white transition-colors text-sm font-bold shadow-sm"
                    >
                      Xem gói
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between rounded-b-2xl transition-colors hover:bg-gray-50">
                  <div className="text-base font-medium">
                    {test.isCompleted ? (
                      <span className={`flex items-center font-bold ${test.totalMarks <= 12 ? 'text-red-600' :
                        test.totalMarks <= 22 ? 'text-orange-500' :
                          test.totalMarks <= 34 ? 'text-green-600' : 'text-yellow-500'
                        }`}>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Đúng {test.totalMarks}/40
                      </span>
                    ) : (
                      <span className="text-gray-400 font-semibold">Chưa làm bài</span>
                    )}
                  </div>

                  <button
                    onClick={() => test.isCompleted ? handleRetakeTest(test) : handleStartTest(test)}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-base font-bold transition-all shadow-sm active:scale-95 ${test.isCompleted
                      ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-500/30'
                      : 'bg-[#0096b1] text-white hover:bg-[#007b94] hover:shadow-[#0096b1]/30'
                      }`}
                  >
                    <span>{test.isCompleted ? 'Làm lại' : 'Bắt đầu'}</span>
                    <Play className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center items-center space-x-4 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          <span className="text-gray-600 font-bold">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
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
