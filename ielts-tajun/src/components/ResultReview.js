import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Circle, Clock, BarChart2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const ResultReview = () => {
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const location = useLocation();
  const { resultId } = location.state || {};
  const answersPerPage = 10;

  useEffect(() => {
    const fetchResultDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8000/student/exam-result/${resultId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setResultData(data);
        }
      } catch (error) {
        console.error('Error fetching result details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (resultId) {
      fetchResultDetails();
    }
  }, [resultId]);

  const getStatusIcon = (answer) => {
    if (!answer.student_answer) {
      return <Circle className="w-5 h-5 text-gray-400" />;
    }
    return answer.score > 0 ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <XCircle className="w-5 h-5 text-red-500" />;
  };

  // Update the filterAnswers function
  const filterAnswers = () => {
    const allAnswers = Array.from({ length: 40 }, (_, index) => {
      const answer = resultData.detailed_answers[index] || {
        student_answer: '',
        correct_answer: '-',
        score: 0,
        max_marks: 1
      };
      return {
        ...answer,
        question_id: index + 1  // Ensure question_id is always index + 1
      };
    });

    switch (filter) {
      case 'correct':
        return allAnswers.filter(answer => answer.score > 0);
      case 'incorrect':
        return allAnswers.filter(answer => answer.student_answer && answer.score === 0);
      case 'blank':
        return allAnswers.filter(answer => !answer.student_answer);
      default:
        return allAnswers;
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Link to="/listening_list" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quay lại trang Listening
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">Kết Quả Bài Thi</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-lime-500">
                {resultData.total_score}
              </div>
              <div className="text-sm text-gray-500 mt-1">Tổng Điểm</div>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="flex items-center text-lg">
                <Clock className="w-5 h-5 mr-2 text-gray-400" />
                <span>
                  {new Date(resultData.completion_date).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">Ngày Hoàn Thành</div>
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
                    Câu Hỏi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Câu Trả Lời Của Bạn
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đáp Án Đúng
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng Thái
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Điểm
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentAnswers.map((answer) => (
                  <tr key={answer.question_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {answer.question_text}
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
                  className={`px-4 py-2 border rounded-lg ${
                    currentPage === i + 1 
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