import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import ReactDOMServer from 'react-dom/server';
import {
  saveAnswer,
  saveHighlight,
  extractMultipleChoiceQuestions,
  extractCheckboxQuestions,
  extractTableRadioQuestions,
  extractDragDropQuestions,
  extractFillInBlanks,
  getThemeStyles
} from './utils/examUtils';

const ReadingTest = ({
  question,
  onAnswerChange,
  index,
  questionNumber,
  examData,
  currentPart,
  questionType,
  textSize,
  colorTheme,
  hardQuestions,
  isTranslatorEnabled,
  onTranslate,
  answerData,
  isRetakeIncorrectMode,
  incorrectQuestions
}) => {
  // Initialize location hook
  const location = useLocation();
  const isReviewMode = location?.state?.fromResultReview;

  // Retake mode helpers
  const incorrectSet = isRetakeIncorrectMode ? new Set(incorrectQuestions || []) : null;
  const isQuestionCorrectRetake = (qNum) => {
    if (!isRetakeIncorrectMode || !incorrectSet) return false;
    const num = typeof qNum === 'string' ? parseInt(qNum) : qNum;
    return !incorrectSet.has(num);
  };

  const [mainText, setMainText] = useState('');
  const [inputs, setInputs] = useState({});
  const [questionMap, setQuestionMap] = useState({});
  const [multipleChoiceQuestions, setMultipleChoiceQuestions] = useState([]);
  const [checkboxQuestions, setCheckboxQuestions] = useState([]);
  const [tableRadioSections, setTableRadioSections] = useState([]);
  const [dragDropSections, setDragDropSections] = useState([]);
  const [filledInBlanks, setFilledInBlanks] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [dragCursor, setDragCursor] = useState(null);

  // New state variables for highlighting
  const [highlightMenu, setHighlightMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selection: null,
    range: null,
    clearMode: false,
    clickedHighlightId: null
  });
  const [highlights, setHighlights] = useState([]);
  const contentAreaRef = useRef(null);
  const menuRef = useRef(null);

  // Get theme styles
  const { themeClass, inputStyles } = getThemeStyles(colorTheme);

  // State for explanation dialog
  const [explanationDialog, setExplanationDialog] = useState({
    visible: false,
    questionId: null,
    explanation: ''
  });

  // Function to get answer validation status in review mode
  const getAnswerValidation = (questionText) => {
    if (!isReviewMode || !answerData) return null;


    // Ensure questionText is a string before processing
    const questionTextStr = typeof questionText === 'string' ? questionText : String(questionText || '');

    // The answerData structure shows detailed_answers array
    const detailedAnswers = answerData.detailed_answers || answerData;

    // First, try to find by question_number if questionText is a number
    let answerInfo = null;
    const questionNum = parseInt(questionTextStr);
    if (!isNaN(questionNum)) {
      answerInfo = detailedAnswers.find(answer =>
        answer.question_number === questionNum
      );
    }

    // If not found by question_number, try by question_text (exact match)
    if (!answerInfo) {
      answerInfo = detailedAnswers.find(answer =>
        answer.question_text && answer.question_text.trim() === questionTextStr.trim()
      );
    }

    // If not found by exact question_text, try to find by extracting question number from question_text
    if (!answerInfo && !isNaN(questionNum)) {
      answerInfo = detailedAnswers.find(answer => {
        if (!answer.question_text) return false;

        // Extract question number from question_text using regex to match numbers in bold format
        // Look for patterns like "<strong>12</strong>" or just "12" at the beginning
        const questionTextMatch = answer.question_text.match(/<strong>(\d+)<\/strong>/);
        if (questionTextMatch) {
          const extractedNum = parseInt(questionTextMatch[1]);
          return extractedNum === questionNum;
        }

        // Fallback: exact number match at word boundaries to avoid partial matches
        const numberRegex = new RegExp(`\\b${questionNum}\\b`);
        return numberRegex.test(answer.question_text);
      });
    }

    if (!answerInfo) {
      return null;
    }

    return {
      isCorrect: answerInfo.evaluation === 'correct',
      studentAnswer: answerInfo.student_answer,
      correctAnswer: answerInfo.correct_answer,
      evaluation: answerInfo.evaluation,
      explanation: answerInfo.explanation,
      locate: answerInfo.locate,
      questionId: answerInfo.question_id
    };
  };

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
    if (!isReviewMode || !answerData) return;
    const detailedAnswers = answerData.detailed_answers || answerData;
    const questionData = detailedAnswers?.find(answer => answer.question_id === questionId);
    const locateText = questionData?.locate;

    if (locateText) {
      // Find and highlight the locate text in the passage
      const passageSelectors = [
        '.passage-content',
        '.reading-passage',
        '[class*="passage"]',
        '.content',
        '#passage',
        '.exam-content .content',
        '.passage'
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

    let found = false;

    // Try exact match first
    for (const textNode of textNodes) {
      const text = textNode.textContent;
      const lowerText = text.toLowerCase();
      const lowerSearchText = searchText.toLowerCase();

      if (lowerText.includes(lowerSearchText)) {
        const index = lowerText.indexOf(lowerSearchText);
        const beforeText = text.substring(0, index);
        const matchText = text.substring(index, index + searchText.length);
        const afterText = text.substring(index + searchText.length);

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

        textNode.parentNode.replaceChild(fragment, textNode);

        // Scroll to the highlighted text
        setTimeout(() => {
          highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        found = true;
        break;
      }
    }

    // If exact match not found, try partial matching with key words
    if (!found) {
      const keywords = searchText.split(' ').filter(word => word.length > 3);
      if (keywords.length > 0) {
        for (const textNode of textNodes) {
          const text = textNode.textContent.toLowerCase();
          const matchedKeywords = keywords.filter(keyword =>
            text.includes(keyword.toLowerCase())
          );

          if (matchedKeywords.length >= Math.min(2, keywords.length)) {
            // Highlight the entire text node if it contains multiple keywords
            const highlight = document.createElement('span');
            highlight.className = 'locate-highlight';
            highlight.style.backgroundColor = '#ffeb3b';
            highlight.style.padding = '2px 4px';
            highlight.style.borderRadius = '3px';
            highlight.style.fontWeight = 'bold';
            highlight.style.boxShadow = '0 0 0 2px #ffc107';
            highlight.textContent = textNode.textContent;

            textNode.parentNode.replaceChild(highlight, textNode);

            // Scroll to the highlighted text
            setTimeout(() => {
              highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

            found = true;
            break;
          }
        }
      }
    }

    return found;
  };
  // Add these state variables
  const [noteDialog, setNoteDialog] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    selection: null
  });

  const [notes, setNotes] = useState([]);

  const handleAddNote = () => {
    // Don't allow adding notes in review mode
    if (location?.state?.fromResultReview) {
      return;
    }

    if (highlightMenu.selection) {
      // Store the selection properly
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);

      setNoteDialog({
        visible: true,
        x: highlightMenu.x,
        y: highlightMenu.y + 40,
        text: '',
        selection: selection,
        range: range.cloneRange() // Store a clone of the range
      });
      setHighlightMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleTranslate = () => {
    if (highlightMenu.selection && onTranslate) {
      // Trigger the translator dialog with the selected text
      const selectedText = highlightMenu.selection.toString();
      onTranslate(selectedText, {
        x: highlightMenu.x,
        y: highlightMenu.y
      });
      setHighlightMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleSaveNote = () => {
    // Don't allow saving notes in review mode
    if (location?.state?.fromResultReview) {
      return;
    }

    if (noteDialog.text.trim()) {
      if (noteDialog.selection && noteDialog.range) {
        try {
          // Extract text content from the range
          const range = noteDialog.range;
          const selectedText = range.toString();
          const span = document.createElement('span');
          span.className = 'highlighted-text with-note';
          span.style.backgroundColor = '#d1fae5';
          span.style.borderBottom = '2px solid #10b981';
          span.style.position = 'relative';
          span.style.cursor = 'pointer';

          // Create note indicator
          const noteIndicator = document.createElement('span');
          noteIndicator.className = 'note-indicator';
          noteIndicator.style.position = 'absolute';
          noteIndicator.style.top = '-8px';
          noteIndicator.style.right = '-8px';
          noteIndicator.style.backgroundColor = '#FCD34D';
          noteIndicator.style.borderRadius = '50%';
          noteIndicator.style.width = '16px';
          noteIndicator.style.height = '16px';
          noteIndicator.style.display = 'flex';
          noteIndicator.style.alignItems = 'center';
          noteIndicator.style.justifyContent = 'center';
          noteIndicator.style.fontSize = '12px';
          noteIndicator.innerHTML = '📝';

          span.appendChild(noteIndicator);

          // Store note data
          const noteId = Date.now().toString();
          span.dataset.noteId = noteId;
          span.setAttribute('data-note', 'true');
          span.setAttribute('data-part', currentPart.toString());
          span.setAttribute('data-timestamp', noteId);

          // Create a new range with only text nodes
          const textContent = range.cloneContents();
          span.appendChild(textContent);
          range.deleteContents();
          range.insertNode(span);

          // Save note to localStorage
          const noteData = {
            id: noteId,
            text: noteDialog.text,
            selectedText: selectedText,
            part: currentPart,
            examId: examData?.exam_id,
            timestamp: parseInt(noteId)
          };

          const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
          savedNotes.push(noteData);
          localStorage.setItem('ielts-notes', JSON.stringify(savedNotes));

          // Save note to component state
          setNotes(prev => {
            // Ensure prev is an array before spreading
            if (Array.isArray(prev)) {
              return [...prev, noteData];
            } else {
              console.error('Previous notes state is not an array:', prev);
              return [noteData]; // Start a new array with just this note
            }
          });

          // Add click handler to show note. Read the latest text from
          // localStorage (not the closure) so re-edits show immediately
          // instead of requiring a delete + re-add.
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const latest = JSON.parse(localStorage.getItem('ielts-notes') || '[]')
              .find(n => n.id === noteId);
            setNoteDialog({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              text: latest ? latest.text : noteData.text,
              selection: null,
              noteId: noteId,
              range: null
            });
          });
        } catch (error) {
          console.error('Error while creating note:', error);
        }
      } else if (noteDialog.noteId) {
        // Editing an existing note
        const updatedNotes = notes.map(note =>
          note.id === noteDialog.noteId
            ? { ...note, text: noteDialog.text }
            : note
        );
        setNotes(updatedNotes);

        // Update localStorage
        const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
        const updatedSavedNotes = savedNotes.map(note =>
          note.id === noteDialog.noteId
            ? { ...note, text: noteDialog.text }
            : note
        );
        localStorage.setItem('ielts-notes', JSON.stringify(updatedSavedNotes));
      }
    }

    setNoteDialog(prev => ({ ...prev, visible: false }));
  };

  // Add this function to handle removing highlights and notes
  const handleRemoveHighlight = (noteId) => {
    // Don't allow removing highlights/notes in review mode
    if (location?.state?.fromResultReview) {
      return;
    }

    const span = document.querySelector(`[data-note-id="${noteId}"]`);
    if (span) {
      const parent = span.parentNode;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);

      // Remove note from state
      setNotes(prev => {
        // Ensure prev is an array before filtering
        if (Array.isArray(prev)) {
          return prev.filter(note => note.id !== noteId);
        } else {
          console.error('Previous notes state is not an array:', prev);
          return []; // Return empty array if prev is not an array
        }
      });

      // Remove from localStorage
      const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
      const updatedNotes = savedNotes.filter(note => note.id !== noteId);
      localStorage.setItem('ielts-notes', JSON.stringify(updatedNotes));
    }
  };
  // Define the text size class
  const textSizeClass = textSize === 'small' ? 'text-sm' :
    textSize === 'large' ? 'text-xl' :
      textSize === 'extra-large' ? 'text-2xl' : 'text-base';


  // Initialize state with saved answers if available
  useEffect(() => {
    if (question.question_type === 'main_text') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = DOMPurify.sanitize(question.question_text);


      setMainText(tempDiv.innerHTML);

      // Get all questions from the current section
      const currentSection = examData?.sections[currentPart - 1];
      const allQuestions = currentSection?.questions.filter(
        q => q.question_type === 'fill_in_blank' || q.question_type === 'multiple_choice' ||
          q.question_type === 'table_radio' || q.question_type === 'drag_drop'
      );

      // Create mapping of numbers to question IDs
      const qMap = {};

      // First, create a direct mapping from question number to question ID
      if (allQuestions && allQuestions.length > 0) {
        // Sort questions by their ID to ensure proper order
        const sortedQuestions = [...allQuestions].sort((a, b) => a.question_id - b.question_id);

        // Calculate base question number based on part
        let baseQuestionNum;
        switch (currentPart) {
          case 1: baseQuestionNum = 1; break;
          case 2: baseQuestionNum = 14; break;
          case 3: baseQuestionNum = 27; break;
          default: baseQuestionNum = 1;
        }

        // Map each question to its corresponding number
        sortedQuestions.forEach((q, index) => {
          // Use the actual question number based on part range instead of calculating with index
          const questionNum = baseQuestionNum + index;
          // Map the question number to itself for consistent mapping
          qMap[questionNum.toString()] = questionNum;
        });

        console.log('Initial question mapping created:', qMap);
      }

      // Then, try to extract numbers from individual questions as a fallback
      allQuestions?.forEach(q => {
        const numberMatch = q.question_text.match(/(\d+)/);
        if (numberMatch) {
          const questionNumber = numberMatch[1];
          if (!qMap[questionNumber]) {
            // Map the question number to itself for consistent mapping
            qMap[questionNumber] = parseInt(questionNumber, 10);
            console.log(`Added question mapping from text: ${questionNumber} -> ${questionNumber}`);
          }
        }
      });

      // Special handling for each part to ensure all question numbers are mapped
      if (currentPart === 1) {
        for (let i = 1; i <= 13; i++) {
          if (!qMap[i.toString()]) {
            // Use the actual question number as the ID instead of calculating an offset
            qMap[i.toString()] = i;
            console.log(`Added special mapping for Part 1: ${i} -> ${i}`);
          }
        }
      } else if (currentPart === 2) {
        for (let i = 14; i <= 26; i++) {
          if (!qMap[i.toString()]) {
            // Use the actual question number as the ID instead of calculating an offset
            qMap[i.toString()] = i;
            console.log(`Added special mapping for Part 2: ${i} -> ${i}`);
          }
        }
      } else if (currentPart === 3) {
        for (let i = 27; i <= 40; i++) {
          if (!qMap[i.toString()]) {
            // Use the actual question number as the ID instead of calculating an offset
            qMap[i.toString()] = i;
            console.log(`Added special mapping for Part 3: ${i} -> ${i}`);
          }
        }
      }

      // Store the question map in window object for table radio access
      window.questionMap = qMap;
      setQuestionMap(qMap);

      // Load saved answers from localStorage
      const savedAnswers = JSON.parse(localStorage.getItem('ielts-answers') || '{}');
      const examAnswers = savedAnswers[examData?.exam_id] || {};

      // Convert question IDs back to question numbers for our inputs state
      const savedInputs = {};
      Object.entries(qMap).forEach(([questionNum, questionId]) => {
        // With our new mapping, questionId is the same as questionNum
        // But we still need to check both for backward compatibility
        if (examAnswers[questionId]) {
          savedInputs[questionNum] = examAnswers[questionId];
        } else if (examAnswers[questionNum]) {
          // Also check if answer exists with questionNum as key
          savedInputs[questionNum] = examAnswers[questionNum];
        }
      });

      // Also load checkbox answers
      // IMPORTANT: Extract checkbox sections first so we have fresh data to work with
      const extractedCheckboxSections = extractCheckboxQuestions(tempDiv.innerHTML);

      Object.keys(examAnswers).forEach(questionId => {
        const answer = examAnswers[questionId];
        if (answer && answer.length === 1 && answer >= 'A' && answer <= 'Z') {
          // With our new mapping, questionId is the same as questionNum
          // First try to find by direct mapping
          let questionNum = questionId;

          // If not found, fall back to the old mapping lookup
          if (!Object.values(qMap).includes(parseInt(questionId, 10))) {
            questionNum = Object.entries(qMap).find(([num, id]) => id.toString() === questionId.toString())?.[0];
          }

          if (questionNum) {
            // Use the freshly extracted checkbox sections instead of potentially stale state
            const section = extractedCheckboxSections.find(s =>
              parseInt(questionNum) >= s.startNum && parseInt(questionNum) <= s.endNum
            );
            if (section) {
              savedInputs[`checkbox_${section.startNum}_${answer}`] = true;
            }
          }
        }
      });

      // Update inputs state with saved answers
      if (Object.keys(savedInputs).length > 0) {
        setInputs(savedInputs);
      }

      // Extract all question types (use already extracted checkbox sections)
      setMultipleChoiceQuestions(extractMultipleChoiceQuestions(tempDiv.innerHTML));
      setCheckboxQuestions(extractedCheckboxSections);
      setTableRadioSections(extractTableRadioQuestions(tempDiv.innerHTML));
      setDragDropSections(extractDragDropQuestions(tempDiv.innerHTML));
      setFilledInBlanks(extractFillInBlanks(tempDiv.innerHTML));
    }
  }, [question, examData, currentPart, textSize, colorTheme]);

  // useEffect to populate inputs with review mode data
  useEffect(() => {
    if (isReviewMode && answerData && answerData.detailed_answers) {
      const reviewInputs = {};

      answerData.detailed_answers.forEach(answer => {
        if (answer.student_answer) {
          const qNum = answer.question_number;

          // Check if this is a checkbox answer (single letter A-Z)
          const studentAns = answer.student_answer.trim().toUpperCase();
          if (studentAns.length === 1 && studentAns >= 'A' && studentAns <= 'Z') {
            // Find if this question belongs to a checkbox section
            const section = checkboxQuestions.find(s =>
              qNum >= s.startNum && qNum <= s.endNum
            );
            if (section) {
              // Use checkbox key format: checkbox_sectionStart_letter
              reviewInputs[`checkbox_${section.startNum}_${studentAns}`] = true;
            } else {
              // Not a checkbox question, store normally
              if (qNum) {
                reviewInputs[qNum] = answer.student_answer;
              }
            }
          } else {
            // Not a single letter answer, store with question number
            if (qNum) {
              reviewInputs[qNum] = answer.student_answer;
            }
            // Fallback: For fill-in-blank questions, extract question number from question_text
            else {
              const questionTextMatch = answer.question_text?.match(/<strong>(\d+)<\/strong>/);
              if (questionTextMatch) {
                const questionNum = parseInt(questionTextMatch[1]);
                reviewInputs[questionNum] = answer.student_answer;
              }
            }
          }
        }
      });

      console.log('Setting review mode inputs:', reviewInputs);
      setInputs(prev => ({ ...prev, ...reviewInputs }));
    }
  }, [isReviewMode, answerData, checkboxQuestions]);

  // Effect to apply retake mode styling
  useEffect(() => {
    if (isRetakeIncorrectMode && incorrectQuestions) {
      // FORCE REMOVE any lingering flags from previous renders/hot-reloads
      document.querySelectorAll('.retake-flag').forEach(el => el.remove());

      // Find all inputs and interactive elements
      const interactiveElements = document.querySelectorAll('input[type="text"], input[type="radio"], .ielts-drop-zone, .ielts-heading-option');

      interactiveElements.forEach(element => {
        let questionNum;

        // Try to determine question number from various attributes
        if (element.dataset.questionNumber) {
          questionNum = parseInt(element.dataset.questionNumber);
        } else if (element.id && element.id.startsWith('input-question-')) {
          questionNum = parseInt(element.id.replace('input-question-', ''));
        } else if (element.name && element.name.startsWith('table_question_')) {
          questionNum = parseInt(element.name.replace('table_question_', ''));
        } else if (element.placeholder && !isNaN(parseInt(element.placeholder))) {
          questionNum = parseInt(element.placeholder);
        }

        if (questionNum) {
          const isIncorrect = incorrectQuestions.includes(questionNum);

          if (isIncorrect) {
            // Apply incorrect styling - just ensure it's interactive
            element.disabled = false;
            element.readOnly = false;
            element.style.pointerEvents = 'auto';
            element.style.opacity = '1';
            element.style.cursor = 'text';
            element.style.backgroundColor = 'white';

            // Reset styles that might have been set
            element.style.borderColor = '';
            element.style.borderWidth = '';
            element.style.boxShadow = '';
            element.classList.remove('animate-pulse');
            element.style.backgroundColor = 'white';

          } else {
            // Apply correct locked styling
            element.style.backgroundColor = '#ecfdf5'; // green-50
            element.style.borderColor = '#10b981'; // green-500
            element.style.borderWidth = '1px';
            element.style.color = '#065f46'; // green-800

            // Disable interaction
            element.disabled = true;
            if (element.tagName === 'INPUT') {
              element.readOnly = true;
            }
            element.style.pointerEvents = 'none';

            // For radio buttons, we might want to keep opacity
            if (element.type !== 'radio') {
              // element.style.opacity = '0.7'; // Optional
            }
          }
        }
      });

      // Handle heading-drop-area elements for heading match questions
      const headingDropAreas = document.querySelectorAll('.heading-drop-area[data-question-number]');
      headingDropAreas.forEach(dropArea => {
        const questionNum = parseInt(dropArea.getAttribute('data-question-number'));
        if (questionNum) {
          const isIncorrect = incorrectQuestions.includes(questionNum);
          if (!isIncorrect) {
            // This is a correct heading question — lock it
            dropArea.style.backgroundColor = '#ecfdf5'; // green-50
            dropArea.style.borderColor = '#10b981'; // green-500
            dropArea.style.pointerEvents = 'none';
            dropArea.style.cursor = 'not-allowed';
            dropArea.style.opacity = '0.8';
            // Add a lock indicator
            if (!dropArea.querySelector('.retake-lock-icon')) {
              const lockSpan = document.createElement('span');
              lockSpan.className = 'retake-lock-icon';
              lockSpan.style.cssText = 'margin-left: 8px; color: #059669; font-size: 14px;';
              lockSpan.textContent = '🔒';
              dropArea.appendChild(lockSpan);
            }
          } else {
            // Ensure incorrect heading drop areas are interactive
            dropArea.style.pointerEvents = 'auto';
            dropArea.style.cursor = 'default';
            dropArea.style.opacity = '1';
            // Remove any lock icons
            const lockIcon = dropArea.querySelector('.retake-lock-icon');
            if (lockIcon) lockIcon.remove();
          }
        }
      });

      // Also disable dragging on heading options that belong to correct answers
      const headingOptions = document.querySelectorAll('.ielts-heading-match .ielts-heading-option');
      headingOptions.forEach(option => {
        const headingId = option.getAttribute('data-heading-id');
        // Check if this heading option is already dropped for a correct question
        const usedInCorrectDrop = Array.from(headingDropAreas).some(dropArea => {
          const qNum = parseInt(dropArea.getAttribute('data-question-number'));
          if (!qNum || incorrectQuestions.includes(qNum)) return false;
          const droppedHeading = dropArea.querySelector('.dropped-heading');
          return droppedHeading && droppedHeading.getAttribute('data-heading-id') === headingId;
        });
        if (usedInCorrectDrop) {
          option.setAttribute('draggable', 'false');
          option.style.pointerEvents = 'none';
          option.style.opacity = '0.5';
          option.style.cursor = 'not-allowed';
        }
      });
    }
  }, [isRetakeIncorrectMode, incorrectQuestions, mainText, currentPart, inputs]);

  // Define window.handleInput for inline text inputs
  useEffect(() => {

    // Define window.handleRadioInput for inline radio buttons
    window.handleRadioInput = (number, value) => {
      handleRadioInput(number, value);
    };
    window.handleFillInBlankInput = (number, value) => {
      handleFillInBlankInput(number, value);
    };
    window.handleTableRadioInput = (number, value) => {
      handleTableRadioInput(number, value);
    };
    // Add handler for drag and drop
    window.handleDragDrop = (number, value) => {
      handleDragDropInput(number, value);
    };

    // Check if this is a new exam session
    const currentExamSession = localStorage.getItem('current-exam-session');
    if (currentExamSession !== examData?.exam_id.toString()) {
      // This is a new exam or browser reload, clear previous data
      localStorage.setItem('ielts-highlights', '[]');
      localStorage.setItem('ielts-answers', '{}');
      localStorage.setItem('current-exam-session', examData?.exam_id.toString());
    }
  }, [questionMap, examData?.exam_id, onAnswerChange]);

  // Define handleRadioInput as a component function
  const handleRadioInput = (number, value) => {
    // Block edits for correct answers in retake mode
    if (isRetakeIncorrectMode && isQuestionCorrectRetake(number)) return;
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
    } else {
      console.warn(`No question ID found for question number ${number} in questionMap:`, questionMap);
    }
  };

  const handleFillInBlankInput = (number, value) => {
    // Block edits for correct answers in retake mode
    if (isRetakeIncorrectMode && isQuestionCorrectRetake(number)) return;
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
    } else {
      console.warn(`No question ID found for question number ${number} in questionMap:`, questionMap);
    }
  };
  const handleTableRadioInput = (number, value) => {
    // Block edits for correct answers in retake mode
    if (isRetakeIncorrectMode && isQuestionCorrectRetake(number)) return;
    console.log(`handleTableRadioInput called with number: ${number}, value: ${value}`);
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    console.log(`Table radio: Question number ${number} maps to question ID ${questionId}`);
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
      console.log(`Saved table radio answer for question ID ${questionId}: ${value}`);

      // Update the DOM to reflect the selection
      const radios = document.querySelectorAll(`input[name="table_question_${number}"]`);
      radios.forEach(radio => {
        radio.checked = radio.value === value;
      });
    } else {
      console.warn(`No question ID found for question number ${number} in questionMap:`, questionMap);
    }
  };
  const handleDragDropInput = (number, value) => {
    console.log(`handleDragDropInput called with number: ${number}, value: ${value}`);

    setInputs(prev => {
      // Check if this value is already used in another field
      const isValueUsedElsewhere = Object.entries(prev).some(
        ([key, val]) => val === value && key !== number
      );

      // If value is already used elsewhere and not being cleared, don't allow it
      if (isValueUsedElsewhere && value !== '') {
        console.log(`Value '${value}' is already used elsewhere, not allowing duplicate`);
        return prev;
      }

      // Update the state with the new value
      const newInputs = { ...prev, [number]: value };

      // Update the question ID and save the answer
      const questionId = questionMap[number];
      console.log(`Drag-drop: Question number ${number} maps to question ID ${questionId}`);

      if (questionId) {
        onAnswerChange(questionId, value);
        saveAnswer(examData?.exam_id, questionId, value);
        console.log(`Saved drag-drop answer for question ID ${questionId}: ${value}`);
      } else {
        console.warn(`No question ID found for question number ${number} in questionMap:`, questionMap);
      }

      return newInputs;
    });

    // Find and properly handle the drop zone elements
    const dropZones = document.querySelectorAll('.ielts-drop-zone');
    dropZones.forEach(zone => {
      const parentElement = zone.parentElement;
      if (!parentElement) return;

      // Find the closest strong tag (question number)
      const strongTag = parentElement.querySelector('strong');
      if (!strongTag) return;

      const questionNum = parseInt(strongTag.textContent.trim());
      if (isNaN(questionNum)) return;

      // If this drop zone belongs to the current question number
      if (questionNum.toString() === number) {
        // Remove any existing answer spans that might have been created previously
        const existingAnswers = parentElement.querySelectorAll('.answer-span');
        existingAnswers.forEach(el => el.remove());

        if (value) {
          // Create a replacement element for the answer
          const answerSpan = document.createElement('span');
          answerSpan.className = 'px-2 py-1 bg-lime-100 border border-lime-200 rounded text-lime-800 inline-block answer-span';
          answerSpan.textContent = value;

          // Hide the drop zone instead of replacing it
          zone.style.display = 'none';

          // Insert the answer span after the drop zone
          parentElement.insertBefore(answerSpan, zone.nextSibling);
        } else {
          // If clearing the answer, just make the drop zone visible again
          zone.style.display = 'inline-block';

          // Remove any existing answer spans
          const existingAnswers = parentElement.querySelectorAll('.answer-span');
          existingAnswers.forEach(el => el.remove());
        }
      }
    });
  };

  // Update handleDragStart to include source info
  const handleDragStart = (e, item, sourceQuestionNum = null) => {
    setDraggedItem({ label: item, sourceQuestionNum });
    e.dataTransfer.setData('text/plain', item);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Update handleDrop to support swapping and prevent heading drops
  const handleDrop = (e, questionNumber) => {
    e.preventDefault();
    setDragOverZone(null);

    // Check if this is a heading drop (has heading-id in dataTransfer)
    const headingId = e.dataTransfer.getData('heading-id');

    // If it's a heading item, prevent the drop
    if (headingId) {
      console.log('Prevented heading item from being dropped in regular drop zone');
      return;
    }

    if (draggedItem) {
      let srcNum = draggedItem.sourceQuestionNum;
      setInputs(prev => {
        const newInputs = { ...prev };
        if (srcNum) {
          const destTag = newInputs[questionNumber];
          if (destTag) {
            // Swap
            newInputs[questionNumber] = draggedItem.label;
            newInputs[srcNum] = destTag;
          } else {
            // Move
            newInputs[questionNumber] = draggedItem.label;
            newInputs[srcNum] = '';
          }
        } else {
          // Dragging from options area
          newInputs[questionNumber] = draggedItem.label;
        }
        return newInputs;
      });
      // Save answers after state update
      setTimeout(() => {
        if (srcNum) {
          const destTag = inputs[questionNumber];
          const srcQid = questionMap[srcNum];
          const destQid = questionMap[questionNumber];
          if (destQid) {
            onAnswerChange(destQid, draggedItem.label);
            saveAnswer(examData?.exam_id, destQid, draggedItem.label);
          }
          if (srcQid) {
            // If swapping, save the swapped value, else clear
            if (inputs[questionNumber]) {
              onAnswerChange(srcQid, inputs[questionNumber]);
              saveAnswer(examData?.exam_id, srcQid, inputs[questionNumber]);
            } else {
              onAnswerChange(srcQid, '');
              saveAnswer(examData?.exam_id, srcQid, '');
            }
          }
        } else {
          const destQid = questionMap[questionNumber];
          if (destQid) {
            onAnswerChange(destQid, draggedItem.label);
            saveAnswer(examData?.exam_id, destQid, draggedItem.label);
          }
        }
      }, 0);
      setDraggedItem(null);
    }
  };

  // Add drop handler to options area for un-dropping
  const handleOptionDrop = (e) => {
    e.preventDefault();
    setDragOverZone(null);

    // Check if this is a heading drop (has heading-id in dataTransfer)
    const headingId = e.dataTransfer.getData('heading-id');

    // If it's a heading item, prevent the drop
    if (headingId) {
      console.log('Prevented heading item from being dropped in options area');
      return;
    }

    if (draggedItem && draggedItem.sourceQuestionNum) {
      const srcNum = draggedItem.sourceQuestionNum;
      setInputs(prev => {
        const newInputs = { ...prev };
        newInputs[srcNum] = '';
        return newInputs;
      });
      setTimeout(() => {
        const srcQid = questionMap[srcNum];
        if (srcQid) {
          onAnswerChange(srcQid, '');
          saveAnswer(examData?.exam_id, srcQid, '');
        }
      }, 0);
      setDraggedItem(null);
    }
  };

  // Update handleDragOver to set dragOverZone and dragCursor
  const handleDragOver = (e, questionNumber) => {
    e.preventDefault();

    // Check if this is a heading being dragged (check for heading-id in dataTransfer)
    try {
      // We can't directly access dataTransfer.getData during dragover
      // But we can check the draggedItem state which we set during dragstart
      // If it's not our draggedItem, it might be a heading from elsewhere
      if (!draggedItem) {
        // Don't show drag-over effect for items we don't recognize
        return;
      }
    } catch (err) {
      // If there's an error accessing dataTransfer, just continue
    }

    setDragOverZone(questionNumber);
    setDragCursor({ x: e.clientX, y: e.clientY });
  };

  // Update handleDragEnd to clear dragOverZone and dragCursor
  const handleDragEnd = () => {
    setDragOverZone(null);
    setDraggedItem(null);
    setDragCursor(null);
  };

  // Handle checkbox changes
  const handleCheckboxChange = (sectionStart, option, checked) => {
    const key = `checkbox_${sectionStart}_${option}`;

    // Find the section to get the selectCount
    const section = checkboxQuestions.find(s => s.startNum === sectionStart);
    if (!section) return;

    // Get currently selected options before updating state
    const selectedOptions = Object.entries(inputs)
      .filter(([k, v]) => k.startsWith(`checkbox_${sectionStart}_`) && v === true)
      .map(([k]) => k.split('_')[2]);

    // If trying to select more than allowed, prevent it
    if (checked && selectedOptions.length >= section.selectCount && !selectedOptions.includes(option)) {
      return; // Don't allow more selections than the limit
    }

    // Update the inputs state
    setInputs(prev => {
      const newInputs = { ...prev, [key]: checked };

      // Calculate updated options after state change
      const updatedOptions = Object.entries(newInputs)
        .filter(([k, v]) => k.startsWith(`checkbox_${sectionStart}_`) && v === true)
        .map(([k]) => k.split('_')[2]);

      // For checkbox questions, distribute the selected options
      if (updatedOptions.length > 0) {
        // Sort the options alphabetically to ensure consistent assignment
        const sortedOptions = [...updatedOptions].sort();

        // Assign each option to a question in the range
        const questionRange = Array.from(
          { length: section.endNum - section.startNum + 1 },
          (_, i) => section.startNum + i
        );

        // For each question in the range, assign the corresponding option
        questionRange.forEach((qNum, index) => {
          const questionId = questionMap[qNum.toString()];

          if (questionId) {
            // If we have enough options, assign one to each question
            // Otherwise, leave some questions blank
            let answerValue = '';
            if (index < sortedOptions.length) {
              answerValue = sortedOptions[index];
            }

            // Save to localStorage
            saveAnswer(examData?.exam_id, questionId, answerValue);

            setTimeout(() => {
              onAnswerChange(questionId, answerValue);
            }, 0);
          }
        });
      } else {
        // If no options are selected, clear all answers in the range
        for (let qNum = section.startNum; qNum <= section.endNum; qNum++) {
          const questionId = questionMap[qNum.toString()];

          if (questionId) {
            // Clear in localStorage
            saveAnswer(examData?.exam_id, questionId, '');

            setTimeout(() => {
              onAnswerChange(questionId, '');
            }, 0);
          }
        }
      }

      return newInputs;
    });
  };

  // Helper: Recursively render HTML as a table, replacing <input> with React input fields
  function renderHtmlAsTableWithInputs(html, inputs, handleFillInBlankInput) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    function walk(node, keyPrefix = '', context = {}) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return null;

      // If this is a <strong>number</strong>, update context and skip rendering
      if (node.tagName === 'STRONG' && node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
        const numText = node.childNodes[0].textContent.trim();
        if (/^\\d+$/.test(numText)) {
          context = { ...context, currentQNum: parseInt(numText) };
          return null;
        }
      }

      // If this is an input for a blank, replace with React input using context.currentQNum
      if (node.tagName === 'INPUT' && node.className.includes('ielts-textfield')) {
        let qNum = context.currentQNum;

        // Try to find a <strong> number in the same parent or previous siblings
        if (!qNum && node.parentNode) {
          // Check parent <td> for a <strong>
          const strongInParent = node.parentNode.querySelector('strong');
          if (strongInParent && /^\d+$/.test(strongInParent.textContent.trim())) {
            qNum = parseInt(strongInParent.textContent.trim());
          }
          // If not found, check previous siblings
          let sibling = node.previousSibling;
          while (sibling) {
            if (
              sibling.nodeType === 1 &&
              sibling.tagName === 'STRONG' &&
              sibling.childNodes.length === 1 &&
              /^\d+$/.test(sibling.childNodes[0].textContent.trim())
            ) {
              qNum = parseInt(sibling.childNodes[0].textContent.trim());
              break;
            }
            sibling = sibling.previousSibling;
          }
        }

        // Fallback: try to get from name or data-question-number attribute
        if (!qNum && node.getAttribute) {
          const attrNum = node.getAttribute('data-question-number') || node.getAttribute('name');
          if (attrNum && /^\d+$/.test(attrNum)) {
            qNum = parseInt(attrNum);
          }
        }

        const answer = inputs[qNum] || '';
        const validation = getAnswerValidation(qNum?.toString());

        // Determine border color based on validation in review mode
        let borderColorClass = inputStyles.borderColor;
        if (isReviewMode && validation) {
          borderColorClass = validation.isCorrect ? 'border-green-500' : 'border-red-500';
        }

        return (
          <span key={`input-wrap-${qNum}-${keyPrefix}`} className="inline-flex flex-col gap-1">
            {/* First row: input field and validation check/x icon */}
            <span className="inline-flex items-center gap-1">
              <input
                key={`input-${qNum}-${keyPrefix}`}
                type="text"
                autoComplete="off"
                id={`input-question-${qNum}`}
                data-question-number={qNum}
                className={`border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lime-500 ${inputStyles.bgColor} ${inputStyles.textColor} ${borderColorClass} ${colorTheme === 'black-on-white' ? 'placeholder-gray' : inputStyles.placeholderColor} transition-all duration-200 ${location?.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={answer}
                onChange={location?.state?.fromResultReview ? undefined : e => handleFillInBlankInput(qNum ? qNum.toString() : '', e.target.value)}
                placeholder={qNum ? `Question ${qNum}` : 'Question'}
                aria-label={qNum ? `Question ${qNum}` : 'Question'}
                style={{ minWidth: 60 }}
                disabled={location?.state?.fromResultReview}
              />
              {/* Validation indicator for review mode */}
              {isReviewMode && validation && (
                <span className="flex-shrink-0">
                  {validation.isCorrect ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              )}
              {hardQuestions && hardQuestions[qNum] && (
                <span className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </span>
            {/* Second row: correct answer and explanation/search icons */}
            {isReviewMode && validation && (!validation.isCorrect || validation.explanation) && (
              <span className="inline-flex items-center gap-1 flex-wrap">
                {/* Display correct answer when incorrect */}
                {!validation.isCorrect && (
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 whitespace-nowrap">
                    ✓ {validation.correctAnswer}
                  </span>
                )}
                {/* Display explanation and search icons */}
                {validation.explanation && (
                  <>
                    <span
                      className="cursor-pointer"
                      onClick={() => handleExplanationClick(validation.questionId, validation.explanation)}
                      title="View explanation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span
                      className="cursor-pointer"
                      onClick={() => handleSearchClick(validation.questionId)}
                      title="Search question in passage"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </>
                )}
              </span>
            )}
          </span>
        );
      }

      // Recursively process children, passing context
      const children = Array.from(node.childNodes).map((child, i) =>
        walk(child, keyPrefix + '-' + i, context)
      );

      // Convert inline style string to React style object
      let reactStyle = undefined;
      if (node.getAttribute && node.getAttribute('style')) {
        reactStyle = Object.fromEntries(
          node.getAttribute('style')
            .split(';')
            .filter(Boolean)
            .map(rule => {
              const [key, value] = rule.split(':');
              return [
                key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase()),
                value.trim()
              ];
            })
        );
      }

      // For table elements, add a border class for visibility
      const tableTags = ['TABLE', 'TR', 'TD', 'TH'];
      let className = node.className || '';
      if (tableTags.includes(node.tagName)) {
        className += ' border border-gray-400';
        if (node.tagName === 'TABLE') className += ' w-full table-fixed';
        if (node.tagName === 'TD' || node.tagName === 'TH') className += ' p-2 align-top overflow-visible';
      }

      return React.createElement(
        node.tagName.toLowerCase(),
        {
          key: keyPrefix,
          className: className || undefined,
          style: reactStyle,
        },
        ...children
      );
    }

    // Find the table node
    const tableNode = Array.from(tempDiv.childNodes).find(
      node => node.nodeType === 1 && node.tagName === 'TABLE'
    );
    if (!tableNode) return null;

    return walk(tableNode, 'table-root');
  }

  // Render the content with all question types
  const renderContent = () => {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(mainText);


    // Apply text size to all text-containing elements
    const allTextElements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, li, td, th, label');
    allTextElements.forEach(el => {
      el.classList.add(textSizeClass);
    });


    // Add IDs to questions for navigation
    const boldElements = tempDiv.querySelectorAll('strong');
    for (const boldEl of boldElements) {
      const num = boldEl.textContent.trim();

      // Check if this is a question number
      if (/^\d+$/.test(num)) {
        // Find the parent paragraph
        const questionP = boldEl.closest('p');
        if (questionP) {
          // Add an ID to the paragraph for scrolling
          questionP.id = `question-${num}`;
          // Add a data attribute to make it easier to find
          questionP.setAttribute('data-question-number', num);

        }
      }
    }

    // Add IDs to checkbox section headers
    const paragraphs = tempDiv.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const text = p.textContent.trim();

      // Check if this is a section header (Questions X-Y)
      const sectionMatch = text.match(/Questions\s+(\d+)\s*(?:–|-|&ndash;)\s*(\d+)/i);
      if (sectionMatch) {
        const startNum = parseInt(sectionMatch[1]);
        const endNum = parseInt(sectionMatch[2]);

        // Add ID to the section header for navigation
        p.id = `question-section-${startNum}-${endNum}`;
        p.setAttribute('data-question-range', `${startNum}-${endNum}`);
      }
    }

    // Find all question sections and their positions
    const allSections = [];

    // Find positions of multiple choice questions
    multipleChoiceQuestions.forEach(q => {
      // Find the position of this question in the DOM
      const elements = tempDiv.querySelectorAll('strong');
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].textContent.trim() === q.number) {
          const parentP = elements[i].closest('p');
          if (parentP) {
            allSections.push({
              type: 'multiple_choice',
              data: q,
              element: parentP,
              position: Array.from(tempDiv.children).indexOf(parentP)
            });
            break;
          }
        }
      }
    });


    // Find positions of checkbox sections
    checkboxQuestions.forEach(section => {
      // Find the position of this section in the DOM
      const allElements = Array.from(tempDiv.children);
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].tagName === 'P') {
          const text = allElements[i].textContent.trim();
          const match = text.match(new RegExp(`Questions\\s+${section.startNum}\\s*(?:–|-|&ndash;)\\s*${section.endNum}`, 'i'));
          if (match) {
            // Add this section to allSections
            allSections.push({
              type: 'checkbox',
              data: section,
              element: allElements[i],
              position: i
            });

            // Remove the original content and options
            let currentElement = allElements[i];
            let nextElement;
            let optionsToRemove = section.options.length;

            // Remove the header and instruction paragraphs
            currentElement.remove();

            // Remove the option paragraphs
            while (optionsToRemove > 0 && i + 1 < allElements.length) {
              nextElement = allElements[i + 1];
              if (nextElement && nextElement.tagName === 'P') {
                nextElement.remove();
                optionsToRemove--;
              }
              i++;
            }
            break;
          }
        }
      }
    });

    // Find positions of table radio sections
    tableRadioSections.forEach(section => {
      // Find the position of this section in the DOM
      const allElements = Array.from(tempDiv.children);
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].tagName === 'P') {
          const text = allElements[i].textContent.trim();
          const match = text.match(new RegExp(`Question\\s+${section.startNum}\\s*(?:–|-|&ndash;)\\s*${section.endNum}`, 'i'));
          if (match) {
            // Add this section to allSections
            allSections.push({
              type: 'table_radio',
              data: section,
              element: allElements[i],
              position: i
            });

            // Remove the original table from the DOM since we'll render our own
            const tableElement = section.tableElement;
            if (tableElement && tableElement.parentNode) {
              tableElement.parentNode.removeChild(tableElement);
            }

            break;
          }
        } else if (allElements[i].tagName === 'TABLE') {
          // Check if this table contains radio inputs for this section
          const radioInputs = allElements[i].querySelectorAll('input.ielts-radio');
          if (radioInputs.length > 0) {
            // Check if any question numbers in this table match our section range
            const strongElements = allElements[i].querySelectorAll('strong');
            let foundMatch = false;

            for (const strong of strongElements) {
              const num = parseInt(strong.textContent.trim());
              if (!isNaN(num) && num >= section.startNum && num <= section.endNum) {
                foundMatch = true;
                break;
              }
            }

            if (foundMatch) {
              allSections.push({
                type: 'table_radio',
                data: section,
                element: allElements[i],
                position: i
              });

              // Remove the original table from the DOM since we'll render our own
              allElements[i].style.display = 'none';

              break;
            }
          }
        }
      }
    });

    // Find positions of drag and drop sections
    dragDropSections.forEach(section => {
      // Find the position of this section in the DOM
      const allElements = Array.from(tempDiv.children);
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].tagName === 'P') {
          const text = allElements[i].textContent.trim();
          const match = text.match(new RegExp(`Question\\s+${section.startNum}\\s*(?:–|-|&ndash;)\\s*${section.endNum}`, 'i'));
          if (match) {
            // Add this section to allSections
            allSections.push({
              type: 'drag_drop',
              data: section,
              element: allElements[i],
              position: i
            });
            break;
          }
        } else if (allElements[i].className && allElements[i].className.includes('ielts-dragdrop-question')) {
          // This is a drag-drop container, check if it matches our section
          const dropZones = allElements[i].querySelectorAll('.ielts-drop-zone');
          if (dropZones.length > 0) {
            allSections.push({
              type: 'drag_drop',
              data: section,
              element: allElements[i],
              position: i
            });
            break;
          }
        }
      }
    });

    // Find positions of fill in blank sections
    Object.values(filledInBlanks).forEach(blank => {
      // Find the position of this fill-in-blank question in the DOM
      const allElements = Array.from(tempDiv.children);
      const questionNumber = blank.questionNumber;

      // Look for paragraphs containing the question number in a <strong> tag
      for (let i = 0; i < allElements.length; i++) {
        const strongElements = allElements[i].querySelectorAll('strong');
        let foundMatch = false;

        for (const strong of strongElements) {
          const num = strong.textContent.trim();
          if (num === questionNumber.toString()) {
            foundMatch = true;

            // Add this fill-in-blank question to allSections
            allSections.push({
              type: 'fill_in_blank',
              data: blank,
              element: allElements[i],
              position: i
            });

            break;
          }
        }

        if (foundMatch) break;
      }
    });

    // Sort sections by their position in the document
    allSections.sort((a, b) => a.position - b.position);

    // Create an array of DOM elements to render
    const contentParts = [];
    let lastPosition = 0;

    // Process the HTML content in chunks, inserting React components at the right positions
    allSections.forEach((section, idx) => {
      // Add HTML content before this section
      const allElements = Array.from(tempDiv.children);
      const htmlBefore = [];

      for (let i = lastPosition; i < section.position; i++) {
        if (allElements[i]) {
          htmlBefore.push(allElements[i].outerHTML);
        }
      }

      if (htmlBefore.length > 0) {
        contentParts.push(
          <div
            key={`html_${idx}`}
            className="space-y-4"
            dangerouslySetInnerHTML={{ __html: htmlBefore.join('') }}
          />
        );
      }

      // Add the React component for this section
      if (section.type === 'multiple_choice') {
        const q = section.data;
        const validation = getAnswerValidation(q.number);
        const isLockedRetake = isRetakeIncorrectMode && isQuestionCorrectRetake(q.number);
        const isDisabledMC = location?.state?.fromResultReview || isLockedRetake;
        contentParts.push(
          <div key={`mc_${q.number}`} className={`mb-4 ${isLockedRetake ? 'bg-green-50 border border-green-300 rounded-lg p-3' : ''}`} id={`question-${q.number}`} data-question-number={q.number}
          >
            <p className="mb-2">
              <strong>{q.number}</strong> {q.text}
              {isLockedRetake && <span className="ml-2 text-green-600 text-sm font-medium">🔒 Đúng</span>}
              {hardQuestions && hardQuestions[q.number] && (
                <span className="inline-block ml-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
              {isReviewMode && validation && validation.explanation && (
                <>
                  <span
                    className="inline-block ml-2 cursor-pointer"
                    onClick={() => handleExplanationClick(validation.questionId, validation.explanation)}
                    title="View explanation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 inline" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span
                    className="inline-block ml-1 cursor-pointer"
                    onClick={() => handleSearchClick(validation.questionId)}
                    title="Search question in passage"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </span>
                </>
              )}
            </p>
            <div className={`ml-6 space-y-2 ${isLockedRetake ? 'opacity-70 pointer-events-none' : ''}`}>
              {q.options.map((option, i) => {
                // Check if this is a True/False/NGV question by looking at the options
                const isTrueFalseNGV = q.options.length <= 3 &&
                  q.options.some(opt =>
                    opt.toLowerCase().includes('true') ||
                    opt.toLowerCase().includes('false') ||
                    opt.toLowerCase().includes('not given') ||
                    opt.toLowerCase().includes('ngv')
                  );

                // For True/False/NGV questions, use the actual option text as value
                // For regular multiple choice, use A, B, C, D
                let optionValue;
                let displayText;

                if (isTrueFalseNGV) {
                  // Extract True, False, or Not Given from the option text
                  if (option.toLowerCase().includes('true')) {
                    optionValue = 'True';
                    displayText = 'True';
                  } else if (option.toLowerCase().includes('false')) {
                    optionValue = 'False';
                    displayText = 'False';
                  } else if (option.toLowerCase().includes('not given') || option.toLowerCase().includes('ngv')) {
                    optionValue = 'NGV';
                    displayText = 'Not Given';
                  } else {
                    // Fallback
                    optionValue = option.trim();
                    displayText = option;
                  }
                } else {
                  // Regular multiple choice
                  optionValue = String.fromCharCode(65 + i); // A, B, C
                  displayText = option;
                }

                const isSelected = inputs[q.number] === optionValue;
                const isCorrectOption = validation && validation.correctAnswer === optionValue;
                const isUserAnswer = validation && validation.studentAnswer === optionValue;

                // Determine background color for review mode
                let radioBackgroundClass = '';
                if (isReviewMode && validation) {
                  if (validation.evaluation === 'blank') {
                    // Question was not answered - show correct answer with light blue background
                    if (isCorrectOption) {
                      radioBackgroundClass = 'bg-blue-300';
                    }
                  } else if (isSelected && validation.isCorrect) {
                    // User's answer is correct - show green
                    radioBackgroundClass = 'bg-green-500';
                  } else if (isSelected && !validation.isCorrect) {
                    // User's answer is incorrect - show red
                    radioBackgroundClass = 'bg-red-500';
                  } else if (isCorrectOption && !validation.isCorrect) {
                    // Show correct answer in green when user was wrong
                    radioBackgroundClass = 'bg-green-500';
                  }
                }

                return (
                  <div key={i} className="flex items-center mb-2">
                    {isDisabledMC ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isLockedRetake && isSelected ? 'bg-green-400' : radioBackgroundClass || (colorTheme === 'black-on-white' ? 'border-2 border-gray-300' : 'border-2 border-yellow-400')}`}>
                        <input
                          autoComplete="off"
                          type="radio"
                          name={`question_${q.number}`}
                          id={`question_${q.number}_${optionValue}`}
                          value={optionValue}
                          checked={isSelected}
                          onChange={() => { }}
                          className="w-4 h-4 focus:ring-lime-500 appearance-none rounded-full bg-white cursor-not-allowed"
                          disabled={true}
                        />
                      </div>
                    ) : (
                      <input
                        autoComplete="off"
                        type="radio"
                        name={`question_${q.number}`}
                        id={`question_${q.number}_${optionValue}`}
                        value={optionValue}
                        checked={isSelected}
                        onChange={() => handleRadioInput(q.number, optionValue)}
                        className={`w-4 h-4 focus:ring-2 focus:ring-blue-500
                          ${colorTheme === 'black-on-white'
                            ? 'text-blue-600 border-gray-300 bg-white'
                            : colorTheme === 'white-on-black'
                              ? 'text-blue-400 border-gray-500 bg-gray-800'
                              : 'text-blue-400 border-yellow-400 bg-gray-800'
                          }`
                        }
                      />
                    )}
                    <label htmlFor={`question_${q.number}_${optionValue}`} onClick={(e) => e.preventDefault()} className="ml-2">
                      {isTrueFalseNGV ? displayText : `${optionValue}. ${displayText}`}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      } else if (section.type === 'checkbox') {
        const s = section.data;
        contentParts.push(
          <div
            key={`cb_${s.startNum}`}
            className="mb-6"
            id={`question-section-${s.startNum}-${s.endNum}`}
            data-question-range={`${s.startNum}-${s.endNum}`}
          >
            <h3 className="font-bold mb-2">
              Questions {s.startNum}-{s.endNum}
              {hardQuestions && Array.from({ length: s.endNum - s.startNum + 1 }, (_, idx) => s.startNum + idx).some(qNum => hardQuestions[qNum]) && (
                <span className="inline-block ml-2 align-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </h3>
            <p className="mb-4">{s.instructionText}</p>
            <div className="ml-6 space-y-2">
              {s.options.map((option, i) => {
                const optionValue = String.fromCharCode(65 + i); // A, B, C, etc.
                const key = `checkbox_${s.startNum}_${optionValue}`;
                const isReviewMode = location?.state?.fromResultReview;
                const isSelected = inputs[key] || false;

                // For checkbox questions, we need to check if this option should be selected
                // by looking at all correct answers for questions in this section
                let isCorrectOption = false;
                if (isReviewMode) {
                  // Get all correct answers for questions in this checkbox section
                  const correctAnswers = [];
                  for (let qNum = s.startNum; qNum <= s.endNum; qNum++) {
                    const validation = getAnswerValidation(qNum.toString());
                    if (validation && validation.correctAnswer) {
                      // Handle "or" separated correct answers (e.g., "D or E")
                      const answerParts = validation.correctAnswer.split(/ or /i);
                      answerParts.forEach(part => {
                        correctAnswers.push(part.trim().toUpperCase());
                      });
                    }
                  }
                  // Check if this option letter should be selected
                  isCorrectOption = correctAnswers.includes(optionValue);
                }

                let checkboxTextClass = '';
                if (isReviewMode) {
                  if (!isSelected && isCorrectOption) {
                    // Should be selected but wasn't - show in blue (blank but correct)
                    checkboxTextClass = 'text-blue-600 font-semibold';
                  } else if (isSelected && isCorrectOption) {
                    // Correctly selected - show in green
                    checkboxTextClass = 'text-green-600 font-semibold';
                  } else if (isSelected && !isCorrectOption) {
                    // Incorrectly selected - show in red
                    checkboxTextClass = 'text-red-600 font-semibold';
                  }
                  // If not selected and not correct, use default styling
                }

                const isLockedCB = isRetakeIncorrectMode && Array.from({ length: s.endNum - s.startNum + 1 }, (_, idx) => s.startNum + idx).every(qn => isQuestionCorrectRetake(qn));
                const isDisabledCB = location?.state?.fromResultReview || isLockedCB;

                return (
                  <div key={i} className={`flex items-center ${isDisabledCB ? 'mb-2 p-2 rounded' : 'mb-1'} ${isLockedCB ? 'bg-green-50' : ''}`}>
                    <input
                      autoComplete="off"
                      type="checkbox"
                      id={`checkbox_${s.startNum}_${optionValue}`}
                      checked={inputs[key] || false}
                      onChange={(e) => !isDisabledCB && handleCheckboxChange(s.startNum, optionValue, e.target.checked)}
                      className={`w-4 h-4 ${isDisabledCB ? 'focus:ring-lime-500' : 'focus:ring-2 focus:ring-blue-500'}
                          ${isDisabledCB
                          ? (colorTheme === 'black-on-white'
                            ? 'text-lime-500 border-gray-300 bg-white'
                            : colorTheme === 'white-on-black'
                              ? 'text-yellow-300 border-gray-500 bg-black'
                              : 'text-yellow-300 border-yellow-400 bg-black')
                          : (colorTheme === 'black-on-white'
                            ? 'text-blue-600 border-gray-300 bg-white'
                            : colorTheme === 'white-on-black'
                              ? 'text-blue-400 border-gray-500 bg-gray-800'
                              : 'text-blue-400 border-yellow-400 bg-gray-800')
                        } ${isDisabledCB ? 'cursor-not-allowed' : ''}`
                      }
                      disabled={isDisabledCB}
                    />
                    <label htmlFor={`checkbox_${s.startNum}_${optionValue}`} className={`ml-2 ${checkboxTextClass || ''}`}>
                      {option}
                    </label>
                    {(() => {
                      // For checkbox questions, we need to find which question this option belongs to
                      // and show its explanation/locate icons
                      if (!isReviewMode || !isCorrectOption) return null;

                      // Find the question that corresponds to this correct option
                      // For checkbox sections, we assign questions sequentially to the correct options
                      // e.g., first correct option (alphabetically sorted) gets first question, second gets second, etc.

                      // First, build sorted list of all correct options in this section
                      const allCorrectOptions = [];
                      for (let qNum = s.startNum; qNum <= s.endNum; qNum++) {
                        const v = getAnswerValidation(qNum.toString());
                        if (v && v.correctAnswer) {
                          const parts = v.correctAnswer.split(/ or /i);
                          parts.forEach(part => {
                            const opt = part.trim().toUpperCase();
                            if (!allCorrectOptions.includes(opt)) {
                              allCorrectOptions.push(opt);
                            }
                          });
                        }
                      }
                      allCorrectOptions.sort(); // Sort alphabetically: A, B, C, D, E...

                      // Find this option's position in the sorted correct options
                      const optionIndex = allCorrectOptions.indexOf(optionValue);
                      if (optionIndex === -1) return null;

                      // Map to the corresponding question number
                      const targetQuestionNum = s.startNum + optionIndex;
                      if (targetQuestionNum > s.endNum) return null;

                      const matchingValidation = getAnswerValidation(targetQuestionNum.toString());

                      return matchingValidation && matchingValidation.explanation && (
                        <>
                          <span
                            className="inline-block ml-2 cursor-pointer"
                            onClick={() => handleExplanationClick(matchingValidation.questionId, matchingValidation.explanation)}
                            title="View explanation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 inline" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span
                            className="inline-block ml-1 cursor-pointer"
                            onClick={() => handleSearchClick(matchingValidation.questionId)}
                            title="Search question in passage"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      else if (section.type === 'table_radio') {
        const s = section.data;
        contentParts.push(
          <div
            key={`table-radio-${s.startNum}`}
            className={`mb-6 p-4 rounded-lg shadow-sm${themeClass} ${colorTheme === 'black-on-white' ? 'border-gray-200' : 'border-gray-700'}`}
            id={`question-section-${s.startNum}-${s.endNum}`}
            data-question-range={`${s.startNum}-${s.endNum}`}
          >
            <table className={`border-collapse border ${colorTheme === 'black-on-white' ? 'border-gray-300' : 'border-gray-600'} ${themeClass}`}>
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2">Question</th>
                  {s.questions?.[0]?.options?.map((option, i) => (
                    <th key={`option-${i}`} className="border border-gray-300 p-2 text-center">{option}</th>
                  )) || null}
                </tr>
              </thead>
              <tbody>
                {s.questions?.map((question, qIndex) => {
                  const questionNum = question.number;
                  const currentAnswer = inputs[questionNum];

                  return (
                    <tr key={`question-${questionNum}`}>
                      <td className="border border-gray-300 p-2">
                        <strong>{questionNum}</strong> {question.text}
                        {hardQuestions && hardQuestions[questionNum] && (
                          <span className="inline-block ml-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        {(() => {
                          const validation = getAnswerValidation(questionNum?.toString());
                          return isReviewMode && validation && validation.explanation && (
                            <>
                              <span
                                className="inline-block ml-2 cursor-pointer"
                                onClick={() => handleExplanationClick(validation.questionId, validation.explanation)}
                                title="View explanation"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span
                                className="inline-block ml-1 cursor-pointer"
                                onClick={() => handleSearchClick(validation.questionId)}
                                title="Search question in passage"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                              </span>
                            </>
                          );
                        })()}
                      </td>
                      {question.options.map((option, oIndex) => {
                        // Get validation for this specific question
                        const validation = getAnswerValidation(questionNum.toString());
                        const isSelected = currentAnswer === option;
                        const isCorrectOption = validation && validation.correctAnswer === option;

                        // Determine background color for review mode
                        let radioBackgroundClass = '';
                        if (isReviewMode && validation) {
                          if (validation.evaluation === 'blank') {
                            // Question was not answered - show correct answer with blue background
                            if (isCorrectOption) {
                              radioBackgroundClass = 'bg-blue-300';
                            }
                          } else if (isSelected && validation.isCorrect) {
                            // User's answer is correct - show green
                            radioBackgroundClass = 'bg-green-500';
                          } else if (isSelected && !validation.isCorrect) {
                            // User's answer is incorrect - show red
                            radioBackgroundClass = 'bg-red-500';
                          } else if (isCorrectOption && !validation.isCorrect) {
                            // Show correct answer in green when user was wrong
                            radioBackgroundClass = 'bg-green-500';
                          }
                        }

                        const isLockedTR = isRetakeIncorrectMode && isQuestionCorrectRetake(questionNum);
                        const isDisabledTR = location?.state?.fromResultReview || isLockedTR;

                        return (
                          <td key={`${questionNum}-option-${oIndex}`} className={`border border-gray-300 p-2 text-center ${isLockedTR ? 'bg-green-50' : ''}`}>
                            <div
                              onClick={() => !isDisabledTR && handleTableRadioInput(questionNum, option)}
                              className={`w-5 h-5 rounded-full border mx-auto ${!isDisabledTR ? 'cursor-pointer' : 'cursor-not-allowed'} flex items-center justify-center
                                ${isLockedTR && currentAnswer === option ? 'bg-green-400 border-green-500' : radioBackgroundClass || (currentAnswer === option
                                  ? colorTheme === 'black-on-white'
                                    ? 'bg-blue-500 border-blue-600'
                                    : colorTheme === 'white-on-black'
                                      ? 'bg-yellow-400 border-yellow-600'
                                      : 'bg-yellow-400 border-yellow-600'
                                  : colorTheme === 'black-on-white'
                                    ? 'bg-white border-gray-300'
                                    : colorTheme === 'white-on-black'
                                      ? 'bg-black border-gray-500'
                                      : 'bg-black border-yellow-400'
                                )} ${isDisabledTR ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {currentAnswer === option && !radioBackgroundClass && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      } else if (section.type === 'drag_drop') {
        const s = section.data;
        contentParts.push(
          <div
            key={`drag-drop-${s.startNum}`}
            className={`mb-6 p-4 rounded-lg shadow-sm border ${themeClass} ${colorTheme === 'black-on-white' ? 'border-gray-200' : 'border-gray-700'}`}
            id={`question-section-${s.startNum}-${s.endNum}`}
            data-question-range={`${s.startNum}-${s.endNum}`}
          >
            {/* Display the original article content with embedded drop zones */}
            <div className="mb-4 border-l-4 border-gray-200 pl-4 space-y-2">
              {s.articleContents && s.articleContents.map((content, i) => {
                // Check if this article element contains a drop zone 
                const hasDropZone = content.includes('ielts-drop-zone');

                // Find the question number if this contains a drop zone 
                let questionNum = null;
                if (hasDropZone) {
                  const match = content.match(/<strong>(\d+)<\/strong>/);
                  if (match) {
                    questionNum = parseInt(match[1]);
                  }
                }

                // If this contains a drop zone, we need to render it specially 
                if (hasDropZone && questionNum) {
                  // Extract the parts before and after the drop zone 
                  const parts = content.split(/<div class="ielts-drop-zone[^>]*>/);
                  const afterParts = parts[1] ? parts[1].split('</div>') : ['', ''];

                  const beforeDropZone = parts[0];
                  const afterDropZone = afterParts[1] || '';

                  const currentAnswer = inputs[questionNum] || '';

                  // Get validation for this question in review mode
                  const isReviewMode = location?.state?.fromResultReview;
                  const validation = getAnswerValidation(questionNum.toString());

                  // Determine styling based on validation using same logic as radio buttons
                  let dropZoneBackgroundClass = '';
                  let dropZoneTextClass = '';

                  if (isReviewMode && validation) {
                    const hasAnswer = currentAnswer && currentAnswer.trim() !== '';
                    const isCorrectAnswer = validation.correctAnswer === currentAnswer;

                    if (validation.evaluation === 'blank') {
                      // Show correct answer with blue styling
                      dropZoneBackgroundClass = 'bg-blue-100 border-2 border-blue-500';
                      dropZoneTextClass = 'text-blue-600 font-semibold';
                    } else if (validation.evaluation === 'correct' || (hasAnswer && isCorrectAnswer)) {
                      // User's answer is correct - show green
                      dropZoneBackgroundClass = 'bg-green-100 border-2 border-green-500';
                      dropZoneTextClass = 'text-green-600 font-semibold';
                    } else if (validation.evaluation === 'wrong' || (hasAnswer && !isCorrectAnswer)) {
                      // User's answer is incorrect - show red
                      dropZoneBackgroundClass = 'bg-red-100 border-2 border-red-500';
                      dropZoneTextClass = 'text-red-600 font-semibold';
                    } else if (!hasAnswer && validation.correctAnswer) {
                      // Show correct answer in blue when user left blank
                      dropZoneBackgroundClass = 'bg-blue-100 border-2 border-blue-500';
                      dropZoneTextClass = 'text-blue-600 font-semibold';
                    }
                  }

                  return (
                    <div key={`article-${i}`} className="ielts-article flex items-center flex-wrap">
                      <span dangerouslySetInnerHTML={{ __html: beforeDropZone }} />
                      <div
                        onDragOver={e => !location?.state?.fromResultReview && handleDragOver(e, questionNum)}
                        onDrop={e => !location?.state?.fromResultReview && handleDrop(e, questionNum)}
                        onDragLeave={() => !location?.state?.fromResultReview && setDragOverZone(null) && setDragCursor(null)}
                        className={`inline-flex items-center justify-between mx-1 min-w-[100px] h-8 px-2 rounded
                          ${isReviewMode && validation && dropZoneBackgroundClass
                            ? dropZoneBackgroundClass
                            : currentAnswer
                              ? `${colorTheme === 'black-on-white' ? 'bg-blue-100 border border-blue-300' : 'bg-gray-700 border border-gray-500'}`
                              : `${colorTheme === 'black-on-white' ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-800 border-2 border-dashed border-gray-600'}`
                          } ${location?.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`
                        }
                      >
                        {hardQuestions && hardQuestions[questionNum] && (
                          <span className="inline-block ml-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        {currentAnswer ? (
                          <div className="flex items-center justify-between w-full">
                            <div
                              draggable={!location?.state?.fromResultReview}
                              onDragStart={e => !location?.state?.fromResultReview && handleDragStart(e, currentAnswer, questionNum)}
                              onDragEnd={!location?.state?.fromResultReview && handleDragEnd}
                              className={`px-3 py-1 rounded cursor-move font-medium ${isReviewMode && dropZoneTextClass
                                ? dropZoneTextClass
                                : colorTheme === 'black-on-white'
                                  ? 'bg-white text-gray-800 border border-gray-300'
                                  : colorTheme === 'white-on-black'
                                    ? 'bg-black text-yellow-200 border border-gray-500'
                                    : 'bg-black text-yellow-300 border border-yellow-400'
                                }`}
                              style={{ minWidth: 60 }}
                            >
                              {currentAnswer}
                            </div>
                          </div>
                        ) : (
                          <span
                            className={`text-center w-full text-sm flex items-center justify-center min-h-[24px] ${isReviewMode && validation && validation.evaluation === 'blank'
                              ? 'text-blue-600 font-semibold'
                              : colorTheme === 'black-on-white'
                                ? 'text-gray-400'
                                : colorTheme === 'white-on-black'
                                  ? 'text-yellow-200'
                                  : 'text-yellow-300'
                              }`}
                          >
                            {isReviewMode && validation && validation.evaluation === 'blank'
                              ? validation.correctAnswer || 'No answer'
                              : 'Drop here'
                            }
                          </span>
                        )}
                      </div>
                      {/* Display correct answer when incorrect */}
                      {isReviewMode && validation && validation.evaluation === 'wrong' && (
                        <span className="ml-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                          ✓ {validation.correctAnswer}
                        </span>
                      )}
                      {/* Display explanation icon */}
                      {(() => {
                        // validation is already defined in the parent scope for drag-drop
                        return isReviewMode && validation && validation.explanation && (
                          <>
                            <span
                              className="inline-block ml-2 cursor-pointer"
                              onClick={() => handleExplanationClick(validation.questionId, validation.explanation)}
                              title="View explanation"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span
                              className="inline-block ml-1 cursor-pointer"
                              onClick={() => handleSearchClick(validation.questionId)}
                              title="Search question in passage"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </>
                        );
                      })()}
                      <span dangerouslySetInnerHTML={{ __html: afterDropZone }} />
                    </div>
                  );
                } else {
                  // Regular content without drop zones 
                  return (
                    <div
                      key={`article-${i}`}
                      className="ielts-article"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  );
                }
              })}
            </div>

            {/* Options to drag */}
            <div
              className={`flex flex-wrap gap-2 mb-4 p-3 rounded-lg ${themeClass} ${colorTheme === 'black-on-white' ? 'border-gray-300' : 'border-gray-600'}`}
              onDragOver={e => e.preventDefault()}
              onDrop={handleOptionDrop}
            >
              {s.options.map((option, optionIndex) => {
                // Check if this option is already used in any answer 
                const isUsed = Object.entries(inputs).some(([num, val]) => {
                  const questionNum = parseInt(num);
                  return questionNum >= s.startNum &&
                    questionNum <= s.endNum &&
                    val === option.label;
                });
                // Only show options that haven't been used yet 
                if (!isUsed) {
                  return (
                    <div
                      key={`option-${s.startNum}-${optionIndex}`}
                      draggable={!location?.state?.fromResultReview}
                      onDragStart={e => !location?.state?.fromResultReview && handleDragStart(e, option.label)}
                      onDragEnd={!location?.state?.fromResultReview && handleDragEnd}
                      className={`px-3 py-2 rounded-md transition-colors 
                          ${!location?.state?.fromResultReview ? 'cursor-move' : 'cursor-not-allowed opacity-70'}
                          ${colorTheme === 'black-on-white'
                          ? 'bg-white border border-gray-300 hover:bg-gray-100 text-black'
                          : colorTheme === 'white-on-black'
                            ? 'bg-black border border-gray-500 hover:bg-gray-800 text-white'
                            : 'bg-black border border-yellow-400 hover:bg-yellow-900 text-yellow-300'
                        } ${location?.state?.fromResultReview ? 'opacity-50' : ''}`}
                    >
                      {option.label}
                    </div>
                  );
                }
                return null; // Don't render used options 
              })}
            </div>
          </div>
        );
      }
      else if (section.type === 'fill_in_blank') {
        const blank = section.data;
        const questionNum = blank.questionNumber;

        if (blank.isTable) {
          contentParts.push(
            <div key={`fill-blank-${questionNum}`} className="w-full overflow-x-auto">
              {renderHtmlAsTableWithInputs(blank.originalHTML, inputs, handleFillInBlankInput)}
            </div>
          );
        } else {
          // --- NEW LOGIC: Render fill-in-blank with table/layout preserved ---
          // Helper: Recursively convert DOM node to React element, replacing <input> with React input, and using <strong>number</strong> as context
          function domNodeToReact(node, keyPrefix = '', context = {}) {
            if (node.nodeType === 3) {
              // Text node
              return node.textContent;
            }
            if (node.nodeType !== 1) return null; // Not an element

            // If this is a <strong>number</strong>, update context and skip rendering
            if (node.tagName === 'STRONG' && node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
              const numText = node.childNodes[0].textContent.trim();
              if (/^\d+$/.test(numText)) {
                // Pass this number as context to siblings/children
                context = { ...context, currentQNum: parseInt(numText) };
                return null; // Do not render the <strong> tag
              }
            }

            // If this is an input for a blank, replace with React input using the closest <strong> number
            if (node.tagName === 'INPUT' && node.className.includes('ielts-textfield')) {
              let qNum = context.currentQNum || questionNum;

              // Try to find a <strong> number in the same parent or previous siblings
              if (node.parentNode) {
                // Check previous siblings
                let sibling = node.previousSibling;
                while (sibling) {
                  if (
                    sibling.nodeType === 1 &&
                    sibling.tagName === 'STRONG' &&
                    sibling.childNodes.length === 1 &&
                    /^\d+$/.test(sibling.childNodes[0].textContent.trim())
                  ) {
                    qNum = parseInt(sibling.childNodes[0].textContent.trim());
                    break;
                  }
                  sibling = sibling.previousSibling;
                }
                // If not found, check parent
                if (!qNum && node.parentNode) {
                  const strongInParent = Array.from(node.parentNode.childNodes).find(
                    el =>
                      el.nodeType === 1 &&
                      el.tagName === 'STRONG' &&
                      el.childNodes.length === 1 &&
                      /^\d+$/.test(el.childNodes[0].textContent.trim())
                  );
                  if (strongInParent) {
                    qNum = parseInt(strongInParent.childNodes[0].textContent.trim());
                  }
                }
              }

              const answer = inputs[qNum] || '';
              const validation = getAnswerValidation(qNum?.toString());

              // Determine border color based on validation in review mode
              let borderColorClass = inputStyles.borderColor;
              if (isReviewMode && validation) {
                borderColorClass = validation.isCorrect ? 'border-green-500' : 'border-red-500';
              }

              return (
                <span key={`input-wrap-${qNum}-${keyPrefix}`} className="inline-flex items-center relative">
                  <input
                    autoComplete="off"
                    key={`input-${qNum}-${keyPrefix}`}
                    type="text"
                    id={`input-question-${qNum}`}
                    data-question-number={qNum}
                    className={`border rounded-md px-3 py-1.5 mx-1 focus:outline-none focus:ring-2 focus:ring-lime-500 ${inputStyles.bgColor} ${inputStyles.textColor} ${borderColorClass} ${colorTheme === 'black-on-white' ? 'placeholder-gray' : inputStyles.placeholderColor} transition-all duration-200 ${location?.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={location?.state?.fromResultReview}
                    value={answer}
                    onChange={e => !location?.state?.fromResultReview && handleFillInBlankInput(qNum.toString(), e.target.value)}
                    placeholder={`Question ${qNum}`}
                    aria-label={`Question ${qNum}`}
                    style={{ minWidth: 60 }}
                  />
                  {/* Display correct answer inline when incorrect */}
                  {isReviewMode && validation && !validation.isCorrect && (
                    <div className="mt-1 text-sm">
                      <span className="ml-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                        ✓: {validation.correctAnswer}
                      </span>
                    </div>
                  )}
                  {/* Display explanation icon */}
                  {(() => {
                    // validation is already defined in the parent scope for fill-in-blank
                    return isReviewMode && validation && validation.explanation && (
                      <>
                        <span
                          className="inline-block ml-2 cursor-pointer"
                          onClick={() => handleExplanationClick(validation.questionId, validation.explanation)}
                          title="View explanation"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 inline" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span
                          className="inline-block ml-1 cursor-pointer"
                          onClick={() => handleSearchClick(validation.questionId)}
                          title="Search question in passage"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </>
                    );
                  })()}
                  {hardQuestions && hardQuestions[qNum] && (
                    <span className="inline-block ml-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </span>
              );
            }

            // Recursively process children, passing context
            const children = Array.from(node.childNodes).map((child, i) =>
              domNodeToReact(child, keyPrefix + '-' + i, context)
            );

            // Convert inline style string to React style object
            let reactStyle = undefined;
            if (node.getAttribute && node.getAttribute('style')) {
              reactStyle = Object.fromEntries(
                node.getAttribute('style')
                  .split(';')
                  .filter(Boolean)
                  .map(rule => {
                    const [key, value] = rule.split(':');
                    return [
                      key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase()),
                      value.trim()
                    ];
                  })
              );
            }

            // Return React element of the same type
            return React.createElement(
              node.tagName.toLowerCase(),
              {
                key: keyPrefix,
                className: node.className || undefined,
                style: reactStyle,
              },
              ...children
            );
          }

          // Parse the original HTML into a DOM tree
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = blank.originalHTML;
          const nodes = Array.from(tempDiv.childNodes);

          contentParts.push(
            <div key={`fill-blank-${questionNum}`} className="w-full overflow-x-auto">
              {nodes.map((node, i) => domNodeToReact(node, `root-${i}`))}
            </div>
          );
        }
      }

      // Update the last position
      lastPosition = section.position + 1;

      // Skip option elements for multiple choice and checkbox sections
      if (section.type === 'checkbox' || section.type === 'multiple_choice' || section.type === 'fill_in_blank') {
        const allElements = Array.from(tempDiv.children);
        let optionCount = 0;

        for (let i = lastPosition; i < allElements.length; i++) {
          if (allElements[i].tagName === 'P') {
            if ((section.type === 'checkbox' && allElements[i].querySelector('input.ielts-checkbox')) ||
              (section.type === 'multiple_choice' && allElements[i].querySelector('input.ielts-radio'))) {
              optionCount++;
              lastPosition = i + 1;
            } else {
              break;
            }
          }
        }
      }
    });

    // Add any remaining HTML content
    const allElements = Array.from(tempDiv.children);
    const htmlAfter = [];

    for (let i = lastPosition; i < allElements.length; i++) {
      htmlAfter.push(allElements[i].outerHTML);
    }

    if (htmlAfter.length > 0) {
      contentParts.push(
        <div
          key="html_final"
          className="space-y-4"
          dangerouslySetInnerHTML={{ __html: htmlAfter.join('') }}
        />
      );
    }

    // At the end of the drag_drop section render, add this floating '+' icon:
    if (dragOverZone && dragCursor) {
      contentParts.push(
        <div
          key="drag_cursor"
          style={{
            position: 'fixed',
            left: dragCursor.x - 10,
            top: dragCursor.y + 7,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <svg className="w-7 h-7 drop-shadow-lg" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="16" fill="#22c55e" />
            <path d="M16 9v14M9 16h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      );
    }

    return <div className="space-y-4">{contentParts}</div>;
  };

  // Add new useEffect to handle question navigation from footer
  useEffect(() => {
    // Custom event handler for question navigation
    const handleQuestionNavigation = (event) => {
      // Get question number from the event detail
      const qNum = event.detail?.questionNumber;
      if (!qNum) return;

      // Find input field for this question number
      setTimeout(() => {
        const inputField = document.getElementById(`input-question-${qNum}`);
        if (inputField) {
          // Scroll to input
          inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Highlight and focus the input
          inputField.style.borderColor = '#3b82f6';
          inputField.style.backgroundColor = '#eff6ff';
          inputField.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.7)';
          inputField.style.transition = 'all 0.3s ease';

          // Focus on input
          inputField.focus();

          // Reset styles after animation
          setTimeout(() => {
            inputField.style.borderColor = '';
            inputField.style.backgroundColor = '';
            inputField.style.boxShadow = '';
            inputField.style.transition = '';
          }, 1500);
        }
      }, 100);
    };

    // Register event listener for question navigation
    window.addEventListener('navigateToQuestion', handleQuestionNavigation);

    // Cleanup
    return () => {
      window.removeEventListener('navigateToQuestion', handleQuestionNavigation);
    };
  }, []);

  // Attach highlight handlers to the reading passage area (left panel)
  useEffect(() => {
    const attachPassageListeners = () => {
      const passageEl = document.getElementById('reading-passage-content');
      if (!passageEl) return;

      const handlePassageMouseUp = (e) => {
        if (location?.state?.fromResultReview) return;

        // Check if clicked on an existing highlight → show clear menu
        const highlightEl = e.target.closest('[data-highlight="true"]');
        if (highlightEl && window.getSelection().toString().trim().length === 0) {
          setHighlightMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            selection: null,
            range: null,
            clearMode: true,
            clickedHighlightId: highlightEl.id
          });
          return;
        }

        // Check if clicked on an existing note → show note
        const noteEl = e.target.closest('[data-note="true"]');
        if (noteEl && window.getSelection().toString().trim().length === 0) {
          const noteId = noteEl.dataset.noteId;
          const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
          const noteData = savedNotes.find(n => n.id === noteId);
          if (noteData) {
            setNoteDialog({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              text: noteData.text,
              selection: null,
              noteId: noteId,
              range: null
            });
          }
          return;
        }

        setTimeout(() => {
          const selection = window.getSelection();
          const selectionText = selection.toString().trim();
          if (selectionText.length > 0) {
            const range = selection.getRangeAt(0);
            setHighlightMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              selection: selectionText,
              range: range,
              clearMode: false,
              clickedHighlightId: null
            });
          }
        }, 10);
      };

      const handlePassageContextMenu = (e) => {
        if (location?.state?.fromResultReview) return;
        e.preventDefault();

        const target = e.target;
        const highlightEl = target.closest('[data-highlight="true"]');

        if (highlightEl) {
          setHighlightMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            selection: null,
            range: null,
            clearMode: true,
            clickedHighlightId: highlightEl.id
          });
          return;
        }

        const selection = window.getSelection();
        const selectionText = selection.toString().trim();
        if (selectionText.length > 0) {
          const range = selection.getRangeAt(0);
          setHighlightMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            selection: selectionText,
            range: range,
            clearMode: false,
            clickedHighlightId: null
          });
        }
      };

      passageEl.addEventListener('mouseup', handlePassageMouseUp);
      passageEl.addEventListener('contextmenu', handlePassageContextMenu);

      return () => {
        passageEl.removeEventListener('mouseup', handlePassageMouseUp);
        passageEl.removeEventListener('contextmenu', handlePassageContextMenu);
      };
    };

    // Use a small delay + MutationObserver to wait for the passage element
    let cleanup = null;
    const tryAttach = () => {
      cleanup = attachPassageListeners();
    };

    const timer = setTimeout(tryAttach, 500);

    // Also re-attach when DOM changes (e.g., part switching)
    const observer = new MutationObserver(() => {
      if (cleanup) cleanup();
      cleanup = attachPassageListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      if (cleanup) cleanup();
      observer.disconnect();
    };
  }, [currentPart, location?.state?.fromResultReview]);

  // Show highlight menu on text selection (mouse-up)
  const handleTextSelection = (e) => {
    if (location?.state?.fromResultReview) return;

    // Check if clicked on an existing highlight → show clear menu
    const highlightEl = e.target.closest('[data-highlight="true"]');
    if (highlightEl && window.getSelection().toString().trim().length === 0) {
      setHighlightMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selection: null,
        range: null,
        clearMode: true,
        clickedHighlightId: highlightEl.id
      });
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const selectionText = selection.toString().trim();

      if (selectionText.length > 0) {
        const range = selection.getRangeAt(0);
        setHighlightMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          selection: selectionText,
          range: range,
          clearMode: false,
          clickedHighlightId: null
        });
      }
    }, 10);
  };

  // Right-click context menu handler (YouPass-style)
  const handleContextMenu = (e) => {
    // Don't allow in review mode
    if (location?.state?.fromResultReview) {
      return;
    }
    e.preventDefault();

    // Check if right-click is on an existing highlight
    const target = e.target;
    const highlightEl = target.closest('[data-highlight="true"]');

    if (highlightEl) {
      // Right-clicked on existing highlight → show clear menu
      setHighlightMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selection: null,
        range: null,
        clearMode: true,
        clickedHighlightId: highlightEl.id
      });
      return;
    }

    // Check if there's text selected
    const selection = window.getSelection();
    const selectionText = selection.toString().trim();

    if (selectionText.length > 0) {
      const range = selection.getRangeAt(0);
      setHighlightMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selection: selectionText,
        range: range,
        clearMode: false,
        clickedHighlightId: null
      });
    }
  };

  const handleClickOutside = (e) => {
    // Close the highlight menu if clicked outside
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setHighlightMenu(prev => ({ ...prev, visible: false }));
    }
  };
  const handleHighlight = () => {
    // Don't allow highlighting in review mode
    if (location?.state?.fromResultReview) {
      return;
    }

    if (!highlightMenu.range || !highlightMenu.selection) return;

    try {
      // Decide the highlight "level": a fresh selection is mắm tôm (level 1);
      // re-highlighting on top of an existing highlight is hồng cánh sen (level 2).
      const isInsideExistingHighlight = (() => {
        const containers = [
          highlightMenu.range.commonAncestorContainer,
          highlightMenu.range.startContainer,
          highlightMenu.range.endContainer
        ];
        return containers.some(node => {
          const el = node && node.nodeType === Node.ELEMENT_NODE ? node : (node && node.parentElement);
          return !!(el && el.closest && el.closest('[data-highlight="true"]'));
        });
      })();
      const highlightLevel = isInsideExistingHighlight ? 2 : 1;

      // Create a new span element for the highlight
      const span = document.createElement('span');
      span.className = highlightLevel === 2 ? 'ielts-highlight hl-level-2' : 'ielts-highlight hl-level-1';
      span.setAttribute('data-highlight', 'true');
      span.setAttribute('data-highlight-level', highlightLevel.toString());
      span.setAttribute('data-part', currentPart.toString());

      // Generate timestamp for the highlight
      const timestamp = new Date().getTime();
      span.setAttribute('data-timestamp', timestamp);

      // Create a unique ID for this highlight
      const highlightId = `highlight-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
      span.setAttribute('id', highlightId);

      // Apply the highlight
      highlightMenu.range.surroundContents(span);

      // Create a position signature to uniquely identify this highlight's location
      const createPositionSignature = () => {
        const parentNode = span.parentNode;
        if (!parentNode) return null;

        const textNodes = [];
        const walker = document.createTreeWalker(
          parentNode,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }

        const siblings = Array.from(parentNode.childNodes);
        const highlightIndex = siblings.indexOf(span);

        let textBefore = '';
        let textAfter = '';

        for (let i = 0; i < highlightIndex; i++) {
          if (siblings[i].nodeType === Node.TEXT_NODE) {
            textBefore += siblings[i].textContent;
          } else if (siblings[i].nodeType === Node.ELEMENT_NODE && siblings[i] !== span) {
            textBefore += siblings[i].textContent;
          }
        }

        for (let i = highlightIndex + 1; i < siblings.length; i++) {
          if (siblings[i].nodeType === Node.TEXT_NODE) {
            textAfter += siblings[i].textContent;
          } else if (siblings[i].nodeType === Node.ELEMENT_NODE && siblings[i] !== span) {
            textAfter += siblings[i].textContent;
          }
        }

        textBefore = textBefore.slice(-30);
        textAfter = textAfter.slice(0, 30);

        const getNodePath = (node) => {
          const path = [];
          let current = node;
          const contentArea = document.getElementById('ielts-content-area');

          while (current && current !== contentArea && current.parentNode) {
            const siblings = Array.from(current.parentNode.childNodes);
            const index = siblings.indexOf(current);
            path.unshift(index);
            current = current.parentNode;
          }

          return path;
        };

        return {
          path: getNodePath(parentNode),
          index: highlightIndex,
          textBefore,
          textAfter,
          parentText: parentNode.textContent
        };
      };

      const signature = createPositionSignature();

      const rangeInfo = {
        text: highlightMenu.selection,
        startOffset: highlightMenu.range.startOffset,
        endOffset: highlightMenu.range.endOffset,
        startContainer: highlightMenu.range.startContainer.textContent,
        endContainer: highlightMenu.range.endContainer.textContent,
        signature: signature
      };

      const highlightObj = {
        id: highlightId,
        text: highlightMenu.selection,
        part: currentPart,
        timestamp: timestamp,
        examId: examData?.exam_id,
        level: highlightLevel,
        rangeInfo: rangeInfo
      };

      setHighlights(prev => [...prev, highlightObj]);

      const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
      savedHighlights.push(highlightObj);
      localStorage.setItem('ielts-highlights', JSON.stringify(savedHighlights));

      // Close the menu
      setHighlightMenu(prev => ({ ...prev, visible: false }));

      // Clear the selection
      window.getSelection().removeAllRanges();
    } catch (e) {
      console.error('Error applying highlight:', e);
    }
  };

  // Clear a single highlight (YouPass-style)
  const handleClearHighlight = () => {
    if (highlightMenu.clickedHighlightId) {
      removeHighlight(highlightMenu.clickedHighlightId);
    }
    setHighlightMenu(prev => ({ ...prev, visible: false }));
  };

  // Clear all highlights on the current part
  const handleClearAllHighlights = () => {
    const contentArea = document.getElementById('ielts-content-area');
    if (!contentArea) return;

    const allHighlights = contentArea.querySelectorAll('[data-highlight="true"]');
    allHighlights.forEach(el => {
      removeHighlight(el.id);
    });
    setHighlightMenu(prev => ({ ...prev, visible: false }));
  };

  // (Copy removed from the selection menu per IDP/BC layout — highlight + note only.)

  const removeHighlight = (highlightId) => {
    // Don't allow removing highlights in review mode
    if (location?.state?.fromResultReview) {
      return;
    }

    const highlightElement = document.getElementById(highlightId);
    if (highlightElement) {
      // Get the parent node
      const parent = highlightElement.parentNode;

      // Create a document fragment to hold the highlight's children
      const fragment = document.createDocumentFragment();

      // Move all children from the highlight to the fragment
      while (highlightElement.firstChild) {
        fragment.appendChild(highlightElement.firstChild);
      }

      // Replace the highlight with its children
      parent.replaceChild(fragment, highlightElement);

      // Update the highlights array
      setHighlights(prev => prev.filter(h => h.id !== highlightId));

      // Remove from localStorage
      const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
      const updatedHighlights = savedHighlights.filter(h => {
        const highlightTimestamp = highlightId.split('-')[1];
        return h.timestamp.toString() !== highlightTimestamp;
      });
      localStorage.setItem('ielts-highlights', JSON.stringify(updatedHighlights));
    }
  };

  // Add event listeners for click outside
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    // Add custom CSS for highlights
    const style = document.createElement('style');
    style.textContent = `
      .ielts-highlight {
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
      }
      /* Highlight styles moved to toolHandlers.js */
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.head.removeChild(style);
    };
  }, []);
  const processHighlightsInElement = (element) => {
    // Find all highlight elements
    const highlightElements = element.querySelectorAll('[data-highlight="true"]');
    highlightElements.forEach(el => {
      // Skip if already processed
      if (el.hasAttribute('data-processed')) return;

      // Mark as processed
      el.setAttribute('data-processed', 'true');
      el.classList.add('ielts-highlight');

      // Add ID if missing
      if (!el.id) {
        const timestamp = el.getAttribute('data-timestamp') || Date.now();
        const highlightId = `highlight-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
        el.id = highlightId;
      }
    });
  };
  // Add listener for highlight interactions
  useEffect(() => {
    // Function to process existing highlights in the DOM
    const processExistingHighlights = () => {
      const contentArea = document.getElementById('ielts-content-area');
      const passageContent = document.getElementById('reading-passage-content');

      if (contentArea) {
        processHighlightsInElement(contentArea);
      }
      if (passageContent) {
        // Make sure we process highlights in the passage content
        processHighlightsInElement(passageContent);

        // Add data-processed attribute to the passage content to ensure it's processed
        if (!passageContent.hasAttribute('data-highlight-processed')) {
          passageContent.setAttribute('data-highlight-processed', 'true');
        }
      }
    };

    // Run once on mount
    processExistingHighlights();

    // Observer to watch for changes to the DOM (like when content is rendered)
    const observer = new MutationObserver(() => {
      processExistingHighlights();
    });

    // Start observing
    const contentArea = document.getElementById('ielts-content-area');
    if (contentArea) {
      observer.observe(contentArea, {
        childList: true,
        subtree: true
      });
    }

    // Cleanup
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [mainText]);


  // Add event listeners for text selection and highlight interactions
  useEffect(() => {
    // Add event listener for click outside
    document.addEventListener('mousedown', handleClickOutside);

    // Add custom CSS for highlights (YouPass-style: clean inline, no decorations)
    const style = document.createElement('style');
    style.textContent = `
    .ielts-highlight {
      cursor: default;
      display: inline;
      border-radius: 2px;
    }
  `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.head.removeChild(style);
    };
  }, []);



  // Add this useEffect to load saved highlights and notes from localStorage
  useEffect(() => {
    if (!examData?.exam_id) return;

    // Load highlights with range information
    const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
    const examHighlights = savedHighlights
      .filter(h => h.examId === examData.exam_id && h.part === currentPart)
      .map(h => ({
        ...h,
        id: h.id || `highlight-${h.timestamp}-${Math.random().toString(36).substring(2, 9)}`,
        rangeInfo: h.rangeInfo || null
      }));
    setHighlights(examHighlights);

    // Load notes
    const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
    const examNotes = savedNotes.filter(n => n.examId === examData.exam_id && n.part === currentPart);
    setNotes(examNotes);

    // Restore highlights and notes to DOM after loading from localStorage
    const restoreHighlightsAndNotesToDOM = () => {
      const contentArea = document.getElementById('ielts-content-area');
      const passageContent = document.getElementById('reading-passage-content');
      if (!contentArea && !passageContent) return;

      // Wait for content to be fully rendered
      setTimeout(() => {
        // Restore highlights
        if (examHighlights.length > 0) {
          examHighlights.forEach(highlight => {
            // Only restore highlights for the current part
            if (highlight.part !== currentPart) return;

            // Find text nodes that match the highlight text and range info in both areas
            const searchInElement = (element) => {
              if (!element) return [];

              const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );

              const matches = [];
              let textNode;
              while (textNode = walker.nextNode()) {
                const text = textNode.textContent;
                const highlightIndex = text.indexOf(highlight.text);

                if (highlightIndex !== -1) {
                  // Check if this is the exact match using range information
                  let exactMatch = false;

                  if (highlight.rangeInfo) {
                    const isStartContainer = text === highlight.rangeInfo.startContainer;
                    const isEndContainer = text === highlight.rangeInfo.endContainer;

                    // If this is the exact container with matching content and offset
                    if ((isStartContainer && highlightIndex === highlight.rangeInfo.startOffset) ||
                      (isEndContainer && highlightIndex === highlight.rangeInfo.endOffset)) {
                      exactMatch = true;
                    }
                  }

                  // Get context before and after for matching
                  const contextBefore = text.substring(Math.max(0, highlightIndex - 30), highlightIndex);
                  const contextAfter = text.substring(highlightIndex + highlight.text.length,
                    Math.min(text.length, highlightIndex + highlight.text.length + 30));

                  // Add to potential matches with exact match flag
                  matches.push({
                    textNode,
                    highlightIndex,
                    exactMatch,
                    contextBefore,
                    contextAfter
                  });
                }
              }

              return matches;
            };

            // Search in both content areas
            const contentAreaMatches = searchInElement(contentArea) || [];
            const passageContentMatches = searchInElement(passageContent) || [];

            // Combine all matches
            const potentialMatches = [...contentAreaMatches, ...passageContentMatches];

            // Keep track of which highlights we've already restored
            const processedHighlights = new Set();

            // Try to find a match using the position signature if available
            let signatureMatch = null;
            if (highlight.rangeInfo?.signature) {
              const signature = highlight.rangeInfo.signature;

              // Try to navigate to the exact node using the path
              const findNodeByPath = (path) => {
                let current = contentArea;

                for (let i = 0; i < path.length; i++) {
                  const index = path[i];
                  if (current.childNodes && index < current.childNodes.length) {
                    current = current.childNodes[index];
                  } else {
                    return null; // Path is invalid
                  }
                }

                return current;
              };

              const parentNode = findNodeByPath(signature.path);

              if (parentNode) {
                // Check if the parent node's text content is similar to what we expect
                const similarityThreshold = 0.7; // 70% similarity required
                const calculateSimilarity = (str1, str2) => {
                  if (!str1 || !str2) return 0;
                  const longer = str1.length > str2.length ? str1 : str2;
                  const shorter = str1.length > str2.length ? str2 : str1;
                  if (longer.length === 0) return 1.0;
                  return (longer.length - editDistance(longer, shorter)) / longer.length;
                };

                const editDistance = (s1, s2) => {
                  s1 = s1.toLowerCase();
                  s2 = s2.toLowerCase();
                  const costs = [];
                  for (let i = 0; i <= s1.length; i++) {
                    let lastValue = i;
                    for (let j = 0; j <= s2.length; j++) {
                      if (i === 0) {
                        costs[j] = j;
                      } else if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                      }
                    }
                    if (i > 0) costs[s2.length] = lastValue;
                  }
                  return costs[s2.length];
                };

                const parentTextSimilarity = calculateSimilarity(parentNode.textContent, signature.parentText);

                if (parentTextSimilarity >= similarityThreshold) {
                  // Check if we can find the highlight text at the expected position
                  const walker = document.createTreeWalker(
                    parentNode,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                  );

                  const textNodes = [];
                  let node;
                  while (node = walker.nextNode()) {
                    textNodes.push(node);
                  }

                  // Try to find a text node that contains our highlight text
                  for (const textNode of textNodes) {
                    const highlightIndex = textNode.textContent.indexOf(highlight.text);
                    if (highlightIndex !== -1) {
                      // Found a potential match in the correct parent node
                      signatureMatch = {
                        textNode,
                        highlightIndex,
                        exactMatch: true,
                        signatureMatch: true
                      };
                      break;
                    }
                  }
                }
              }
            }

            // If we found a signature match, use it directly
            if (signatureMatch) {
              potentialMatches.unshift(signatureMatch); // Add to beginning to prioritize
            }

            // Sort remaining matches by context similarity
            potentialMatches.sort((a, b) => {
              // Always prioritize signature matches
              if (a.signatureMatch && !b.signatureMatch) return -1;
              if (!a.signatureMatch && b.signatureMatch) return 1;

              // Then prioritize exact matches from range info
              if (a.exactMatch && !b.exactMatch) return -1;
              if (!a.exactMatch && b.exactMatch) return 1;

              // If no exact matches or both are exact, use context to determine the best match
              // Calculate how well the context matches
              const aContextScore = (highlight.rangeInfo?.contextBefore?.includes(a.contextBefore) ? 2 : 0) +
                (highlight.rangeInfo?.contextAfter?.includes(a.contextAfter) ? 2 : 0) +
                (highlight.rangeInfo?.signature?.textBefore?.includes(a.contextBefore) ? 3 : 0) +
                (highlight.rangeInfo?.signature?.textAfter?.includes(a.contextAfter) ? 3 : 0);

              const bContextScore = (highlight.rangeInfo?.contextBefore?.includes(b.contextBefore) ? 2 : 0) +
                (highlight.rangeInfo?.contextAfter?.includes(b.contextAfter) ? 2 : 0) +
                (highlight.rangeInfo?.signature?.textBefore?.includes(b.contextBefore) ? 3 : 0) +
                (highlight.rangeInfo?.signature?.textAfter?.includes(b.contextAfter) ? 3 : 0);

              return bContextScore - aContextScore;
            });

            // Process the best match if available
            if (potentialMatches.length > 0 && !processedHighlights.has(highlight.id)) {
              const bestMatch = potentialMatches[0];

              try {
                // Create range for the found text
                const range = document.createRange();
                range.setStart(bestMatch.textNode, bestMatch.highlightIndex);
                range.setEnd(bestMatch.textNode, bestMatch.highlightIndex + highlight.text.length);

                // Check if this text is already highlighted
                const existingHighlight = range.commonAncestorContainer.parentElement;
                if (existingHighlight && (existingHighlight.hasAttribute('data-highlight') || existingHighlight.hasAttribute('data-note'))) {
                  return; // Skip if already highlighted or noted
                }

                // Create highlight span (preserve the saved level: 2 = pink re-highlight)
                const span = document.createElement('span');
                const restoredLevel = highlight.level === 2 ? 2 : 1;
                span.className = restoredLevel === 2 ? 'ielts-highlight hl-level-2' : 'ielts-highlight hl-level-1';
                span.setAttribute('data-highlight', 'true');
                span.setAttribute('data-highlight-level', restoredLevel.toString());
                span.setAttribute('data-part', highlight.part.toString());
                span.setAttribute('data-timestamp', highlight.timestamp);
                span.setAttribute('id', highlight.id || `highlight-${highlight.timestamp}-${Math.random().toString(36).substring(2, 9)}`);

                // Store context information to help with future restoration
                if (!highlight.rangeInfo) {
                  highlight.rangeInfo = {
                    contextBefore: bestMatch.contextBefore,
                    contextAfter: bestMatch.contextAfter
                  };

                  // Update in localStorage
                  const updatedHighlights = savedHighlights.map(h => {
                    if (h.id === highlight.id ||
                      (h.timestamp === highlight.timestamp && h.text === highlight.text)) {
                      return { ...h, rangeInfo: highlight.rangeInfo };
                    }
                    return h;
                  });
                  localStorage.setItem('ielts-highlights', JSON.stringify(updatedHighlights));
                }

                // Apply the highlight
                range.surroundContents(span);

                // Mark this highlight as processed so we don't highlight it again
                processedHighlights.add(highlight.id);
              } catch (error) {
                console.warn('Could not restore highlight:', error);
              }
            }
          });
        }

        // Restore notes
        if (examNotes.length > 0) {
          // Define a reusable function to search for and apply notes in a DOM element
          const searchInElement = (element, note, processedNotes, isPassageContent = false) => {
            if (!element) return false;

            const walker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );

            let textNode;
            let foundNote = false;

            while (textNode = walker.nextNode()) {
              const text = textNode.textContent;
              const noteIndex = text.indexOf(note.selectedText);

              // Only process this note if we found a match and haven't already restored it
              if (noteIndex !== -1 && !processedNotes.has(note.id)) {
                try {
                  // Create range for the found text
                  const range = document.createRange();
                  range.setStart(textNode, noteIndex);
                  range.setEnd(textNode, noteIndex + note.selectedText.length);

                  // Check if this text is already noted or highlighted
                  const existingElement = range.commonAncestorContainer.parentElement;
                  if (existingElement && (existingElement.hasAttribute('data-note') || existingElement.hasAttribute('data-highlight'))) {
                    continue; // Skip if already noted or highlighted
                  }

                  // Create note span
                  const span = document.createElement('span');
                  span.className = 'highlighted-text with-note';
                  span.style.backgroundColor = '#d1fae5';
                  span.style.borderBottom = '2px solid #10b981';
                  span.style.position = 'relative';
                  span.style.cursor = 'pointer';
                  span.setAttribute('data-note', 'true');
                  span.setAttribute('data-part', note.part.toString());
                  span.setAttribute('data-timestamp', note.timestamp.toString());
                  span.dataset.noteId = note.id;

                  // Store information about where this note was restored
                  span.dataset.restoredIn = isPassageContent ? 'passage' : 'content';

                  // Create note indicator
                  const noteIndicator = document.createElement('span');
                  noteIndicator.className = 'note-indicator';
                  noteIndicator.style.position = 'absolute';
                  noteIndicator.style.top = '-8px';
                  noteIndicator.style.right = '-8px';
                  noteIndicator.style.backgroundColor = '#FCD34D';
                  noteIndicator.style.borderRadius = '50%';
                  noteIndicator.style.width = '16px';
                  noteIndicator.style.height = '16px';
                  noteIndicator.style.display = 'flex';
                  noteIndicator.style.alignItems = 'center';
                  noteIndicator.style.justifyContent = 'center';
                  noteIndicator.style.fontSize = '12px';
                  noteIndicator.innerHTML = '📝';
                  span.appendChild(noteIndicator);

                  // Apply the note
                  range.surroundContents(span);

                  // Add click handler to show note. Read the latest text from
                  // localStorage (not the closure) so re-edits show immediately.
                  span.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const latest = JSON.parse(localStorage.getItem('ielts-notes') || '[]')
                      .find(n => n.id === note.id);
                    setNoteDialog({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      text: latest ? latest.text : note.text,
                      selection: null,
                      noteId: note.id,
                      range: null
                    });
                  });

                  // Mark this note as processed so we don't highlight it again
                  processedNotes.add(note.id);
                  foundNote = true;
                  break; // Found and applied the note, exit the loop
                } catch (error) {
                  console.warn('Could not restore note:', error);
                }
              }
            }
            return foundNote;
          };

          // Process each note
          const processedNotes = new Set();
          examNotes.forEach(note => {
            // Only restore notes for the current part
            if (note.part !== currentPart) return;

            // Try to find and restore the note in the passage content first (preferred location)
            const foundInPassageContent = passageContent && searchInElement(passageContent, note, processedNotes, true);

            // If not found in passage content, then check in content area as fallback
            if (!foundInPassageContent && contentArea) {
              searchInElement(contentArea, note, processedNotes, false);
            }
          });
        }
      }, 100); // Small delay to ensure DOM is ready
    };

    // Restore highlights and notes when content changes
    if (mainText && (examHighlights.length > 0 || examNotes.length > 0)) {
      restoreHighlightsAndNotesToDOM();
    }
  }, [examData?.exam_id, currentPart, mainText, colorTheme]);
  return (
    <div className={`${themeClass}`}>

      <div
        ref={contentAreaRef}
        className={`p-4 ${colorTheme !== 'black-on-white' ? themeClass : 'bg-white'}`}
        id="ielts-content-area"
        onContextMenu={handleContextMenu}
        onMouseUp={handleTextSelection}
      >
        {renderContent()}
      </div>

      {/* Explanation Modal - Enhanced version */}
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

      {/* Highlight Menu */}
      {/* YouPass-style Right-Click Context Menu */}
      {highlightMenu.visible && (
        <div
          ref={menuRef}
          className={`fixed z-[9999] shadow-xl rounded-lg overflow-hidden border ${colorTheme === 'black-on-white' ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-600'}`}
          style={{
            left: `${Math.max(8, Math.min(highlightMenu.x, window.innerWidth - (highlightMenu.clearMode ? 200 : 320)))}px`,
            top: `${Math.min(highlightMenu.y, window.innerHeight - 200)}px`,
            minWidth: highlightMenu.clearMode ? '160px' : 'max-content',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          <div className={`py-1 ${highlightMenu.clearMode ? 'flex flex-col' : 'flex flex-row items-stretch'}`}>
            {highlightMenu.clearMode ? (
              /* Clear mode: right-clicked on existing highlight */
              <>
                <button
                  onClick={handleClearHighlight}
                  className={`px-4 py-2.5 text-left text-sm ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'} flex items-center gap-2 transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Highlight
                </button>
                <div className={`mx-2 border-t ${colorTheme === 'black-on-white' ? 'border-gray-200' : 'border-gray-600'}`} />
                <button
                  onClick={handleClearAllHighlights}
                  className={`px-4 py-2.5 text-left text-sm ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'} flex items-center gap-2 transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All Highlights
                </button>
              </>
            ) : (
              /* Normal mode: text selected, right-clicked */
              <>
                <button
                  onClick={handleHighlight}
                  className={`px-4 py-2.5 text-left text-sm ${colorTheme === 'black-on-white' ? 'hover:bg-yellow-50 text-gray-700' : 'hover:bg-gray-700 text-gray-200'} flex items-center gap-2 transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.5 1.5l4 4L9 19l-4 1 1-4L18.5 1.5zM2 24h20v-2H2v2z" />
                  </svg>
                  Highlight
                </button>
                <button
                  onClick={handleAddNote}
                  className={`px-4 py-2.5 text-left text-sm border-l ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700 border-gray-200' : 'hover:bg-gray-700 text-gray-200 border-gray-600'} flex items-center gap-2 transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Add Note
                </button>
                {isTranslatorEnabled && (
                  <button
                    onClick={handleTranslate}
                    className={`px-4 py-2.5 text-left text-sm border-l ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700 border-gray-200' : 'hover:bg-gray-700 text-gray-200 border-gray-600'} flex items-center gap-2 transition-colors`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Translate
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Note Dialog */}
      {noteDialog.visible && (
        <div
          className="fixed z-[9999] p-4 rounded-lg shadow-lg bg-yellow-50 border border-yellow-200"
          style={{
            left: `${Math.min(noteDialog.x, window.innerWidth - 320)}px`,
            top: `${noteDialog.y + 180 > window.innerHeight ? Math.max(10, noteDialog.y - 200) : noteDialog.y}px`,
            maxWidth: '300px'
          }}
        >
          <textarea
            value={noteDialog.text}
            onChange={(e) => setNoteDialog(prev => ({ ...prev, text: e.target.value }))}
            className="w-full p-2 rounded border border-yellow-300 bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter your note..."
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleSaveNote}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Save
            </button>
            {noteDialog.noteId && (
              <button
                onClick={() => {
                  handleRemoveHighlight(noteDialog.noteId);
                  setNoteDialog(prev => ({ ...prev, visible: false }));
                }}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            )}
            <button
              onClick={() => setNoteDialog(prev => ({ ...prev, visible: false }))}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingTest;
