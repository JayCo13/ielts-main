import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, MessageCircle, Edit, Eye, Copy, Filter } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import Split from 'react-split';

const SpeakingLayout = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState('all');
  const location = useLocation();
  const { topicId } = location.state || {};
  const [studentAnswers, setStudentAnswers] = useState({});

  useEffect(() => {
    const fetchTopicDetails = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [topicResponse, answersResponse] = await Promise.all([
          fetch(`http://localhost:8000/student/speaking/topics/${topicId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`http://localhost:8000/student/speaking/my-answers`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (topicResponse.ok) {
          const topicData = await topicResponse.json();
          setTopic(topicData);

          if (answersResponse.ok) {
            const answersData = await answersResponse.json();
            const answers = {};
            answersData
              .filter(answer => answer.topic_id === topicId)
              .forEach(answer => {
                answers[answer.question_id] = answer.answer_text;
              });
            setStudentAnswers(answers);
          }
        } else if (topicResponse.status === 401) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicDetails();
  }, [topicId, navigate]);

  const formatPartType = (partType) => {
    if (!partType) return '';
    return partType.replace(/^part/, 'Part ');
  };
  const handleSaveAnswer = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:8000/student/speaking/answers/${currentQuestion.question_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer_text: studentAnswers[currentQuestion.question_id] || ''
          })
        }
      );

      if (response.ok) {
        setNotification({
          show: true,
          message: 'Your answer has been saved successfully!',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      setNotification({
        show: true,
        message: 'Failed to save your answer. Please try again.',
        type: 'error'
      });
    }
  };

  const handleEditorChange = (content) => {
    setStudentAnswers(prev => ({
      ...prev,
      [currentQuestion.question_id]: content
    }));
  };

  const getQuestionsByPart = () => {
    if (!topic) return [];
    if (selectedPart === 'all') {
      return topic.questions;
    }
    return topic.questions.filter(question => question.part_type === selectedPart);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading topic details...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Topic not found</div>
      </div>
    );
  }

  const filteredQuestions = getQuestionsByPart();
  const currentQuestion = filteredQuestions[currentQuestionIndex] || topic.questions[0];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm flex-none">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <button
            onClick={() => navigate('/speaking_list')}
            className="flex items-center text-lg font-bold text-gray-600 hover:text-lime-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" strokeWidth={3} />
            Back to Topics
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="bg-white rounded-xl shadow-md h-full p-6">
          <h3 className="text-2xl text-center font-bold text-gray-800 mb-3">
            <span className="text-lime-600 font-bold italic mr-2">Topic:</span>
            <span className="text-gray-700">{topic.title}</span>
          </h3>

          <div className="flex flex-col items-center mb-6">
            <div className="flex flex-wrap justify-center gap-2">
              {filteredQuestions.map((question, index) => (
                <button
                  key={question.question_id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${index === currentQuestionIndex
                    ? 'bg-lime-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <Split
            className="flex h-[calc(100vh-240px)]"
            sizes={[50, 50]}
            minSize={300}
            expandToMin={false}
            gutterSize={10}
            gutterAlign="center"
            snapOffset={30}
            dragInterval={1}
            direction="horizontal"
            cursor="col-resize"
          >
            <div className="overflow-y-auto p-4">
              <div className="flex flex-col space-y-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">
                    Question {currentQuestionIndex + 1} - {formatPartType(currentQuestion.part_type)}
                  </h2>
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-black-500" />
                    <select
                      value={selectedPart}
                      onChange={(e) => {
                        setSelectedPart(e.target.value);
                        setCurrentQuestionIndex(0);
                      }}
                      className="px-4 py-2 border rounded-lg text-medium focus:outline-none focus:ring-2 focus:ring-lime-500"
                    >
                      <option value="all">All Parts</option>
                      <option value="part1">Part 1</option>
                      <option value="part2">Part 2</option>
                      <option value="part3">Part 3</option>
                    </select>
                  </div>
                </div>


              </div>

              <div
                className="text-gray-600 text-lg leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
              />
              <button
                onClick={() => setShowAnswerDialog(true)}
                className="mt-6 flex items-center space-x-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all duration-300"
              >
                <Eye className="w-5 h-5" />
                <span>View Sample Answer</span>
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Your Answer:
              </h3>
              <Editor
                apiKey="mbitaig1o57ii8l8aa8wx4b4le9cc1e0aw5t2c1lo4axii6u"
                value={studentAnswers[currentQuestion.question_id] || ''}
                onEditorChange={handleEditorChange}
                init={{
                  height: 'calc(100vh - 400px)',
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'charmap',
                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'table', 'wordcount'
                  ],
                  toolbar: 'undo redo | formatselect | ' +
                    'bold italic backcolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat',
                  content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; }'
                }}
              />
              <button
                onClick={handleSaveAnswer}
                className="mt-4 bg-lime-500 text-white px-6 py-2 rounded-lg hover:bg-lime-600 transition-all duration-300 flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Save Answer</span>
              </button>
            </div>
          </Split>
        </div>
      </div>

      {notification.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className={`text-2xl mb-4 ${notification.type === 'success' ? 'text-lime-600' : 'text-red-600'
                }`}>
                {notification.type === 'success' ? '✓' : '✕'}
              </div>
              <p className="text-gray-700 text-lg mb-6">{notification.message}</p>
              <button
                onClick={() => setNotification({ show: false, message: '', type: '' })}
                className={`px-6 py-2 rounded-lg text-white ${notification.type === 'success' ? 'bg-lime-500 hover:bg-lime-600' : 'bg-red-500 hover:bg-red-600'
                  } transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnswerDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-blue-500 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6" />
                  Sample Answer
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setStudentAnswers(prev => ({
                        ...prev,
                        [currentQuestion.question_id]: currentQuestion.sample_answer
                      }));
                      setShowAnswerDialog(false);
                    }}
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    title="Copy to your answer"
                  >
                    <Copy className="w-5 h-5" />
                    <span className="text-sm">Copy to your answer</span>
                  </button>
                  <button
                    onClick={() => setShowAnswerDialog(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div
                className="prose max-w-none text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentQuestion.sample_answer }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingLayout;