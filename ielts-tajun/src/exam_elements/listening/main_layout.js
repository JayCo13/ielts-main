import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpenText, Bell, Menu, Volume2, Volume1, VolumeX, Play, Pause, Rewind, FastForward, Bot, Gauge, ChevronDown, Plus } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import ListeningTest from './fill_in_blank';
import { Player } from '@lottiefiles/react-lottie-player';
import TranscriptModal from '../../components/TranscriptModal';
import AlertForm from '../../components/AlertForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import ForceLogoutDialog from '../../components/ForceLogoutDialog';
import Split from 'react-split';
import { TranslatorDialog, useTextSelection } from '../../translator';
import { API_BASE } from '../../config/api';

// Audio Control Component — uses native browser streaming (no blob download)
const AudioControl = ({ examId, currentPart, colorTheme, isReviewMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true); // true until canplay fires
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [error, setError] = useState(null);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const audioRef = useRef(null);

  // Create unique key for this audio control instance
  const audioControlKey = `audio-${examId}-${currentPart}`;

  // Build streaming URL with token as query parameter (no blob download needed)
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsLoading(false);
    setIsAudioReady(false);
    setPendingPlay(false);
    setIsFetching(true);

    if (examId && currentPart && audioRef.current) {
      const token = localStorage.getItem('token');
      if (token) {
        // Stop current audio
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // Set src directly — browser handles streaming with Range requests
        audioRef.current.src = `${API_BASE}/student/exam/${examId}/audio-part/${currentPart}?token=${encodeURIComponent(token)}`;
        audioRef.current.load();
      }
    }
  }, [examId, currentPart]);

  // Auto-play once audio is ready, if user already clicked play
  useEffect(() => {
    if (isAudioReady && pendingPlay && audioRef.current) {
      setPendingPlay(false);
      setIsLoading(true);
      audioRef.current.play()
        .then(() => setError(null))
        .catch(err => {
          console.error('Auto-play after load error:', err);
          setError('Failed to play audio');
          setIsLoading(false);
        });
    }
  }, [isAudioReady, pendingPlay]);

  // Handle click outside to close speed control dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSpeedControl && !event.target.closest('.speed-control-container')) {
        setShowSpeedControl(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedControl]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else if (!isAudioReady) {
        // Audio still buffering — queue play for when canplay fires
        setPendingPlay(true);
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoading(true);
        setError(null);
        audioRef.current.play().catch(err => {
          console.error('Audio play error:', err);
          setError('Failed to play audio');
          setIsLoading(false);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.playbackRate = playbackSpeed;
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const speedOptions = [0.75, 0.85, 1, 1.1, 1.2, 1.25, 1.5, 1.75];

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setShowSpeedControl(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  };

  return (
    <div key={audioControlKey} className={`audio-control ${colorTheme === 'black-on-white' ? 'text-black' : 'text-white'}`}>
      <audio
        key={`${audioControlKey}-element`}
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onCanPlay={() => {
          setIsAudioReady(true);
          setIsFetching(false);
          setError(null);
        }}
        onWaiting={() => setIsFetching(true)}
        onCanPlayThrough={() => setIsFetching(false)}
        onError={(e) => {
          const code = e.target?.error?.code;
          const msg = code === 2 ? 'Network error loading audio'
            : code === 4 ? 'Audio format not supported'
              : 'Audio failed to load';
          setError(msg);
          setIsFetching(false);
        }}
        preload="auto"
      />

      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Part {currentPart} Audio</h3>
          <div className="text-sm opacity-75">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {isFetching && (
          <div className="text-blue-400 text-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Đang tải audio...
          </div>
        )}
        {pendingPlay && !isFetching && (
          <div className="text-yellow-400 text-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            Đang chờ audio...
          </div>
        )}
        {error && !isFetching && !pendingPlay && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {/* Progress Bar */}
        <div
          className={`w-full h-2 rounded-full cursor-pointer ${colorTheme === 'black-on-white' ? 'bg-gray-200' : 'bg-gray-600'}`}
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Speed Control */}
          <div className="relative speed-control-container">
            <button
              onClick={() => setShowSpeedControl(!showSpeedControl)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 min-w-[80px] shadow-sm ${colorTheme === 'black-on-white'
                ? 'bg-white/95 border border-gray-200 hover:border-gray-300 hover:shadow-md text-gray-700 hover:bg-gray-50'
                : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:shadow-md text-gray-200 hover:bg-gray-750'
                } ${showSpeedControl ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
              title="Playback Speed"
            >
              <Gauge size={16} className="text-blue-500" />
              <span className="text-sm font-medium">{playbackSpeed}x</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showSpeedControl ? 'rotate-180' : ''}`}
              />
            </button>

            {showSpeedControl && (
              <div className={`absolute top-full left-0 mt-2 z-[100] rounded-lg shadow-xl border backdrop-blur-sm min-w-[120px] ${colorTheme === 'black-on-white'
                ? 'bg-white/95 border-gray-200 shadow-gray-200/50'
                : 'bg-gray-800/95 border-gray-700 shadow-black/50'
                }`}>
                <div className="p-1">
                  {speedOptions.map((speed, index) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-md transition-all duration-150 ${playbackSpeed === speed
                        ? (colorTheme === 'black-on-white'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                          : 'bg-blue-900/50 text-blue-200 border border-blue-700/50 shadow-sm')
                        : (colorTheme === 'black-on-white'
                          ? 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                          : 'hover:bg-gray-700/50 text-gray-300 hover:text-white')
                        }`}
                    >
                      <span className="font-medium">{speed}x</span>
                      {playbackSpeed === speed && (
                        <div className={`w-2 h-2 rounded-full ${colorTheme === 'black-on-white' ? 'bg-blue-500' : 'bg-blue-400'
                          }`} />
                      )}
                    </button>
                  ))}
                </div>
                <div className={`px-3 py-2 border-t text-xs ${colorTheme === 'black-on-white'
                  ? 'border-gray-100 text-gray-500'
                  : 'border-gray-700 text-gray-400'
                  }`}>
                  <div className="flex items-center space-x-1">
                    <Gauge size={12} />
                    <span>Playback Speed</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={skipBackward}
              className={`p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-colors`}
              title="Skip backward 10s"
            >
              <Rewind size={20} />
            </button>

            <button
              onClick={() => {
                if (pendingPlay) {
                  // Cancel pending play
                  setPendingPlay(false);
                  setIsLoading(false);
                } else {
                  togglePlayPause();
                }
              }}
              disabled={isLoading && !pendingPlay}
              className={`p-3 rounded-full ${pendingPlay
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : colorTheme === 'black-on-white' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'
                } text-white transition-colors disabled:opacity-50`}
            >
              {(isLoading || pendingPlay) ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </button>

            <button
              onClick={skipForward}
              className={`p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-colors`}
              title="Skip forward 10s"
            >
              <FastForward size={20} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <Volume2 size={16} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const processCheckboxEvaluation = (answers) => {
  if (!answers || answers.length === 0) return answers;

  console.log('=== Checkbox Evaluation Debug ===');

  // Step 1: Find all checkbox questions by question_type
  // Checkbox questions have question_type = "Choose TWO" or "Choose THREE"
  const checkboxQuestions = [];
  answers.forEach((answer, index) => {
    const questionType = (answer.question_type || '').toLowerCase();
    const isCheckbox = questionType.includes('choose two') || questionType.includes('choose three');

    if (isCheckbox) {
      const correctAnswer = (answer.correct_answer || '').trim().toUpperCase();
      const studentAnswer = (answer.student_answer || '').trim().toUpperCase();
      checkboxQuestions.push({
        ...answer,
        index,
        questionNumber: answer.question_number,
        correctAnswer,
        studentAnswer,
        questionType: answer.question_type
      });
    }
  });

  // Step 2: Group consecutive checkbox questions
  const groups = [];
  let currentGroup = [];

  checkboxQuestions.forEach((item, i) => {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
    } else {
      const lastInGroup = currentGroup[currentGroup.length - 1];
      // Check if consecutive and same question_type
      if (item.questionNumber === lastInGroup.questionNumber + 1 &&
        item.questionType === lastInGroup.questionType) {
        currentGroup.push(item);
      } else {
        // Finalize current group if it has 2+ items
        if (currentGroup.length >= 2) {
          groups.push([...currentGroup]);
        }
        currentGroup = [item];
      }
    }
  });

  // Don't forget the last group
  if (currentGroup.length >= 2) {
    groups.push([...currentGroup]);
  }

  // Step 3: Create updated answers with recalculated evaluations
  const updatedAnswers = [...answers];

  groups.forEach(group => {
    // Build the set of ALL correct answers for this group
    // Handle cases where correct answer might be "A or B" or "A/B" or "A, B"
    const correctSet = new Set();
    group.forEach(a => {
      if (a.correctAnswer) {
        // Split by "OR", "/", or "," (case insensitive for OR)
        const parts = a.correctAnswer.split(/OR|\/|,/i);
        parts.forEach(p => {
          const clean = p.trim().toUpperCase();
          if (clean) correctSet.add(clean);
        });
      }
    });

    // Build the set of ALL student answers for this group
    const studentAnswerSet = new Set(group.map(a => a.studentAnswer).filter(a => a));

    // Track which student answers have been assigned
    const usedStudentAnswers = new Set();

    // First pass: For each question row, check if there's a matching student answer
    group.forEach((item) => {
      const originalStudentAnswer = item.studentAnswer;
      let newEvaluation;

      // Check if THIS student answer is one of the correct answers in the group
      if (originalStudentAnswer && correctSet.has(originalStudentAnswer) && !usedStudentAnswers.has(originalStudentAnswer)) {
        // Student's answer is correct (it's in the set of correct answers)
        newEvaluation = 'correct';
        usedStudentAnswers.add(originalStudentAnswer);
      } else if (!originalStudentAnswer) {
        // No answer provided
        newEvaluation = 'blank';
      } else {
        // Student answered but it's not in the correct set
        newEvaluation = 'wrong';
      }

      // Update the answer in our copy
      updatedAnswers[item.index] = {
        ...updatedAnswers[item.index],
        evaluation: newEvaluation,
        score: newEvaluation === 'correct' ? (item.max_marks || 1) : 0
      };
    });
  });

  console.log('=== End Checkbox Evaluation ===');
  return updatedAnswers;
};

const MainLayout = () => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentPart, setCurrentPart] = useState(1);
  const [examData, setExamData] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showDescriptionPanel, setShowDescriptionPanel] = useState(true);
  const [testDescription, setTestDescription] = useState(null);
  const [partDescriptions, setPartDescriptions] = useState({
    part1_description: null,
    part2_description: null,
    part3_description: null,
    part4_description: null
  });
  const [answers, setAnswers] = useState({});
  const [hardQuestions, setHardQuestions] = useState({});
  const [studentAnswers, setStudentAnswers] = useState({});
  const [answerData, setAnswerData] = useState(null); // Store complete answer data for evaluation
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [completedQuestions, setCompletedQuestions] = useState({}); // Track completed questions
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { examId } = location.state || {};
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  // Add new state variables for settings
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [textSize, setTextSize] = useState('regular');
  const [colorTheme, setColorTheme] = useState('black-on-white');
  const [isTranslatorEnabled, setIsTranslatorEnabled] = useState(false);
  const [totalTestLength, setTotalTestLength] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [resetKey, setResetKey] = useState(0); // Add reset key to force child component re-render
  const [isSubmissionPeriod, setIsSubmissionPeriod] = useState(false);
  const [submissionTimeRemaining, setSubmissionTimeRemaining] = useState(2 * 60); // 5 minutes in seconds
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
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
  const [retakeScore, setRetakeScore] = useState({ correct: 0, total: 0, details: [] });
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(40);
  const [logoutMessage, setLogoutMessage] = useState('');
  const [vipStatus, setVipStatus] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Vocabulary context menu state
  const [vocabMenu, setVocabMenu] = useState({ visible: false, x: 0, y: 0, selectedText: '' });
  const vocabMenuRef = useRef(null);

  // Initialize translator
  const isReviewMode = location?.state?.fromResultReview;
  const isRetakeIncorrectMode = location?.state?.retakeIncorrectMode;
  const incorrectQuestions = location?.state?.incorrectQuestions || [];
  const correctQuestions = location?.state?.correctQuestions || [];
  const retakeAnswerData = location?.state?.answerData;
  const forecastPartFromNav = location?.state?.forecastPart;
  const resultId = location?.state?.resultId;
  const {
    selectedText,
    selectionPosition,
    showTranslator,
    closeTranslator,
    translateText
  } = useTextSelection(isTranslatorEnabled, isReviewMode);

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

  const isPartForecast = (desc) => {
    if (!desc || typeof desc !== 'string') return false;
    return /\[forecast\]/i.test(desc);
  };

  const forecastParts = {
    1: isPartForecast(partDescriptions.part1_description),
    2: isPartForecast(partDescriptions.part2_description),
    3: isPartForecast(partDescriptions.part3_description),
    4: isPartForecast(partDescriptions.part4_description)
  };

  const [isForecastSession, setIsForecastSession] = useState(!!forecastPartFromNav);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');

  useEffect(() => {
    if (forecastPartFromNav && [1, 2, 3, 4].includes(forecastPartFromNav)) {
      setCurrentPart(forecastPartFromNav);
      setIsForecastSession(true);
    }
  }, [forecastPartFromNav]);

  // Function to handle search/locate icon click - highlights text in transcript
  const handleSearchClick = (questionNumber) => {
    // Remove any existing highlights first
    const existingHighlights = document.querySelectorAll('.locate-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });

    // Get locate data for this question from answerData
    if (!isReviewMode || !answerData) return;

    const questionData = answerData.find(answer =>
      answer.question_number === questionNumber
    );

    const locateText = questionData?.locate;

    if (locateText) {
      // Find the transcript panel container
      const transcriptPanel = document.getElementById('transcript-panel');
      if (transcriptPanel) {
        const found = highlightTextInElement(transcriptPanel, locateText);
        if (!found) {
          console.log('Locate text not found in transcript:', locateText);
        }
      }
    }
  };

  // Function to show explanation modal
  const handleExplainClick = (questionNumber) => {
    if (!isReviewMode || !answerData) return;

    const questionData = answerData.find(answer =>
      answer.question_number === questionNumber
    );

    const explanation = questionData?.explanation;
    if (explanation) {
      setCurrentExplanation(explanation);
      setShowExplanationModal(true);
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
            highlight.style.padding = '4px 6px';
            highlight.style.borderRadius = '4px';
            highlight.style.fontWeight = 'bold';
            highlight.style.boxShadow = '0 0 0 2px #ffc107';
            highlight.style.lineHeight = '2';
            highlight.style.display = 'inline';
            highlight.style.boxDecorationBreak = 'clone';
            highlight.style.webkitBoxDecorationBreak = 'clone';
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
            highlight.style.padding = '4px 6px';
            highlight.style.borderRadius = '4px';
            highlight.style.fontWeight = 'bold';
            highlight.style.boxShadow = '0 0 0 2px #ffc107';
            highlight.style.lineHeight = '2';
            highlight.style.display = 'inline';
            highlight.style.boxDecorationBreak = 'clone';
            highlight.style.webkitBoxDecorationBreak = 'clone';
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

  // Update handleAnswerChange to also mark questions as completed
  const handleAnswerChange = (questionId, answer) => {
    // In retake incorrect mode, prevent editing locked (correct) answers
    if (isRetakeIncorrectMode && retakeAnswerData?.detailed_answers) {
      const incorrectSet = new Set(incorrectQuestions);
      const questionData = retakeAnswerData.detailed_answers.find(a => a.question_id === questionId);
      if (questionData && !incorrectSet.has(questionData.question_number)) {
        return; // This is a correct question — don't allow editing
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

    const fetchPartDescriptions = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/listening/exam/${examId}/part-descriptions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPartDescriptions({
            part1_description: data.part1_description,
            part2_description: data.part2_description,
            part3_description: data.part3_description,
            part4_description: data.part4_description
          });
          // Do not auto-switch to forecast mode when starting from full test list.
          // Only enable forecast session when explicitly navigated with forecastPart.
        }
      } catch (error) {
        console.error('Error fetching part descriptions:', error);
      }
    };

    if (examId) {
      fetchTestDescription();
      fetchPartDescriptions();
    }
  }, [examId]);


  useEffect(() => {
    const fetchAudioLengths = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/exam/${examId}/audio-lengths`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (isForecastSession) {
            const partLen = (data.part_lengths || []).find(p => p.part_number === currentPart);
            setTotalTestLength(partLen && partLen.length_formatted ? partLen.length_formatted : data.total_length_formatted);
          } else {
            setTotalTestLength(data.total_length_formatted);
          }
        }
      } catch (error) {
        console.error('Error fetching audio lengths:', error);
      }
    };

    if (examId) {
      fetchAudioLengths();
    }
  }, [examId, isForecastSession, currentPart]);

  useEffect(() => {
    if (examId) {
      if (isForecastSession && currentPart) {
        setAudioUrl(`${API_BASE}/student/exam/${examId}/audio-part/${currentPart}`);
      } else {
        setAudioUrl(`${API_BASE}/student/exam/${examId}/audio`);
      }
    }

    const fetchExamData = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/exam/${examId}/start`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setExamData(data);
          // Audio URL is already set above
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
  }, [examId, isForecastSession, currentPart]);

  // Fetch answer data when in review mode
  useEffect(() => {
    const fetchAnswerData = async () => {
      if (!isReviewMode || !resultId) return;

      try {
        const response = await fetch(`${API_BASE}/student/exam-result/${resultId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Fetched answer data:', data);
          console.log('Detailed answers:', data.detailed_answers);

          // Store only the detailed_answers array for evaluation display (matching working components)
          const allAnswers = data.detailed_answers || [];
          const processedAnswers = processCheckboxEvaluation(allAnswers);
          setAnswerData(processedAnswers);

          // Convert the answer data to the format expected by the component
          const formattedAnswers = {};
          if (data.detailed_answers) {
            data.detailed_answers.forEach(answer => {
              formattedAnswers[answer.question_id] = answer.student_answer;
            });
          }
          console.log('Formatted answers:', formattedAnswers);

          setStudentAnswers(formattedAnswers);

          // Mark all questions as completed since this is review mode
          const completedQs = {};
          Object.keys(formattedAnswers).forEach(questionId => {
            completedQs[questionId] = true;
          });
          setCompletedQuestions(completedQs);
        }
      } catch (error) {
        console.error('Error fetching answer data:', error);
      }
    };

    fetchAnswerData();
  }, [isReviewMode, resultId]);

  // Initialize retake incorrect mode — pre-fill correct answers and previously answered wrong ones
  useEffect(() => {
    if (!isRetakeIncorrectMode || !retakeAnswerData?.detailed_answers) return;

    const incorrectSet = new Set(incorrectQuestions);
    const formattedAnswers = {};
    const completedQs = {};

    retakeAnswerData.detailed_answers.forEach(answer => {
      if (!incorrectSet.has(answer.question_number)) {
        // This is a correct question — pre-fill and lock it
        formattedAnswers[answer.question_id] = answer.student_answer;
        completedQs[answer.question_id] = true;
      } else if (answer.evaluation === 'wrong' && answer.student_answer) {
        // This is an incorrect question that the user DID answer — pre-fill so footer shows it as done
        formattedAnswers[answer.question_id] = answer.student_answer;
        completedQs[answer.question_id] = true;
      }
      // Blank questions (evaluation === 'blank') are intentionally left empty
    });

    setStudentAnswers(formattedAnswers);
    setCompletedQuestions(completedQs);

    // Store processed answer data for highlighting in fill_in_blank
    const allAnswers = retakeAnswerData.detailed_answers || [];
    const processedAnswers = processCheckboxEvaluation(allAnswers);
    setAnswerData(processedAnswers);
  }, [isRetakeIncorrectMode, retakeAnswerData]);

  // Fetch VIP status for retake button restrictions
  useEffect(() => {
    const fetchVipStatus = async () => {
      const userRole = localStorage.getItem('role');
      if (userRole !== 'customer') {
        setVipStatus({ is_subscribed: true }); // Students have full access
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/customer/vip/subscription/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setVipStatus(data);
        } else {
          setVipStatus({ is_subscribed: false });
        }
      } catch (error) {
        console.error('Error fetching VIP status:', error);
        setVipStatus({ is_subscribed: false });
      }
    };

    fetchVipStatus();
  }, []);

  const getCurrentSection = () => {
    return examData?.sections[currentPart - 1];
  };

  const handleSubmitExam = async () => {
    // In retake incorrect mode, calculate score locally — don't call backend
    if (isRetakeIncorrectMode && retakeAnswerData?.detailed_answers) {
      const incorrectSet = new Set(incorrectQuestions);
      let correctCount = 0;
      const details = [];

      // Filter to only the questions relevant to this retake session
      // Use the union of incorrectQuestions + correctQuestions as the definitive list
      // (these were computed correctly with proper numbering when the retake was initiated)
      let answersToProcess = retakeAnswerData.detailed_answers;
      const retakeQuestionSet = new Set([...incorrectQuestions, ...correctQuestions]);
      if (retakeQuestionSet.size > 0) {
        answersToProcess = retakeAnswerData.detailed_answers.filter(
          a => retakeQuestionSet.has(a.question_number)
        );
      }

      answersToProcess.forEach(answer => {
        // Check if student's answer matches correct answer
        // First try studentAnswers state, then fallback to DOM input value
        let newAnswer = studentAnswers[answer.question_id] || '';
        if (!newAnswer) {
          // Fallback: read from DOM input (handles case after Thử lại where state is cleared but DOM retains values)
          // Try multiple selectors — inputs use data-question-number with local qNum
          const inputEl = document.querySelector(
            `#input-question-${answer.question_number}, ` +
            `input[data-question-number="${answer.question_number}"]`
          );
          if (inputEl) {
            newAnswer = inputEl.value || '';
          }
        }
        // Split correct answers on both '/' and ' or ' (e.g., "theater or theatre", "color/colour")
        const correctAnswerStr = answer.correct_answer || '';
        const correctAnswers = correctAnswerStr.split(/\/| or /i).map(a => a.trim().toLowerCase()).filter(a => a);
        const isNowCorrect = newAnswer.trim() !== '' && correctAnswers.includes(newAnswer.trim().toLowerCase());

        if (isNowCorrect) correctCount++;

        details.push({
          question_number: answer.question_number,
          student_answer: newAnswer,
          correct_answer: answer.correct_answer,
          isCorrect: isNowCorrect,
          wasOriginallyCorrect: !incorrectSet.has(answer.question_number)
        });
      });

      setRetakeScore({ correct: correctCount, total: answersToProcess.length, details });
      setShowRetakeResult(true);
      return;
    }

    try {
      const forecastParam = isForecastSession && currentPart ? `?forecast_part=${currentPart}` : '';
      const response = await fetch(`${API_BASE}/student/exam/${examId}/submit${forecastParam}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentAnswers)
      });

      if (response.ok) {
        const result = await response.json();
        // Keep all stored data for review
        // localStorage data (ielts-answers, ielts-highlights, ielts-notes, current-exam-session) is preserved
        // No DOM manipulation to remove highlights
        // State variables are preserved for review

        navigate('/result_review', { state: { resultId: result.result_id, examId: examId, forecastPart: isForecastSession ? currentPart : undefined } });
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

  // Function to clear all exam data after review
  const clearExamData = () => {
    // Clear localStorage data
    localStorage.removeItem('ielts-answers');
    localStorage.removeItem('ielts-highlights');
    localStorage.removeItem('ielts-notes');
    localStorage.removeItem('current-exam-session');

    // Remove highlight elements from DOM
    const highlightElements = document.querySelectorAll('.highlight-element');
    highlightElements.forEach(el => el.remove());

    // Reset state variables
    setStudentAnswers({});
    setHighlights([]);
    setNotes({});

    // Navigate back to correct list based on forecast mode
    if (isForecastSession || forecastPartFromNav) {
      navigate('/listening_forecast');
    } else {
      navigate('/listening_list');
    }
  };

  // Handle confirm exit
  const handleConfirmExit = () => {
    setShowExitAlert(false);
    handleSubmitExam(); // Submit the exam before navigating away
  };

  // Handle confirm retake
  const handleRetakeConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/student/listening/exam/${examId}/retake`, {
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

        // Clear exam-specific data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(`listening_${examId}`) ||
            key.includes(`highlights_listening_${examId}`) ||
            key.includes(`notes_listening_${examId}`) ||
            key.includes(`highlights-${examId}`) ||
            key.includes(`notes-${examId}`) ||
            key.startsWith('heading-'))) {
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

        // Reset state variables
        setStudentAnswers({});
        setHighlights([]);
        setNotes({});
        setHardQuestions({});
        setCompletedQuestions({});

        // Force child component re-render by updating reset key
        setResetKey(prev => prev + 1);

        // Navigate to test room
        navigate('/listening_test_room', { state: { examId } });
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

  // Handle cancel exit
  const handleCancelExit = () => {
    setShowExitAlert(false);
    // Push a new state to the history to prevent the back navigation
    window.history.pushState(null, document.title, window.location.href);
  };

  // State for clear data confirmation dialog
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  // State for exit alert dialog
  const [showExitAlert, setShowExitAlert] = useState(false);
  // Monitor changes to audioUrl and load the audio when URL changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      // Handle audio end event
      const handleEnded = () => {
        setIsAudioPlaying(false);
        setIsAudioStarted(false);
        // No need to handle parts since it's one continuous audio file
      };

      // Handle time update event to keep UI in sync
      const handleTimeUpdate = () => {
        // This will trigger a re-render with the current time
        setIsAudioStarted(true); // Ensure we know audio is playing
        setIsAudioPlaying(!audioRef.current.paused); // Update play/pause state
      };

      // Handle play event
      const handlePlay = () => {
        setIsAudioPlaying(true);
        setIsAudioStarted(true);
        setIsPlayLoading(false);
      };

      // Handle pause event
      const handlePause = () => {
        setIsAudioPlaying(false);
      };

      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('pause', handlePause);

      // Clean up event listeners
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.removeEventListener('play', handlePlay);
          audioRef.current.removeEventListener('pause', handlePause);
        }
      };
    }
  }, []); // No dependencies needed since we're not handling parts

  // Effect to handle audioUrl changes
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    // Skip main audio loading in retake incorrect mode — AudioControl handles per-part audio
    if (isRetakeIncorrectMode) return;
    const token = localStorage.getItem('token');
    if (isForecastSession) {
      // Try native streaming first via ?token= query-param auth (fast, uses
      // Range requests). If the backend on this environment doesn't support
      // query-param auth (returns non-audio response), fall back to fetch+blob
      // with header auth — slower but works on older backend deployments.
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      const nativeSrc = `${audioUrl}${tokenParam}`;
      let didFallback = false;

      const fallbackToBlob = () => {
        if (didFallback) return;
        didFallback = true;
        if (!audioRef.current) return;
        fetch(audioUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
          .then(response => {
            // 403 = VIP expired / no access for this skill. Show a clear
            // message + redirect to renewal page instead of letting the
            // <audio> element fail later with a cryptic "Format error".
            if (response.status === 403) {
              alert('Gói VIP của bạn đã hết hạn hoặc không có quyền truy cập bài thi này. Vui lòng gia hạn để tiếp tục luyện tập.');
              navigate('/vip-packages?type=listening');
              throw new Error('VIP access denied');
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.blob();
          })
          .then(blob => {
            if (!blob || !audioRef.current) return;
            const objectUrl = URL.createObjectURL(blob);
            audioRef.current.src = objectUrl;
            audioRef.current.load();
          })
          .catch(err => {
            console.error('Audio blob-fallback failed:', err);
          });
      };

      const onError = () => {
        audioRef.current?.removeEventListener('error', onError);
        console.warn('Native audio streaming failed, falling back to blob fetch');
        fallbackToBlob();
      };
      audioRef.current.addEventListener('error', onError, { once: true });

      audioRef.current.src = nativeSrc;
      audioRef.current.load();
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl, isForecastSession]);
  const handleStartAudio = async () => {
    if (!audioRef.current || isStartLoading) return;
    setIsStartLoading(true);
    try {
      if (isForecastSession) {
        if (!audioRef.current.src && audioUrl) {
          const token = localStorage.getItem('token');
          const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
          audioRef.current.src = `${audioUrl}${tokenParam}`;
        }
      } else {
        if (!audioRef.current.src) {
          audioRef.current.src = audioUrl;
        }
      }

      // Let the browser's preload="auto" do its job.
      // Calling load() here aborts the ongoing buffering connection, which causes massive TTFB spikes with Cloudflare and long loading times on clicking "Start".
      await audioRef.current.play();
      setIsAudioStarted(true);
      setIsAudioPlaying(true);
      setIsStartLoading(false);
    } catch (error) {
      console.error('Audio playback error:', error);
      setTimeout(async () => {
        try {
          if (audioRef.current) {
            audioRef.current.load();
            await audioRef.current.play();
            setIsAudioStarted(true);
            setIsAudioPlaying(true);
          }
        } catch (e) {
          console.error('Retry audio playback failed:', e);
        }
        setIsStartLoading(false);
      }, 300);
    }
  };

  useEffect(() => {
    if (isAudioStarted && totalTestLength) {
      const [minutes, seconds] = totalTestLength.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      setRemainingTime(totalSeconds);

      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            setIsSubmissionPeriod(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isAudioStarted, totalTestLength, isForecastSession, currentPart]);


  // Add this helper function
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
    // Calculate the correct question number based on the current part and index
    const questionNumber = range.start + index;

    if (question.question_type === 'main_text') {
      // Make hardQuestions available to the window object
      window.hardQuestions = hardQuestions;

      return (
        <ListeningTest
          key={`${question.question_id}-${resetKey}`}
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
          isTranslatorEnabled={isTranslatorEnabled}
          onTranslate={translateText}
          answerData={answerData}
          forecastMode={isReviewMode && (forecastParts[currentPart] || (forecastPartFromNav === currentPart))}
          onSearchClick={handleSearchClick}
          onExplainClick={handleExplainClick}
          isReviewMode={isReviewMode}
          retakeIncorrectMode={isRetakeIncorrectMode}
          incorrectQuestionNumbers={incorrectQuestions}
          correctQuestionNumbers={correctQuestions}
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
    const MAX_SELECTION_LENGTH = 200; // Maximum characters allowed in selection

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
      toast.textContent = 'Tránh copy đề chỉ được phép chọn 200 ký tự 1 lần';
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
          source_type: 'listening',
          source_exam_id: examId,
          source_exam_title: examData?.exam_title || 'Listening Test'
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

  // Handle click outside to close speed control dropdown in main layout
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSpeedControl && !event.target.closest('.speed-control-container')) {
        setShowSpeedControl(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedControl]);

  // Handle browser back button for both normal exam and review mode
  useEffect(() => {
    // Handle popstate event (browser back button)
    const handlePopState = (e) => {
      // If in review mode, clear data and navigate away
      if (location.state?.fromResultReview) {
        clearExamData();
      } else {
        setShowExitAlert(true);
      }
      // Push state again to prevent actual navigation
      window.history.pushState(null, document.title, window.location.href);
    };

    // Add event listener
    window.addEventListener('popstate', handlePopState);

    // Push a new state to the history to enable catching the back button
    window.history.pushState(null, document.title, window.location.href);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.state?.fromResultReview]);

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

      <audio
        ref={audioRef}
        preload="auto"
        onLoadedMetadata={() => {
          if (audioRef.current) {
            const duration = audioRef.current.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            console.log(`Audio loaded successfully. Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);

            // Initialize playback rate
            audioRef.current.playbackRate = playbackSpeed;

            // If in view-only mode, disable audio controls
            if (location.state?.fromResultReview) {
              audioRef.current.controls = false;
            }
          }
        }}
        onError={(e) => console.error('Audio error:', e.target.error ? e.target.error : 'Unknown error')}
      />

      <div className={`h-screen flex flex-col ${colorThemeClasses[colorTheme]} relative`}>
        <header className={`${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'} border-b border-zinc-500 px-2 md:px-4 py-2 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0`}>
          <div className="flex items-center space-x-4 md:space-x-8 w-full md:w-auto justify-between md:justify-start">
            <span className="text-red-600 font-bold text-2xl md:text-3xl">IELTS</span>
            <div className={`${textSizeClasses[textSize]} text-sm md:text-base`}>
              <div> <p className="font-bold">Test taker ID: {localStorage.getItem('username')}</p></div>
              {testDescription?.title && (
                <div className={`${colorTheme !== 'black-on-white' ? 'text-blue-400' : 'text-blue-600'} font-semibold ${textSizeClasses[textSize]}`}>
                  {testDescription.title}
                </div>
              )}
              <div className={`hidden md:block ${colorTheme !== 'black-on-white' ? 'text-gray-300' : 'text-black-500'} ${textSizeClasses[textSize]}`}>
                1 year, 10 months, 1 week, 1 day, 21 hours, 11 minutes remaining
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 md:space-x-4 font-bold w-full md:w-auto mt-2 md:mt-0">
            {/* AI Translator button */}
            <div className="relative group">
              <button
                onClick={() => setIsTranslatorEnabled(!isTranslatorEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isTranslatorEnabled
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
                  : colorTheme !== 'black-on-white'
                    ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/60 border border-gray-600/30'
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
            <div className={`flex flex-col ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-black-600'} p-2 md:p-3 bg-gray-800/30 rounded-lg w-80 max-w-full ${isRetakeIncorrectMode ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              {/* Progress bar — disabled in retake mode */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xs min-w-[40px] text-center">
                  {formatTime(audioRef.current?.currentTime || 0)}
                </span>
                <div className="relative w-full h-1.5">
                  {/* Background track */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gray-500 rounded-full z-0"></div>
                  {/* Colored progress bar */}
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-400 rounded-full z-0"
                    style={{
                      width: `${((audioRef.current?.currentTime || 0) / (audioRef.current?.duration || 100)) * 100}%`
                    }}
                  ></div>
                  {/* Range input */}
                  <input
                    type="range"
                    min="0"
                    max={audioRef.current?.duration || 100}
                    step="1"
                    value={audioRef.current?.currentTime || 0}
                    className={`absolute top-0 left-0 w-full h-1.5 appearance-none cursor-pointer z-10 opacity-0
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:shadow
                      [&::-webkit-slider-thumb]:opacity-100
                      [&::-webkit-slider-thumb]:relative
                      [&::-webkit-slider-thumb]:z-20
                      [&::-moz-range-thumb]:appearance-none
                      [&::-moz-range-thumb]:h-3
                      [&::-moz-range-thumb]:w-3
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-white
                      [&::-moz-range-thumb]:shadow
                      [&::-moz-range-thumb]:opacity-100
                      [&::-moz-range-thumb]:relative
                      [&::-moz-range-thumb]:z-20 ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (audioRef.current && !location.state?.fromResultReview) {
                        const newTime = parseFloat(e.target.value);
                        audioRef.current.currentTime = newTime;
                      }
                    }}
                    disabled={location.state?.fromResultReview}
                  />
                  {/* Visible thumb */}
                  <div
                    className="absolute top-1/2 h-3 w-3 rounded-full bg-white shadow z-20 -translate-y-1/2"
                    style={{
                      left: `calc(${((audioRef.current?.currentTime || 0) / (audioRef.current?.duration || 100)) * 100}% - 6px)`
                    }}
                  ></div>
                </div>
                <span className="text-xs min-w-[40px] text-center">
                  {formatTime(audioRef.current?.duration || 0)}
                </span>
              </div>

              {/* Controls row with speed control on left, centered refresh buttons, and volume on right */}
              <div className="flex items-center justify-between">
                {/* Speed control on left */}
                <div className="relative speed-control-container">
                  <button
                    onClick={() => setShowSpeedControl(!showSpeedControl)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 
                      ${colorTheme !== 'black-on-white'
                        ? 'bg-gray-700/50 hover:bg-gray-600/60 text-white border border-gray-600/30'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      } 
                      backdrop-blur-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400/50
                      ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={location.state?.fromResultReview}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{playbackSpeed}×</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${showSpeedControl ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showSpeedControl && (
                    <div className={`absolute top-full left-0 mt-2 rounded-xl shadow-xl border z-50 min-w-[140px]
                      ${colorTheme !== 'black-on-white'
                        ? 'bg-gray-800/95 border-gray-600/30 text-white'
                        : 'bg-white/95 border-gray-200 text-gray-700'
                      } 
                      backdrop-blur-md`}>
                      <div className="p-1">
                        {[0.75, 0.85, 1, 1.1, 1.2, 1.25, 1.5, 1.75].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => {
                              if (!location.state?.fromResultReview) {
                                setPlaybackSpeed(speed);
                                if (audioRef.current) {
                                  audioRef.current.playbackRate = speed;
                                }
                                setShowSpeedControl(false);
                              }
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-150 flex items-center justify-between
                              ${playbackSpeed === speed
                                ? (colorTheme !== 'black-on-white'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-500 text-white'
                                )
                                : (colorTheme !== 'black-on-white'
                                  ? 'hover:bg-gray-700/60 text-gray-200'
                                  : 'hover:bg-gray-100 text-gray-600'
                                )
                              }
                              ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={location.state?.fromResultReview}
                          >
                            <span className="font-medium">{speed}× Speed</span>
                            {playbackSpeed === speed && (
                              <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className={`px-3 py-2 text-xs border-t 
                        ${colorTheme !== 'black-on-white'
                          ? 'border-gray-600/30 text-gray-400'
                          : 'border-gray-200 text-gray-500'
                        }`}>
                        Current: {playbackSpeed}× playback
                      </div>
                    </div>
                  )}
                </div>

                {/* Center controls */}
                <div className="flex items-center space-x-4 justify-center">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (audioRef.current && !location.state?.fromResultReview) {
                        const newTime = Math.max(0, audioRef.current.currentTime - 10);
                        audioRef.current.currentTime = newTime;
                      }
                    }}
                    className={`p-1 rounded hover:bg-gray-400 flex items-center ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Rewind 10 seconds"
                    disabled={location.state?.fromResultReview}
                  >
                    <Rewind className="w-4 h-4 transform" />
                    <span className="ml-1 text-xs">10s</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (audioRef.current && !location.state?.fromResultReview) {
                        if (audioRef.current.paused) {
                          setIsPlayLoading(true);
                          audioRef.current.play()
                            .then(() => {
                              setIsAudioStarted(true);
                              setIsAudioPlaying(true);
                              setIsPlayLoading(false);
                            })
                            .catch(error => {
                              console.error('Play button error:', error.name, error.message);
                              // Try to play again if there was an error without load()ing
                              setTimeout(() => {
                                if (audioRef.current) {
                                  audioRef.current.play()
                                    .then(() => {
                                      setIsAudioStarted(true);
                                      setIsAudioPlaying(true);
                                      setIsPlayLoading(false);
                                    })
                                    .catch(e => console.error('Retry play failed:', e.name, e.message));
                                }
                              }, 300);
                            });
                        } else {
                          audioRef.current.pause();
                          setIsAudioPlaying(false);
                          setIsPlayLoading(false);
                        }
                      }
                    }}
                    className={`p-1 rounded hover:bg-gray-400 ${location.state?.fromResultReview || isPlayLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={location.state?.fromResultReview || isPlayLoading}
                  >
                    {isPlayLoading && !isAudioPlaying ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      !isAudioPlaying ?
                        <Play className="w-4 h-4" /> :
                        <Pause className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (audioRef.current && !location.state?.fromResultReview) {
                        const newTime = Math.min(
                          audioRef.current.duration || 0,
                          audioRef.current.currentTime + 10
                        );
                        audioRef.current.currentTime = newTime;
                      }
                    }}
                    className={`p-1 rounded hover:bg-gray-400 flex items-center ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Forward 10 seconds"
                    disabled={location.state?.fromResultReview}
                  >
                    <span className="mr-1 text-xs">10s</span>
                    <FastForward className="w-4 h-4 transform rotate-95" />

                  </button>
                </div>

                {/* Volume control on right */}
                <div
                  className="relative"
                  onMouseEnter={() => !location.state?.fromResultReview && setShowVolumeControl(true)}
                  onMouseLeave={() => {
                    // Add a small delay before hiding to prevent accidental hiding
                    setTimeout(() => {
                      if (!document.querySelector(':hover > .volume-popup')) {
                        setShowVolumeControl(false);
                      }
                    }, 100);
                  }}
                >
                  <div
                    className={`p-1 rounded hover:bg-gray-400 flex items-center ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </div>

                  {showVolumeControl && (
                    <div
                      className="absolute top-full right-0 mt-2 bg-gray-400 rounded-lg p-2 shadow-lg z-10 w-32 volume-popup"
                    >
                      <div className="flex items-center space-x-2">
                        <button
                          className={`p-1 rounded hover:bg-gray-500 ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (!location.state?.fromResultReview) {
                              const newVolume = volume === 0 ? 0.5 : 0;
                              setVolume(newVolume);
                              if (audioRef.current) audioRef.current.volume = newVolume;
                            }
                          }}
                          disabled={location.state?.fromResultReview}
                        >
                          {volume === 0 ? <Volume1 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        </button>
                        <div className="relative w-full h-1.5">
                          {/* Background track - lower z-index */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gray-500 rounded-full z-0"></div>

                          {/* Colored progress bar - higher z-index */}
                          <div
                            className="absolute top-0 left-0 h-full bg-blue-400 rounded-full z-1"
                            style={{
                              width: `${volume * 100}%`
                            }}
                          ></div>

                          {/* Range input */}
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            className={`absolute top-0 left-0 w-full h-1.5 appearance-none z-10 opacity-0
                              [&::-webkit-slider-thumb]:appearance-none
                              [&::-webkit-slider-thumb]:h-2.5
                              [&::-webkit-slider-thumb]:w-2.5
                              [&::-webkit-slider-thumb]:rounded-full
                              [&::-webkit-slider-thumb]:bg-white
                              [&::-webkit-slider-thumb]:opacity-100
                              [&::-webkit-slider-thumb]:relative
                              [&::-webkit-slider-thumb]:z-20
                              [&::-moz-range-thumb]:appearance-none
                              [&::-moz-range-thumb]:h-2.5
                              [&::-moz-range-thumb]:w-2.5
                              [&::-moz-range-thumb]:rounded-full
                              [&::-moz-range-thumb]:bg-white
                              [&::-moz-range-thumb]:opacity-100
                              [&::-moz-range-thumb]:relative
                              [&::-moz-range-thumb]:z-20 ${location.state?.fromResultReview ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            onChange={(e) => {
                              if (!location.state?.fromResultReview) {
                                const newVolume = parseFloat(e.target.value);
                                setVolume(newVolume);
                                if (audioRef.current) audioRef.current.volume = newVolume;
                              }
                            }}
                            disabled={location.state?.fromResultReview}
                          />

                          {/* Visible thumb */}
                          <div
                            className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-white shadow z-20 -translate-y-1/2"
                            style={{
                              left: `calc(${volume * 100}% - 5px)`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
            <div className="relative" ref={menuRef}>
              <Menu
                className={`w-5 h-5 cursor-pointer ml-4 relative z-10 ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
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



        {/* Retake Confirmation Dialog */}
        {showRetakeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-orange-100">
                  <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Làm lại câu sai</h2>
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                  Bạn sẽ được làm lại những câu trả lời sai hoặc bỏ trống. Những câu đã đúng sẽ được giữ nguyên và không thể chỉnh sửa.
                </p>
                <p className="text-orange-600 font-semibold mt-3 text-sm">
                  ⚠️ Kết quả làm lại sẽ không ảnh hưởng đến lịch sử bài thi của bạn.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRetakeConfirm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    setShowRetakeConfirm(false);
                    if (!answerData || !Array.isArray(answerData) || answerData.length === 0) {
                      console.warn('No answerData available for retake', answerData);
                      return;
                    }

                    let partAnswers = answerData;
                    let offset = 0;
                    const currentSection = examData?.sections?.[currentPart - 1];
                    if ((isForecastSession || forecastPartFromNav) && currentSection) {
                      const sectionQuestionIds = new Set(
                        currentSection.questions.map(q => q.question_id)
                      );
                      partAnswers = answerData.filter(a => sectionQuestionIds.has(a.question_id));
                      const range = getQuestionRange(currentPart);
                      if (partAnswers.length > 0) {
                        const minQ = Math.min(...partAnswers.map(a => a.question_number));
                        if (minQ < range.start) {
                          offset = range.start - minQ;
                        }
                      }
                    }

                    const incorrectQs = partAnswers
                      .filter(a => a.evaluation === 'wrong' || a.evaluation === 'blank')
                      .map(a => a.question_number + offset);
                    const correctQs = partAnswers
                      .filter(a => a.evaluation === 'correct')
                      .map(a => a.question_number + offset);

                    if (incorrectQs.length === 0) {
                      alert('Tất cả câu hỏi đều đúng! Không có câu sai để làm lại.');
                      return;
                    }
                    navigate('/listening_test_room', {
                      state: {
                        examId,
                        retakeIncorrectMode: true,
                        incorrectQuestions: incorrectQs,
                        correctQuestions: correctQs,
                        answerData: {
                          detailed_answers: partAnswers.map(a => ({
                            ...a,
                            question_number: a.question_number + offset
                          }))
                        },
                        forecastPart: (isForecastSession || forecastPartFromNav) ? currentPart : undefined,
                        resultId: resultId
                      }
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors font-semibold"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

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
                          delete reset[a.question_id];
                        }
                      });
                      return reset;
                    });
                    // Also clear completed questions for the incorrect ones
                    setCompletedQuestions(prev => {
                      const reset = { ...prev };
                      retakeAnswerData.detailed_answers.forEach(a => {
                        if (incorrectSet.has(a.question_number)) {
                          delete reset[a.question_id];
                        }
                      });
                      return reset;
                    });
                    // Clear DOM inputs (fill-in-blank type)
                    document.querySelectorAll('input[data-question-number]').forEach(input => {
                      const qNum = parseInt(input.getAttribute('data-question-number'));
                      if (incorrectSet.has(qNum)) {
                        input.value = '';
                      }
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
                    navigate('/listening_test_room', {
                      state: {
                        examId,
                        fromResultReview: true,
                        resultId: resultId,
                        forecastPart: (isForecastSession || forecastPartFromNav) ? currentPart : undefined
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

        {/* Retake Incorrect Mode Banner */}
        {isRetakeIncorrectMode && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex items-center justify-between flex-none z-50 relative">
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

        {(location.state?.fromResultReview || isRetakeIncorrectMode) ? (
          <div className="flex-1 overflow-hidden relative">
            {/* Import Split component at the top of the file */}
            {showDescriptionPanel ? (
              <Split
                className={`flex split-container ${isMobile ? 'flex-col' : 'flex-row'}`}
                sizes={isMobile ? [40, 60] : [50, 50]}
                minSize={isMobile ? 150 : 200}
                expandToMin={false}
                gutterSize={isMobile ? 10 : 20}
                gutterAlign="center"
                snapOffset={10}
                dragInterval={1}
                direction={isMobile ? "vertical" : "horizontal"}
                cursor={isMobile ? "row-resize" : "col-resize"}
              >
                {/* Exam content on the left */}
                <div className={`overflow-y-auto ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'}`}>
                  <div className={textSizeClasses[textSize]}>
                    {getCurrentSection()?.questions.map((question, index) =>
                      renderQuestionComponent(question, index)
                    )}
                  </div>
                </div>

                {/* Description on the right */}
                <div className={`overflow-y-auto border-l ${colorTheme === 'black-on-white' ? 'bg-white border-gray-200' : 'bg-black border-gray-700'}`}>
                  {/* Audio Control Component - Sticky */}
                  <div className={`sticky top-0 z-10 p-4 border-b ${colorTheme === 'black-on-white' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'}`}>
                    <AudioControl examId={examId} currentPart={currentPart} colorTheme={colorTheme} isReviewMode={isReviewMode} />
                  </div>
                  <div className="p-4" id="transcript-panel">
                    <h2 className="text-2xl font-bold text-center text-blue-600 mb-4">Transcript Part {currentPart} - {testDescription?.title}</h2>
                    <div className="prose max-w-none">
                      {partDescriptions && currentPart && partDescriptions[`part${currentPart}_description`] && (
                        <div
                          className="text-gray-700"
                          dangerouslySetInnerHTML={{ __html: partDescriptions[`part${currentPart}_description`] }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Split>
            ) : (
              <div className={`w-full h-full overflow-y-auto ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'}`}>
                <div className={`p-4 ${textSizeClasses[textSize]}`}>
                  {getCurrentSection()?.questions.map((question, index) =>
                    renderQuestionComponent(question, index)
                  )}
                </div>
              </div>
            )}

            {/* Sticky toggle button for transcript panel */}
            <button
              onClick={() => setShowDescriptionPanel(!showDescriptionPanel)}
              className={`fixed top-20 right-4 z-50 p-3 rounded-full shadow-lg ${colorTheme === 'black-on-white' ? 'bg-white hover:bg-gray-50 border border-gray-200' : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'} transition-all duration-300 transform hover:scale-105`}
              title={showDescriptionPanel ? 'Hide transcript' : 'Show transcript'}
            >
              {showDescriptionPanel ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'}`}>
            <div className={textSizeClasses[textSize]}>
              {getCurrentSection()?.questions.map((question, index) =>
                renderQuestionComponent(question, index)
              )}
            </div>
          </div>
        )}

        <footer className={`${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-black'} border-t border-gray-200 p-4 w-full`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col mr-4">
                <span className="text-red-600 font-bold text-sm">Developed by</span>
                <span className="text-red-600 font-bold text-lg leading-none">IELTS TA JUN</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-6">
                {!isForecastSession && [1, 2, 3, 4].map((part) => (
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
                              <div
                                key={questionNum}
                                role="button"
                                tabIndex={0}
                                className={`w-6 h-6 text-sm flex items-center justify-center border relative
                                  ${currentQuestion === questionNum
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : isRetakeIncorrectMode
                                      ? (incorrectQuestions.includes(questionNum)
                                        ? (isCompleted
                                          ? 'bg-sky-100 border-sky-400 text-sky-700'    // answered wrong → light blue
                                          : 'bg-red-100 border-red-400 text-red-700')   // blank → red
                                        : 'bg-green-100 border-green-500 text-green-700') // correct → green
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
                                  transition-colors cursor-pointer`}
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
                                {isRetakeIncorrectMode && incorrectQuestions.includes(questionNum) && (
                                  <div className="absolute -top-1 -right-1 z-10 bg-white rounded-full p-[1px]" title="Incorrect Answer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
                                    </svg>
                                  </div>
                                )}
                              </div>
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
                {isForecastSession && (
                  <div className="relative">
                    <button
                      className={`px-4 py-2 rounded-lg transition-colors ${colorTheme === 'black-on-white' ? 'bg-white-100 text-black-600' : 'bg-gray-800 text-white'}`}
                    >
                      <div className="flex gap-1">
                        {[...Array(10)].map((_, idx) => {
                          const questionNum = getQuestionRange(currentPart).start + idx;
                          const isCompleted = isQuestionCompleted(questionNum);

                          return (
                            <div
                              key={questionNum}
                              role="button"
                              tabIndex={0}
                              className={`w-6 h-6 text-sm flex items-center justify-center border relative
                                ${currentQuestion === questionNum
                                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                                  : isRetakeIncorrectMode
                                    ? (incorrectQuestions.includes(questionNum)
                                      ? (isCompleted
                                        ? 'bg-sky-100 border-sky-400 text-sky-700'
                                        : 'bg-red-100 border-red-400 text-red-700')
                                      : 'bg-green-100 border-green-500 text-green-700')
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
                                transition-colors cursor-pointer`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentQuestion(questionNum);
                                const navigationEvent = new CustomEvent('navigateToQuestion', {
                                  detail: { questionNumber: questionNum }
                                });
                                window.dispatchEvent(navigationEvent);
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
                              {isRetakeIncorrectMode && incorrectQuestions.includes(questionNum) && (
                                <div className="absolute -top-1 -right-1 z-10 bg-white rounded-full p-[1px]" title="Incorrect Answer">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <div className="ml-6 flex gap-2">
                {!location.state?.fromResultReview && (
                  <button
                    onClick={handleSubmitExam}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors
                      ${isRetakeIncorrectMode
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                        : colorTheme === 'black-on-white'
                          ? 'bg-lime-500 text-white hover:bg-lime-600'
                          : colorTheme === 'white-on-black'
                            ? 'bg-gray-900 text-yellow-300 hover:bg-yellow-700'
                            : 'bg-yellow-400 text-black hover:bg-yellow-500'
                      }`}
                  >
                    {isRetakeIncorrectMode ? 'Nộp bài làm lại' : 'Submit'}
                  </button>
                )}
                {location.state?.fromResultReview && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setShowRetakeConfirm(true)}
                        className="px-6 py-2 rounded-lg font-medium transition-colors bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                      >
                        Làm lại câu sai
                      </button>
                      <button
                        onClick={() => setShowClearDataDialog(true)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors
                          ${colorTheme === 'black-on-white'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : colorTheme === 'white-on-black'
                              ? 'bg-red-700 text-white hover:bg-red-800'
                              : 'bg-red-500 text-white hover:bg-red-600'
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
          {!location.state?.fromResultReview && (
            <TranscriptModal
              isOpen={showDescription}
              onClose={() => setShowDescription(false)}
              title={testDescription?.title}
              description={testDescription?.description}
              partDescriptions={partDescriptions}
              currentPart={currentPart}
            />
          )}
        </footer>

        {/* Overlay rendered on top if not started */}
        {!isAudioStarted && !location.state?.fromResultReview && !isRetakeIncorrectMode && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[10000]">
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
                disabled={isStartLoading}
                className={`bg-lime-500 text-white px-8 py-3 rounded-lg transition-colors font-medium ${isStartLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-lime-600'}`}
              >
                {isStartLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading
                  </span>
                ) : (
                  'Play'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exit Alert Dialog */}
      <AlertForm
        open={showExitAlert}
        onClose={handleCancelExit}
        onConfirm={handleConfirmExit}
        title="Cảnh báo hành động thoát bài thi"
        message="Nếu bạn thoát bài thi trong quá trình làm bài, bài thi sẽ được nộp tự động."
      />
      {/* Clear Data Confirmation Dialog */}
      <AlertForm
        open={showClearDataDialog}
        onClose={() => setShowClearDataDialog(false)}
        onConfirm={clearExamData}
        title="Dừng xem lại"
        message="Lưu ý: Sau khi dừng xem lại, bài thi sẽ được lưu trữ xem lại ở lịch sử bài thi."
      />
      {/* Retake Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRetakeDialog}
        message="Bạn có chắc chắn muốn làm lại bài thi này? Bài thi sẽ được lưu trữ xem lại ở lịch sử bài thi."
        onConfirm={handleRetakeConfirm}
        onCancel={() => setShowRetakeDialog(false)}
      />

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

      {/* Explanation Modal */}
      {showExplanationModal && (
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
                onClick={() => setShowExplanationModal(false)}
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
                dangerouslySetInnerHTML={{ __html: currentExplanation }}
              />
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end ${colorTheme === 'black-on-white' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900/50'}`}>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainLayout;
