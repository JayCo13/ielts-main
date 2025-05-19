import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BarChart2, ChevronRight, Search, ChevronLeft } from 'lucide-react';

const ExamHistory = () => {
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const examsPerPage = 3;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExamHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/student/my-exam-history', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setExamHistory(data);
        }
      } catch (error) {
        console.error('Error fetching exam history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExamHistory();
  }, []);

  const filteredExams = examHistory.filter(exam => 
    exam.exam_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastExam = currentPage * examsPerPage;
  const indexOfFirstExam = indexOfLastExam - examsPerPage;
  const currentExams = filteredExams.slice(indexOfFirstExam, indexOfLastExam);
  const totalPages = Math.ceil(filteredExams.length / examsPerPage);

  // Function to generate pagination numbers with ellipsis for large page counts
  const getPaginationNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // Show max 5 page numbers at once
    
    if (totalPages <= maxVisiblePages) {
      // If total pages is small, show all page numbers
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of visible page range
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        endPage = Math.min(maxVisiblePages - 1, totalPages - 1);
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 2);
      }
      
      // Add ellipsis before middle pages if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis after middle pages if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
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
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-gray-500 mb-2">Không tìm thấy lịch sử bài thi</div>
        <button
          onClick={() => navigate('/exams')}
          className="text-lime-500 hover:text-lime-600 font-medium"
        >
          Làm bài thi đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Lịch Sử Bài Thi</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm bài thi..."
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-48 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 mb-6 overflow-x-hidden">
        {currentExams.map((exam) => (
          <div key={exam.result_id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <h3 className="font-medium text-gray-900">{exam.exam_title}</h3>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{new Date(exam.completion_date).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">

                <div className="text-center px-3 border-l border-r border-gray-200">
                  <div className="text-lg font-bold text-lime-500">{exam.total_score}</div>
                  <div className="text-xs text-gray-500">Tổng điểm</div>
                </div>

                <button
                  onClick={() => navigate(`/exam-result/${exam.result_id}`)}
                  className="flex items-center text-sm text-lime-500 hover:text-lime-600 font-medium"
                >
                  Chi tiết
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredExams.length > examsPerPage && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {getPaginationNumbers().map((pageNumber, index) => (
            pageNumber === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2">...</span>
            ) : (
              <button
                key={`page-${pageNumber}`}
                onClick={() => setCurrentPage(pageNumber)}
                className={`w-8 h-8 text-sm rounded-lg ${
                  currentPage === pageNumber
                    ? 'bg-lime-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {pageNumber}
              </button>
            )
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ExamHistory;
