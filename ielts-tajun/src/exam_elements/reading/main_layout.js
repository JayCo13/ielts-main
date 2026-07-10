import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpenText, Menu, Bell, Bot, Plus } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import DOMPurify from 'dompurify';
import Split from 'react-split';
import ReadingTest from './fill_in_blank';
import { Player } from '@lottiefiles/react-lottie-player';
import AlertForm from '../../components/AlertForm';
import ExplanationModal from '../../components/ExplanationModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import ForceLogoutDialog from '../../components/ForceLogoutDialog';
import { TranslatorDialog, useTextSelection } from '../../translator';
import { API_BASE } from '../../config/api';

const MainLayout = () => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const location = useLocation();
  const [currentPart, setCurrentPart] = useState((location.state && location.state.forecastPart) ? location.state.forecastPart : 1);
  const isForecastMode = !!(location.state && location.state.forecastPart);
  const partsToShow = isForecastMode ? [currentPart] : [1, 2, 3];
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showDescription, setShowDescription] = useState(false);
  const [testDescription, setTestDescription] = useState(null);
  const [hardQuestions, setHardQuestions] = useState({});
  const [studentAnswers, setStudentAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [completedQuestions, setCompletedQuestions] = useState({}); // Track completed questions
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState({});
  const [answerData, setAnswerData] = useState(null); // Store answer data for review mode
  const navigate = useNavigate();
  const { examId, resultId } = location.state || {};
  const isReviewMode = location?.state?.fromResultReview;
  const isRetakeIncorrectMode = location?.state?.retakeIncorrectMode;
  const incorrectQuestions = location?.state?.incorrectQuestions || [];
  const retakeAnswerData = location?.state?.answerData;
  // Add new state variables for settings
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [textSize, setTextSize] = useState('regular');
  const [colorTheme, setColorTheme] = useState('black-on-white');
  const [isTranslatorEnabled, setIsTranslatorEnabled] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
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
  const [showRetakeDialog, setShowRetakeDialog] = useState(false);
  const [showRetakeResult, setShowRetakeResult] = useState(false);
  const [retakeScore, setRetakeScore] = useState({ correct: 0, total: 0, details: [] });
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [logoutCountdown, setLogoutCountdown] = useState(40);
  const [logoutMessage, setLogoutMessage] = useState('');
  const [resetKey, setResetKey] = useState(0); // Add reset key to force child component re-render
  const [vipStatus, setVipStatus] = useState(null); // VIP status state

  // Vocabulary context menu state
  const [vocabMenu, setVocabMenu] = useState({ visible: false, x: 0, y: 0, selectedText: '' });
  const vocabMenuRef = useRef(null);

  // Initialize translator
  const {
    selectedText,
    selectionPosition,
    showTranslator,
    closeTranslator,
    translateText
  } = useTextSelection(isTranslatorEnabled, isReviewMode);

  // State for explanation dialog
  const [explanationDialog, setExplanationDialog] = useState({
    visible: false,
    questionId: null,
    explanation: ''
  });

  // Function to handle explanation icon click
  const handleExplanationClick = (questionId, explanation) => {
    setExplanationDialog({
      visible: true,
      questionId,
      explanation: explanation || 'No explanation available for this question.'
    });
  };

  // Function to close explanation dialog
  const closeExplanationDialog = () => {
    setExplanationDialog({
      visible: false,
      questionId: null,
      explanation: ''
    });
  };

  // Function to handle search icon click with locate functionality
  const handleSearchClick = (questionId) => {
    // Remove any existing highlights first
    const existingHighlights = document.querySelectorAll('.locate-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });

    // Get locate data for this question from detailedAnswers
    const isReviewMode = location?.state?.fromResultReview;
    let questionData = null;

    if (isReviewMode && answerData) {
      const detailedAnswers = answerData.detailed_answers || answerData;

      // First try to find by question_id
      questionData = detailedAnswers?.find(answer => answer.question_id === questionId);

      // If not found, try to find by question_number (for heading questions)
      if (!questionData) {
        const questionNum = parseInt(questionId);
        if (!isNaN(questionNum)) {
          questionData = detailedAnswers?.find(answer =>
            answer.question_number === questionNum
          );
        }
      }

      // If still not found, try to match by extracting number from question_text
      if (!questionData) {
        const questionNum = parseInt(questionId);
        if (!isNaN(questionNum)) {
          questionData = detailedAnswers?.find(answer => {
            if (answer.question_text) {
              const match = answer.question_text.match(/^(\d+)/);
              return match && parseInt(match[1]) === questionNum;
            }
            return false;
          });
        }
      }
    }

    const locateText = questionData?.locate;

    if (locateText) {
      // Find and highlight the locate text in the passage
      const passageSelectors = [
        '.passage-content',
        '.reading-passage',
        '[data-passage]',
        '.content',
        '#passage',
        '.exam-content .content',
        '.passage',
        '[class*="passage"]'
      ];

      let passageElement = null;
      for (const selector of passageSelectors) {
        passageElement = document.querySelector(selector);
        if (passageElement) break;
      }

      if (passageElement) {
        const found = highlightTextInElement(passageElement, locateText);
        if (!found) {
          // Try searching in the entire document if not found in passage
          highlightTextInElement(document.body, locateText);
        }
      } else {
        // Search in the entire document if no passage element found
        highlightTextInElement(document.body, locateText);
      }
    } else {
      // Fallback to original search behavior if no locate data
      const questionElement = document.getElementById(`question-${questionId}`);
      if (questionElement) {
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        questionElement.style.backgroundColor = '#fef3c7';
        setTimeout(() => {
          questionElement.style.backgroundColor = '';
        }, 2000);
      }
    }
  };

  // Helper function to highlight text in an element
  const highlightTextInElement = (element, searchText) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Build a map of text content with node positions
    let fullText = '';
    const nodeMap = [];

    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const startPos = fullText.length;
      fullText += text;
      const endPos = fullText.length;

      nodeMap.push({
        node: textNode,
        startPos,
        endPos,
        text
      });
    });

    let found = false;
    const lowerFullText = fullText.toLowerCase();
    const lowerSearchText = searchText.toLowerCase();

    // Try exact match first across the full reconstructed text
    const matchIndex = lowerFullText.indexOf(lowerSearchText);
    if (matchIndex !== -1) {
      const matchStart = matchIndex;
      const matchEnd = matchIndex + searchText.length;

      // Find which nodes contain the match
      const affectedNodes = nodeMap.filter(nodeInfo =>
        nodeInfo.startPos < matchEnd && nodeInfo.endPos > matchStart
      );

      if (affectedNodes.length > 0) {
        // Process nodes from last to first to avoid DOM position issues
        for (let i = affectedNodes.length - 1; i >= 0; i--) {
          const nodeInfo = affectedNodes[i];
          const nodeStart = Math.max(0, matchStart - nodeInfo.startPos);
          const nodeEnd = Math.min(nodeInfo.text.length, matchEnd - nodeInfo.startPos);

          if (nodeStart < nodeEnd) {
            const beforeText = nodeInfo.text.substring(0, nodeStart);
            const matchText = nodeInfo.text.substring(nodeStart, nodeEnd);
            const afterText = nodeInfo.text.substring(nodeEnd);

            const fragment = document.createDocumentFragment();

            if (beforeText) {
              fragment.appendChild(document.createTextNode(beforeText));
            }

            const highlight = document.createElement('span');
            highlight.className = 'locate-highlight';
            highlight.style.backgroundColor = '#ffeb3b';
            highlight.style.padding = '2px 4px';
            highlight.style.borderRadius = '3px';
            highlight.style.fontWeight = 'bold';
            highlight.style.boxShadow = '0 0 0 2px #ffc107';
            highlight.textContent = matchText;
            fragment.appendChild(highlight);

            if (afterText) {
              fragment.appendChild(document.createTextNode(afterText));
            }

            nodeInfo.node.parentNode.replaceChild(fragment, nodeInfo.node);

            // Scroll to the first highlighted part
            if (i === 0) {
              setTimeout(() => {
                highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }
          }
        }
        found = true;
      }
    }

    // If exact match not found, try partial matching with key words
    if (!found) {
      const keywords = searchText.split(' ').filter(word => word.length > 3);
      if (keywords.length > 0) {
        const matchedKeywords = keywords.filter(keyword =>
          lowerFullText.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length >= Math.min(2, keywords.length)) {
          // Find the best matching section by looking for nodes that contain multiple keywords
          let bestNode = null;
          let bestScore = 0;

          for (const nodeInfo of nodeMap) {
            const nodeText = nodeInfo.text.toLowerCase();
            const nodeKeywords = matchedKeywords.filter(keyword =>
              nodeText.includes(keyword.toLowerCase())
            );

            if (nodeKeywords.length > bestScore) {
              bestScore = nodeKeywords.length;
              bestNode = nodeInfo;
            }
          }

          if (bestNode && bestScore > 0) {
            const highlight = document.createElement('span');
            highlight.className = 'locate-highlight';
            highlight.style.backgroundColor = '#ffeb3b';
            highlight.style.padding = '2px 4px';
            highlight.style.borderRadius = '3px';
            highlight.style.fontWeight = 'bold';
            highlight.style.boxShadow = '0 0 0 2px #ffc107';
            highlight.textContent = bestNode.text;

            bestNode.node.parentNode.replaceChild(highlight, bestNode.node);

            // Scroll to the highlighted text
            setTimeout(() => {
              highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

            found = true;
          }
        }
      }
    }

    return found;
  };

  useEffect(() => {

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


    if (examId) {
      fetchTestDescription();
    }
  }, [examId]);

  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes for reading test

  useEffect(() => {
    if (timeLeft === null || isReviewMode || isRetakeIncorrectMode) return; // Disable timer in review/retake mode

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmitExam(); // Auto submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isReviewMode]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
  useEffect(() => {
    // Handle beforeunload event (page reload, tab close)
    const handleBeforeUnload = (e) => {
      // Cancel the event
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = 'Your exam progress will be lost and automatically submitted if you leave. Are you sure?';
      // For older browsers
      return 'Your exam progress will be lost and automatically submitted if you leave. Are you sure?';
    };

    // Handle popstate event (browser back button)
    const handlePopState = (e) => {
      e.preventDefault();
      // If in review mode, clear data and navigate away
      if (location.state?.fromResultReview || isRetakeIncorrectMode) {
        clearExamData();
      } else {
        setShowExitAlert(true);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push a new state to the history to enable catching the back button
    window.history.pushState(null, document.title, window.location.href);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Copy protection and screenshot/recording prevention
  useEffect(() => {
    // Handle context menu - block right-click in non-review mode
    const handleContextMenu = (e) => {
      if (!isReviewMode) {
        e.preventDefault();
      }
    };

    // Handle mouseup - show vocabulary menu on text selection in review mode
    const handleMouseUp = (e) => {
      if (!isReviewMode) return;

      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        // Only allow single word selection (no spaces)
        if (selectedText && selectedText.length > 0 && selectedText.length < 50 && !selectedText.includes(' ')) {
          // Get selection position
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          setVocabMenu({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.bottom + window.scrollY + 5,
            selectedText: selectedText
          });
        }
      }, 10);
    };

    // Prevent keyboard shortcuts for saving and screenshots only
    const handleKeyDown = (e) => {
      // Allow Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+V (copy, cut, select all, paste)
      // Only prevent Ctrl+S, Ctrl+P (save, print)
      if ((e.ctrlKey || e.metaKey) && ['s', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      // Prevent PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
      // Prevent F12 (developer tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+Shift+I (developer tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        return false;
      }
    };

    // Limit text selection to prevent selecting large amounts
    const MAX_SELECTION_LENGTH = 1500; // Maximum characters allowed in selection

    const showSelectionWarning = () => {
      // Check if warning already exists
      if (document.getElementById('selection-warning-toast')) return;

      const toast = document.createElement('div');
      toast.id = 'selection-warning-toast';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: fadeIn 0.3s ease;
      `;
      toast.textContent = 'Tránh copy đề chỉ được phép chọn 1000 ký tự 1 lần';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > MAX_SELECTION_LENGTH) {
        // Clear selection if it exceeds the limit
        selection.removeAllRanges();
        showSelectionWarning();
      }
    };

    // Apply CSS for screenshot protection only (limited text selection is allowed)
    const style = document.createElement('style');
    style.id = 'exam-protection-styles';
    style.textContent = `
      /* Blur content when window loses focus (screenshot/recording detection) */
      .exam-blurred {
        filter: blur(25px) !important;
        pointer-events: none !important;
        opacity: 0.5 !important;
      }
    `;
    document.head.appendChild(style);

    // Handle visibility change (tab switching, screen recording detection)
    const handleVisibilityChange = () => {
      const examContent = document.querySelector('.exam-content');
      if (document.hidden && examContent) {
        examContent.classList.add('exam-blurred');
      } else if (examContent) {
        examContent.classList.remove('exam-blurred');
      }
    };

    // Handle window blur (when user switches apps or uses screen capture)
    const handleWindowBlur = () => {
      const examContent = document.querySelector('.exam-content');
      if (examContent) {
        examContent.classList.add('exam-blurred');
      }
    };

    // Handle window focus (when user returns to the page)
    const handleWindowFocus = () => {
      const examContent = document.querySelector('.exam-content');
      if (examContent) {
        examContent.classList.remove('exam-blurred');
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      const protectionStyle = document.getElementById('exam-protection-styles');
      if (protectionStyle) {
        protectionStyle.remove();
      }
    };
  }, [isReviewMode]);

  // Close vocabulary context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vocabMenuRef.current && !vocabMenuRef.current.contains(event.target)) {
        setVocabMenu({ visible: false, x: 0, y: 0, selectedText: '' });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save word to vocabulary
  const saveToVocabulary = async () => {
    if (!vocabMenu.selectedText) return;

    try {
      const response = await fetch(`${API_BASE}/student/vocabulary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word: vocabMenu.selectedText,
          source_type: 'reading',
          source_exam_id: examId,
          source_exam_title: examData?.exam_title || 'Reading Test'
        })
      });

      if (response.ok) {
        toast.success(`"${vocabMenu.selectedText}" đã được thêm vào từ vựng mới, xem lại ở mục Vocabulary -> New Words!`);
      } else {
        toast.error('Failed to save word');
      }
    } catch (error) {
      console.error('Error saving vocabulary:', error);
      toast.error('Error saving word');
    }

    setVocabMenu({ visible: false, x: 0, y: 0, selectedText: '' });
  };
  // Handle confirm exit
  const handleConfirmExit = () => {
    setShowExitAlert(false);
    handleSubmitExam(); // Submit the exam before navigating away
  };

  // Handle cancel exit
  const handleCancelExit = () => {
    setShowExitAlert(false);
    // Push a new state to the history to prevent the back navigation
    window.history.pushState(null, document.title, window.location.href);
  };

  const getQuestionRange = (partNumber) => {
    switch (partNumber) {
      case 1:
        return { start: 1, end: 13 };
      case 2:
        return { start: 14, end: 26 };
      case 3:
        return { start: 27, end: 40 };
      default:
        return { start: 1, end: 13 };
    }
  };


  // Update handleAnswerChange to also mark questions as completed
  const handleAnswerChange = (questionId, answer) => {
    // In retake incorrect mode, prevent editing locked (correct) answers
    if (isRetakeIncorrectMode && retakeAnswerData?.detailed_answers) {
      const incorrectSet = new Set(incorrectQuestions);
      const questionData = retakeAnswerData.detailed_answers.find(a => a.question_id === questionId || String(a.question_number) === String(questionId));
      if (questionData && !incorrectSet.has(questionData.question_number)) {
        return; // correct question — don't allow editing
      }
    }


    // Use a callback to ensure we're working with the latest state
    setStudentAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };

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
      if (questionId && answer && window.questionMap) {
        // Find all radio buttons for this question
        const questionNumber = Object.keys(window.questionMap).find(
          num => window.questionMap[num] === questionId
        );

        if (questionNumber) {
          const radios = document.querySelectorAll(`input[name="table_question_${questionNumber}"]`);
          if (radios) {
            radios.forEach(radio => {
              if (radio) {
                radio.checked = radio.value === answer;
              }
            });
          }
        }
      }

      return newAnswers;
    });
  };

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/reading/reading-test/${examId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setExamData(data);

          // Load saved answers from localStorage
          const savedAnswers = JSON.parse(localStorage.getItem('ielts-answers') || '{}');
          const loadedAnswers = savedAnswers[examId] || {};

          // Also load heading answers from localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Check if this is a heading answer key (format: heading-{questionNum})
            if (key && key.startsWith('heading-')) {
              const questionNumber = key.replace('heading-', '');
              const headingText = localStorage.getItem(key);

              if (headingText && questionNumber) {
                // For heading questions (27-32), use the question number as the question ID
                const questionNum = parseInt(questionNumber, 10);
                if (questionNum >= 27 && questionNum <= 32) {

                  loadedAnswers[questionNum] = headingText;
                } else {
                  // Find the question ID for this question number using the utility function

                  const questionId = findQuestionIdByNumber(data?.question_map, questionNumber);

                  if (questionId) {

                    loadedAnswers[questionId] = headingText;
                  }
                }
              }
            }
          }

          setStudentAnswers(loadedAnswers);

          // Mark questions as completed if they have answers
          const completed = {};
          Object.entries(loadedAnswers).forEach(([questionId, answer]) => {
            if (answer && answer.trim() !== '') {
              completed[questionId] = true;
            }
          });
          setCompletedQuestions(completed);
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

  // Handle answer data for review mode
  useEffect(() => {
    const handleAnswerData = async () => {
      if (isReviewMode) {
        let data = null;

        // First, try to use answerData passed from result review page
        if (location.state?.answerData) {
          data = location.state.answerData;
          console.log('Using answerData from location.state:', data);
        }
        // If not available, fetch from API using resultId
        else if (resultId) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/student/exam-result/${resultId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              data = await response.json();
              console.log('Fetched answer data from API:', data);
            }
          } catch (error) {
            console.error('Error fetching answer data for review:', error);
            return;
          }
        }

        if (data) {
          // Store the complete answer data for evaluation display
          setAnswerData(data);

          // Format the answers for reading exam
          const formattedAnswers = {};
          const completed = {};

          if (data.detailed_answers) {
            data.detailed_answers.forEach(answer => {
              if (answer.question_id && answer.student_answer) {
                formattedAnswers[answer.question_id] = answer.student_answer;
                completed[answer.question_id] = true;
              }
            });
          }

          // Set the formatted answers and completed questions
          setStudentAnswers(formattedAnswers);
          setCompletedQuestions(completed);

          console.log('Formatted answers for review:', formattedAnswers);
          console.log('Completed questions for review:', completed);
        }
      }
    };

    handleAnswerData();
  }, [isReviewMode, resultId, location.state?.answerData]);

  // Initialize retake incorrect mode — pre-fill correct answers and previously answered wrong ones
  useEffect(() => {
    if (!isRetakeIncorrectMode || !retakeAnswerData?.detailed_answers) return;

    const incorrectSet = new Set(incorrectQuestions);
    const formattedAnswers = {};
    const completedQs = {};

    retakeAnswerData.detailed_answers.forEach(answer => {
      if (!incorrectSet.has(answer.question_number)) {
        // This is a correct question — pre-fill and lock it
        if (answer.question_id) {
          formattedAnswers[answer.question_id] = answer.student_answer;
          completedQs[answer.question_id] = true;
        }
        // Also set by question number for heading-type questions
        formattedAnswers[String(answer.question_number)] = answer.student_answer;
        completedQs[String(answer.question_number)] = true;
      } else if (answer.evaluation === 'wrong' && answer.student_answer) {
        // This is an incorrect question that the user DID answer — pre-fill so footer shows it as done
        if (answer.question_id) {
          formattedAnswers[answer.question_id] = answer.student_answer;
          completedQs[answer.question_id] = true;
        }
        formattedAnswers[String(answer.question_number)] = answer.student_answer;
        completedQs[String(answer.question_number)] = true;
      }
      // Blank questions (evaluation === 'blank') are intentionally left empty
    });

    setStudentAnswers(formattedAnswers);
    setCompletedQuestions(completedQs);
    setAnswerData(retakeAnswerData);
  }, [isRetakeIncorrectMode, retakeAnswerData]);

  // Fetch VIP status
  useEffect(() => {
    const fetchVipStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');

        // If user is not a customer, they have access to all features
        if (userRole !== 'customer') {
          setVipStatus({ is_subscribed: true });
          return;
        }

        const response = await fetch(`${API_BASE}/customer/vip/subscription/status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setVipStatus(data);
        } else {
          // Fail open: if we can't confirm a non-subscription, don't blur
          // (never wrongly hide content from a paying/VIP user).
          setVipStatus({ is_subscribed: true });
        }
      } catch (error) {
        console.error('Error fetching VIP status:', error);
        // Fail open on network error so VIP users are never wrongly blurred.
        setVipStatus({ is_subscribed: true });
      }
    };

    fetchVipStatus();
  }, []);

  const getCurrentSection = () => {
    return examData?.sections[currentPart - 1];
  };

  // Non-VIP customers have the full-test part/passage titles blurred (kept
  // hidden to preserve the VIP value). Only true once we've positively
  // confirmed there is no active subscription — otherwise we never blur.
  const isNonVip = vipStatus ? vipStatus.is_subscribed === false : false;

  // Handle confirm retake
  const handleRetakeConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student/reading/reading-test/${examId}/retake`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Clear all localStorage data comprehensively
        localStorage.removeItem('ielts-answers');
        localStorage.removeItem('ielts-highlights');
        localStorage.removeItem('ielts-notes');
        localStorage.removeItem('current-exam-session');

        // Clear part-specific highlights and notes
        for (let part = 1; part <= 3; part++) {
          localStorage.removeItem(`highlights-${examId}-${part}`);
          localStorage.removeItem(`notes-${examId}-${part}`);
        }

        // Clear exam-specific data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(`reading_${examId}`) ||
            key.includes(`highlights_reading_${examId}`) ||
            key.includes(`notes_reading_${examId}`) ||
            key.includes(`highlights-${examId}`) ||
            key.includes(`notes-${examId}`) ||
            key.startsWith('heading-') ||
            key.startsWith('answer_'))) {
            keysToRemove.push(key);
          }
        }

        // Remove all identified keys
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Remove highlight elements from DOM
        const highlightElements = document.querySelectorAll('.highlight-element, .highlighted-text, [data-highlight-id]');
        highlightElements.forEach(el => {
          if (el.classList.contains('highlight-element')) {
            el.remove();
          } else {
            // Remove highlight classes and attributes
            el.classList.remove('highlighted-text');
            el.removeAttribute('data-highlight-id');
            el.style.backgroundColor = '';
            el.style.border = '';
          }
        });

        // Remove heading elements from drop areas
        const headingElements = document.querySelectorAll('.dropped-heading');
        headingElements.forEach(el => el.remove());

        // Reset heading options to be draggable again
        const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
        headingOptions.forEach(option => {
          option.style.opacity = '1';
          option.style.pointerEvents = 'auto';
          option.setAttribute('draggable', 'true');
          const innerDiv = option.querySelector('div');
          if (innerDiv) {
            innerDiv.style.cursor = 'grab';
          }
        });

        // Reset state variables
        setStudentAnswers({});
        setHighlights([]);
        setNotes({});
        setHardQuestions({});
        setCompletedQuestions({});

        // Force child component re-render by updating reset key
        setResetKey(prev => prev + 1);

        // Navigate to test room
        navigate('/reading_test_room', { state: { examId } });
      } else {
        alert('Failed to reset the test. Please try again.');
      }
    } catch (error) {
      console.error('Error retaking test:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setShowRetakeDialog(false);
    }
  };

  const clearExamData = () => {
    // Clear all stored data
    localStorage.removeItem('ielts-answers');

    // Clear highlights and notes for all parts
    localStorage.removeItem('ielts-highlights');
    localStorage.removeItem('ielts-notes');

    // Clear part-specific highlights and notes
    for (let part = 1; part <= 3; part++) {
      localStorage.removeItem(`highlights-${examId}-${part}`);
      localStorage.removeItem(`notes-${examId}-${part}`);
    }

    localStorage.removeItem('current-exam-session');

    // Remove all heading-related localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('heading-')) {
        localStorage.removeItem(key);
      }
    }

    // Clear all heading drop areas and restore original heading options
    const dropAreas = document.querySelectorAll('.heading-drop-area');
    dropAreas.forEach(dropArea => {
      // Get the question number from the drop area
      const questionNum = dropArea.getAttribute('data-question-number');

      // Check if there's a dropped heading in this area
      const droppedHeading = dropArea.querySelector('.dropped-heading');
      if (droppedHeading) {
        // Get the heading ID to restore the original option
        const headingId = droppedHeading.getAttribute('data-heading-id');

        // Find and restore the original heading option
        if (headingId) {
          const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
          headingOptions.forEach(option => {
            const optionHeadingId = option.getAttribute('data-heading-id');
            if (optionHeadingId === headingId) {
              // Make it available again
              option.style.opacity = '1';
              option.style.pointerEvents = 'auto';
              option.setAttribute('draggable', 'true');

              // Set cursor on the inner div
              const innerDiv = option.querySelector('div');
              if (innerDiv) {
                innerDiv.style.cursor = 'grab';
              }
            }
          });
        }
      }

      // Clear the drop area and restore the placeholder with question number
      dropArea.innerHTML = '';
      const placeholderText = document.createElement('p');
      placeholderText.textContent = `${questionNum}`;
      placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
      placeholderText.style.fontWeight = 'bold';
      placeholderText.style.fontSize = '1rem';
      placeholderText.style.margin = '0';
      dropArea.appendChild(placeholderText);
    });

    // Restore all heading options to be available again
    const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
    headingOptions.forEach(option => {
      // Make all options available again
      option.style.opacity = '1';
      option.style.pointerEvents = 'auto';
      option.setAttribute('draggable', 'true');

      // Set cursor on the inner div
      const innerDiv = option.querySelector('div');
      if (innerDiv) {
        innerDiv.style.cursor = 'grab';
      }
    });

    // Dispatch a custom event to reset the usedHeadings set
    const resetHeadingsEvent = new CustomEvent('resetHeadings');
    window.dispatchEvent(resetHeadingsEvent);

    // Reset all state variables
    setStudentAnswers({});
    setCompletedQuestions({});

    navigate(isForecastMode ? '/reading_forecast' : '/reading_list');
  };

  const handleSubmitExam = async () => {
    // In retake incorrect mode, calculate score locally — don't call backend
    if (isRetakeIncorrectMode && retakeAnswerData?.detailed_answers) {
      const incorrectSet = new Set(incorrectQuestions);
      let correctCount = 0;
      const details = [];

      retakeAnswerData.detailed_answers.forEach(answer => {
        // Check if student's answer matches correct answer (for ALL questions)
        const qNum = answer.question_number;
        const qId = answer.question_id;
        const newAnswer = studentAnswers[qId] || studentAnswers[String(qNum)] || '';
        const correctAnswers = (answer.correct_answer || '').split('/').map(a => a.trim().toLowerCase());
        const isNowCorrect = correctAnswers.includes(newAnswer.trim().toLowerCase());

        if (isNowCorrect) correctCount++;

        // Add details for ALL questions so the result table shows complete info
        details.push({
          question_number: answer.question_number,
          student_answer: newAnswer,
          correct_answer: answer.correct_answer,
          isCorrect: isNowCorrect,
          wasOriginallyCorrect: !incorrectSet.has(answer.question_number)
        });
      });

      // Total is now the full exam length, not just incorrect ones
      setRetakeScore({ correct: correctCount, total: retakeAnswerData.detailed_answers.length, details });
      setShowRetakeResult(true);
      return;
    }

    try {
      const baseUrl = `${API_BASE}/student/reading/reading-test/${examId}/submit`;
      const url = isForecastMode ? `${baseUrl}?forecast_part=${currentPart}` : baseUrl;
      // Remap answers to be keyed by question number as required by backend
      const answersByNumber = {};
      if (window.questionMap && typeof window.questionMap === 'object') {
        Object.entries(window.questionMap).forEach(([num, qId]) => {
          const ans = studentAnswers[qId];
          if (typeof ans === 'string' && ans.trim() !== '') {
            answersByNumber[String(num)] = ans;
          }
        });
      }
      // Also include any heading answers already keyed by question number
      Object.entries(studentAnswers).forEach(([key, val]) => {
        const num = Number(key);
        if (!Number.isNaN(num) && num >= 1 && num <= 40 && typeof val === 'string' && val.trim() !== '') {
          answersByNumber[String(num)] = val;
        }
      });
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: answersByNumber })
      });

      if (response.ok) {
        const result = await response.json();
        navigate('/result_review_rd', { state: { resultId: result.result_id, examId: examId, forecastPart: isForecastMode ? currentPart : undefined } });
      } else if (response.status === 409) {
        // Handle multi-device detection
        const errorData = await response.json();
        setLogoutMessage(errorData.detail || 'Phát hiện đăng nhập trên nhiều thiết bị! • Hệ thống phát hiện tài khoản của bạn đã được đăng nhập trên nhiều thiết bị. • Nếu bạn đã đăng nhập trên thiết bị hoặc trình duyệt khác trước đó, hãy bấm "Submit" thử trước khi làm bài để hệ thống tự động đăng xuất thiết bị cũ, giúp tránh gặp sự cố tương tự.');
        setShowForceLogoutDialog(true);

        // Start countdown timer
        let countdown = 40;
        setLogoutCountdown(countdown);

        const timer = setInterval(() => {
          countdown -= 1;
          setLogoutCountdown(countdown);

          if (countdown <= 0) {
            clearInterval(timer);
            // Force logout
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
        }, 1000);
      } else {
        console.error('Error submitting exam:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
    }
  };



  // Utility function to find question ID from question number
  const findQuestionIdByNumber = (questionMap, questionNumber) => {
    // Use the provided questionMap or fall back to window.questionMap
    const mapToUse = questionMap || window.questionMap;
    if (!mapToUse) {
      return null;
    }


    // Method 1: Try with parseInt
    let questionId = Object.keys(mapToUse).find(
      key => mapToUse[key] === parseInt(questionNumber)
    );

    if (questionId) {
      return questionId;
    }

    // Method 2: Try with string comparison
    questionId = Object.keys(mapToUse).find(
      key => String(mapToUse[key]) === String(questionNumber)
    );

    if (questionId) {
      return questionId;
    }

    // Method 3: Try to find by partial match
    const possibleKeys = Object.keys(mapToUse).filter(
      key => key.includes(questionNumber) || String(mapToUse[key]).includes(questionNumber)
    );

    if (possibleKeys.length > 0) {
      questionId = possibleKeys[0];
      return questionId;
    }

    return null;
  };



  // Add a function to check if a question is completed
  const isQuestionCompleted = (questionNumber) => {
    // Find the question ID for this question number
    const partNumber = getPartForQuestionNumber(questionNumber);
    if (!partNumber) return false;

    const section = examData?.sections[partNumber - 1];
    if (!section) return false;

    // Get the question map to find the question ID from window object
    // This is set by the ReadingTest component in fill_in_blank.js
    if (!window.questionMap) {
      return false;
    }

    const questionId = window.questionMap[questionNumber];
    if (!questionId) {
      return false;
    }

    // Check if this question has an answer
    return !!studentAnswers[questionId] && studentAnswers[questionId].trim() !== '';
  };

  // Helper function to determine which part a question number belongs to
  const getPartForQuestionNumber = (questionNumber) => {
    for (let part = 1; part <= 3; part++) {
      const range = getQuestionRange(part);
      if (questionNumber >= range.start && questionNumber <= range.end) {
        return part;
      }
    }
    return null;
  };

  // Improve the scrollToQuestion function
  const scrollToQuestion = (questionNumber) => {
    // Try multiple strategies to find the question element
    let found = false;

    // Strategy 1: Find heading drop areas by data-question-number attribute
    const dropAreas = document.querySelectorAll(`.heading-drop-area[data-question-number="${questionNumber}"]`);
    if (dropAreas.length > 0) {
      const dropArea = dropAreas[0];
      dropArea.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Store the original border style
      const originalBorder = dropArea.style.border;
      const originalBorderColor = dropArea.style.borderColor;

      // Add highlight effect with a blue border
      dropArea.style.border = '2px solid #3b82f6'; // blue-500
      dropArea.style.borderColor = '#3b82f6';
      dropArea.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.3)';
      dropArea.style.transition = 'all 0.3s ease';

      // Clear styles after animation
      setTimeout(() => {
        dropArea.style.border = originalBorder;
        dropArea.style.borderColor = originalBorderColor;
        dropArea.style.boxShadow = '';
        dropArea.style.transition = '';
      }, 1500);

      found = true;
    }

    // Strategy 2: Find by direct ID
    if (!found) {
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
    }

    // Strategy 3: Find by data attribute
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

    // Strategy 4: Find input fields with this question number as placeholder
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

    // Strategy 5: Find by question number in text
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

    // Strategy 6: Find section headers for checkbox questions
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

    // Strategy 7: Find input fields with data-question-number attribute
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

  // Add CSS for the new drop area design and draggable heading options
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      
      .ielts-heading-option {
        position: relative;
        transition: all 0.2s ease;
      }
      
      .ielts-heading-option:hover {
        transform: translateY(-2px);
      }
      
      .ielts-heading-option.dragging {
        opacity: 0.6;
        cursor: grabbing;
      }
      
      .ielts-heading-option > div {
        border: 1px solid ${colorTheme === 'black-on-white' ? '#ccc' : '#444'};
        background-color: ${colorTheme === 'black-on-white' ? '#fff' : '#000'};
        color: ${colorTheme === 'black-on-white' ? '#333' : '#fff'};
        transition: all 0.2s ease;
        cursor: grab;
        position: relative;
        z-index: 1;
      }
      
      .ielts-heading-option:hover > div {
        border-color: #3b82f6;
        background-color: ${colorTheme === 'black-on-white' ? '#f0f9ff' : '#1e3a8a'};
      }
      
      .dropped-heading {
        transition: all 0.2s ease;
        position: relative;
        cursor: move;
        font-weight: bold;
        padding: 0;
      }
      
      .dropped-heading:hover {
        transform: translateY(-1px);
      }
      
      /* Add a pseudo-element to prevent dragging from blank space */
      .dropped-heading::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [colorTheme]);

  // Define renderQuestionComponent only once
  const renderQuestionComponent = (question, index) => {
    const range = getQuestionRange(currentPart);
    const questionNumber = range.start;

    if (question.question_type === 'main_text') {
      // Make hardQuestions available to the window object
      window.hardQuestions = hardQuestions;

      return (
        <ReadingTest
          key={`${question.question_id}-${resetKey}`}
          question={question}
          index={index}
          questionNumber={questionNumber}
          answers={studentAnswers}
          onAnswerChange={handleAnswerChange}
          examData={examData}
          currentPart={currentPart}
          questionType={getCurrentSection()?.questions?.map(q => q.question_type) || []}
          textSize={textSize}
          colorTheme={colorTheme}
          hardQuestions={hardQuestions}
          isTranslatorEnabled={isTranslatorEnabled}
          onTranslate={translateText}
          answerData={answerData}
          isRetakeIncorrectMode={isRetakeIncorrectMode}
          incorrectQuestions={incorrectQuestions}
        />
      );
    }
    return null;
  };



  // Add a useEffect to make heading tags draggable after component mounts
  useEffect(() => {
    // Track which headings have been used
    const usedHeadings = new Set();
    // Function to load saved heading answers from localStorage
    const loadSavedHeadingAnswers = () => {
      // Get all keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if this is a heading answer key (format: heading-{questionNum})
        if (key && key.startsWith('heading-')) {
          const value = localStorage.getItem(key);
          if (value) {
            // Extract the heading ID from the stored value
            // The value might be just the text, so we need to find the corresponding heading option
            const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
            headingOptions.forEach(option => {
              const headingDiv = option.querySelector('div');
              if (headingDiv && headingDiv.textContent === value) {
                const headingId = option.getAttribute('data-heading-id');
                if (headingId) {
                  // Add this heading ID to the used headings set
                  usedHeadings.add(headingId);
                }
              }
            });
          }
        }
      }
    };

    // Function to make heading tags draggable
    const makeHeadingTagsDraggable = () => {
      // Load saved heading answers first
      loadSavedHeadingAnswers();

      // Use a more specific selector to target heading options in the question area
      const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');

      headingOptions.forEach(option => {
        // Get the heading ID and text
        const headingId = option.getAttribute('data-heading-id');
        const headingDiv = option.querySelector('div');
        if (!headingDiv) {
          return;
        }
        const headingText = headingDiv.textContent;

        // Check if we're in review mode
        const isReviewMode = location?.state?.fromResultReview;

        // Make the option draggable only if not in review mode
        option.setAttribute('draggable', isReviewMode ? 'false' : 'true');

        // Remove any existing event listeners to prevent duplicates
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);

        // Store reference to the new option for later use
        const currentOption = newOption;

        // Make sure the inner div has the cursor style, not the outer container
        const innerDiv = newOption.querySelector('div');
        if (innerDiv) {
          innerDiv.style.cursor = isReviewMode ? 'not-allowed' : 'grab';
        }

        // Apply review mode styling
        if (isReviewMode) {
          newOption.style.opacity = '0.5';
          newOption.style.pointerEvents = 'none';
          newOption.setAttribute('draggable', 'false');
        } else {
          // Check if this heading has been used already
          if (usedHeadings.has(headingId)) {
            // Make it transparent to indicate it's been used
            newOption.style.opacity = '0.4';
            newOption.style.pointerEvents = 'none'; // Prevent dragging
            newOption.setAttribute('draggable', 'false');
          }
        }

        // Add drag start event listener to the new element
        currentOption.addEventListener('dragstart', (e) => {
          // Check if we're in review mode
          const isReviewMode = location?.state?.fromResultReview;
          if (isReviewMode) {
            e.preventDefault();
            return;
          }

          // Only allow dragging if not already used
          if (usedHeadings.has(headingId)) {
            e.preventDefault();
            return;
          }

          // Ensure we have valid data to transfer
          if (!headingText || !headingId) {
            e.preventDefault();
            return;
          }

          e.dataTransfer.setData('text/plain', headingText);
          e.dataTransfer.setData('heading-id', headingId);
          e.dataTransfer.effectAllowed = 'move';

          // Add a class to indicate it's being dragged
          currentOption.classList.add('dragging');
        });

        // Add drag end event listener
        currentOption.addEventListener('dragend', () => {
          currentOption.classList.remove('dragging');
        });
      });
    };

    // Call the function to make heading tags draggable after a short delay to ensure DOM is ready
    setTimeout(() => {
      makeHeadingTagsDraggable();
    }, 1000);

    // Add a mutation observer to detect when new heading options are added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any of the added nodes contain heading options
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && (node.classList?.contains('ielts-heading-match') ||
              node.querySelector?.('.ielts-heading-match'))) {
              makeHeadingTagsDraggable();
            }
          });
        }
      });
    });

    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Add event listener for headingRemove custom event
    const handleHeadingRemove = (e) => {
      const { headingId, questionNumber } = e.detail;
      if (headingId && usedHeadings.has(headingId)) {
        usedHeadings.delete(headingId);

        // Update studentAnswers state to remove the answer
        setStudentAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[questionNumber];
          return newAnswers;
        });

        // Update completedQuestions state
        setCompletedQuestions(prev => {
          const updated = { ...prev };
          delete updated[questionNumber];
          return updated;
        });
      }
    };

    window.addEventListener('headingRemove', handleHeadingRemove);

    // Add event listener for headingDrop custom event
    const handleHeadingDrop = (e) => {
      const { questionNumber, value, headingId } = e.detail;

      // Add the heading ID to the used headings set
      if (headingId) {
        usedHeadings.add(headingId);
      }

      // For heading questions, we don't need to find the question ID
      // Just save the heading text to localStorage for persistence
      const headingKey = `heading-${questionNumber}`;
      localStorage.setItem(headingKey, value);

      // For heading questions (27-32), use the question number as the question ID
      // This matches how the question map is created in fill_in_blank.js
      const questionId = parseInt(questionNumber, 10);
      if (questionId >= 27 && questionId <= 32) {
        // Update the answer in the state
        handleAnswerChange(questionId, value);
        // Save answer using localStorage
        const key = `answer_${examData?.exam_id}_${questionId}`;
        localStorage.setItem(key, value);
      } else {
        // Try to find the question ID as a fallback
        const foundQuestionId = findQuestionIdByNumber(examData?.question_map, questionNumber);
        if (foundQuestionId) {
          // If we found a question ID, update the answer in the state
          handleAnswerChange(foundQuestionId, value);
          // Save answer using localStorage
          const key = `answer_${examData?.exam_id}_${foundQuestionId}`;
          localStorage.setItem(key, value);
        } else {
          console.log('No question ID found for heading question:', questionNumber, 'using direct localStorage storage');
        }
      }
    };

    window.addEventListener('headingDrop', handleHeadingDrop);

    // Add event listener for resetHeadings custom event
    const handleResetHeadings = () => {
      // Clear the usedHeadings set
      usedHeadings.clear();
    };

    window.addEventListener('resetHeadings', handleResetHeadings);

    return () => {
      window.removeEventListener('headingDrop', handleHeadingDrop);
      window.removeEventListener('resetHeadings', handleResetHeadings);
      observer.disconnect();
    };
  }, [examData, colorTheme, handleAnswerChange]);

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
      <Toaster position="top-right" />



      {/* Retake Result Dialog */}
      {showRetakeResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${retakeScore.correct === retakeScore.total ? 'bg-green-100' : 'bg-orange-100'}`}>
                {retakeScore.correct === retakeScore.total ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Kết quả làm lại câu sai</h2>
              <p className="text-gray-500 mt-1">Kết quả này không ảnh hưởng đến lịch sử bài thi</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">
                  {retakeScore.correct}/{retakeScore.total}
                </div>
                <div className="text-sm text-gray-500 mt-1">câu trả lời đúng</div>
              </div>
            </div>
            {retakeScore.details.length > 0 && (
              <div className="max-h-48 overflow-y-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Câu</th>
                      <th className="px-3 py-2 text-left">Câu trả lời</th>
                      <th className="px-3 py-2 text-left">Đáp án</th>
                      <th className="px-3 py-2 text-center">KQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retakeScore.details.map((d, i) => (
                      <tr key={i} className={d.wasOriginallyCorrect ? 'bg-blue-50' : d.isCorrect ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-3 py-2 font-medium">{d.question_number}</td>
                        <td className="px-3 py-2">{d.student_answer || '-'}</td>
                        <td className="px-3 py-2 text-green-600">{d.correct_answer}</td>
                        <td className="px-3 py-2 text-center">{d.wasOriginallyCorrect ? '🔒' : d.isCorrect ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRetakeResult(false);
                  // Reset answers for another attempt
                  const incorrectSet = new Set(incorrectQuestions);
                  setStudentAnswers(prev => {
                    const reset = { ...prev };
                    retakeAnswerData.detailed_answers.forEach(a => {
                      if (incorrectSet.has(a.question_number)) {
                        if (a.question_id) delete reset[a.question_id];
                        delete reset[String(a.question_number)];
                      }
                    });
                    return reset;
                  });
                }}
                className="flex-1 px-4 py-3 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
              >
                Thử lại
              </button>
              <button
                onClick={() => {
                  setShowRetakeResult(false);
                  // Navigate back to review mode
                  navigate('/reading_test_room', {
                    state: {
                      examId,
                      fromResultReview: true,
                      resultId: resultId,
                      forecastPart: isForecastMode ? currentPart : undefined
                    }
                  });
                }}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
              >
                Quay về xem lại bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vocabulary Context Menu for Review Mode */}
      {vocabMenu.visible && (
        <div
          ref={vocabMenuRef}
          className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px]"
          style={{ left: vocabMenu.x, top: vocabMenu.y }}
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

      <div className={`h-screen flex flex-col ${colorThemeClasses[colorTheme]} relative`}>
        {/* Retake Incorrect Mode Banner */}
        {isRetakeIncorrectMode && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex items-center justify-between z-50 relative flex-none">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-semibold">Chế độ làm lại câu sai</span>
              <span className="mx-2">—</span>
              <span className="text-orange-100">{incorrectQuestions.length} câu cần làm lại • Kết quả không ảnh hưởng lịch sử</span>
            </div>
            <button
              onClick={handleSubmitExam}
              className="bg-white text-orange-600 px-4 py-1 rounded-lg font-semibold hover:bg-orange-50 transition-colors text-sm"
            >
              Nộp bài làm lại
            </button>
          </div>
        )}
        <header className={`${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'} border-b border-zinc-500 px-2 md:px-4 py-2 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0`}>
          <div className="flex items-center space-x-4 md:space-x-8 w-full md:w-auto justify-between md:justify-start">
            <span className="text-red-600 font-bold text-2xl md:text-3xl">IELTS</span>
            <div className={`${textSizeClasses[textSize]}`}>
              <div> <p className="font-bold">Test taker ID: {localStorage.getItem('username')}</p></div>
              {testDescription?.title && (
                <div className={`${colorTheme !== 'black-on-white' ? 'text-blue-400' : 'text-blue-600'} font-semibold ${textSizeClasses[textSize]}`}>
                  {testDescription.title}
                </div>
              )}
              <div className={`${colorTheme !== 'black-on-white' ? 'text-gray-300' : 'text-black-500'} ${textSizeClasses[textSize]}`}>
                {isReviewMode ? 'Review Mode' : `${formatTime(timeLeft)} remaining`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 md:space-x-4 font-medium w-full md:w-auto">
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
                    strokeWidth={3}
                    style={{ width: 30, height: 27 }}
                  />
                ) : (
                  <Player
                    speed={0.5}
                    autoplay
                    loop
                    src="/wifi.json"
                    strokeWidth={3}
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
                      <span className={`px-2 py-1 rounded-full text-xs ${wifiStatus.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                        <span className={`font-medium ${wifiStatus.strength === 'Excellent' ? 'text-green-500' :
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
            {/* AI Translator button */}
            <div className="relative group">
              <button
                onClick={() => setIsTranslatorEnabled(!isTranslatorEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isTranslatorEnabled
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  }`}
              >
                <Bot className="w-5 h-5" />
                <span className="text-xs font-medium hidden sm:inline">AI-translator</span>
              </button>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 text-center pointer-events-none z-50">
                Khi mở từ điển, bạn có thể tra cứu bằng cách quét chọn bất kỳ từ nào.
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
              </div>
            </div>
            <Bell className='w-7 h-6 cursor-pointer mt-1 text-gray-600' strokeWidth={3} onClick={() => setIsBellOpen(!isBellOpen)} />
            {isBellOpen && (
              <div className="fixed inset-0 z-[10000]">
                <div className={`min-h-screen w-full flex flex-col items-center justify-center ${colorThemeClasses[colorTheme]}`}>
                  <div className="w-full max-w-3xl bg-opacity-95 p-12 rounded-2xl">
                    <div className="flex justify-between items-center mb-12">
                      <h2 className="text-3xl text-lime-600 font-bold">No message found!</h2>
                      <button
                        onClick={() => setIsBellOpen(false)}
                        className="font-bold text-2xl hover:opacity-70 transition-opacity absolute top-10 right-10 bg-gray-300 rounded-full p-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="relative" ref={menuRef}>
              <Menu
                className={`w-7 h-6 cursor-pointer ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'} `}
                onClick={() => setIsMenuOpen(!isMenuOpen)} strokeWidth={3}
              />
              {isMenuOpen && (
                <div className="fixed inset-0 z-[10000]">
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12">
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

        <div className={`${colorTheme === 'black-on-white' ? 'bg-[#f3f3eb]' : 'bg-gray-800'} ${isMobile ? 'mx-2 my-1.5 p-1.5' : 'm-4 p-3'} rounded-lg border ${colorTheme === 'black-on-white' ? 'border-gray-300' : 'border-gray-600'}`}>
          <h3 className={`font-bold ${isMobile ? 'text-sm mb-0.5' : 'text-lg mb-2'}`}>Part {currentPart}</h3>
          <p className={`${isMobile ? 'text-xs' : ''} ${colorTheme === 'black-on-white' ? 'text-black-600' : ''}`}>
            Answer questions {currentPart === 1 ? '1-13' : currentPart === 2 ? '14-26' : '27-40'}.
          </p>
        </div>

        <Split
          className={`flex-1 flex ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'}`}
          sizes={isMobile ? [40, 60] : [45, 55]}
          minSize={isMobile ? 150 : 300}
          direction={isMobile ? "vertical" : "horizontal"}
          gutterSize={10}
          gutterStyle={() => ({
            backgroundColor: colorTheme === 'black-on-white' ? '#e5e7eb' : '#374151'
          })}
        >
          {/* Reading Passage */}
          <div className="border-r border-gray-300 p-4 overflow-y-auto">
            <h1
              className={`text-3xl font-bold mb-4 text-center ${isNonVip ? 'blur-[5px] select-none pointer-events-none' : ''}`}
              title={isNonVip ? 'VIP cần nâng cấp để xem' : undefined}
            >
              {getCurrentSection()?.passages[0]?.title}
            </h1>
            {getCurrentSection()?.passages[0]?.content && (
              <div
                id="reading-passage-content"
                className={textSizeClasses[textSize]}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getCurrentSection().passages[0].content) }}
                onMouseUp={(e) => {
                  // Get the current selection
                  const selection = window.getSelection();
                  const selectionText = selection.toString().trim();

                  console.log('Passage text selected:', selectionText);

                  // Only dispatch event if there's actual text selected
                  if (selectionText.length > 0) {
                    // Dispatch a custom event for text selection in the passage
                    const event = new CustomEvent('passageTextSelected', {
                      detail: {
                        event: e,
                        selection: selectionText
                      }
                    });
                    document.dispatchEvent(event);
                    console.log('Dispatched passageTextSelected event');
                  }
                }}

                ref={(el) => {
                  // Process the passage content after it's rendered to add question number markers and drop areas
                  if (el) {

                    // Find all heading drop areas and replace them with interactive drop zones
                    const headingDropAreas = el.querySelectorAll('.heading-drop-area');
                    const questionRange = getQuestionRange(currentPart);

                    headingDropAreas.forEach(dropArea => {
                      // Find the associated question number (usually in a <strong> element before the drop area)
                      const container = dropArea.parentElement;
                      // Center align the container to help center the drop area
                      container.style.textAlign = 'center';
                      const questionNumElement = container.querySelector('strong');

                      if (questionNumElement) {
                        const questionNum = questionNumElement.textContent.trim();
                        const qNumInt = parseInt(questionNum, 10);
                        if (Number.isInteger(qNumInt)) {
                          if (qNumInt < questionRange.start || qNumInt > questionRange.end) {
                            return;
                          }
                        }

                        // Create a new drop area with improved styling
                        const newDropArea = document.createElement('div');
                        newDropArea.className = 'heading-drop-area';
                        newDropArea.setAttribute('data-question-number', questionNum);
                        newDropArea.style.border = '2px dashed rgb(154, 154, 154)';
                        newDropArea.style.borderRadius = '8px';
                        newDropArea.style.backgroundColor = colorTheme === 'black-on-white' ? '#fafbfc' : '#fafbfc';
                        newDropArea.style.color = colorTheme === 'black-on-white' ? '#1e40af' : '#93c5fd';
                        newDropArea.style.minHeight = '5px';
                        newDropArea.style.padding = '10px';
                        newDropArea.style.width = '550px';
                        newDropArea.style.maxWidth = '100%';
                        newDropArea.style.display = 'flex';
                        newDropArea.style.alignItems = 'center';
                        newDropArea.style.justifyContent = 'center';
                        newDropArea.style.cursor = 'pointer';
                        newDropArea.style.margin = '0 auto'; // Center the drop area horizontally
                        newDropArea.style.position = 'relative'; // Add position relative for absolute positioning of the flag

                        // Check if there's a saved answer for this question
                        const answerKey = `heading-${questionNum}`;
                        const savedHeadingText = localStorage.getItem(answerKey);

                        if (savedHeadingText) {
                          // Find the heading ID for this text first
                          let headingId = null;
                          const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                          headingOptions.forEach(option => {
                            const headingDiv = option.querySelector('div');
                            if (headingDiv && headingDiv.textContent === savedHeadingText) {
                              headingId = option.getAttribute('data-heading-id');
                            }
                          });

                          // Check if we're in review mode and get validation data
                          const isReviewMode = location?.state?.fromResultReview;
                          let validation = null;

                          if (isReviewMode && answerData) {
                            const detailedAnswers = answerData.detailed_answers || answerData;

                            // Try to find by question_number first
                            validation = detailedAnswers.find(answer =>
                              answer.question_number === parseInt(questionNum)
                            );

                            // If not found by question_number, try to match by extracting number from question_text
                            if (!validation) {
                              validation = detailedAnswers.find(answer => {
                                if (answer.question_text) {
                                  const match = answer.question_text.match(/^(\d+)/);
                                  return match && parseInt(match[1]) === parseInt(questionNum);
                                }
                                return false;
                              });
                            }

                            console.log('Heading validation for question', questionNum, ':', validation);
                          }

                          // Create a styled heading element for the saved answer
                          const headingElement = document.createElement('div');
                          headingElement.className = 'dropped-heading';
                          headingElement.style.fontWeight = 'bold';
                          headingElement.textContent = savedHeadingText;

                          // Apply validation styling in review mode
                          if (isReviewMode && validation) {
                            const isCorrectAnswer = validation.correct_answer === savedHeadingText;

                            if (validation.evaluation === 'correct' || isCorrectAnswer) {
                              // Correct answer - green styling
                              headingElement.style.backgroundColor = '#ecfdf5'; // light green
                              headingElement.style.color = '#047857'; // dark green
                              headingElement.style.border = '2px solid #10b981'; // medium green
                            } else if (validation.evaluation === 'wrong' || !isCorrectAnswer) {
                              // Incorrect answer - red styling
                              headingElement.style.backgroundColor = '#fef2f2'; // light red
                              headingElement.style.color = '#b91c1c'; // dark red
                              headingElement.style.border = '2px solid #ef4444'; // medium red

                              // Add correct answer indicator after the heading
                              const correctAnswerIndicator = document.createElement('div');
                              correctAnswerIndicator.className = 'correct-answer-indicator';
                              correctAnswerIndicator.textContent = `✓ ${validation.correct_answer}`;
                              correctAnswerIndicator.style.color = '#047857'; // dark green
                              correctAnswerIndicator.style.fontSize = '0.875rem';
                              correctAnswerIndicator.style.fontWeight = 'bold';
                              correctAnswerIndicator.style.marginTop = '4px';
                              correctAnswerIndicator.style.padding = '4px 8px';
                              correctAnswerIndicator.style.backgroundColor = '#ecfdf5'; // light green
                              correctAnswerIndicator.style.borderRadius = '4px';
                              correctAnswerIndicator.style.border = '1px solid #10b981'; // medium green
                              newDropArea.appendChild(correctAnswerIndicator);
                            } else if (validation.evaluation === 'blank') {
                              // Blank but showing correct answer - blue styling
                              headingElement.style.backgroundColor = '#eff6ff'; // light blue
                              headingElement.style.color = '#1e40af'; // dark blue
                              headingElement.style.border = '2px solid #3b82f6'; // medium blue
                              headingElement.textContent = validation.correct_answer;
                            }
                          } else {
                            // Default styling when not in review mode
                            headingElement.style.backgroundColor = colorTheme === 'black-on-white' ? '#fafbfc' : '#fafbfc';
                            headingElement.style.color = colorTheme === 'black-on-white' ? '#000' : '#fff';
                          }

                          headingElement.style.borderRadius = '4px';
                          headingElement.style.width = '100%';
                          headingElement.style.padding = '0';
                          headingElement.style.cursor = isReviewMode ? 'not-allowed' : 'move';
                          headingElement.setAttribute('draggable', isReviewMode ? 'false' : 'true');
                          if (headingId) {
                            headingElement.setAttribute('data-heading-id', headingId);
                          }

                          // Add explanation and search icons if in review mode and explanation exists
                          if (isReviewMode && validation && validation.explanation) {
                            // Create search icon
                            const searchIcon = document.createElement('div');
                            searchIcon.className = 'search-icon';
                            searchIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
                            searchIcon.style.position = 'absolute';
                            searchIcon.style.top = '4px';
                            searchIcon.style.right = '32px';
                            searchIcon.style.color = 'white';
                            searchIcon.style.backgroundColor = '#10b981';
                            searchIcon.style.borderRadius = '50%';
                            searchIcon.style.padding = '4px';
                            searchIcon.style.cursor = 'pointer';
                            searchIcon.style.zIndex = '1001';
                            searchIcon.style.display = 'flex';
                            searchIcon.style.alignItems = 'center';
                            searchIcon.style.justifyContent = 'center';
                            searchIcon.style.width = '24px';
                            searchIcon.style.height = '24px';
                            searchIcon.title = 'Search for this question';

                            searchIcon.addEventListener('click', () => {
                              handleSearchClick(questionNum);
                            });

                            newDropArea.appendChild(searchIcon);

                            // Create explanation icon
                            const explanationIcon = document.createElement('div');
                            explanationIcon.className = 'explanation-icon';
                            explanationIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                            explanationIcon.style.position = 'absolute';
                            explanationIcon.style.top = '4px';
                            explanationIcon.style.right = '4px';
                            explanationIcon.style.color = 'white';
                            explanationIcon.style.backgroundColor = '#3b82f6';
                            explanationIcon.style.borderRadius = '50%';
                            explanationIcon.style.padding = '4px';
                            explanationIcon.style.cursor = 'pointer';
                            explanationIcon.style.zIndex = '1001';
                            explanationIcon.style.display = 'flex';
                            explanationIcon.style.alignItems = 'center';
                            explanationIcon.style.justifyContent = 'center';
                            explanationIcon.style.width = '24px';
                            explanationIcon.style.height = '24px';

                            explanationIcon.addEventListener('click', () => {
                              handleExplanationClick(questionNum, validation.explanation);
                            });

                            newDropArea.appendChild(explanationIcon);
                          }

                          // Make sure the original heading option is properly disabled
                          if (headingId) {
                            const allHeadingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                            allHeadingOptions.forEach(option => {
                              const optionHeadingId = option.getAttribute('data-heading-id');
                              if (optionHeadingId === headingId) {
                                // Ensure it's disabled with consistent styling
                                option.style.opacity = '0.4';
                                option.style.pointerEvents = 'none';
                                option.setAttribute('draggable', 'false');

                                // Set cursor on the inner div
                                const innerDiv = option.querySelector('div');
                                if (innerDiv) {
                                  innerDiv.style.cursor = 'not-allowed';
                                }
                              }
                            });
                          }

                          // Create a drag handle to ensure users can only drag by clicking on the text
                          const dragHandle = document.createElement('div');
                          dragHandle.className = 'drag-handle';
                          dragHandle.style.position = 'absolute';
                          dragHandle.style.top = '0';
                          dragHandle.style.left = '0';
                          dragHandle.style.width = '100%';
                          dragHandle.style.height = '100%';
                          dragHandle.style.pointerEvents = 'none';
                          headingElement.appendChild(dragHandle);

                          // Make the dropped heading draggable for repositioning (only if not in review mode)
                          headingElement.addEventListener('dragstart', (dragEvent) => {
                            // Check if we're in review mode
                            const isReviewMode = location?.state?.fromResultReview;
                            if (isReviewMode) {
                              dragEvent.preventDefault();
                              return;
                            }

                            dragEvent.dataTransfer.setData('text/plain', savedHeadingText);
                            dragEvent.dataTransfer.setData('heading-id', headingId);
                            dragEvent.dataTransfer.setData('source-question', questionNum);
                          });

                          // Add double-click event listener to remove the heading (only if not in review mode)
                          headingElement.addEventListener('dblclick', () => {
                            // Check if we're in review mode
                            const isReviewMode = location?.state?.fromResultReview;
                            if (isReviewMode) {
                              return; // Prevent removal in review mode
                            }

                            // Clear the drop zone and restore the placeholder with question number
                            newDropArea.innerHTML = '';
                            const placeholderText = document.createElement('p');
                            placeholderText.textContent = `${questionNum}`;
                            placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
                            placeholderText.style.fontWeight = 'bold';
                            placeholderText.style.fontSize = '1rem';
                            placeholderText.style.margin = '0';
                            newDropArea.appendChild(placeholderText);

                            // Find the original heading option and make it available again
                            const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                            headingOptions.forEach(option => {
                              const optionHeadingId = option.getAttribute('data-heading-id');
                              if (optionHeadingId === headingId) {
                                // Make it available again
                                option.style.opacity = '1';
                                option.style.pointerEvents = 'auto';
                                option.setAttribute('draggable', 'true');

                                // Set cursor on the inner div, not the outer container
                                const innerDiv = option.querySelector('div');
                                if (innerDiv) {
                                  innerDiv.style.cursor = 'grab';
                                }
                              }
                            });

                            // Remove the answer from localStorage
                            localStorage.removeItem(answerKey);

                            // Dispatch a custom event to notify that a heading has been removed
                            const headingRemoveEvent = new CustomEvent('headingRemove', {
                              detail: {
                                headingId,
                                questionNumber: questionNum
                              }
                            });
                            window.dispatchEvent(headingRemoveEvent);
                          });

                          newDropArea.appendChild(headingElement);
                        } else {
                          // Check if we're in review mode and get validation data
                          const isReviewMode = location?.state?.fromResultReview;
                          let validation = null;

                          if (isReviewMode && answerData?.detailed_answers) {
                            // Try to find validation by question_number first
                            validation = answerData.detailed_answers.find(answer =>
                              answer.question_number === parseInt(questionNum)
                            );

                            // If not found, try to find by extracting number from question_text
                            if (!validation) {
                              validation = answerData.detailed_answers.find(answer => {
                                const match = answer.question_text?.match(/\d+/);
                                return match && parseInt(match[0]) === parseInt(questionNum);
                              });
                            }
                          }

                          if (isReviewMode && validation) {
                            // In review mode with validation data, show the correct answer
                            const correctAnswerElement = document.createElement('div');
                            correctAnswerElement.className = 'correct-answer-display';
                            correctAnswerElement.style.fontWeight = 'bold';
                            correctAnswerElement.style.borderRadius = '4px';
                            correctAnswerElement.style.width = '100%';
                            correctAnswerElement.style.padding = '8px';
                            correctAnswerElement.style.margin = '0';
                            correctAnswerElement.textContent = validation.correct_answer;

                            // Apply blue styling for blank answers in review mode
                            correctAnswerElement.style.backgroundColor = '#eff6ff'; // light blue
                            correctAnswerElement.style.color = '#1e40af'; // dark blue
                            correctAnswerElement.style.border = '2px solid #3b82f6'; // medium blue

                            // Add explanation and search icons if explanation exists
                            if (validation.explanation) {
                              // Create search icon
                              const searchIcon = document.createElement('div');
                              searchIcon.className = 'search-icon';
                              searchIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
                              searchIcon.style.position = 'absolute';
                              searchIcon.style.top = '4px';
                              searchIcon.style.right = '32px';
                              searchIcon.style.color = 'white';
                              searchIcon.style.backgroundColor = '#10b981';
                              searchIcon.style.borderRadius = '50%';
                              searchIcon.style.padding = '4px';
                              searchIcon.style.cursor = 'pointer';
                              searchIcon.style.zIndex = '1001';
                              searchIcon.style.display = 'flex';
                              searchIcon.style.alignItems = 'center';
                              searchIcon.style.justifyContent = 'center';
                              searchIcon.style.width = '24px';
                              searchIcon.style.height = '24px';
                              searchIcon.title = 'Search for this question';

                              searchIcon.addEventListener('click', () => {
                                handleSearchClick(questionNum);
                              });

                              newDropArea.appendChild(searchIcon);

                              // Create explanation icon
                              const explanationIcon = document.createElement('div');
                              explanationIcon.className = 'explanation-icon';
                              explanationIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                              explanationIcon.style.position = 'absolute';
                              explanationIcon.style.top = '4px';
                              explanationIcon.style.right = '4px';
                              explanationIcon.style.color = 'white';
                              explanationIcon.style.backgroundColor = '#3b82f6';
                              explanationIcon.style.borderRadius = '50%';
                              explanationIcon.style.padding = '4px';
                              explanationIcon.style.cursor = 'pointer';
                              explanationIcon.style.zIndex = '1001';
                              explanationIcon.style.display = 'flex';
                              explanationIcon.style.alignItems = 'center';
                              explanationIcon.style.justifyContent = 'center';
                              explanationIcon.style.width = '24px';
                              explanationIcon.style.height = '24px';

                              explanationIcon.addEventListener('click', () => {
                                handleExplanationClick(questionNum, validation.explanation);
                              });

                              newDropArea.appendChild(explanationIcon);
                            }

                            newDropArea.appendChild(correctAnswerElement);
                          } else {
                            // Add placeholder text with question number if no saved answer
                            const placeholderText = document.createElement('p');
                            placeholderText.textContent = `${questionNum}`;
                            placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
                            placeholderText.style.fontWeight = 'bold';
                            placeholderText.style.fontSize = '1rem';
                            placeholderText.style.margin = '0';
                            newDropArea.appendChild(placeholderText);
                          }
                        }

                        // Add drag and drop event listeners
                        newDropArea.addEventListener('dragover', (e) => {
                          e.preventDefault();

                          // Check if we're in review mode
                          const isReviewMode = location?.state?.fromResultReview;
                          if (isReviewMode) {
                            return;
                          }

                          // Set drop effect to move for better UX
                          e.dataTransfer.dropEffect = 'move';

                          // Visual feedback for valid drop zone
                          newDropArea.style.backgroundColor = '#e0f2fe';
                          newDropArea.style.borderColor = '#0284c7';
                          newDropArea.style.borderStyle = 'solid';
                        });

                        newDropArea.addEventListener('dragleave', (e) => {
                          // Only reset if we're actually leaving the drop area (not entering a child element)
                          if (!newDropArea.contains(e.relatedTarget)) {
                            // Reset the drop area style when drag leaves
                            newDropArea.style.backgroundColor = colorTheme === 'black-on-white' ? '#fafbfc' : '#fafbfc';
                            newDropArea.style.borderColor = 'rgb(154, 154, 154)';
                            newDropArea.style.borderStyle = 'dashed';
                          }
                        });

                        newDropArea.addEventListener('drop', (e) => {
                          e.preventDefault();

                          // Reset visual feedback first
                          newDropArea.style.backgroundColor = colorTheme === 'black-on-white' ? '#fafbfc' : '#fafbfc';
                          newDropArea.style.borderColor = 'rgb(154, 154, 154)';

                          // Check if we're in review mode
                          const isReviewMode = location?.state?.fromResultReview;
                          if (isReviewMode) {
                            return;
                          }

                          // Check if this is a heading drop (has heading-id in dataTransfer)
                          const headingId = e.dataTransfer.getData('heading-id');
                          const plainText = e.dataTransfer.getData('text/plain');

                          // Validate that we have both heading ID and text
                          if (!headingId || !plainText) {
                            console.warn('Invalid drop: missing heading ID or text');
                            return;
                          }

                          // Verify this is actually a heading option
                          const headingOption = document.querySelector(`.ielts-heading-option[data-heading-id="${headingId}"]`);
                          if (!headingOption) {
                            console.warn('Invalid drop: heading option not found');
                            return;
                          }

                          // Get the heading text and source question from the dataTransfer
                          // We already have headingId from earlier
                          const headingText = e.dataTransfer.getData('text/plain');
                          const sourceQuestion = e.dataTransfer.getData('source-question');

                          // Update the drop area content to show the dropped heading
                          if (headingText) {
                            // If this is a heading being moved from another drop zone
                            if (sourceQuestion && sourceQuestion !== questionNum) {
                              // Find the source drop area and clear it
                              const sourceDropArea = document.querySelector(`.heading-drop-area[data-question-number="${sourceQuestion}"]`);
                              if (sourceDropArea) {
                                sourceDropArea.innerHTML = '';
                                const placeholderText = document.createElement('p');
                                placeholderText.textContent = `${sourceQuestion}`;
                                placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
                                placeholderText.style.fontSize = '1rem';
                                placeholderText.style.fontWeight = 'bold';
                                placeholderText.style.margin = '0';
                                sourceDropArea.appendChild(placeholderText);

                                // Remove the answer from localStorage for the source question
                                const sourceAnswerKey = `heading-${sourceQuestion}`;
                                localStorage.removeItem(sourceAnswerKey);

                                // Dispatch a custom event to notify that a heading has been removed from the source
                                const headingRemoveEvent = new CustomEvent('headingRemove', {
                                  detail: {
                                    headingId,
                                    questionNumber: sourceQuestion
                                  }
                                });
                                window.dispatchEvent(headingRemoveEvent);
                              }
                            }

                            // Check if there's an existing heading in the drop zone
                            const existingHeading = newDropArea.querySelector('.dropped-heading');
                            if (existingHeading) {
                              // Get the existing heading's ID
                              const existingHeadingId = existingHeading.getAttribute('data-heading-id');

                              // If we have an existing heading ID, make that heading available again
                              if (existingHeadingId) {
                                const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                                headingOptions.forEach(option => {
                                  const optionHeadingId = option.getAttribute('data-heading-id');
                                  if (optionHeadingId === existingHeadingId) {
                                    // Make it available again
                                    option.style.opacity = '1';
                                    option.style.pointerEvents = 'auto';
                                    option.setAttribute('draggable', 'true');

                                    // Set cursor on the inner div, not the outer container
                                    const innerDiv = option.querySelector('div');
                                    if (innerDiv) {
                                      innerDiv.style.cursor = 'grab';
                                    }

                                    // Dispatch a custom event to notify that a heading has been removed
                                    const headingRemoveEvent = new CustomEvent('headingRemove', {
                                      detail: {
                                        headingId: existingHeadingId,
                                        questionNumber: questionNum
                                      }
                                    });
                                    window.dispatchEvent(headingRemoveEvent);
                                  }
                                });
                              }
                            }

                            // Check if we're in review mode and get validation data
                            const isReviewMode = location?.state?.fromResultReview;
                            let validation = null;

                            if (isReviewMode && answerData?.detailed_answers) {
                              // Try to find validation by question_number first
                              validation = answerData.detailed_answers.find(answer =>
                                answer.question_number === parseInt(questionNum)
                              );

                              // If not found, try to find by extracting number from question_text
                              if (!validation) {
                                validation = answerData.detailed_answers.find(answer => {
                                  const match = answer.question_text?.match(/\d+/);
                                  return match && parseInt(match[0]) === parseInt(questionNum);
                                });
                              }

                              console.log('Heading validation for question', questionNum, ':', validation);
                            }

                            // Create a styled heading element
                            const headingElement = document.createElement('div');
                            headingElement.className = 'dropped-heading';
                            headingElement.style.fontWeight = 'bold';
                            headingElement.textContent = headingText;

                            // Apply validation styling in review mode
                            if (isReviewMode && validation) {
                              const isCorrectAnswer = validation.correct_answer === headingText;

                              if (validation.evaluation === 'correct' || isCorrectAnswer) {
                                // Correct answer - green styling
                                headingElement.style.backgroundColor = '#ecfdf5'; // light green
                                headingElement.style.color = '#047857'; // dark green
                                headingElement.style.border = '2px solid #10b981'; // medium green
                              } else if (validation.evaluation === 'wrong' || !isCorrectAnswer) {
                                // Incorrect answer - red styling
                                headingElement.style.backgroundColor = '#fef2f2'; // light red
                                headingElement.style.color = '#b91c1c'; // dark red
                                headingElement.style.border = '2px solid #ef4444'; // medium red

                                // Add correct answer indicator after the heading
                                const correctAnswerIndicator = document.createElement('div');
                                correctAnswerIndicator.className = 'correct-answer-indicator';
                                correctAnswerIndicator.textContent = `✓ ${validation.correct_answer}`;
                                correctAnswerIndicator.style.color = '#047857'; // dark green
                                correctAnswerIndicator.style.fontSize = '0.875rem';
                                correctAnswerIndicator.style.fontWeight = 'bold';
                                correctAnswerIndicator.style.marginTop = '4px';
                                correctAnswerIndicator.style.padding = '4px 8px';
                                correctAnswerIndicator.style.backgroundColor = '#ecfdf5'; // light green
                                correctAnswerIndicator.style.borderRadius = '4px';
                                correctAnswerIndicator.style.border = '1px solid #10b981'; // medium green
                                newDropArea.appendChild(correctAnswerIndicator);
                              } else if (validation.evaluation === 'blank') {
                                // Blank but showing correct answer - blue styling
                                headingElement.style.backgroundColor = '#eff6ff'; // light blue
                                headingElement.style.color = '#1e40af'; // dark blue
                                headingElement.style.border = '2px solid #3b82f6'; // medium blue
                                headingElement.textContent = validation.correct_answer;
                              }
                            } else {
                              // Default styling when not in review mode
                              headingElement.style.backgroundColor = colorTheme === 'black-on-white' ? '#fff' : '#000';
                              headingElement.style.color = colorTheme === 'black-on-white' ? '#000' : '#fff';
                            }

                            headingElement.style.borderRadius = '4px';
                            headingElement.style.width = '100%';
                            headingElement.style.padding = '0';
                            headingElement.style.cursor = isReviewMode ? 'not-allowed' : 'move';
                            headingElement.setAttribute('draggable', isReviewMode ? 'false' : 'true');
                            headingElement.setAttribute('data-heading-id', headingId);

                            // Add explanation and search icons if in review mode and explanation exists
                            if (isReviewMode && validation && validation.explanation) {
                              // Create search icon
                              const searchIcon = document.createElement('div');
                              searchIcon.className = 'search-icon';
                              searchIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
                              searchIcon.style.position = 'absolute';
                              searchIcon.style.top = '4px';
                              searchIcon.style.right = '32px';
                              searchIcon.style.color = 'white';
                              searchIcon.style.backgroundColor = '#10b981';
                              searchIcon.style.borderRadius = '50%';
                              searchIcon.style.padding = '4px';
                              searchIcon.style.cursor = 'pointer';
                              searchIcon.style.zIndex = '1001';
                              searchIcon.style.display = 'flex';
                              searchIcon.style.alignItems = 'center';
                              searchIcon.style.justifyContent = 'center';
                              searchIcon.style.width = '24px';
                              searchIcon.style.height = '24px';
                              searchIcon.title = 'Search for this question';

                              searchIcon.addEventListener('click', () => {
                                handleSearchClick(questionNum);
                              });

                              newDropArea.appendChild(searchIcon);

                              // Create explanation icon
                              const explanationIcon = document.createElement('div');
                              explanationIcon.className = 'explanation-icon';
                              explanationIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                              explanationIcon.style.position = 'absolute';
                              explanationIcon.style.top = '4px';
                              explanationIcon.style.right = '4px';
                              explanationIcon.style.color = 'white';
                              explanationIcon.style.backgroundColor = '#3b82f6';
                              explanationIcon.style.borderRadius = '50%';
                              explanationIcon.style.padding = '4px';
                              explanationIcon.style.cursor = 'pointer';
                              explanationIcon.style.zIndex = '1001';
                              explanationIcon.style.display = 'flex';
                              explanationIcon.style.alignItems = 'center';
                              explanationIcon.style.justifyContent = 'center';
                              explanationIcon.style.width = '24px';
                              explanationIcon.style.height = '24px';

                              explanationIcon.addEventListener('click', () => {
                                handleExplanationClick(questionNum, validation.explanation);
                              });

                              newDropArea.appendChild(explanationIcon);
                            }

                            // Create a drag handle to ensure users can only drag by clicking on the text
                            const dragHandle = document.createElement('div');
                            dragHandle.className = 'drag-handle';
                            dragHandle.style.position = 'absolute';
                            dragHandle.style.top = '0';
                            dragHandle.style.left = '0';
                            dragHandle.style.width = 'fit-content';
                            dragHandle.style.height = '100%';
                            dragHandle.style.pointerEvents = 'none';
                            headingElement.appendChild(dragHandle);

                            // Make the dropped heading draggable for repositioning (only if not in review mode)
                            headingElement.addEventListener('dragstart', (dragEvent) => {
                              // Check if we're in review mode
                              const isReviewMode = location?.state?.fromResultReview;
                              if (isReviewMode) {
                                dragEvent.preventDefault();
                                return;
                              }

                              dragEvent.dataTransfer.setData('text/plain', headingText);
                              dragEvent.dataTransfer.setData('heading-id', headingId);
                              dragEvent.dataTransfer.setData('source-question', questionNum);
                            });

                            // Add double-click event listener to remove the heading (only if not in review mode)
                            headingElement.addEventListener('dblclick', () => {
                              // Check if we're in review mode
                              const isReviewMode = location?.state?.fromResultReview;
                              if (isReviewMode) {
                                return; // Prevent removal in review mode
                              }

                              // Clear the drop zone and restore the placeholder
                              newDropArea.innerHTML = '';
                              const placeholderText = document.createElement('p');
                              placeholderText.textContent = `${questionNum}`;
                              placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
                              placeholderText.style.fontWeight = 'bold';
                              placeholderText.style.fontSize = '1rem';
                              placeholderText.style.margin = '0';
                              newDropArea.appendChild(placeholderText);

                              // Find the original heading option and make it available again
                              const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                              headingOptions.forEach(option => {
                                const optionHeadingId = option.getAttribute('data-heading-id');
                                if (optionHeadingId === headingId) {
                                  // Make it available again
                                  option.style.opacity = '1';
                                  option.style.pointerEvents = 'auto';
                                  option.setAttribute('draggable', 'true');

                                  // Set cursor on the inner div, not the outer container
                                  const innerDiv = option.querySelector('div');
                                  if (innerDiv) {
                                    innerDiv.style.cursor = 'grab';
                                  }
                                }
                              });

                              // Remove the answer from localStorage
                              const answerKey = `heading-${questionNum}`;
                              localStorage.removeItem(answerKey);

                              // Dispatch a custom event to notify that a heading has been removed
                              const headingRemoveEvent = new CustomEvent('headingRemove', {
                                detail: {
                                  headingId,
                                  questionNumber: questionNum
                                }
                              });
                              window.dispatchEvent(headingRemoveEvent);
                            });

                            // Clear the drop zone and add the new heading
                            newDropArea.innerHTML = '';
                            newDropArea.appendChild(headingElement);

                            // Mark the original heading as used (transparent)
                            const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                            headingOptions.forEach(option => {
                              const optionHeadingId = option.getAttribute('data-heading-id');
                              if (optionHeadingId === headingId) {
                                // Make it unavailable with consistent styling
                                option.style.opacity = '0.4';
                                option.style.pointerEvents = 'none';
                                option.setAttribute('draggable', 'false');

                                // Set cursor on the inner div to not-allowed
                                const innerDiv = option.querySelector('div');
                                if (innerDiv) {
                                  innerDiv.style.cursor = 'not-allowed';
                                }
                              }
                            });
                          }

                          // Dispatch a custom event that the ReadingTest component can listen for
                          const dropEvent = new CustomEvent('headingDrop', {
                            detail: { questionNumber: questionNum, value: headingText, headingId: headingId }
                          });
                          window.dispatchEvent(dropEvent);
                        });

                        // Replace the old drop area with the new one
                        container.replaceChild(newDropArea, dropArea);

                        // Hide the question number element since we now show it in the placeholder
                        questionNumElement.style.display = 'none';

                        // Keep the click functionality on the drop area instead
                        newDropArea.addEventListener('click', () => {
                          scrollToQuestion(parseInt(questionNum));
                        });

                        // Add a function to update the hard question flag
                        const updateHardFlag = () => {
                          // Remove any existing flag
                          const existingFlag = newDropArea.querySelector('.hard-question-flag');
                          if (existingFlag) {
                            existingFlag.remove();
                          }

                          // Check if this question is marked as hard
                          if (hardQuestions[questionNum]) {
                            // Create a red flag element
                            const flagElement = document.createElement('div');
                            flagElement.className = 'hard-question-flag';
                            flagElement.title = 'Hard question';
                            flagElement.style.position = 'absolute';
                            flagElement.style.top = '-8px';
                            flagElement.style.right = '-8px';
                            flagElement.style.zIndex = '10';

                            // Create SVG for the flag
                            const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                            svgElement.setAttribute('class', 'h-4 w-4 text-red-500');
                            svgElement.setAttribute('viewBox', '0 0 20 20');
                            svgElement.setAttribute('fill', 'currentColor');

                            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            pathElement.setAttribute('fillRule', 'evenodd');
                            pathElement.setAttribute('d', 'M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z');
                            pathElement.setAttribute('clipRule', 'evenodd');

                            svgElement.appendChild(pathElement);
                            flagElement.appendChild(svgElement);
                            newDropArea.appendChild(flagElement);
                          }
                        };

                        // Initial update of hard flag
                        updateHardFlag();

                        // Listen for changes to hardQuestions
                        window.addEventListener('hardQuestionsChanged', (event) => {
                          if (event.detail && event.detail.hardQuestions) {
                            // Save any existing dropped heading before updating the flag
                            const existingHeading = newDropArea.querySelector('.dropped-heading');
                            const headingContent = existingHeading ? existingHeading.textContent : null;
                            const headingId = existingHeading ? existingHeading.getAttribute('data-heading-id') : null;

                            // Update the flag
                            updateHardFlag();

                            // If there was a heading, restore it after updating the flag
                            if (headingContent && headingId) {
                              // Make sure the heading is still there after flag update
                              const currentHeading = newDropArea.querySelector('.dropped-heading');
                              if (!currentHeading) {
                                // Recreate the heading if it was removed
                                const headingElement = document.createElement('div');
                                headingElement.className = 'dropped-heading';
                                headingElement.style.fontWeight = 'bold';
                                headingElement.textContent = headingContent;
                                headingElement.style.backgroundColor = colorTheme === 'black-on-white' ? '#fff' : '#000';
                                headingElement.style.color = colorTheme === 'black-on-white' ? '#000' : '#fff';
                                headingElement.style.borderRadius = '4px';
                                headingElement.style.width = '100%';
                                headingElement.style.padding = '0';
                                headingElement.style.cursor = 'move';
                                headingElement.setAttribute('draggable', 'true');
                                headingElement.setAttribute('data-heading-id', headingId);

                                // Add drag start event listener (only if not in review mode)
                                headingElement.addEventListener('dragstart', (dragEvent) => {
                                  // Check if we're in review mode
                                  const isReviewMode = location?.state?.fromResultReview;
                                  if (isReviewMode) {
                                    dragEvent.preventDefault();
                                    return;
                                  }

                                  dragEvent.dataTransfer.setData('text/plain', headingContent);
                                  dragEvent.dataTransfer.setData('heading-id', headingId);
                                  dragEvent.dataTransfer.setData('source-question', questionNum);
                                });

                                // Make sure the original heading option is still disabled
                                const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                                headingOptions.forEach(option => {
                                  const optionHeadingId = option.getAttribute('data-heading-id');
                                  if (optionHeadingId === headingId) {
                                    // Ensure it's disabled
                                    option.style.opacity = '0.4';
                                    option.style.pointerEvents = 'none';
                                    option.setAttribute('draggable', 'false');

                                    // Set cursor on the inner div
                                    const innerDiv = option.querySelector('div');
                                    if (innerDiv) {
                                      innerDiv.style.cursor = 'not-allowed';
                                    }
                                  }
                                });

                                // Add double-click event listener to remove the heading (only if not in review mode)
                                headingElement.addEventListener('dblclick', () => {
                                  // Check if we're in review mode
                                  const isReviewMode = location?.state?.fromResultReview;
                                  if (isReviewMode) {
                                    return; // Prevent removal in review mode
                                  }

                                  // Clear the drop zone and restore the placeholder
                                  newDropArea.innerHTML = '';
                                  const placeholderText = document.createElement('p');
                                  placeholderText.textContent = `${questionNum}`;
                                  placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
                                  placeholderText.style.fontWeight = 'bold';
                                  placeholderText.style.fontSize = '1rem';
                                  placeholderText.style.margin = '0';
                                  newDropArea.appendChild(placeholderText);

                                  // Find the original heading option and make it available again
                                  const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                                  headingOptions.forEach(option => {
                                    const optionHeadingId = option.getAttribute('data-heading-id');
                                    if (optionHeadingId === headingId) {
                                      // Make it available again
                                      option.style.opacity = '1';
                                      option.style.pointerEvents = 'auto';
                                      option.setAttribute('draggable', 'true');

                                      // Set cursor on the inner div, not the outer container
                                      const innerDiv = option.querySelector('div');
                                      if (innerDiv) {
                                        innerDiv.style.cursor = 'grab';
                                      }
                                    }
                                  });

                                  // Remove the answer from localStorage
                                  const answerKey = `heading-${questionNum}`;
                                  localStorage.removeItem(answerKey);

                                  // Dispatch a custom event to notify that a heading has been removed
                                  const headingRemoveEvent = new CustomEvent('headingRemove', {
                                    detail: {
                                      headingId,
                                      questionNumber: questionNum
                                    }
                                  });
                                  window.dispatchEvent(headingRemoveEvent);
                                });

                                // Clear any placeholder text
                                newDropArea.innerHTML = '';
                                newDropArea.appendChild(headingElement);
                              }
                            }
                          }
                        });
                      }
                    });

                  }
                }}
              />
            )}
          </div>

          {/* Questions */}
          <div className="p-4 overflow-y-auto">
            <div className={textSizeClasses[textSize]}>
              {getCurrentSection()?.questions?.map((question, index) =>
                renderQuestionComponent(question, index)
              ) || null}
            </div>
          </div>
        </Split>

        <footer className={`${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'} border-t border-gray-200 p-4 w-full`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col mr-4">
                <span className="text-red-600 font-bold text-sm">Developed by</span>
                <span className="text-red-600 font-bold text-lg leading-none">IELTS TA JUN</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-6">
                {partsToShow.map((part) => (
                  <div key={part} className="relative">
                    <button
                      onClick={() => {
                        if (isForecastMode && part !== currentPart) return;
                        setCurrentPart(part);
                      }}
                      className={`px-4 py-2 text-lg rounded-lg font-bold transition-colors ${currentPart === part
                        ? `${colorTheme === 'black-on-white' ? 'bg-white-100 text-black-600' : 'bg-gray-800 text-white'}`
                        : `hover:${colorTheme === 'black-on-white' ? 'bg-gray-100' : 'bg-gray-800'} text-black-600`
                        }`}
                    >
                      {currentPart === part ? (
                        <div className="flex gap-1">
                          {[...Array(part === 3 ? 14 : 13)].map((_, idx) => {
                            const questionNum = getQuestionRange(part).start + idx;
                            const isCompleted = isQuestionCompleted(questionNum);

                            return (
                              <button
                                key={questionNum}
                                className={`w-7 h-7 text-md flex items-center justify-center border relative
                                  ${currentQuestion === questionNum
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : isRetakeIncorrectMode
                                      ? (incorrectQuestions.includes(questionNum)
                                        ? (isCompleted
                                          ? 'bg-sky-100 border-sky-400 text-sky-700'    // answered wrong → light blue
                                          : 'bg-red-100 border-red-400 text-red-700')   // blank → red
                                        : 'bg-green-100 border-green-500 text-green-700') // correct → green
                                      : hardQuestions[questionNum]
                                        ? 'bg-red-100 border-red-500 text-red-700'
                                        : isCompleted
                                          ? 'bg-lime-100 border-lime-500 text-lime-700'
                                          : 'border-gray-300'
                                  }
                                  ${colorTheme === 'black-on-white'
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

                                  // Save the state of all heading drop areas before navigation
                                  const headingDropAreas = document.querySelectorAll('.heading-drop-area');
                                  const savedHeadings = [];

                                  headingDropAreas.forEach(dropArea => {
                                    const questionNum = dropArea.getAttribute('data-question-number');
                                    const droppedHeading = dropArea.querySelector('.dropped-heading');

                                    if (droppedHeading) {
                                      savedHeadings.push({
                                        questionNum,
                                        headingContent: droppedHeading.textContent,
                                        headingId: droppedHeading.getAttribute('data-heading-id')
                                      });
                                    }
                                  });

                                  // Also use the regular navigation as fallback
                                  setTimeout(() => {
                                    scrollToQuestion(questionNum);

                                    // Restore any headings that might have disappeared
                                    setTimeout(() => {
                                      savedHeadings.forEach(saved => {
                                        const dropArea = document.querySelector(`.heading-drop-area[data-question-number="${saved.questionNum}"]`);
                                        if (dropArea && !dropArea.querySelector('.dropped-heading')) {
                                          // Recreate the heading if it was removed
                                          const headingElement = document.createElement('div');
                                          headingElement.className = 'dropped-heading';
                                          headingElement.style.fontWeight = 'bold';
                                          headingElement.textContent = saved.headingContent;
                                          headingElement.style.backgroundColor = colorTheme === 'black-on-white' ? '#fff' : '#000';
                                          headingElement.style.color = colorTheme === 'black-on-white' ? '#000' : '#fff';
                                          headingElement.style.borderRadius = '4px';
                                          headingElement.style.width = '100%';

                                          // Make sure the original heading option is still disabled
                                          const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                                          headingOptions.forEach(option => {
                                            const optionHeadingId = option.getAttribute('data-heading-id');
                                            if (optionHeadingId === saved.headingId) {
                                              // Ensure it's disabled
                                              option.style.opacity = '0.4';
                                              option.style.pointerEvents = 'none';
                                              option.setAttribute('draggable', 'false');

                                              // Set cursor on the inner div
                                              const innerDiv = option.querySelector('div');
                                              if (innerDiv) {
                                                innerDiv.style.cursor = 'not-allowed';
                                              }
                                            }
                                          });
                                          headingElement.style.padding = '0';
                                          headingElement.style.cursor = 'move';
                                          headingElement.setAttribute('draggable', 'true');
                                          headingElement.setAttribute('data-heading-id', saved.headingId);

                                          // Add drag start event listener (only if not in review mode)
                                          headingElement.addEventListener('dragstart', (dragEvent) => {
                                            // Check if we're in review mode
                                            const isReviewMode = location?.state?.fromResultReview;
                                            if (isReviewMode) {
                                              dragEvent.preventDefault();
                                              return;
                                            }

                                            dragEvent.dataTransfer.setData('text/plain', saved.headingContent);
                                            dragEvent.dataTransfer.setData('heading-id', saved.headingId);
                                            dragEvent.dataTransfer.setData('source-question', saved.questionNum);
                                          });

                                          // Add double-click event listener to remove the heading (only if not in review mode)
                                          headingElement.addEventListener('dblclick', () => {
                                            // Check if we're in review mode
                                            const isReviewMode = location?.state?.fromResultReview;
                                            if (isReviewMode) {
                                              return; // Prevent removal in review mode
                                            }

                                            // Clear the drop zone and restore the placeholder
                                            dropArea.innerHTML = '';
                                            const placeholderText = document.createElement('p');
                                            placeholderText.textContent = `${saved.questionNum}`;
                                            placeholderText.style.color = colorTheme === 'black-on-white' ? '#141414' : '#9ca3af';
                                            placeholderText.style.fontWeight = 'bold';
                                            placeholderText.style.fontSize = '1rem';
                                            placeholderText.style.margin = '0';
                                            dropArea.appendChild(placeholderText);

                                            // Find the original heading option and make it available again
                                            const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
                                            headingOptions.forEach(option => {
                                              const optionHeadingId = option.getAttribute('data-heading-id');
                                              if (optionHeadingId === saved.headingId) {
                                                // Make it available again
                                                option.style.opacity = '1';
                                                option.style.pointerEvents = 'auto';
                                                option.setAttribute('draggable', 'true');

                                                // Set cursor on the inner div, not the outer container
                                                const innerDiv = option.querySelector('div');
                                                if (innerDiv) {
                                                  innerDiv.style.cursor = 'grab';
                                                }
                                              }
                                            });

                                            // Remove the answer from localStorage
                                            const answerKey = `heading-${saved.questionNum}`;
                                            localStorage.removeItem(answerKey);

                                            // Dispatch a custom event to notify that a heading has been removed
                                            const headingRemoveEvent = new CustomEvent('headingRemove', {
                                              detail: {
                                                headingId: saved.headingId,
                                                questionNumber: saved.questionNum
                                              }
                                            });
                                            window.dispatchEvent(headingRemoveEvent);
                                          });

                                          // Clear any placeholder text
                                          dropArea.innerHTML = '';
                                          dropArea.appendChild(headingElement);

                                          // Update the hard question flag if needed
                                          if (hardQuestions[saved.questionNum]) {
                                            // Create a red flag element
                                            const flagElement = document.createElement('div');
                                            flagElement.className = 'hard-question-flag';
                                            flagElement.title = 'Hard question';
                                            flagElement.style.position = 'absolute';
                                            flagElement.style.top = '-8px';
                                            flagElement.style.right = '-8px';
                                            flagElement.style.zIndex = '10';

                                            // Create SVG for the flag
                                            const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                                            svgElement.setAttribute('class', 'h-4 w-4 text-red-500');
                                            svgElement.setAttribute('viewBox', '0 0 20 20');
                                            svgElement.setAttribute('fill', 'currentColor');
                                            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                            pathElement.setAttribute('fillRule', 'evenodd');
                                            pathElement.setAttribute('d', 'M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z');
                                            pathElement.setAttribute('clipRule', 'evenodd');

                                            svgElement.appendChild(pathElement);
                                            flagElement.appendChild(svgElement);
                                            dropArea.appendChild(flagElement);
                                          }
                                        }
                                      });
                                    }, 100);
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

                                    // Dispatch the hardQuestionsChanged event after state update
                                    setTimeout(() => {
                                      const hardQuestionsEvent = new CustomEvent('hardQuestionsChanged', {
                                        detail: { hardQuestions: newHardQuestions }
                                      });
                                      window.dispatchEvent(hardQuestionsEvent);
                                    }, 0);

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
                                {isRetakeIncorrectMode && incorrectQuestions.includes(questionNum) && (
                                  <div className="absolute -top-1 -right-1 z-10 bg-white rounded-full p-[1px]" title="Incorrect Answer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
                                    </svg>
                                  </div>
                                )}
                                {hardQuestions[questionNum] && (
                                  <div className="absolute -top-1 -right-1" title="Hard question">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
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
              <div className="ml-6 flex space-x-4">
                {!location.state?.fromResultReview && !isRetakeIncorrectMode && (
                  <button
                    onClick={handleSubmitExam}
                    className={`px-6 py-4 rounded-lg text-lg font-bold transition-colors
                      ${colorTheme === 'black-on-white'
                        ? 'bg-black text-white hover:bg-gray-600'
                        : colorTheme === 'white-on-black'
                          ? 'bg-gray-900 text-yellow-300 hover:bg-yellow-700'
                          : 'bg-yellow-400 text-black hover:bg-yellow-500'
                      }`}
                  >
                    Submit
                  </button>
                )}
                {isRetakeIncorrectMode && (
                  <button
                    onClick={handleSubmitExam}
                    className="px-6 py-4 rounded-lg text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-colors shadow-lg"
                  >
                    Nộp bài làm lại
                  </button>
                )}
                {location.state?.fromResultReview && !isRetakeIncorrectMode && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => {
                          if (!answerData?.detailed_answers) return;

                          // Determine offset for Forecast mode
                          let offset = 0;
                          if (isForecastMode && currentPart > 1) {
                            const range = getQuestionRange(currentPart);
                            // Check if backend answers use 1-based indexing for parts > 1
                            const minQ = Math.min(...answerData.detailed_answers.map(a => a.question_number));
                            if (minQ < range.start) {
                              offset = range.start - 1;
                            }
                          }

                          const incorrectQuestions = answerData.detailed_answers
                            .filter(a => a.evaluation === 'wrong' || a.evaluation === 'blank')
                            .map(a => a.question_number + offset);

                          if (incorrectQuestions.length === 0) {
                            alert('Tất cả câu hỏi đều đúng! Không có câu sai để làm lại.');
                            return;
                          }
                          navigate('/reading_test_room', {
                            state: {
                              examId,
                              retakeIncorrectMode: true,
                              incorrectQuestions,
                              answerData: {
                                ...answerData,
                                detailed_answers: answerData.detailed_answers.map(a => ({
                                  ...a,
                                  question_number: a.question_number + offset
                                }))
                              },
                              forecastPart: isForecastMode ? currentPart : undefined,
                              resultId: resultId
                            }
                          });
                        }}
                        className="px-6 py-4 rounded-lg text-lg font-bold transition-colors bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                      >
                        Làm lại câu sai
                      </button>
                      <button
                        onClick={() => setShowClearDataDialog(true)}
                        className={`px-6 py-4 rounded-lg text-lg font-bold transition-colors
                          ${colorTheme === 'black-on-white'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : colorTheme === 'white-on-black'
                              ? 'bg-red-800 text-yellow-300 hover:bg-red-900'
                              : 'bg-red-500 text-black hover:bg-red-600'
                          }`}
                      >
                        Dừng xem lại
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </footer>

      </div>
      <ExplanationModal
        isOpen={showDescription}
        onClose={() => setShowDescription(false)}
        title={testDescription?.title}
        description={testDescription?.description}
      />
      <AlertForm
        open={showExitAlert}
        onClose={handleCancelExit}
        onConfirm={handleConfirmExit}
        title="Cảnh báo hành động thoát bài thi"
        message="Nếu bạn thoát bài thi trong quá trình làm bài, bài thi sẽ được nộp tự động."
      />
      <AlertForm
        open={showClearDataDialog}
        onClose={() => setShowClearDataDialog(false)}
        onConfirm={() => {
          clearExamData();
          setShowClearDataDialog(false);
        }}
        title="Xác nhận dừng xem lại"
        message="Lưu ý: Sau khi dừng xem lại, bài thi sẽ được lưu trữ xem lại ở lịch sử bài thi"
      />
      <ConfirmDialog
        isOpen={showRetakeDialog}
        message="Bạn có chắc chắn muốn làm lại bài thi này? Bài thi sẽ được lưu trữ xem lại ở lịch sử bài thi."
        onConfirm={handleRetakeConfirm}
        onCancel={() => setShowRetakeDialog(false)}
      />

      {/* Explanation Modal - Enhanced version from listening */}
      {explanationDialog.visible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
          <div className={`relative rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-gray-800'}`}>
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${colorTheme === 'black-on-white' ? 'border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50' : 'border-gray-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30'}`}>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className={`text-lg font-bold ${colorTheme === 'black-on-white' ? 'text-gray-800' : 'text-white'}`}>
                  Giải thích chi tiết
                </h3>
              </div>
              <button
                onClick={closeExplanationDialog}
                className={`p-1 rounded-full transition-colors ${colorTheme === 'black-on-white' ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className={`p-5 overflow-y-auto max-h-[60vh] ${colorTheme === 'black-on-white' ? 'text-gray-700' : 'text-gray-200'}`}>
              <style>
                {`
                  .explanation-content {
                    line-height: 1.8;
                  }
                  .explanation-content p {
                    margin-bottom: 0.75rem;
                  }
                  .explanation-content strong {
                    color: ${colorTheme === 'black-on-white' ? '#1e40af' : '#93c5fd'};
                  }
                  .explanation-content em {
                    color: ${colorTheme === 'black-on-white' ? '#047857' : '#6ee7b7'};
                    font-style: normal;
                    font-weight: 500;
                  }
                  .explanation-content .step-title {
                    font-weight: 600;
                    color: ${colorTheme === 'black-on-white' ? '#7c3aed' : '#c4b5fd'};
                    margin-top: 1rem;
                  }
                  .explanation-content .keyword {
                    background: ${colorTheme === 'black-on-white' ? '#fef3c7' : '#854d0e'};
                    padding: 0.125rem 0.375rem;
                    border-radius: 0.25rem;
                    font-weight: 500;
                  }
                  .explanation-content .answer {
                    background: ${colorTheme === 'black-on-white' ? '#dcfce7' : '#166534'};
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    margin-top: 1rem;
                    font-weight: 600;
                    display: inline-block;
                  }
                  .explanation-content ul {
                    list-style: none;
                    padding-left: 0;
                  }
                  .explanation-content li {
                    padding-left: 1.5rem;
                    position: relative;
                    margin-bottom: 0.5rem;
                  }
                  .explanation-content li::before {
                    content: "📌";
                    position: absolute;
                    left: 0;
                  }
                `}
              </style>
              <div
                className="explanation-content prose max-w-none"
                dangerouslySetInnerHTML={{ __html: explanationDialog.explanation }}
              />
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end ${colorTheme === 'black-on-white' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900/50'}`}>
              <button
                onClick={closeExplanationDialog}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Translator Dialog */}
      <TranslatorDialog
        isOpen={showTranslator}
        selectedText={selectedText}
        position={selectionPosition}
        onClose={closeTranslator}
        theme={colorTheme}
      />

      <ForceLogoutDialog
        isOpen={showForceLogoutDialog}
        message={logoutMessage}
        secondsRemaining={logoutCountdown}
      />
    </>
  );
};

export default MainLayout;
