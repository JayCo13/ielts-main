import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Wifi, Volume2 } from 'lucide-react';
import ListeningTest from './fill_in_blank';
import { Player } from '@lottiefiles/react-lottie-player';

const MainLayout = () => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentPart, setCurrentPart] = useState(1);
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [hardQuestions, setHardQuestions] = useState({});
  const [studentAnswers, setStudentAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [completedQuestions, setCompletedQuestions] = useState({}); // Track completed questions
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { examId } = location.state || {};
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [volume, setVolume] = useState(1);
  // Add new state variables for settings
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [textSize, setTextSize] = useState('regular');
  const [colorTheme, setColorTheme] = useState('black-on-white');
  const [totalTestLength, setTotalTestLength] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [isSubmissionPeriod, setIsSubmissionPeriod] = useState(false);
  const [submissionTimeRemaining, setSubmissionTimeRemaining] = useState(5 * 60); // 5 minutes in seconds
  const menuRef = useRef(null);
  const [wifiStatus, setWifiStatus] = useState({
    isConnected: true,
    strength: 'Good',
    showTooltip: false,
    type: 'wifi',
    downlink: 0,
    effectiveType: '4g',
    rtt: 0,
    saveData: false
  });

  // Define classes for different text sizes and color themes
  const textSizeClasses = {
    'regular': 'text-base',
    'large': 'text-lg',
    'extra-large': 'text-xl',
  };

  const colorThemeClasses = {
    'black-on-white': 'bg-white text-black',
    'white-on-black': 'bg-black text-white',
    'yellow-on-black': 'bg-black text-yellow-300',
  };

  const getQuestionRange = (partNumber) => {
    switch (partNumber) {
      case 1:
        return { start: 1, end: 10 };
      case 2:
        return { start: 11, end: 20 };
      case 3:
        return { start: 21, end: 30 };
      case 4:
        return { start: 31, end: 40 };
      default:
        return { start: 0, end: 0 };
    }
  };

  // Update handleAnswerChange to also mark questions as completed
  const handleAnswerChange = (questionId, answer) => {
    console.log('Updating answers:', questionId, answer);
    
    // Use a callback to ensure we're working with the latest state
    setStudentAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };
      console.log('New answers state:', newAnswers);
      
      // Mark this question as completed if it has a non-empty answer
      if (answer && answer.trim() !== '') {
        setCompletedQuestions(prevCompleted => ({
          ...prevCompleted,
          [questionId]: true
        }));
      } else {
        // If answer is empty, mark as not completed
        setCompletedQuestions(prevCompleted => {
          const updated = { ...prevCompleted };
          delete updated[questionId];
          return updated;
        });
      }
      
      // Save to localStorage immediately
      const savedAnswers = JSON.parse(localStorage.getItem('ielts-answers') || '{}');
      if (!savedAnswers[examId]) {
        savedAnswers[examId] = {};
      }
      savedAnswers[examId][questionId] = answer;
      localStorage.setItem('ielts-answers', JSON.stringify(savedAnswers));
      
      // Update radio buttons in the DOM directly
      if (questionId && answer) {
        // Find all radio buttons for this question
        const questionNumber = Object.keys(window.questionMap || {}).find(
          num => window.questionMap[num] === questionId
        );
        
        if (questionNumber) {
          const radios = document.querySelectorAll(`input[name="table_question_${questionNumber}"]`);
          radios.forEach(radio => {
            radio.checked = radio.value === answer;
          });
        }
      }
      
      return newAnswers;
    });
  };

  
  


  useEffect(() => {
    const fetchAudioLengths = async () => {
      try {
        const response = await fetch(`http://localhost:8000/student/exam/${examId}/audio-lengths`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTotalTestLength(data.total_length_formatted);
        }
      } catch (error) {
        console.error('Error fetching audio lengths:', error);
      }
    };

    if (examId) {
      fetchAudioLengths();
    }
  }, [examId]);
  
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/student/exam/${examId}/start`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setExamData(data);
          setAudioUrl(`http://localhost:8000/student/exam/${examId}/audio`);
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  const getCurrentSection = () => {
    return examData?.sections[currentPart - 1];
  };

  const handleSubmitExam = async () => {
    console.log('Submitting exam with answers:', studentAnswers);
    try {
      const response = await fetch(`http://localhost:8000/student/exam/${examId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentAnswers)
      });

      if (response.ok) {
        const result = await response.json();
        // Clear all student answers from localStorage after submission
        localStorage.removeItem('ielts-answers');
        localStorage.removeItem('ielts-highlights');
        localStorage.removeItem('current-exam-session');
        
        // Reset all state variables related to student answers
        setStudentAnswers({});
        setCompletedQuestions({});
        
        navigate('/result_review', { state: { resultId: result.result_id } });
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
    }
  };

  const handleStartAudio = () => {
    if (audioRef.current) {
      setIsAudioStarted(true);
      setTimeout(() => {
        audioRef.current.play().catch(error => {
          console.log('Audio playback error:', error);
        });
      }, 100);
    }
  };

  useEffect(() => {
    if (isAudioStarted && totalTestLength) {
      // Convert MM:SS format to seconds
      const [minutes, seconds] = totalTestLength.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      setRemainingTime(totalSeconds);

      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            // Start submission period instead of immediately submitting
            setIsSubmissionPeriod(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isAudioStarted, totalTestLength]);

  // Add submission period timer
  useEffect(() => {
    if (isSubmissionPeriod) {
      const submissionTimer = setInterval(() => {
        setSubmissionTimeRemaining(prev => {
          if (prev <= 0) {
            clearInterval(submissionTimer);
            // Auto-submit when submission period ends
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(submissionTimer);
    }
  }, [isSubmissionPeriod]);

  // Add this helper function
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add a function to check if a question is completed
  const isQuestionCompleted = (questionNumber) => {
    // Find the question ID for this question number
    const currentSection = examData?.sections[currentPart - 1];
    if (!currentSection) return false;

    const allQuestions = currentSection.questions.filter(
      q => q.question_type === 'fill_in_blank' || q.question_type === 'multiple_choice'
    );

    // Calculate base question number for this part
    const baseQuestionNum = (currentPart - 1) * 10 + 1;

    // Find the question at this position
    const questionIndex = questionNumber - baseQuestionNum;
    if (questionIndex < 0 || questionIndex >= allQuestions.length) return false;

    const questionId = allQuestions[questionIndex]?.question_id;
    if (!questionId) return false;

    // Check if this question has an answer
    return !!studentAnswers[questionId] && studentAnswers[questionId].trim() !== '';
  };

  // Improve the scrollToQuestion function
  const scrollToQuestion = (questionNumber) => {
    // Try multiple strategies to find the question element
    let found = false;

    // Strategy 1: Find by direct ID
    const questionElement = document.getElementById(`question-${questionNumber}`);
    if (questionElement) {
      questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight effect
      questionElement.classList.add('bg-[#60A5FA]'); // or 'bg-blue-400' if using Tailwind
      setTimeout(() => {
        questionElement.classList.remove('bg-[#60A5FA]');
      }, 1500);
      found = true;
    }

    // Strategy 2: Find by data attribute
    if (!found) {
      const elementsByData = document.querySelectorAll(`[data-question-number="${questionNumber}"]`);
      if (elementsByData.length > 0) {
        elementsByData[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        elementsByData[0].classList.add('bg-[#60A5FA]');
        setTimeout(() => {
          elementsByData[0].classList.remove('bg-[#60A5FA]');
        }, 1500);
        found = true;
      }
    }

    // Strategy 3: Find input fields with this question number as placeholder
    if (!found) {
      const inputElement = document.getElementById(`input-question-${questionNumber}`);
      if (inputElement) {
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight effect to the input with inline styles for reliability
        inputElement.style.borderColor = '#3b82f6'; // blue-500
        inputElement.style.backgroundColor = '#eff6ff'; // blue-50
        inputElement.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.6)'; // ring effect
        
        // Set focus to the input for better user experience
        inputElement.focus();
        
        // Add transition for smooth highlighting
        inputElement.style.transition = 'all 0.3s ease';
        
        // Clear styles after animation
        setTimeout(() => {
          inputElement.style.borderColor = '';
          inputElement.style.backgroundColor = '';
          inputElement.style.boxShadow = '';
          inputElement.style.transition = '';
        }, 1500);
        
        found = true;
      } else {
        // Try finding by placeholder
        const inputElements = document.querySelectorAll(`input[placeholder="${questionNumber}"]`);
        if (inputElements.length > 0) {
          inputElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Use inline styles instead of classes for more reliable highlighting
          inputElements[0].style.borderColor = '#3b82f6'; // blue-500
          inputElements[0].style.backgroundColor = '#eff6ff'; // blue-50
          inputElements[0].style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)'; // ring effect

          setTimeout(() => {
            inputElements[0].style.borderColor = '';
            inputElements[0].style.backgroundColor = '';
            inputElements[0].style.boxShadow = '';
          }, 1500);
          found = true;
        }
      }
    }

    // Strategy 4: Find by question number in text
    if (!found) {
      const elements = document.querySelectorAll('strong');
      for (const el of elements) {
        if (el.textContent.trim() === questionNumber.toString()) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight effect to parent element
          const parent = el.closest('p') || el.parentElement;
          if (parent) {
            parent.classList.add('bg-[#60A5FA]');
            setTimeout(() => {
              parent.classList.remove('bg-[#60A5FA]');
            }, 1500);
          }
          found = true;
          break;
        }
      }
    }

    // Strategy 5: Find section headers for checkbox questions
    if (!found) {
      // Check if this question is part of a checkbox section
      const sections = document.querySelectorAll('[data-question-range]');
      for (const section of sections) {
        const range = section.getAttribute('data-question-range').split('-');
        const start = parseInt(range[0]);
        const end = parseInt(range[1]);

        if (questionNumber >= start && questionNumber <= end) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          section.classList.add('bg-[#60A5FA]');
          setTimeout(() => {
            section.classList.remove('bg-[#60A5FA]');
          }, 1500);
          found = true;
          break;
        }
      }
    }

    // If still not found, try a more general approach
    if (!found) {
      // Look for any element containing the question number
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent.includes(questionNumber) &&
          el.tagName !== 'BUTTON' &&
          !el.closest('footer')) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight effect
          el.classList.add('bg-[#60A5FA]');
          setTimeout(() => {
            el.classList.remove('bg-[#60A5FA]');
          }, 1500);
          break;
        }
      }
    }
    
    // Strategy 6: Find input fields with data-question-number attribute
    if (!found) {
      const inputsByData = document.querySelectorAll(`input[data-question-number="${questionNumber}"]`);
      if (inputsByData.length > 0) {
        const inputElement = inputsByData[0];
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect to the input
        inputElement.style.borderColor = '#3b82f6'; // blue-500
        inputElement.style.backgroundColor = '#eff6ff'; // blue-50
        inputElement.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.6)'; // ring effect
        inputElement.style.transition = 'all 0.3s ease';
        
        // Set focus to the input
        inputElement.focus();
        
        setTimeout(() => {
          inputElement.style.borderColor = '';
          inputElement.style.backgroundColor = '';
          inputElement.style.boxShadow = '';
          inputElement.style.transition = '';
        }, 1500);
        
        found = true;
      }
    }
  };

  // Define renderQuestionComponent only once
  const renderQuestionComponent = (question, index) => {
    const range = getQuestionRange(currentPart);
    const questionNumber = range.start;

    if (question.question_type === 'main_text') {
      // Make hardQuestions available to the window object
      window.hardQuestions = hardQuestions;
      
      return (
        <ListeningTest
          key={question.question_id}
          question={question}
          index={index}
          questionNumber={questionNumber}
          answers={studentAnswers}
          onAnswerChange={handleAnswerChange}
          examData={examData}
          currentPart={currentPart}
          questionType={getCurrentSection()?.questions.map(q => q.question_type)}
          textSize={textSize}
          colorTheme={colorTheme}
          hardQuestions={hardQuestions}
        />
      );
    }
    return null;
  };

  // Add this useEffect to handle browser reload prevention
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only show the dialog if the audio has started (exam is in progress)
      if (isAudioStarted) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = 'You are in the middle of an exam. Are you sure you want to leave? Your progress may be lost.';
        return e.returnValue;
      }
    };

    // Add event listener when component mounts
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAudioStarted]);

  // Add a click outside handler to close the menu (moved up from below)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Update the useEffect for WiFi status
  useEffect(() => {
    const checkWifiStatus = async () => {
      if (navigator.onLine) {
        try {
          // Get network information if available
          const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          
          if (connection) {
            const updateNetworkInfo = () => {
              setWifiStatus(prev => ({
                ...prev,
                isConnected: true,
                type: connection.type || 'wifi',
                downlink: connection.downlink || 0,
                effectiveType: connection.effectiveType || '4g',
                rtt: connection.rtt || 0,
                saveData: connection.saveData || false,
                strength: getSignalStrength(connection.downlink)
              }));
            };

            // Initial update
            updateNetworkInfo();

            // Listen for changes
            connection.addEventListener('change', updateNetworkInfo);
            return () => connection.removeEventListener('change', updateNetworkInfo);
          } else {
            // Fallback for browsers that don't support Network Information API
            setWifiStatus(prev => ({
              ...prev,
              isConnected: true,
              strength: 'Good'
            }));
          }
        } catch (error) {
          console.error('Error getting network info:', error);
        }
      } else {
        setWifiStatus(prev => ({
          ...prev,
          isConnected: false,
          strength: 'Disconnected'
        }));
      }
    };

    // Helper function to determine signal strength
    const getSignalStrength = (downlink) => {
      if (!downlink) return 'Unknown';
      if (downlink >= 10) return 'Excellent';
      if (downlink >= 5) return 'Good';
      if (downlink >= 2) return 'Fair';
      return 'Poor';
    };

    // Check initially
    checkWifiStatus();

    // Add event listeners
    window.addEventListener('online', checkWifiStatus);
    window.addEventListener('offline', checkWifiStatus);

    return () => {
      window.removeEventListener('online', checkWifiStatus);
      window.removeEventListener('offline', checkWifiStatus);
    };
  }, []);

  if (loading) {
    return <div>Loading exam...</div>;
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onError={(e) => console.log('Audio error:', e)}
        headers={{
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }}
      />

      <div className={`h-screen flex flex-col ${colorThemeClasses[colorTheme]} relative`}>
        <header className={`${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'} border-b border-zinc-500 px-4 py-4 flex justify-between items-center`}>
          <div className="flex items-center space-x-8">
            <span className="text-red-600 font-bold text-3xl">IELTS</span>
            <div className={`${textSizeClasses[textSize]}`}>
              <div> <p className="font-bold">Test taker ID: {localStorage.getItem('username')}</p></div>
              <div className={`${colorTheme !== 'black-on-white' ? 'text-gray-300' : 'text-black-500'} ${textSizeClasses[textSize]}`}>
                1 year, 10 months, 1 week, 1 day, 21 hours, 11 minutes remaining
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-medium">
            <div
              className={`flex items-center ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-black-600'} relative cursor-pointer group`}
              onClick={() => {
                setShowVolumeControl(prev => !prev);
              }}
            >
              <Volume2 className={`w-4 h-4 mr-2 ${isAudioStarted ? 'animate-pulse' : ''}`} />
              <i className={`${textSizeClasses[textSize]} ${isAudioStarted ? 'animate-pulse' : ''} text-sm`}>Audio is playing</i>

              {showVolumeControl && (
                <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-md p-3 z-10">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    className="w-32"
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      if (audioRef.current) {
                        audioRef.current.volume = newVolume;
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <div 
              className="relative"
              onMouseEnter={() => setWifiStatus(prev => ({ ...prev, showTooltip: true }))}
              onMouseLeave={() => setWifiStatus(prev => ({ ...prev, showTooltip: false }))}
            >
              <div className="relative flex items-center justify-center w-8 h-8">
                {(!wifiStatus.isConnected || wifiStatus.strength === 'Poor' || wifiStatus.strength === 'Unknown') ? (
                  <Player
                  speed={0.01}
                    autoplay
                    loop
                    src="/wifi-bad.json"
                    style={{ width: 30, height: 27 }}
                  />
                ) : (
                  <Player
                  speed={0.5}
                    autoplay
                    loop
                    src="/wifi.json"
                    style={{ width: 45, height: 45 }}
                  />
                )}
              </div>
              {wifiStatus.showTooltip && (
                <div className={`absolute top-full right-0 mt-2 p-3 rounded-lg shadow-lg z-50 transform transition-all duration-200 ease-in-out
                  ${colorTheme === 'black-on-white' ? 'bg-white text-gray-800' : 'bg-gray-800 text-white'}`}
                >
                  <div className="text-sm whitespace-nowrap">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Network Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        wifiStatus.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {wifiStatus.isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium capitalize">{wifiStatus.type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Speed:</span>
                        <span className="font-medium">{wifiStatus.downlink} Mbps</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Signal:</span>
                        <span className={`font-medium ${
                          wifiStatus.strength === 'Excellent' ? 'text-green-500' :
                          wifiStatus.strength === 'Good' ? 'text-lime-500' :
                          wifiStatus.strength === 'Fair' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {wifiStatus.strength}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Latency:</span>
                        <span className="font-medium">{wifiStatus.rtt}ms</span>
                      </div>
                      {wifiStatus.saveData && (
                        <div className="text-xs text-yellow-500 mt-1">
                          Data Saver Mode Active
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                        <div className="space-y-8">
                          <h3 className="font-semibold text-2xl mb-6">Text Size</h3>
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
                              <span className="text-lg ml-4">Regular</span>
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
                              <span className="text-lg ml-4">Extra Large</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'}`}>
          <div className={textSizeClasses[textSize]}>
            {getCurrentSection()?.questions.map((question, index) =>
              renderQuestionComponent(question, index)
            )}
          </div>
        </div>

        <footer className={`${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'} border-t border-gray-200 p-4 w-full`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex items-center justify-center gap-6">
                {[1, 2, 3, 4].map((part) => (
                  <div key={part} className="relative">
                    <button
                      onClick={() => setCurrentPart(part)}
                      className={`px-4 py-2 rounded-lg transition-colors ${currentPart === part
                        ? `${colorTheme === 'black-on-white' ? 'bg-white-100 text-black-600' : 'bg-gray-800 text-white'}`
                        : `hover:${colorTheme === 'black-on-white' ? 'bg-gray-100' : 'bg-gray-800'} text-black-600`
                        }`}
                    >
                      {currentPart === part ? (
                        <div className="flex gap-1">
                          {[...Array(10)].map((_, idx) => {
                            const questionNum = getQuestionRange(part).start + idx;
                            const isCompleted = isQuestionCompleted(questionNum);

                            return (
                              <button
                                key={questionNum}
                                className={`w-6 h-6 text-sm flex items-center justify-center border relative
                                  ${currentQuestion === questionNum
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : isCompleted
                                      ? 'bg-lime-100 border-lime-500 text-lime-700'
                                      : 'border-gray-300'
                                  }
                                  ${
                                    colorTheme === 'black-on-white'
                                      ? 'hover:bg-blue-200 hover:text-black'
                                      : colorTheme === 'white-on-black'
                                        ? 'hover:bg-blue-400 hover:text-black-300'
                                        : 'hover:bg-blue-400 hover:text-black'
                                  }
                                  transition-colors`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentQuestion(questionNum);
                                  
                                  // Dispatch a custom event for fill-in-blank inputs
                                  const navigationEvent = new CustomEvent('navigateToQuestion', {
                                    detail: { questionNumber: questionNum }
                                  });
                                  window.dispatchEvent(navigationEvent);
                                  
                                  // Also use the regular navigation as fallback
                                  setTimeout(() => {
                                    scrollToQuestion(questionNum);
                                  }, 50);
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setHardQuestions(prev => {
                                    const newHardQuestions = { ...prev };
                                    if (newHardQuestions[questionNum]) {
                                      delete newHardQuestions[questionNum];
                                    } else {
                                      newHardQuestions[questionNum] = true;
                                    }
                                    return newHardQuestions;
                                  });
                                }}
                              >
                                {questionNum}
                                {isCompleted && (
                                  <div className="absolute -top-1 -right-1" title="Question completed">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span>Part {part} ({Object.keys(studentAnswers).filter(id => {
                          const qRange = getQuestionRange(part);
                          const questionIds = examData?.sections[part - 1]?.questions
                            .filter(q => q.question_type === 'fill_in_blank' || q.question_type === 'multiple_choice')
                            .map(q => q.question_id);

                          return questionIds?.includes(parseInt(id)) && studentAnswers[id].trim() !== '';
                        }).length || 0} of 10)</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <div className="ml-6">
                <button
                  onClick={handleSubmitExam}
                  disabled={!isSubmissionPeriod && remainingTime > 0}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors
                    ${!isSubmissionPeriod && remainingTime > 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : colorTheme === 'black-on-white'
                        ? 'bg-lime-500 text-white hover:bg-lime-600'
                        : colorTheme === 'white-on-black'
                          ? 'bg-gray-900 text-yellow-300 hover:bg-yellow-700'
                          : 'bg-yellow-400 text-black hover:bg-yellow-500'
                    }`}
                >
                  {isSubmissionPeriod 
                    ? `Submit (${Math.floor(submissionTimeRemaining / 60)}:${(submissionTimeRemaining % 60).toString().padStart(2, '0')})` 
                    : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </footer>

        {/* Overlay rendered on top if not started */}
        {!isAudioStarted && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="text-center max-w-2xl p-8 bg-white rounded-lg shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Audio Instructions</h2>
              <p className="text-gray-600 mb-4">
                You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions.
              </p>
              {totalTestLength && (
                <p className="text-gray-600 mb-8">
                  Total test duration: <span className="font-semibold">{totalTestLength}</span>
                </p>
              )}
              <button
                onClick={handleStartAudio}
                className="bg-lime-500 text-white px-8 py-3 rounded-lg hover:bg-lime-600 transition-colors font-medium"
              >
                Play
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MainLayout;
