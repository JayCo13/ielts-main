import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { Bell, Menu, Wifi, Volume2 } from 'lucide-react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Split from 'react-split';


const processInstructions = (instructions) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(instructions, 'text/html');
  
  doc.querySelectorAll('img').forEach(img => {
    if (img.src.startsWith('/')) {
      img.src = `http://localhost:8000${img.src}`;
    }
  });
  
  return doc.body.innerHTML;
};

const WritingLayout = () => {
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const location = useLocation();
  const { taskId, testId } = location.state || {};
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [textSize, setTextSize] = useState('regular');
  const [colorTheme, setColorTheme] = useState('black-on-white');
  const menuRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [parts, setParts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submissionData, setSubmissionData] = useState(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const isSubmitEnabled = (timeRemaining) => {
    return timeRemaining <= 120 || timeRemaining <= 0; // Enable when 2 minutes or less remaining
  };
  const textSizeClasses = {
    regular: 'text-base',
    large: 'text-lg',
    'extra-large': 'text-xl'
  };
  const colorThemeClasses = {
    'black-on-white': 'bg-white text-black',
    'white-on-black': 'bg-black text-white',
    'yellow-on-black': 'bg-black text-yellow-300'
  };
  useEffect(() => {
    const fetchTestParts = async () => {
      const token = localStorage.getItem('token');
      if (!token || !testId) return;

      try {
        const response = await fetch(`http://localhost:8000/student/writing/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const currentTest = data.find(test => test.test_id === parseInt(testId));
          if (currentTest) {
            setParts(currentTest.parts);
            const currentIndex = currentTest.parts.findIndex(part => part.task_id === parseInt(taskId));
            setCurrentPartIndex(currentIndex);
          }
        }
      } catch (error) {
        console.error('Error fetching test parts:', error);
      }
    };

    fetchTestParts();
  }, [testId, taskId]);

  // Remove answers from dependency array
  useEffect(() => {
    const fetchTaskDetails = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/student/writing/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTask(data);
          setTimeLeft(data.duration * 60);
          setCurrentPartIndex(data.part_number - 1);
          
          // Use saved answer if exists, otherwise use previous answer from server
          const savedAnswer = answers[taskId];
          if (savedAnswer) {
            setStudentAnswer(savedAnswer);
          } else if (data.previous_answer) {
            setStudentAnswer(data.previous_answer.answer_text);
          } else {
            setStudentAnswer('');
          }
        } else if (response.status === 401) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching task details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId, navigate]); // Removed answers from dependencies

  useEffect(() => {
    if (timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit(); // Auto submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Add this new state to track both answers
  const [allAnswers, setAllAnswers] = useState({
    part1_answer: '',
    part2_answer: ''
  });

  // Modify handleEditorChange to update both states
  const handleEditorChange = (content) => {
    setStudentAnswer(content);
    // Update the specific part's answer
    setAllAnswers(prev => ({
      ...prev,
      [task.part_number === 1 ? 'part1_answer' : 'part2_answer']: content
    }));
  };

  // Replace the existing handleSubmit with this new version
  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    try {
      // Save current answer before submitting
      const currentAnswer = studentAnswer;
      setAllAnswers(prev => ({
        ...prev,
        [task.part_number === 1 ? 'part1_answer' : 'part2_answer']: currentAnswer
      }));

      const response = await fetch(
        `http://localhost:8000/student/writing/test/${testId}/submit`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            part1_answer: task.part_number === 1 ? currentAnswer : allAnswers.part1_answer,
            part2_answer: task.part_number === 2 ? currentAnswer : allAnswers.part2_answer
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubmissionData(data);
        
        setNotification({
          show: true,
          message: 'Test submitted successfully! Returning to test list...',
          type: 'success'
        });
        
        setTimeout(() => {
          navigate('/writing_list');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      setNotification({
        show: true,
        message: 'Failed to submit your test. Please try again.',
        type: 'error'
      });
    }
  };

  // Update the submit button text in the return section
  <button
    onClick={handleSubmit}
    className={`flex items-center gap-2 px-7 py-5 rounded-lg transition-colors ${
      colorTheme === 'black-on-white' ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'
    }`}
  >
    <Check className="w-5 h-5" />
    <span>Submit Test</span>
  </button>

const handlePreviousPart = async () => {
  if (currentPartIndex > 0) {
    // Save current answer before switching
    const previousPart = parts[currentPartIndex - 1];
    setAllAnswers(prev => ({
      ...prev,
      [task.part_number === 1 ? 'part1_answer' : 'part2_answer']: studentAnswer
    }));

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/student/writing/tasks/${previousPart.task_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTask(data);
        // Remove the setTimeLeft line to maintain current timer
        setStudentAnswer(data.part_number === 1 ? allAnswers.part1_answer : allAnswers.part2_answer || '');
        setCurrentPartIndex(currentPartIndex - 1);
      }
    } catch (error) {
      console.error('Error fetching previous task:', error);
    } finally {
      setLoading(false);
    }
  }
};

const handleNextPart = async () => {
  if (currentPartIndex < parts.length - 1) {
    // Save current answer before switching
    const nextPart = parts[currentPartIndex + 1];
    setAllAnswers(prev => ({
      ...prev,
      [task.part_number === 1 ? 'part1_answer' : 'part2_answer']: studentAnswer
    }));

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/student/writing/tasks/${nextPart.task_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTask(data);
        // Remove the setTimeLeft line to maintain current timer
        setStudentAnswer(data.part_number === 1 ? allAnswers.part1_answer : allAnswers.part2_answer || '');
        setCurrentPartIndex(currentPartIndex + 1);
      }
    } catch (error) {
      console.error('Error fetching next task:', error);
    } finally {
      setLoading(false);
    }
  }
};

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading task details...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Task not found</div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${colorThemeClasses[colorTheme]}`}>
      <header className={`border-b border-zinc-500 px-4 py-4 flex justify-between items-center ${colorThemeClasses[colorTheme]}`}>
        <div className="flex items-center space-x-8">
          <span className="text-red-600 font-bold text-3xl">IELTS</span>
          <div className={`text-sm ${colorThemeClasses[colorTheme]}`}>
            <div><p className="font-bold">Test taker ID</p></div>
            <div>
              {formatTime(timeLeft)} remaining
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 font-medium">
          <Wifi className={`w-5 h-5 ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'}`} />
          <Bell className={`w-5 h-5 ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'}`} />
          <div className="relative" ref={menuRef}>
          <Menu 
              className={`w-5 h-5 cursor-pointer ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            />
            {isMenuOpen && (
              <div className="fixed inset-0 z-50">
                <div className={`min-h-screen w-full flex flex-col items-center justify-center ${colorThemeClasses[colorTheme]}`}>
                  <div className="w-full max-w-3xl bg-opacity-95 p-12 rounded-2xl">
                    <div className="flex justify-between items-center mb-12">
                      <h2 className="text-3xl font-bold">Settings</h2>
                      <button 
                        onClick={() => setIsMenuOpen(false)}
                        className="text-2xl hover:opacity-70 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-16">
                      <div className="space-y-8">
                        <div>
                          <h3 className="font-semibold text-2xl mb-6">Text Size</h3>
                          <div className="p-6 border rounded-xl mb-8 text-center">
                            <p className={`${textSizeClasses[textSize]}`}>
                              Sample Text Preview
                            </p>
                          </div>
                          <div className="space-y-4">
                            <label className="flex items-center p-4 bg-white text-black rounded-lg cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all">
                              <input
                                type="radio"
                                name="textSize"
                                value="regular"
                                checked={textSize === 'regular'}
                                onChange={(e) => setTextSize(e.target.value)}
                                className="w-5 h-5 text-lime-500"
                              />
                              <span className="text-base ml-4">Regular</span>
                            </label>
                            <label className="flex items-center p-4 bg-white text-black rounded-lg cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all">
                              <input
                                type="radio"
                                name="textSize"
                                value="large"
                                checked={textSize === 'large'}
                                onChange={(e) => setTextSize(e.target.value)}
                                className="w-5 h-5 text-lime-500"
                              />
                              <span className="text-lg ml-4">Large</span>
                            </label>
                            <label className="flex items-center p-4 bg-white text-black rounded-lg cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all">
                              <input
                                type="radio"
                                name="textSize"
                                value="extra-large"
                                checked={textSize === 'extra-large'}
                                onChange={(e) => setTextSize(e.target.value)}
                                className="w-5 h-5 text-lime-500"
                              />
                              <span className="text-xl ml-4">Extra Large</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div>
                          <h3 className="font-semibold text-2xl mb-6">Color Theme</h3>
                          <div className="space-y-4">
                            <label className="flex items-center p-4 bg-white text-black rounded-lg cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all">
                              <input
                                type="radio"
                                name="colorTheme"
                                value="black-on-white"
                                checked={colorTheme === 'black-on-white'}
                                onChange={(e) => setColorTheme(e.target.value)}
                                className="w-5 h-5 text-lime-500"
                              />
                              <span className="text-lg ml-4">Black on White</span>
                            </label>
                            <label className="flex items-center p-4 bg-black text-white rounded-lg cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all">
                              <input
                                type="radio"
                                name="colorTheme"
                                value="white-on-black"
                                checked={colorTheme === 'white-on-black'}
                                onChange={(e) => setColorTheme(e.target.value)}
                                className="w-5 h-5 text-lime-500"
                              />
                              <span className="text-lg ml-4">White on Black</span>
                            </label>
                            <label className="flex items-center p-4 bg-black text-yellow-300 rounded-lg cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all">
                              <input
                                type="radio"
                                name="colorTheme"
                                value="yellow-on-black"
                                checked={colorTheme === 'yellow-on-black'}
                                onChange={(e) => setColorTheme(e.target.value)}
                                className="w-5 h-5 text-lime-500"
                              />
                              <span className="text-lg ml-4">Yellow on Black</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}    </div>
        </div>
      </header>

      <div className={`flex-1 flex flex-col h-[calc(100vh-72px)] ${colorThemeClasses[colorTheme]}`}>
        <div className={`mx-4 mt-2 p-3 rounded-lg border border-gray-300 ${colorThemeClasses[colorTheme]}`}>
          <h3 className={`font-bold text-lg mb-1 ${textSizeClasses[textSize]}`}>Part {task.part_number}</h3>
          <p className={textSizeClasses[textSize]}>
            You should spend about {task.duration} minutes on this task. Write at least {task.word_limit} words.
          </p>
        </div>

        <Split
          sizes={[50, 50]}
          minSize={300}
          gutterSize={10}
          className="flex-1 flex h-[calc(100vh-200px)]"
        >
          <div className={`overflow-y-auto p-4 ${colorThemeClasses[colorTheme]}`}>
            <div
              className={`leading-relaxed ${textSizeClasses[textSize]}`}
              dangerouslySetInnerHTML={{ __html: processInstructions(task.instructions) }}
            />
          </div>

          <div className={`p-4 flex flex-col ${colorThemeClasses[colorTheme]}`}>
          <Editor
              apiKey="mbitaig1o57ii8l8aa8wx4b4le9cc1e0aw5t2c1lo4axii6u"
              value={studentAnswer}
              onEditorChange={handleEditorChange}
              key={`${textSize}-${colorTheme}`} // Add this line to force re-render
              init={{
                height: 'calc(100vh-300px)',
                width: '100%',
                menubar: false,
                plugins: ['wordcount'],
                toolbar: false,
                content_style: `
                  * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
                  body { 
                    padding: 20px;
                    font-size: ${textSize === 'regular' ? '16px' : textSize === 'large' ? '20px' : '24px'} !important;
                    background-color: ${colorTheme === 'black-on-white' ? 'white' : 'black'} !important;
                    color: ${
                      colorTheme === 'black-on-white' ? 'black' : 
                      colorTheme === 'white-on-black' ? 'white' : 
                      '#fde047'
                    } !important;
                  }
                  p { font-size: inherit !important; }
                `,
                statusbar: false,
                skin: colorTheme === 'black-on-white' ? 'oxide' : 'oxide-dark',
                content_css: colorTheme === 'black-on-white' ? 'default' : 'dark',
                setup: (editor) => {
                  editor.on('init', () => {
                    editor.getBody().style.fontSize = textSize === 'regular' ? '16px' : textSize === 'large' ? '20px' : '24px';
                    editor.getBody().style.backgroundColor = colorTheme === 'black-on-white' ? 'white' : 'black';
                    editor.getBody().style.color = colorTheme === 'black-on-white' ? 'black' : 
                      colorTheme === 'white-on-black' ? 'white' : '#fde047';
                  });
                }
              }}
              className={colorThemeClasses[colorTheme]}
            />
            <div className={`flex justify-between items-center mt-4 ${colorThemeClasses[colorTheme]}`}>
              <div className={`text-md ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'}`}>
                Words: {studentAnswer.split(/\s+/).filter(word => word.length > 0).length}
              </div>
              <div className="flex gap-2">
                <button 
                  className={`p-3 border rounded-lg shadow-sm hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
                    colorTheme === 'black-on-white' ? 'bg-black text-white' : 'bg-white text-black'
                  }`}
                  onClick={handlePreviousPart}
                  disabled={currentPartIndex === 0}
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button 
                  className={`p-3 border rounded-lg shadow-sm hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
                    colorTheme === 'black-on-white' ? 'bg-black text-white' : 'bg-white text-black'
                  }`}
                  onClick={handleNextPart}
                  disabled={currentPartIndex === parts.length - 1}
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </div>
            </div>
          </div>
        </Split>

        <div className={`border-t border-lime-500 py-2 px-6 ${colorThemeClasses[colorTheme]}`}>
          <div className="flex justify-between items-center">
            <div>
              Part {task.part_number}
            </div>
            <div className="flex gap-2">
    {isSubmitEnabled(timeLeft) && (
      currentPartIndex < parts.length - 1 ? (
        <button
          onClick={handleSubmit}
          className={`flex items-center gap-2 px-7 py-5 rounded-lg transition-colors ${
            colorTheme === 'black-on-white' ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>Submit</span>
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          className={`flex items-center gap-2 px-7 py-5 rounded-lg transition-colors ${
            colorTheme === 'black-on-white' ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>Complete Test</span>
        </button>
      )
    )}
  </div>
          </div>
        </div>
      </div>

      {notification.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl max-w-md w-full p-6 ${colorThemeClasses[colorTheme]}`}>
            <div className="text-center">
              <div className={`text-2xl mb-4 ${
                notification.type === 'success' ? 'text-lime-600' : 'text-red-600'
              }`}>
                {notification.type === 'success' ? '✓' : '✕'}
              </div>
              <p className={`text-lg mb-6 ${colorThemeClasses[colorTheme]}`}>{notification.message}</p>
              <button
                onClick={() => {
                  setNotification({ show: false, message: '', type: '' });
                  if (notification.type === 'success' && !submissionData?.other_part) {
                    navigate('/writing_list');
                  }
                }}
                className={`px-6 py-6 rounded-lg text-white ${
                  notification.type === 'success' ? 'bg-lime-500 hover:bg-lime-600' : 'bg-red-500 hover:bg-red-600'
                } transition-colors`}
              >
                {notification.type === 'success' ? 
                  (submissionData?.other_part ? 'Continue to Next Part' : 'Back to Tests') 
                  : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingLayout;