import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Search, ChevronLeft, ChevronRight, Sparkles, RotateCw, Bot, Lock } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import EditEssayDialog from './EditEssayDialog';
import Navbar from './Navbar';
import AIFeedbackDialog from './AiFeedbackDialog';
import { create } from 'framer-motion/m';
import { checkExamAccess } from '../utils/examAccess';

const Writing_Fe = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isVIP, setIsVIP] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const dropdownRef = useRef(null);
  const testsPerPage = 6;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [testsResponse, subscriptionResponse] = await Promise.all([
          fetch('http://localhost:8000/student/writing/tasks', {
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
          
          // Writing-specific VIP access logic
          const hasWritingAccess = subscriptionData.is_subscribed && (
            subscriptionData.package_type === 'all_skills' || 
            (subscriptionData.package_type === 'single_skill' && 
             subscriptionData.skill_type === 'writing')
          );
          
          setIsVIP(hasWritingAccess);
          setTests(testsData.map(exam => ({
            id: exam.exam_id,
            title: exam.title,
            created_at: exam.created_at,
            test_id: exam.test_id,
            parts: exam.parts,
            is_completed: exam.is_completed
          })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleAIFeedback = async (task) => {
    if (!task.is_completed) {
      return;
    }

    setAiLoading(true);
    setAiDialogOpen(true);

    try {
      const token = localStorage.getItem('token');

      // Fetch essay data
      const essayResponse = await fetch(`http://localhost:8000/student/writing/part/${task.task_id}/essay`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!essayResponse.ok) {
        throw new Error('Failed to fetch essay data');
      }

      const essayData = await essayResponse.json();

      if (!essayData.essay?.answer_text) {
        setAiResult({ error: 'No essay text found for evaluation. Please complete the test first.' });
        return;
      }

      // AI evaluation request with retry mechanism
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          const response = await fetch(`http://localhost:8000/ai/evaluate-and-save/${task.task_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              essay_text: essayData.essay.answer_text,
              instructions: task.instructions
            })
          });

          let data;
          const responseText = await response.text();

          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            throw new Error('Invalid response format from AI service');
          }

          if (!response.ok) {
            throw new Error(data.detail || 'AI service error occurred');
          }

          if (!data.evaluation_result) {
            throw new Error('Missing evaluation result in AI response');
          }

          setAiResult({
            task_id: data.task_id,
            evaluation_timestamp: data.evaluation_timestamp,
            word_count: data.word_count,
            answer_text: essayData.essay.answer_text,
            evaluation_result: data.evaluation_result
          });
          return;

        } catch (error) {
          console.error(`AI request attempt ${retryCount + 1} failed:`, error);
          if (retryCount === maxRetries) {
            throw new Error(`AI service failed after ${maxRetries + 1} attempts: ${error.message}`);
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount))); // Exponential backoff
        }
      }

    } catch (error) {
      console.error('AI Feedback Error:', error);
      setAiResult({
        error: `Unable to process AI feedback: ${error.message}`
      });
    } finally {
      setAiLoading(false);
    }
  };
  const handleStartTest = async (test) => {
    if (test.is_completed) {
      setSelectedTest(test);
      setDialogOpen(true);
    } else {
      navigate(`/writing_test_room`, {
        state: {
          taskId: test.parts[0].task_id,
          testId: test.test_id,
          testTitle: test.title
        }
      });
    }
  };

  const handleConfirmReset = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/student/writing/test/${selectedTest.test_id}/reset`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const testsResponse = await fetch('http://localhost:8000/student/writing/tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (testsResponse.ok) {
          const updatedTests = await testsResponse.json();
          setTests(updatedTests);
        }

        navigate(`/writing_test_room`, {
          state: {
            taskId: selectedTest.parts[0].task_id,
            testId: selectedTest.test_id,
            testTitle: selectedTest.title
          }
        });
      }
    } catch (error) {
      console.error('Error resetting test:', error);
    } finally {
      setDialogOpen(false);
      setSelectedTest(null);
    }
  };

  const handleEditEssay = (task) => {
    setSelectedPart(task);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = (wasUpdated) => {
    if (wasUpdated) {
      const fetchTests = async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch('http://localhost:8000/student/writing/tasks', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setTests(data);
          }
        } catch (error) {
          console.error('Error fetching tests:', error);
        }
      };
      fetchTests();
    }
    setEditDialogOpen(false);
    setSelectedPart(null);
  };

  // Add sortOrder state
  const [sortOrder, setSortOrder] = useState('latest');

  // Modify the filteredTests to include sorting
  const filteredTests = tests
  .filter(test => test.title.toLowerCase().includes(searchQuery.toLowerCase()))
  .sort((a, b) => {
    if (sortOrder === 'latest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else {
      return new Date(a.created_at) - new Date(b.created_at);
    }
  });

  // Add the select element in the search bar div
  <div className="flex flex-col md:flex-row gap-4 mb-8">
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder="Search tests..."
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
      <option value="latest">Latest</option>
      <option value="oldest">Oldest</option>
    </select>
  </div>

  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading writing tests...</div>
      </div>
    );
  }

  const renderTestCard = (test, index) => (
    <div 
      key={test.test_id} 
      className={`bg-white rounded-lg shadow hover:shadow-md transition-all duration-300 border border-gray-100 p-2 relative ${
        !isVIP && (index + indexOfFirstTest) >= 3 ? 'opacity-60' : ''
      }`}
    >
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
          <span className="text-lime-600 text-md italic mr-2">Test:</span>
          <span className="text-gray-700 truncate">{test.title}</span>
        </h3>

        <div className="space-y-2 mb-4">
          {test.parts.map((task) => (
            <div key={task.task_id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 py-1.5 px-2 rounded">
              <span>Part {task.part_number}</span>
              <div className="flex items-center gap-2">
                <span className="text-md">{task.word_limit} words</span>
                {test.is_completed && (
                  <>
                    <button
                      onClick={() => handleEditEssay(task)}
                      className="px-2 py-0.5 text-md bg-gray-800 text-white hover:bg-gray-700 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleAIFeedback({
                        ...task,
                        is_completed: test.is_completed
                      })}
                      className="px-2 py-0.5 text-md bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded flex items-center gap-1"
                      disabled={aiLoading}
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiLoading ? '...' : 'AI'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
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
            onClick={() => handleStartTest(test)}
            className={`w-full flex items-center justify-center gap-2 ${
              test.is_completed ? 'bg-red-500 hover:bg-red-600' : 'bg-lime-500 hover:bg-lime-600'
            } text-white px-4 py-2 rounded-md transition-colors font-medium text-sm`}
          >
            {test.is_completed ? (
              <RotateCw className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{test.is_completed ? 'Retake Test' : 'Start Test'}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li><Link to="/" className="text-gray-500 hover:text-lime-500">Home</Link></li>
            <li><span className="text-gray-400 mx-2">/</span></li>
            <li><span className="text-lime-500 font-medium">Writing Tests</span></li>
          </ol>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tests..."
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
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentTests.map((test, index) => renderTestCard(test, index))}
        </div>

        {/* Add pagination controls */}
        <div className="flex justify-center items-center space-x-4 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={3}/>
          </button>
          <span className="text-gray-600 font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={3}/>
          </button>
        </div>

        <ConfirmDialog
          isOpen={dialogOpen}
          message="Starting a new attempt will delete your previous answers. Are you sure you want to continue?"
          onConfirm={handleConfirmReset}
          onCancel={() => {
            setDialogOpen(false);
            setSelectedTest(null);
          }}
        />
        <EditEssayDialog
          isOpen={editDialogOpen}
          onClose={handleEditDialogClose}
          taskId={selectedPart}
          partNumber={selectedPart?.part_number}
        />
        <AIFeedbackDialog
          isOpen={aiDialogOpen}
          onClose={() => setAiDialogOpen(false)}
          result={aiResult}
          loading={aiLoading}
          setSelectedPart={setSelectedPart}
          setEditDialogOpen={setEditDialogOpen}
        />
      </div>
    </div>
  );
};

export default Writing_Fe;