import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Search, ChevronLeft, ChevronRight, Sparkles, RotateCw, Bot, Lock, CheckCircle } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import EditEssayDialog from './EditEssayDialog';
import Navbar from './Navbar';
import AIFeedbackDialog from './AiFeedbackDialog';
import { create } from 'framer-motion/m';
import { checkExamAccess } from '../utils/examAccess';
import secureStorage from '../utils/secureStorage';
import { API_BASE } from '../config/api';

const Writing_Fe = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  // Any active VIP package (writing/reading/listening/all_skills) — unlocks the 6/day AI grading
  // quota. The footer text promises this for Reading/Listening VIPs too, so we honor any VIP here.
  const [hasAnyVipForAi, setHasAnyVipForAi] = useState(false);
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
  const [evaluatedTasks, setEvaluatedTasks] = useState({});
  const [aiRemaining, setAiRemaining] = useState(0);


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

      const token = secureStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [testsResponse, subscriptionResponse] = await Promise.all([
          fetch(`${API_BASE}/student/writing/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/customer/vip/subscription/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (testsResponse.status === 401 || subscriptionResponse.status === 401) {
          navigate('/login');
          return;
        }

        if (testsResponse.ok && subscriptionResponse.ok) {
          const [testsData, subscriptionData] = await Promise.all([
            testsResponse.json(),
            subscriptionResponse.json()
          ]);

          setAccountStatus(subscriptionData);

          setHasAnyVipForAi(!!subscriptionData.is_subscribed && (
            subscriptionData.package_type === 'all_skills' ||
            subscriptionData.package_type === 'single_skill'
          ));
          const mapped = testsData.map(exam => ({
            id: exam.exam_id,
            title: exam.title,
            created_at: exam.created_at,
            test_id: exam.test_id,
            parts: exam.parts,
            is_completed: exam.is_completed
          }));
          setTests(mapped);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Deep-link from the public SEO landing pages: /writing_list?open=<exam_id>
  // opens that full test once the access-filtered list has loaded. No match
  // (no access / VIP-only) => normal list shows, gating untouched.
  const autoOpenHandledRef = useRef(false);
  useEffect(() => {
    if (loading || autoOpenHandledRef.current || !tests.length) return;
    const openId = parseInt(new URLSearchParams(window.location.search).get('open'), 10);
    if (!openId) return;
    const target = tests.find(t => t.id === openId);
    if (target && target.parts && target.parts.length) {
      autoOpenHandledRef.current = true;
      navigate('/writing_test_room', {
        state: {
          taskId: target.parts[0].task_id,
          testId: target.test_id,
          testTitle: target.title
        }
      });
    }
  }, [tests, loading, navigate]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const usernameKey = localStorage.getItem('username') || 'unknown';
    const now = new Date();
    const nowUtcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vnMs = nowUtcMs + (7 * 60 * 60 * 1000);
    const vn = new Date(vnMs);
    const dateKey = `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
    const storeKey = `aiEvalCounters:${usernameKey}`;
    const counters = JSON.parse(localStorage.getItem(storeKey) || '{}');
    const isVipOrStudent = hasAnyVipForAi || role === 'student';
    const limit = isVipOrStudent ? 6 : 1;
    const used = isVipOrStudent ? (counters[dateKey]?.total || 0) : (counters[dateKey]?.full || 0);
    setAiRemaining(Math.max(0, limit - used));
  }, [hasAnyVipForAi, aiDialogOpen, aiLoading]);

  const handleAIFeedback = async (task) => {
    if (!task.is_completed) {
      return;
    }

    const role = localStorage.getItem('role');
    const usernameKey = localStorage.getItem('username') || 'unknown';
    const now = new Date();
    const nowUtcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vnMs = nowUtcMs + (7 * 60 * 60 * 1000);
    const vn = new Date(vnMs);
    const dateKey = `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
    const storeKey = `aiEvalCounters:${usernameKey}`;
    const counters = JSON.parse(localStorage.getItem(storeKey) || '{}');
    if (!counters[dateKey]) counters[dateKey] = { full: 0, forecast: 0, total: 0 };
    const isVipOrStudent = hasAnyVipForAi || role === 'student';
    if (isVipOrStudent) {
      if (counters[dateKey].total >= 6) {
        setAiResult({ error: 'Bạn đã vượt quá giới hạn đánh giá AI trong ngày (6).' });
        setAiDialogOpen(true);
        return;
      }
    } else {
      if (counters[dateKey].full >= 1) {
        setAiResult({ error: 'Tài khoản thường chỉ được đánh giá 1 bài full mỗi ngày.' });
        setAiDialogOpen(true);
        return;
      }
    }

    if (aiRemaining <= 0) {
      setAiResult({ error: 'Bạn đã hết số lượt đánh giá AI trong ngày.' });
      setAiDialogOpen(true);
      return;
    }

    setAiLoading(true);
    setAiDialogOpen(true);

    try {
      const token = secureStorage.getItem('token') || localStorage.getItem('token');

      // Fetch essay data
      const essayResponse = await fetch(`${API_BASE}/student/writing/part/${task.task_id}/essay`, {
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
          const response = await fetch(`${API_BASE}/ai/evaluate-and-save/${task.task_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              essay_text: essayData.essay.answer_text,
              instructions: essayData.instructions || ''
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
            band_score: data.evaluation_result.band_score,  // Changed from 'score' to 'band_score'
            word_count: data.word_count,
            answer_text: essayData.essay.answer_text,
            evaluation_result: data.evaluation_result
          });
          setEvaluatedTasks(prev => ({ ...prev, [task.task_id]: true }));
          counters[dateKey].total = (counters[dateKey].total || 0) + 1;
          counters[dateKey].full = (counters[dateKey].full || 0) + 1;
          localStorage.setItem(storeKey, JSON.stringify(counters));
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
    const token = secureStorage.getItem('token') || localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/student/writing/test/${selectedTest.test_id}/reset`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const testsResponse = await fetch(`${API_BASE}/student/writing/tasks`, {
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
        const token = secureStorage.getItem('token') || localStorage.getItem('token');
        try {
          const response = await fetch(`${API_BASE}/student/writing/tasks`, {
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

  const [sortOrder, setSortOrder] = useState('alphabet', 'latest', 'oldest');

  const filteredTests = tests
    .filter(test => test.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortOrder) {
        case 'alphabet':
          // Split titles into text and number parts
          const [aText, aNum] = a.title.match(/([^\d]+)(\d+)/).slice(1);
          const [bText, bNum] = b.title.match(/([^\d]+)(\d+)/).slice(1);

          // Compare text parts first
          const textCompare = aText.localeCompare(bText);
          if (textCompare !== 0) return textCompare;

          // If text parts are same, compare numbers
          return parseInt(aNum) - parseInt(bNum);
        case 'latest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        default:
          return a.title.localeCompare(b.title);
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
      <option value="alphabet">Theo Alphabet</option>
      <option value="latest">Mới nhất</option>
      <option value="oldest">Cũ nhất</option>
    </select>
  </div>

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

          <div className="text-xl font-medium text-gray-700 mb-2">Loading writing tests...</div>

          <div className="flex space-x-1.5 mt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <div className="mt-4 text-sm text-gray-500 max-w-xs text-center">
            Đang tải các bài kiểm tra IELTS Writing. Vui lòng đợi trong giây lát...
          </div>
        </div>
      </div>
    );
  }

  const renderTestCard = (test, index) => (
    <div
      key={test.test_id}
      className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-300 border border-gray-100 p-2 relative"
    >
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
          <span className="text-[#0096b1] text-md italic mr-2">Test:</span>
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
                      className={`px-2 py-0.5 text-md bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded flex items-center gap-1 ${aiRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={aiLoading || aiRemaining <= 0}
                    >
                      {evaluatedTasks[task.task_id] ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {aiLoading ? '...' : 'Evaluate with AI'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => handleStartTest(test)}
          className={`w-full flex items-center justify-center gap-2 ${test.is_completed ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0096b1] hover:bg-[#eb7e37]'} text-white px-4 py-2 rounded-md transition-colors font-medium text-sm`}
        >
          {test.is_completed ? (
            <RotateCw className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{test.is_completed ? 'Làm lại' : 'Bắt đầu'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><Link to="/" className="text-gray-500 hover:text-[#0096b1]">Home</Link></li>
              <li><span className="text-gray-400 mx-2">/</span></li>
              <li><span className="text-[#0096b1] font-medium">Writing Tests</span></li>
            </ol>
          </nav>
          <div className="text-sm font-semibold text-red-700 mt-5">
            <p>* Nâng cấp VIP Listening và Reading để mở khóa thêm 6 lượt chấm điểm AI Writing miễn phí mỗi ngày. *</p>
            <p>* Số lượt chấm điểm bằng AI miễn phí còn lại trong ngày: {aiRemaining} *</p>
          </div>
        </div>
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
            <option value="alphabet">Theo Alphabet</option>
            <option value="latest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
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
            <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          <span className="text-gray-600 font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
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
