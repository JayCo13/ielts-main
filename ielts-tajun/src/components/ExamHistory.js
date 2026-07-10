import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, BarChart2, ChevronRight, Search, ChevronLeft, Trophy, Target, TrendingUp, BookOpen, Award, Calendar, Headphones, FileText, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, defs } from 'recharts';
import Navbar from './Navbar';
import { API_BASE } from '../config/api';

// Function to calculate band score based on correct answers for Reading Academic
// Based on official IELTS Reading Academic scoring criteria
const calculateBandScore = (correctAnswers) => {
  let bandScore = 0;
  if (correctAnswers >= 39) bandScore = 9.0;
  else if (correctAnswers >= 37) bandScore = 8.5;
  else if (correctAnswers >= 35) bandScore = 8.0;
  else if (correctAnswers >= 33) bandScore = 7.5;
  else if (correctAnswers >= 30) bandScore = 7.0;
  else if (correctAnswers >= 27) bandScore = 6.5;
  else if (correctAnswers >= 23) bandScore = 6.0;
  else if (correctAnswers >= 20) bandScore = 5.5;
  else if (correctAnswers >= 16) bandScore = 5.0;
  else if (correctAnswers >= 13) bandScore = 4.5;
  else if (correctAnswers >= 10) bandScore = 4.0;
  else if (correctAnswers >= 7) bandScore = 3.5;
  else if (correctAnswers >= 5) bandScore = 3.0;
  else if (correctAnswers >= 3) bandScore = 2.5;

  console.log(`BAND_SCORE_DEBUG: correctAnswers=${correctAnswers}, bandScore=${bandScore}`);
  return bandScore;
};

const ExamHistory = () => {
  const [examHistory, setExamHistory] = useState([]);
  const [readingExams, setReadingExams] = useState([]);
  const [listeningExams, setListeningExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reading'); // New state for active tab
  const [readingSearchQuery, setReadingSearchQuery] = useState('');
  const [listeningSearchQuery, setListeningSearchQuery] = useState('');
  const [currentReadingPage, setCurrentReadingPage] = useState(1);
  const [currentListeningPage, setCurrentListeningPage] = useState(1);
  const [isVIP, setIsVIP] = useState(false);
  const [userRole, setUserRole] = useState('customer'); // Default to customer
  const [vipLoading, setVipLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('weekly'); // 'weekly' or 'monthly'
  const [examSubTab, setExamSubTab] = useState('fullTest'); // 'fullTest' or 'forecast'
  const examsPerPage = 3;
  const navigate = useNavigate();

  // All useEffect hooks must be called before any early returns or function definitions
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();

          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Set default role as customer if API fails
        setUserRole('customer');
      }
    };

    const checkVIPAccess = async () => {
      try {
        const response = await fetch(`${API_BASE}/customer/vip/subscription/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }

        });
        if (response.ok) {
          const data = await response.json();
          console.log('VIP API Response From Exam History:', data);
          // VIP access for exam history - any active subscription grants access
          const hasVIPAccess = data.is_subscribed && (
            data.package_type === 'all_skills' ||
            data.package_type === 'single_skill'
          );
          setIsVIP(hasVIPAccess);
        }
      } catch (error) {
        console.error('Error checking VIP access:', error);
        // Keep isVIP as false if API fails
        setIsVIP(false);
      } finally {
        setVipLoading(false);
      }
    };

    const initializeUserData = async () => {
      await Promise.all([fetchUserRole(), checkVIPAccess()]);
    };
    initializeUserData();
  }, []);

  useEffect(() => {
    const fetchExamHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/my-exam-history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setExamHistory(data);

          // Separate exams by type using the exam_type field from API
          const reading = data.filter(exam => exam.exam_type === 'reading');
          const listening = data.filter(exam => exam.exam_type === 'listening');

          setReadingExams(reading);
          setListeningExams(listening);
        }
      } catch (error) {
        console.error('Error fetching exam history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExamHistory();
  }, []);

  const handleViewReadingDetails = async (exam) => {
    try {
      // Fetch exam details to get the answer data
      const response = await fetch(`${API_BASE}/student/exam-result/${exam.result_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const examData = await response.json();

        navigate('/reading_test_room', {
          state: {
            examId: exam.exam_id,
            resultId: exam.result_id,
            fromResultReview: true,
            answerData: examData,
            forecastPart: exam.part_number || exam.forecast_part_number || exam.forecast_part
          }
        });
      }
    } catch (error) {
      console.error('Error fetching reading exam details:', error);
      // Fallback to original behavior
      navigate(`/exam-result/${exam.result_id}`);
    }
  };

  const handleViewListeningDetails = async (exam) => {
    try {
      // Navigate to listening test room with resultId for proper data fetching
      navigate('/listening_test_room', {
        state: {
          examId: exam.exam_id,
          resultId: exam.result_id,
          fromResultReview: true,
          forecastPart: exam.part_number || exam.forecast_part_number || exam.forecast_part
        }
      });
    } catch (error) {
      console.error('Error navigating to listening exam:', error);
      // Fallback to original behavior
      navigate(`/exam-result/${exam.result_id}`);
    }
  };



  // Calculate statistics for a specific skill type
  const calculateSkillStats = (exams) => {
    if (!exams || exams.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        bestScore: 0,
        recentScore: 0,
        averageBandScore: 0,
        bestBandScore: 0,
        recentBandScore: 0,
        improvementTrend: 0
      };
    }

    const scores = exams.map(exam => exam.total_score);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / exams.length;
    const bestScore = Math.max(...scores);
    const recentScore = exams[0]?.total_score || 0;

    // Calculate band scores
    const averageBandScore = calculateBandScore(Math.round(averageScore));
    const bestBandScore = calculateBandScore(bestScore);
    const recentBandScore = calculateBandScore(recentScore);

    // Calculate improvement trend (compare recent 3 vs previous 3)
    let improvementTrend = 0;
    if (exams.length >= 6) {
      const recent3 = exams.slice(0, 3).reduce((sum, exam) => sum + exam.total_score, 0) / 3;
      const previous3 = exams.slice(3, 6).reduce((sum, exam) => sum + exam.total_score, 0) / 3;
      improvementTrend = previous3 > 0 ? ((recent3 - previous3) / previous3) * 100 : 0;
    }

    return {
      totalExams: exams.length,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore,
      recentScore,
      averageBandScore,
      bestBandScore,
      recentBandScore,
      improvementTrend: Math.round(improvementTrend * 10) / 10
    };
  };

  // Generate chart data for weekly/monthly progress
  const generateChartData = (period) => {
    const now = new Date();
    const chartData = [];

    if (period === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const readingWeekExams = readingExams.filter(exam => {
          const examDate = new Date(exam.completion_date);
          return examDate >= weekStart && examDate <= weekEnd;
        });

        const listeningWeekExams = listeningExams.filter(exam => {
          const examDate = new Date(exam.completion_date);
          return examDate >= weekStart && examDate <= weekEnd;
        });

        const readingAvg = readingWeekExams.length > 0
          ? readingWeekExams.reduce((sum, e) => sum + e.total_score, 0) / readingWeekExams.length
          : null;

        const listeningAvg = listeningWeekExams.length > 0
          ? listeningWeekExams.reduce((sum, e) => sum + e.total_score, 0) / listeningWeekExams.length
          : null;

        const weekLabel = `T${Math.ceil((weekStart.getDate()) / 7) || 1}/${weekStart.getMonth() + 1}`;

        chartData.push({
          name: weekLabel,
          reading: readingAvg ? calculateBandScore(Math.round(readingAvg)) : null,
          listening: listeningAvg ? calculateBandScore(Math.round(listeningAvg)) : null,
          readingExams: readingWeekExams.length,
          listeningExams: listeningWeekExams.length
        });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

        const readingMonthExams = readingExams.filter(exam => {
          const examDate = new Date(exam.completion_date);
          return examDate >= monthStart && examDate <= monthEnd;
        });

        const listeningMonthExams = listeningExams.filter(exam => {
          const examDate = new Date(exam.completion_date);
          return examDate >= monthStart && examDate <= monthEnd;
        });

        const readingAvg = readingMonthExams.length > 0
          ? readingMonthExams.reduce((sum, e) => sum + e.total_score, 0) / readingMonthExams.length
          : null;

        const listeningAvg = listeningMonthExams.length > 0
          ? listeningMonthExams.reduce((sum, e) => sum + e.total_score, 0) / listeningMonthExams.length
          : null;

        const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

        chartData.push({
          name: monthNames[monthStart.getMonth()],
          reading: readingAvg ? calculateBandScore(Math.round(readingAvg)) : null,
          listening: listeningAvg ? calculateBandScore(Math.round(listeningAvg)) : null,
          readingExams: readingMonthExams.length,
          listeningExams: listeningMonthExams.length
        });
      }
    }

    return chartData;
  };

  const readingStats = calculateSkillStats(readingExams);
  const listeningStats = calculateSkillStats(listeningExams);
  const chartData = generateChartData(chartPeriod);

  // Legacy combined stats for backward compatibility
  const stats = {
    totalExams: examHistory.length,
    averageScore: examHistory.length > 0 ? Math.round(examHistory.reduce((sum, e) => sum + e.total_score, 0) / examHistory.length * 10) / 10 : 0,
    bestScore: examHistory.length > 0 ? Math.max(...examHistory.map(e => e.total_score)) : 0,
    recentScore: examHistory[0]?.total_score || 0,
    totalBandScore: calculateBandScore(Math.round(examHistory.length > 0 ? examHistory.reduce((sum, e) => sum + e.total_score, 0) / examHistory.length : 0)),
    improvementTrend: 0
  };

  // Filter exams by search query AND sub-tab (Full Test vs Forecast)
  const filteredReadingExams = readingExams.filter(exam => {
    const matchesSearch = exam.exam_title.toLowerCase().includes(readingSearchQuery.toLowerCase());
    const matchesSubTab = examSubTab === 'fullTest' ? !exam.is_forecast : exam.is_forecast;
    return matchesSearch && matchesSubTab;
  });

  const filteredListeningExams = listeningExams.filter(exam => {
    const matchesSearch = exam.exam_title.toLowerCase().includes(listeningSearchQuery.toLowerCase());
    const matchesSubTab = examSubTab === 'fullTest' ? !exam.is_forecast : exam.is_forecast;
    return matchesSearch && matchesSubTab;
  });

  const indexOfLastReadingExam = currentReadingPage * examsPerPage;
  const indexOfFirstReadingExam = indexOfLastReadingExam - examsPerPage;
  const currentReadingExams = filteredReadingExams.slice(indexOfFirstReadingExam, indexOfLastReadingExam);
  const totalReadingPages = Math.ceil(filteredReadingExams.length / examsPerPage);

  const indexOfLastListeningExam = currentListeningPage * examsPerPage;
  const indexOfFirstListeningExam = indexOfLastListeningExam - examsPerPage;
  const currentListeningExams = filteredListeningExams.slice(indexOfFirstListeningExam, indexOfLastListeningExam);
  const totalListeningPages = Math.ceil(filteredListeningExams.length / examsPerPage);

  const getPaginationNumbers = (totalPages, currentPage) => {
    if (totalPages <= 7) {
      // If 7 or fewer pages, show all
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    rangeWithDots.push(1);

    // Calculate the range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    // Add dots after first page if needed
    if (start > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        range.push(i);
      }
    }
    rangeWithDots.push(...range);

    // Add dots before last page if needed
    if (end < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((item, index, arr) => {
      // Remove duplicates while preserving order
      return arr.indexOf(item) === index;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (examHistory.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md mx-auto px-6">
            {/* Icon Section */}
            <div className="mb-8">
              <div className="relative inline-block">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full p-8 shadow-lg">
                  <Trophy className="w-18 h-18 text-blue-500 mx-auto" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-800">
                  Chưa có lịch sử bài thi
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Bạn chưa hoàn thành bài thi nào. Hãy bắt đầu hành trình học IELTS của mình ngay hôm nay!
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <button
                  onClick={() => navigate('/listening_list')}
                  className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform"
                >
                  <BookOpen className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  Làm bài thi đầu tiên
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </div>

              {/* Additional Info */}
              <div className="pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Headphones className="w-4 h-4 text-blue-400" />
                    <span>Listening Tests</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4 text-green-400" />
                    <span>Reading Tests</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shouldShowOverlay = !isVIP && userRole === 'customer';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* VIP Access Control Overlay */}
        {shouldShowOverlay && (
          <div className="fixed inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/85 to-indigo-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            {/* Main content container */}
            <div className="relative w-full max-w-lg mx-auto">
              {/* Glass morphism card */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl">
                {/* Icon section with enhanced animation */}
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-xl opacity-30 animate-pulse scale-150"></div>
                    {/* Inner ring */}
                    <div className="relative bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm rounded-full p-6 border border-white/30">
                      <Lock className="w-12 h-12 sm:w-16 sm:h-16 text-white mx-auto animate-bounce" />
                    </div>
                    {/* Floating particles */}
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-300"></div>
                  </div>
                </div>

                {/* Content section */}
                <div className="text-center space-y-6">
                  {/* Title with gradient text */}
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent leading-tight">
                      Tính năng VIP
                    </h2>
                    <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mx-auto"></div>
                  </div>

                  {/* Description */}
                  <p className="text-base sm:text-lg text-white/90 leading-relaxed px-2">
                    Lịch sử bài thi chi tiết chỉ dành cho thành viên VIP.
                    <span className="block mt-2 text-cyan-200 font-medium">
                      Nâng cấp ngay để truy cập tất cả các tính năng!
                    </span>
                  </p>

                  {/* Feature highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/80 bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>Lịch sử chi tiết</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Phân tích kết quả</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                      <span>Theo dõi tiến độ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span>Báo cáo nâng cao</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-4 pt-2">
                    <Link
                      to="/vip-packages"
                      className="group relative w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-2xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-105 transform"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Xem gói VIP
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                      </span>
                      {/* Button glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </Link>

                    <button
                      onClick={() => navigate('/reading_list')}
                      className="w-full text-white/80 hover:text-white font-medium py-3 px-4 rounded-xl hover:bg-white/10 transition-all duration-200 border border-white/20 hover:border-white/30"
                    >
                      Quay lại danh sách bài thi
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom decorative elements */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                <div className="w-2 h-2 bg-cyan-400/50 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400/50 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-indigo-400/50 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        {/* Skill Tab Selection - Main Navigation */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Tổng Quan Kết Quả</h1>
            <p className="text-gray-500 text-sm sm:text-base">Chọn kỹ năng để xem thống kê chi tiết</p>
          </div>

          {/* Skill Toggle Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-xl inline-flex">
              <button
                onClick={() => setActiveTab('reading')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-300 ${activeTab === 'reading'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-blue-600'
                  }`}
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Reading</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'reading' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                  {readingStats.totalExams}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('listening')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-300 ${activeTab === 'listening'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-orange-500'
                  }`}
              >
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Listening</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'listening' ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                  {listeningStats.totalExams}
                </span>
              </button>
            </div>
          </div>

          {/* Selected Skill Stats Card */}
          <div className={`rounded-2xl p-6 text-white shadow-lg mb-8 transition-all duration-300 ${activeTab === 'reading'
            ? 'bg-gradient-to-br from-blue-500 to-blue-700'
            : 'bg-gradient-to-br from-orange-500 to-orange-700'
            }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-3">
                  {activeTab === 'reading' ? <FileText className="w-8 h-8" /> : <Headphones className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold">{activeTab === 'reading' ? 'Reading' : 'Listening'}</h3>
                  <p className={`text-sm ${activeTab === 'reading' ? 'text-blue-100' : 'text-orange-100'}`}>
                    {activeTab === 'reading' ? readingStats.totalExams : listeningStats.totalExams} bài thi đã hoàn thành
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className={`text-xs uppercase tracking-wide ${activeTab === 'reading' ? 'text-blue-100' : 'text-orange-100'}`}>Band Score Trung Bình</p>
                <p className="text-5xl sm:text-6xl font-bold">
                  {activeTab === 'reading' ? readingStats.averageBandScore : listeningStats.averageBandScore}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">
                  {activeTab === 'reading' ? readingStats.bestBandScore : listeningStats.bestBandScore}
                </p>
                <p className={`text-xs ${activeTab === 'reading' ? 'text-blue-100' : 'text-orange-100'}`}>Cao nhất</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">
                  {activeTab === 'reading' ? readingStats.recentBandScore : listeningStats.recentBandScore}
                </p>
                <p className={`text-xs ${activeTab === 'reading' ? 'text-blue-100' : 'text-orange-100'}`}>Gần nhất</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl sm:text-3xl font-bold ${(activeTab === 'reading' ? readingStats.improvementTrend : listeningStats.improvementTrend) >= 0
                  ? 'text-green-300'
                  : 'text-red-300'
                  }`}>
                  {(activeTab === 'reading' ? readingStats.improvementTrend : listeningStats.improvementTrend) > 0 ? '+' : ''}
                  {activeTab === 'reading' ? readingStats.improvementTrend : listeningStats.improvementTrend}%
                </p>
                <p className={`text-xs ${activeTab === 'reading' ? 'text-blue-100' : 'text-orange-100'}`}>Xu hướng</p>
              </div>
            </div>
          </div>

          {/* Progress Chart Section */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Biểu Đồ Tiến Độ {activeTab === 'reading' ? 'Reading' : 'Listening'}
                </h2>
                <p className="text-gray-500 text-sm">Band Score theo thời gian</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartPeriod('weekly')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${chartPeriod === 'weekly'
                    ? activeTab === 'reading' ? 'bg-blue-600 text-white shadow-md' : 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Theo tuần
                </button>
                <button
                  onClick={() => setChartPeriod('monthly')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${chartPeriod === 'monthly'
                    ? activeTab === 'reading' ? 'bg-blue-600 text-white shadow-md' : 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Theo tháng
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64 sm:h-80">
              {chartData.some(d => (activeTab === 'reading' ? d.reading : d.listening) !== null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="readingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="listeningGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 9]}
                      ticks={[0, 3, 5, 6, 7, 8, 9]}
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)'
                      }}
                      formatter={(value) => [
                        value ? `Band ${value}` : 'Không có dữ liệu',
                        activeTab === 'reading' ? 'Reading' : 'Listening'
                      ]}
                    />
                    <Area
                      type="natural"
                      dataKey={activeTab}
                      stroke={activeTab === 'reading' ? '#3b82f6' : '#f97316'}
                      strokeWidth={3}
                      fill={activeTab === 'reading' ? 'url(#readingGradient)' : 'url(#listeningGradient)'}
                      dot={{ fill: '#fff', stroke: activeTab === 'reading' ? '#3b82f6' : '#f97316', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 8, stroke: activeTab === 'reading' ? '#3b82f6' : '#f97316', strokeWidth: 2, fill: '#fff' }}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <BarChart2 className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
                  <p className="text-base sm:text-lg font-medium">Chưa có đủ dữ liệu</p>
                  <p className="text-xs sm:text-sm text-center px-4">Hoàn thành thêm bài thi để xem biểu đồ tiến độ</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Exams Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          {/* VIP Overlay for non-VIP customers */}

          {!isVIP && !vipLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50/95 to-gray-100/95 backdrop-blur-sm rounded-2xl transition-all duration-300 hover:bg-gradient-to-b hover:from-gray-50/98 hover:to-gray-100/98 group z-10">
              <div className="text-center transform transition-transform duration-300 group-hover:scale-105 p-8">
                <div className="relative mb-6">
                  <Lock className="w-16 h-16 text-[#0096b1] mx-auto mb-4 animate-bounce" />
                  <div className="absolute -inset-2 opacity-30 rounded-full blur animate-pulse"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Lịch Sử Bài Thi Chỉ Dành Cho VIP
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                  Nâng cấp lên VIP để xem lại tất cả các bài thi đã hoàn thành, theo dõi tiến độ học tập và phân tích kết quả chi tiết.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/vip-packages"
                    className="inline-flex items-center px-6 py-3 bg-[#0096b1] text-white rounded-xl hover:bg-[#eb7e37] transition-all duration-300 shadow-lg hover:shadow-[#eb7e37]/20 font-semibold text-lg"
                  >
                    Nâng cấp VIP ngay
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Link>
                  <div className="text-sm text-gray-500">
                    Truy cập không giới hạn tất cả tính năng
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* History Section Header with Sub-tabs */}
          <div className="border-b border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Lịch Sử Bài Thi {activeTab === 'reading' ? 'Reading' : 'Listening'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Xem lại các bài thi {activeTab === 'reading' ? 'Reading' : 'Listening'} đã hoàn thành
                </p>
              </div>
              {/* Full Test / Forecast Sub-tabs */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setExamSubTab('fullTest')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${examSubTab === 'fullTest'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Full Test
                </button>
                <button
                  onClick={() => setExamSubTab('forecast')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${examSubTab === 'forecast'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Forecast
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-8">
            {/* Reading Tab Content */}
            {activeTab === 'reading' && (
              <>
                <div className="flex justify-end mb-6">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm bài thi..."
                      className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl w-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={readingSearchQuery}
                      onChange={(e) => setReadingSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {currentReadingExams.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Chưa có bài thi Reading nào</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6 mb-8">
                      {currentReadingExams.map((exam) => (
                        <div key={exam.result_id} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-1 space-y-5">
                              {/* Exam Title */}
                              <div className="border-b border-gray-100 pb-4">
                                <h3 className="font-bold text-gray-900 text-xl leading-tight">{exam.exam_title}</h3>
                              </div>

                              {/* Exam Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Date & Time */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-blue-50 rounded-lg p-2.5 mt-0.5">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {new Date(exam.completion_date).toLocaleDateString('vi-VN')}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">
                                      {new Date(exam.completion_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>

                                {/* Score Display - different for Full Test vs Forecast */}
                                <div className="flex items-start space-x-3">
                                  <div className={`rounded-lg p-2.5 mt-0.5 ${examSubTab === 'forecast' ? 'bg-blue-50' : 'bg-green-50'}`}>
                                    <BarChart2 className={`w-5 h-5 ${examSubTab === 'forecast' ? 'text-blue-600' : 'text-green-600'}`} />
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    {examSubTab === 'fullTest' ? (
                                      <>
                                        <span className="text-sm font-medium text-gray-900">
                                          Band Score: <span className="font-bold text-green-600">{calculateBandScore(exam.total_score)}</span>
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">
                                          Raw Score: {exam.total_score}/40
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-sm font-medium text-gray-900">
                                          Số câu đúng: <span className="font-bold text-blue-600">{exam.total_score}/{exam.total_questions || 40}</span>
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">
                                          Tỷ lệ: {Math.round((exam.total_score / (exam.total_questions || 40)) * 100)}%
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Attempt Number */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-purple-50 rounded-lg p-2.5 mt-0.5">
                                    <Target className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-gray-900">Lần thử: {exam.attempt_number}</span>
                                    <span className="text-xs text-gray-500 font-medium">Lần làm bài</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleViewReadingDetails(exam)}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                              >
                                <span className="mr-2">Xem chi tiết</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalReadingPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                        <div className="text-sm text-gray-600 order-2 sm:order-1">
                          Hiển thị {indexOfFirstReadingExam + 1}-{Math.min(indexOfLastReadingExam, filteredReadingExams.length)} trong tổng số {filteredReadingExams.length} kết quả
                        </div>

                        <div className="flex justify-center items-center space-x-1 order-1 sm:order-2">
                          <button
                            onClick={() => setCurrentReadingPage(currentReadingPage - 1)}
                            disabled={currentReadingPage === 1}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            aria-label="Trang trước"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="flex items-center space-x-1 max-w-xs overflow-x-auto scrollbar-hide">
                            {getPaginationNumbers(totalReadingPages, currentReadingPage).map((pageNumber, index) => (
                              <button
                                key={index}
                                onClick={() => pageNumber !== '...' && setCurrentReadingPage(pageNumber)}
                                disabled={pageNumber === '...'}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pageNumber === currentReadingPage
                                  ? 'bg-blue-600 text-white'
                                  : pageNumber === '...'
                                    ? 'text-gray-400 cursor-default'
                                    : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                              >
                                {pageNumber}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setCurrentReadingPage(currentReadingPage + 1)}
                            disabled={currentReadingPage === totalReadingPages}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            aria-label="Trang sau"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Listening Tab Content */}
            {activeTab === 'listening' && (
              <>
                <div className="flex justify-end mb-6">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm bài thi..."
                      className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl w-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      value={listeningSearchQuery}
                      onChange={(e) => setListeningSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {currentListeningExams.length === 0 ? (
                  <div className="text-center py-12">
                    <Headphones className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Chưa có bài thi Listening nào</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6 mb-8">
                      {currentListeningExams.map((exam) => (
                        <div key={exam.result_id} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-1 space-y-5">
                              {/* Exam Title */}
                              <div className="border-b border-gray-100 pb-4">
                                <h3 className="font-bold text-gray-900 text-xl leading-tight">{exam.exam_title}</h3>
                              </div>

                              {/* Exam Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Date & Time */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-orange-50 rounded-lg p-2.5 mt-0.5">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {new Date(exam.completion_date).toLocaleDateString('vi-VN')}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">
                                      {new Date(exam.completion_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>

                                {/* Score Display - different for Full Test vs Forecast */}
                                <div className="flex items-start space-x-3">
                                  <div className={`rounded-lg p-2.5 mt-0.5 ${examSubTab === 'forecast' ? 'bg-orange-50' : 'bg-green-50'}`}>
                                    <BarChart2 className={`w-5 h-5 ${examSubTab === 'forecast' ? 'text-orange-600' : 'text-green-600'}`} />
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    {examSubTab === 'fullTest' ? (
                                      <>
                                        <span className="text-sm font-medium text-gray-900">
                                          Band Score: <span className="font-bold text-green-600">{calculateBandScore(exam.total_score)}</span>
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">
                                          Raw Score: {exam.total_score}/40
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-sm font-medium text-gray-900">
                                          Số câu đúng: <span className="font-bold text-orange-600">{exam.total_score}/{exam.total_questions || 40}</span>
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">
                                          Tỷ lệ: {Math.round((exam.total_score / (exam.total_questions || 40)) * 100)}%
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Attempt Number */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-purple-50 rounded-lg p-2.5 mt-0.5">
                                    <Target className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-gray-900">Lần thử: {exam.attempt_number}</span>
                                    <span className="text-xs text-gray-500 font-medium">Lần làm bài</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleViewListeningDetails(exam)}
                                className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                              >
                                <span className="mr-2">Xem chi tiết</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalListeningPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                        <div className="text-sm text-gray-600 order-2 sm:order-1">
                          Hiển thị {indexOfFirstListeningExam + 1}-{Math.min(indexOfLastListeningExam, filteredListeningExams.length)} trong tổng số {filteredListeningExams.length} kết quả
                        </div>

                        <div className="flex justify-center items-center space-x-1 order-1 sm:order-2">
                          <button
                            onClick={() => setCurrentListeningPage(currentListeningPage - 1)}
                            disabled={currentListeningPage === 1}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            aria-label="Trang trước"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="flex items-center space-x-1 max-w-xs overflow-x-auto scrollbar-hide">
                            {getPaginationNumbers(totalListeningPages, currentListeningPage).map((pageNumber, index) => (
                              <button
                                key={index}
                                onClick={() => pageNumber !== '...' && setCurrentListeningPage(pageNumber)}
                                disabled={pageNumber === '...'}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pageNumber === currentListeningPage
                                  ? 'bg-orange-600 text-white'
                                  : pageNumber === '...'
                                    ? 'text-gray-400 cursor-default'
                                    : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                              >
                                {pageNumber}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setCurrentListeningPage(currentListeningPage + 1)}
                            disabled={currentListeningPage === totalListeningPages}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            aria-label="Trang sau"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamHistory;
