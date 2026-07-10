import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Circle, Clock, BarChart2, ArrowLeft, ChevronLeft, ChevronRight, Info, BookOpen, Plus } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import Lottie from 'react-lottie';
import highAnimation from '../effect/high.json';
import mediumAnimation from '../effect/medium.json';
import lowAnimation from '../effect/low.json';
import { API_BASE } from '../config/api';

const circumference = 2 * Math.PI * 45;
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Add this to your existing styled components
const AnimatedTitle = styled.h1`
  animation: ${fadeIn} 0.8s ease-out;
`;
const progressAnimation = keyframes`
  0% { stroke-dashoffset: ${circumference}; }
  50% { stroke-dashoffset: ${circumference * 0.2}; }
  100% { stroke-dashoffset: ${props => circumference - (props.score / 40) * circumference}; }
`;

const CircleProgress = styled.circle`
  stroke-dasharray: ${circumference};
  stroke-dashoffset: ${props => circumference - (props.score / 40) * circumference};
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  animation: ${progressAnimation} 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

// Function to calculate band score based on correct answers for Reading Academic
// Based on official IELTS Reading Academic scoring criteria
const calculateBandScore = (correctAnswers) => {
  if (correctAnswers >= 39) return 9.0;
  if (correctAnswers >= 37) return 8.5;
  if (correctAnswers >= 35) return 8.0;
  if (correctAnswers >= 33) return 7.5;
  if (correctAnswers >= 30) return 7.0;
  if (correctAnswers >= 27) return 6.5;
  if (correctAnswers >= 23) return 6.0;
  if (correctAnswers >= 20) return 5.5;
  if (correctAnswers >= 16) return 5.0;
  if (correctAnswers >= 13) return 4.5;
  if (correctAnswers >= 10) return 4.0;
  if (correctAnswers >= 7) return 3.5;
  if (correctAnswers >= 5) return 3.0;
  if (correctAnswers >= 3) return 2.5;
  return 0;
};

const getBandResultImage = (band) => {
  if (band >= 8.5) return { img: '/result-images/band-8-5-to-9.png', msg: "Bạn đỉnh thật sự! 🏆" };
  if (band >= 7.5) return { img: '/result-images/band-7-5-to-8.png', msg: 'Chúc mừng, xứng đáng luôn! 🎉' };
  if (band >= 6.0) return { img: '/result-images/band-6-to-7.png', msg: "Bạn giỏi lắm đó 🌸" };
  if (band >= 4.5) return { img: '/result-images/band-4-5-to-5-5.png', msg: 'Lạy trời , sắp đạt rồi !! 💪' };
  return { img: '/result-images/band-below-4-5.png', msg: "Đừng stress quá nha… 🌟" };
};

const ResultReview = () => {
  const navigate = useNavigate();
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [showDescription, setShowDescription] = useState(false);
  const [testDescription, setTestDescription] = useState(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const location = useLocation();
  const { resultId, examId, forecastPart } = location.state || {};

  // Context menu state for vocabulary saving
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, selectedText: '' });
  const contextMenuRef = useRef(null);

  // Function to clear all exam data before navigating back
  const clearExamData = () => {
    // Clear localStorage data
    localStorage.removeItem('ielts-answers');
    localStorage.removeItem('ielts-highlights');
    localStorage.removeItem('ielts-notes');
    localStorage.removeItem('current-exam-session');

    // Remove highlight elements from DOM
    const highlightElements = document.querySelectorAll('.highlight-element');
    highlightElements.forEach(el => el.remove());

    navigate(forecastPart ? '/reading_forecast' : '/reading_list');
  };
  const answersPerPage = 10;
  const lottieOptions = (animationData) => ({
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  });

  useEffect(() => {
    const fetchResultDetails = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/exam-result/${resultId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setResultData(data);
        }
      } catch (error) {
        console.error('Error fetching result details:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTestDescription = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/reading/reading-test/${examId}/description`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTestDescription(data);

        }
      } catch (error) {
        console.error('Error fetching test description:', error);
      }
    };

    if (resultId) {
      fetchResultDetails();
    }
    if (examId) {
      fetchTestDescription();
    }
  }, [resultId, examId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle right-click for context menu
  const handleContextMenu = (event) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0 && selectedText.length < 100) {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        selectedText: selectedText
      });
    }
  };

  // Save word to vocabulary
  const saveToVocabulary = async () => {
    if (!contextMenu.selectedText) return;

    try {
      const response = await fetch(`${API_BASE}/student/vocabulary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word: contextMenu.selectedText,
          source_type: 'reading',
          source_exam_id: examId,
          source_exam_title: resultData?.exam_title || 'Reading Test'
        })
      });

      if (response.ok) {
        toast.success(`"${contextMenu.selectedText}" added to New Words!`);
      } else {
        toast.error('Failed to save word');
      }
    } catch (error) {
      console.error('Error saving vocabulary:', error);
      toast.error('Error saving word');
    }

    setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
  };

  // Update the filterAnswers function
  const filterAnswers = () => {
    if (!resultData || !resultData.detailed_answers) return [];

    // For listening exams, the backend now provides all 40 questions
    // with proper evaluation status (correct, wrong, or blank)
    const allAnswers = resultData.detailed_answers;

    switch (filter) {
      case 'correct':
        return allAnswers.filter(answer => answer.evaluation === 'correct');
      case 'incorrect':
        return allAnswers.filter(answer => answer.evaluation === 'wrong');
      case 'blank':
        return allAnswers.filter(answer => answer.evaluation === 'blank');
      default:
        return allAnswers;
    }
  };

  // Update the getStatusIcon function to use the evaluation field
  const getStatusIcon = (answer) => {
    switch (answer.evaluation) {
      case 'correct':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'wrong':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'blank':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Đang tải kết quả...</div>
      </div>
    );
  }

  const filteredAnswers = filterAnswers();
  const totalPages = Math.ceil(filteredAnswers.length / answersPerPage);
  const currentAnswers = filteredAnswers.slice(
    (currentPage - 1) * answersPerPage,
    currentPage * answersPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8" onContextMenu={handleContextMenu}>
      <Toaster position="top-right" />

      {/* Custom Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={saveToVocabulary}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#0096b1]/10 hover:text-[#0096b1] flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add to New Words
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={clearExamData}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại trang Reading
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          {/* Band Result Banner */}
          {(() => {
            const band = calculateBandScore(resultData.total_score);
            const { img, msg } = getBandResultImage(band);
            return (
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                <img
                  src={img}
                  alt={msg}
                  className="w-full max-w-sm rounded-2xl object-contain"
                  style={{ maxHeight: 220 }}
                />
                <div className="flex flex-col text-center md:text-left">
                  <h2 className="text-xl md:text-2xl font-medium text-gray-600 mb-2">
                    {msg}
                  </h2>
                  <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-lime-600 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
                    Band {band}
                  </h1>
                </div>
              </div>
            );
          })()}
          {/* Description Dialog */}
          {showDescription && testDescription && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setShowDescription(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className='flex flex-col items-center'>
                  <h2 className="text-2xl font-bold text-center text-blue-600"> Giải thích - {testDescription.title}</h2>
                  <span className="text-center mt-1 text-sm text-gray-500">-- Bản quyền lời giải thuộc về thiieltstrenmay.com --</span>
                </div>
                <div className="prose max-w-none mt-6">
                  <p className="text-gray-600 whitespace-pre-wrap">{testDescription.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Dialog */}
          {showWarningDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Xác nhận xem lại bài thi</h2>
                <p className="text-gray-600 mb-6">
                  Trong chế độ xem lại phần Reading, các bạn có thể click vào biểu tượng "i" cạnh câu hỏi để xem giải thích đáp án chi tiết
                  <br />
                  <span className="text-red-600">Lưu ý: Sau khi xem lại, bạn không thể quay lại trang kết quả nên hãy xem thật kỹ trước khi chuyển chế độ xem lại.</span>
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowWarningDialog(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      setShowWarningDialog(false);
                      navigate('/reading_test_room', {
                        state: {
                          examId,
                          fromResultReview: true,
                          answerData: resultData,
                          resultId: resultId,
                          forecastPart: forecastPart
                        }
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Score and Status Section */}
            <div className="flex items-start space-x-8">
              {/* Score Circle */}
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="8"
                      className="transition-all duration-300"
                    />
                    {/* Progress circle */}
                    <CircleProgress
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="8"
                      strokeLinecap="round"
                      score={resultData.total_score}
                      className="transition-all duration-300"
                    />
                    {/* Score text */}
                    <text
                      x="50"
                      y="54"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xl font-medium"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      <tspan fill="#84cc16">{resultData.total_score}</tspan>
                      <tspan fill="#9ca3af">/40</tspan>
                    </text>
                  </svg>
                </div>
                {/* Chart icon */}
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-lime-500 shadow-lg border-2 border-white flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
                  {resultData.total_score >= 30 ? (
                    <Lottie options={lottieOptions(highAnimation)} height={34} width={34} />
                  ) : resultData.total_score >= 20 ? (
                    <Lottie options={lottieOptions(mediumAnimation)} height={34} width={34} />
                  ) : (
                    <Lottie options={lottieOptions(lowAnimation)} height={34} width={34} />
                  )}
                </div>
              </div>

              {/* Status Legend */}
              <div className="flex-grow">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Chú Thích Trạng Thái</h3>
                <div className="space-y-3">
                  <div className="flex items-center bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-700">Câu trả lời đúng</span>
                  </div>
                  <div className="flex items-center bg-red-50 p-3 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-500 mr-3" />
                    <span className="text-sm text-gray-700">Câu trả lời sai</span>
                  </div>
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <Circle className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Chưa trả lời</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Date and Additional Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="items-center text-lg text-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Ngày Hoàn Thành</h3>
                    <div className='flex items-center'>
                      <Clock className="w-5 h-5 mr-3 text-gray-400" />
                      <span>
                        {new Date(resultData.completion_date).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWarningDialog(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 animate-bounce"
                  >
                    <BookOpen className="w-6 h-6 mr-2" />
                    Xem giải thích
                  </button>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Thống Kê Chi Tiết</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="text-green-500 font-semibold">
                        {resultData.detailed_answers.filter(a => a.evaluation === 'correct').length}
                      </div>
                      <div className="text-xs text-gray-600">Đúng</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <div className="text-red-500 font-semibold">
                        {resultData.detailed_answers.filter(a => a.evaluation === 'wrong').length}
                      </div>
                      <div className="text-xs text-gray-600">Sai</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <div className="text-gray-500 font-semibold">
                        {resultData.detailed_answers.filter(a => a.evaluation === 'blank').length}
                      </div>
                      <div className="text-xs text-gray-600">Bỏ qua</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Xem Lại Câu Hỏi</h2>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                <option value="all">Tất Cả Câu Trả Lời</option>
                <option value="correct">Chỉ Câu Đúng</option>
                <option value="incorrect">Chỉ Câu Sai</option>
                <option value="blank">Chỉ Câu Chưa Trả Lời</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Answer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correct Answer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentAnswers.map((answer) => (
                  <tr key={answer.question_number || answer.question_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="font-bold">Question {answer.question_number}</div>
                      {answer.question_text && (
                        <div className="text-gray-600 font-normal text-xs mt-1 max-w-md whitespace-normal">
                          {answer.question_text}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {answer.student_answer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {answer.correct_answer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(answer)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {answer.score}/{answer.max_marks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Hiển thị {Math.min(filteredAnswers.length, (currentPage - 1) * answersPerPage + 1)} đến{' '}
              {Math.min(currentPage * answersPerPage, filteredAnswers.length)} trong tổng số {filteredAnswers.length} kết quả
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 border rounded-lg ${currentPage === i + 1
                    ? 'bg-lime-500 text-white border-lime-500'
                    : 'hover:bg-gray-50'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultReview;
