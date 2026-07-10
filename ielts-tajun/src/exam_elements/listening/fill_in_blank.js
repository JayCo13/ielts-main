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

const ListeningTest = ({
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
  forecastMode,
  onSearchClick,
  onExplainClick,
  isReviewMode: isReviewModeProp,
  retakeIncorrectMode,
  incorrectQuestionNumbers = [],
  correctQuestionNumbers = [],
}) => {
  // Initialize location hook
  const location = useLocation();
  const isReviewMode = isReviewModeProp ?? location?.state?.fromResultReview;
  const inForecast = !!(isReviewMode && forecastMode);

  // Retake incorrect mode helpers
  const incorrectSet = retakeIncorrectMode ? new Set(incorrectQuestionNumbers) : null;
  const isQuestionIncorrect = (qNum) => {
    if (!retakeIncorrectMode || !incorrectSet) return false;
    const num = typeof qNum === 'string' ? parseInt(qNum) : qNum;
    return incorrectSet.has(num);
  };
  const isQuestionCorrectRetake = (qNum) => {
    if (!retakeIncorrectMode || !incorrectSet) return false;
    const num = typeof qNum === 'string' ? parseInt(qNum) : qNum;
    // If not in incorrectSet, it's a correct answer → should be locked
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
  // Add these state variables
  const [noteDialog, setNoteDialog] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    selection: null
  });

  const [notes, setNotes] = useState([]);

  // Function to get answer validation status in review mode
  const getAnswerValidation = (questionText) => {
    if (!isReviewMode || !answerData) {
      return { isCorrect: null, studentAnswer: '', correctAnswer: '', evaluation: null };
    }

    // Ensure questionText is a string before processing
    const questionTextStr = typeof questionText === 'string' ? questionText : String(questionText || '');

    // The answerData structure shows detailed_answers array
    const detailedAnswers = answerData.detailed_answers || answerData;

    // First, try to find by question_number if questionText is a number
    let answerInfo = null;
    let questionNum = parseInt(questionTextStr);
    if (!isNaN(questionNum)) {
      // Adjust for listening part-local numbering (1-10 per part) to global 1-40
      if (questionNum >= 1 && questionNum <= 10 && typeof currentPart === 'number') {
        questionNum = ((currentPart - 1) * 10) + questionNum;
      }
      answerInfo = detailedAnswers.find(answer => answer.question_number === questionNum);
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
          let extractedNum = parseInt(questionTextMatch[1]);
          if (extractedNum >= 1 && extractedNum <= 10 && typeof currentPart === 'number') {
            extractedNum = ((currentPart - 1) * 10) + extractedNum;
          }
          return extractedNum === questionNum;
        }

        // Fallback: exact number match at word boundaries to avoid partial matches
        const numberRegex = new RegExp(`\\b${questionNum}\\b`);
        return numberRegex.test(answer.question_text);
      });
    }

    if (!answerInfo) {
      return { isCorrect: null, studentAnswer: '', correctAnswer: '', evaluation: null };
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
      onTranslate(selectedText, { x: highlightMenu.x, y: highlightMenu.y });
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

          // Get surrounding context for signature
          const textNode = range.startContainer;
          const text = textNode.textContent;
          const startOffset = range.startOffset;
          const endOffset = range.endOffset;

          // Get 20 characters before and after the note
          const contextBefore = text.slice(Math.max(0, startOffset - 20), startOffset);
          const contextAfter = text.slice(endOffset, Math.min(text.length, endOffset + 20));

          // Generate signature
          const signature = `${contextBefore}|${selectedText}|${contextAfter}`;

          const span = document.createElement('span');
          span.className = 'highlighted-text with-note';
          span.style.backgroundColor = '#d1fae5';
          span.style.borderBottom = '2px solid #10b981';
          span.style.position = 'relative';
          span.style.cursor = 'pointer';

          // Store note data
          const noteId = Date.now().toString();
          span.dataset.noteId = noteId;
          span.setAttribute('data-note', 'true');
          span.setAttribute('data-part', currentPart.toString());
          span.setAttribute('data-timestamp', noteId);
          span.setAttribute('data-signature', signature);

          // Create note indicator
          const noteIndicator = document.createElement('span');
          noteIndicator.className = 'note-indicator';
          noteIndicator.style.position = 'absolute';
          noteIndicator.style.top = '-8px';
          noteIndicator.style.right = '-8px';
          noteIndicator.style.backgroundColor = '#6ee7b7';
          noteIndicator.style.borderRadius = '50%';
          noteIndicator.style.width = '16px';
          noteIndicator.style.height = '16px';
          noteIndicator.style.display = 'flex';
          noteIndicator.style.alignItems = 'center';
          noteIndicator.style.justifyContent = 'center';
          noteIndicator.style.fontSize = '12px';
          noteIndicator.innerHTML = '📝';
          span.appendChild(noteIndicator);

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
            timestamp: parseInt(noteId),
            signature: signature
          };

          const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
          savedNotes.push(noteData);
          localStorage.setItem('ielts-notes', JSON.stringify(savedNotes));

          // Save note to component state
          setNotes(prev => [...prev, noteData]);

          // Add click handler to show note
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            setNoteDialog({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              text: noteData.text,
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
      setNotes(prev => prev.filter(note => note.id !== noteId));

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
        const baseQuestionNum = (currentPart - 1) * 10 + 1;

        // Map each question to its corresponding number
        sortedQuestions.forEach((q, index) => {
          const questionNum = baseQuestionNum + index;
          qMap[questionNum.toString()] = q.question_id;
        });


        // Store the question map in window object for table radio access
        window.questionMap = qMap;
      }

      // Then, try to extract numbers from individual questions as a fallback
      allQuestions?.forEach(q => {
        const numberMatch = q.question_text.match(/(\d+)/);
        if (numberMatch) {
          const questionNumber = numberMatch[1];
          if (!qMap[questionNumber]) {
            qMap[questionNumber] = q.question_id;
          }
        }
      });

      // Special handling for Part 4 (questions 31-40)
      if (currentPart === 4) {
        for (let i = 31; i <= 40; i++) {
          if (!qMap[i.toString()]) {
            const baseId = allQuestions?.[0]?.question_id || 0;
            const offset = i - 31;
            qMap[i.toString()] = baseId + offset;
          }
        }
      }

      console.log('Setting questionMap:', qMap);
      setQuestionMap(qMap);

      // Extract all question types first
      const extractedCheckboxQuestions = extractCheckboxQuestions(tempDiv.innerHTML);
      setMultipleChoiceQuestions(extractMultipleChoiceQuestions(tempDiv.innerHTML));
      setCheckboxQuestions(extractedCheckboxQuestions);
      setTableRadioSections(extractTableRadioQuestions(tempDiv.innerHTML));
      setDragDropSections(extractDragDropQuestions(tempDiv.innerHTML));
      setFilledInBlanks(extractFillInBlanks(tempDiv.innerHTML));

      // Load saved answers from localStorage
      const savedAnswers = JSON.parse(localStorage.getItem('ielts-answers') || '{}');
      const examAnswers = savedAnswers[examData?.exam_id] || {};

      // Convert question IDs back to question numbers for our inputs state
      const savedInputs = {};
      Object.entries(qMap).forEach(([questionNum, questionId]) => {
        if (examAnswers[questionId]) {
          savedInputs[questionNum] = examAnswers[questionId];
        }
      });

      // Also load checkbox answers (now that extractedCheckboxQuestions is available)
      Object.keys(examAnswers).forEach(questionId => {
        const answer = examAnswers[questionId];
        if (answer && answer.length === 1 && answer >= 'A' && answer <= 'Z') {
          const questionNum = Object.entries(qMap).find(([num, id]) => id.toString() === questionId.toString())?.[0];
          if (questionNum) {
            const section = extractedCheckboxQuestions.find(s =>
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
    }
  }, [question, examData, currentPart, textSize, colorTheme]);

  // Populate inputs from answerData in review mode
  useEffect(() => {
    if (isReviewMode && answerData && questionMap && Object.keys(questionMap).length > 0) {
      console.log('Review mode - populating inputs');
      console.log('answerData:', answerData);
      console.log('questionMap:', questionMap);
      console.log('checkboxQuestions:', checkboxQuestions);

      const detailedAnswers = Array.isArray(answerData) ? answerData : [];
      const reviewInputs = {};

      // For listening exams, match by question_number (sequential 1-40)
      Object.keys(questionMap).forEach(questionNum => {
        const answerInfo = detailedAnswers.find(item => item.question_number === parseInt(questionNum));
        console.log(`Question ${questionNum} -> Answer:`, answerInfo);

        if (answerInfo && answerInfo.student_answer !== undefined) {
          const studentAnswer = answerInfo.student_answer || '';
          reviewInputs[questionNum] = studentAnswer;

          // For checkbox questions, also populate the checkbox-style key
          // Check if this question belongs to a checkbox section
          const qNum = parseInt(questionNum);
          const checkboxSection = checkboxQuestions.find(s =>
            qNum >= s.startNum && qNum <= s.endNum
          );

          if (checkboxSection && studentAnswer && studentAnswer.length === 1 && studentAnswer >= 'A' && studentAnswer <= 'Z') {
            // This is a checkbox answer (single letter A-Z)
            const checkboxKey = `checkbox_${checkboxSection.startNum}_${studentAnswer}`;
            reviewInputs[checkboxKey] = true;
            console.log(`Checkbox key set: ${checkboxKey} = true`);
          }
        }
      });

      console.log('Review inputs to set:', reviewInputs);
      if (Object.keys(reviewInputs).length > 0) {
        setInputs(reviewInputs);
      }
    }
  }, [isReviewMode, answerData, questionMap, checkboxQuestions]);

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
    if (retakeIncorrectMode && isQuestionCorrectRetake(number)) return;
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
    }
  };

  const handleFillInBlankInput = (number, value) => {
    // Block edits for correct answers in retake mode
    if (retakeIncorrectMode && isQuestionCorrectRetake(number)) return;
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
    }
  };
  const handleTableRadioInput = (number, value) => {
    // Block edits for correct answers in retake mode
    if (retakeIncorrectMode && isQuestionCorrectRetake(number)) return;
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);

      // Update the DOM to reflect the selection
      const radios = document.querySelectorAll(`input[name="table_question_${number}"]`);
      radios.forEach(radio => {
        radio.checked = radio.value === value;
      });
    }
  };
  const handleDragDropInput = (number, value) => {
    setInputs(prev => {
      // Check if this value is already used in another field
      const isValueUsedElsewhere = Object.entries(prev).some(
        ([key, val]) => val === value && key !== number
      );

      // If value is already used elsewhere and not being cleared, don't allow it
      if (isValueUsedElsewhere && value !== '') {
        return prev;
      }

      // Update the state with the new value
      const newInputs = { ...prev, [number]: value };

      // Update the question ID and save the answer
      const questionId = questionMap[number];
      if (questionId) {
        onAnswerChange(questionId, value);
        saveAnswer(examData?.exam_id, questionId, value);
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

  // Update handleDrop to support swapping
  const handleDrop = (e, questionNumber) => {
    e.preventDefault();
    setDragOverZone(null);
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

    // Block changes in retake mode for options that map to correct answers
    if (retakeIncorrectMode) {
      // If unchecking an option, check if this option maps to a correct question
      if (!checked) {
        const checkedOpts = [];
        for (let ci = 0; ci < section.options.length; ci++) {
          const ov = String.fromCharCode(65 + ci);
          const ck = `checkbox_${sectionStart}_${ov}`;
          if (inputs[ck]) checkedOpts.push(ov);
        }
        checkedOpts.sort();
        const questionRange = Array.from(
          { length: section.endNum - section.startNum + 1 },
          (_, idx) => section.startNum + idx
        );
        const optIdx = checkedOpts.indexOf(option);
        if (optIdx !== -1 && optIdx < questionRange.length) {
          const mappedQ = questionRange[optIdx];
          if (isQuestionCorrectRetake(mappedQ)) {
            return; // Block unchecking a correct answer
          }
        }
      }
    }

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
        const validation = getAnswerValidation(qNum);

        // Retake incorrect mode styling
        const isLockedCorrect = retakeIncorrectMode && isQuestionCorrectRetake(qNum);
        const isRetakeTarget = retakeIncorrectMode && isQuestionIncorrect(qNum);

        let borderColor;
        if (isLockedCorrect) {
          borderColor = 'border-green-400 bg-green-50';
        } else if (isRetakeTarget) {
          borderColor = 'border-red-400 ring-2 ring-red-300 ring-opacity-50';
        } else if (isReviewMode && validation.evaluation) {
          borderColor = validation.isCorrect ? 'border-green-500' : 'border-red-500';
        } else {
          borderColor = inputStyles.borderColor;
        }

        const isInputDisabled = location.state?.fromResultReview || isLockedCorrect;

        return (
          <span key={`input-wrap-${qNum}-${keyPrefix}`} className="inline-flex items-center">
            <input
              key={`input-${qNum}-${keyPrefix}`}
              type="text"
              autoComplete="off"
              id={`input-question-${qNum}`}
              data-question-number={qNum}
              className={`border rounded-md px-3 py-1.5 mx-1 focus:outline-none focus:ring-2 focus:ring-lime-500 ${isLockedCorrect ? 'bg-green-50' : inputStyles.bgColor} ${inputStyles.textColor} ${borderColor} ${colorTheme === 'black-on-white' ? 'placeholder-gray' : inputStyles.placeholderColor} transition-all duration-200 ${isInputDisabled ? 'opacity-70 cursor-not-allowed' : ''} ${isRetakeTarget ? 'animate-pulse' : ''}`}
              value={answer}
              onChange={e => !isInputDisabled && handleFillInBlankInput(qNum ? qNum.toString() : '', e.target.value)}
              placeholder={qNum ? `Question ${qNum}` : 'Question'}
              aria-label={qNum ? `Question ${qNum}` : 'Question'}
              style={{ minWidth: 60 }}
              disabled={isInputDisabled}
              readOnly={isLockedCorrect}
            />
            {isLockedCorrect && (
              <span className="ml-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            {(!retakeIncorrectMode && isReviewMode && validation.evaluation) && (
              <span className="ml-1">
                {validation.isCorrect ? (
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            )}
            {inForecast && validation.correctAnswer && (
              <span className="ml-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                ✓: {validation.correctAnswer}
              </span>
            )}
            {isReviewMode && validation.evaluation && !validation.isCorrect && (
              <span className="ml-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                ✓: {validation.correctAnswer}
              </span>
            )}
            {/* Locate and Explain icons in review mode */}
            {isReviewMode && validation.evaluation && (
              <span className="ml-2 inline-flex items-center gap-1">
                {validation.locate && onSearchClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // If qNum is 1-10, it's local - convert to global. If > 10, it's already global.
                      const globalQNum = parseInt(qNum) <= 10 ? ((currentPart - 1) * 10) + parseInt(qNum) : parseInt(qNum);
                      onSearchClick(globalQNum);
                    }}
                    className="p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Xem vị trí trong transcript"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
                {validation.explanation && onExplainClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // If qNum is 1-10, it's local - convert to global. If > 10, it's already global.
                      const globalQNum = parseInt(qNum) <= 10 ? ((currentPart - 1) * 10) + parseInt(qNum) : parseInt(qNum);
                      onExplainClick(globalQNum);
                    }}
                    className="p-1 rounded hover:bg-purple-100 transition-colors cursor-pointer"
                    title="Xem giải thích"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
              </span>
            )}
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
        if (node.tagName === 'TABLE') className += ' w-full';
        if (node.tagName === 'TD' || node.tagName === 'TH') className += ' p-2';
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
        const questionP = boldEl.closest('p') || boldEl.closest('td') || boldEl.closest('div');
        if (questionP) {
          // Add an ID to the paragraph for scrolling
          questionP.id = `question-${num}`;
          // Add a data attribute to make it easier to find
          questionP.setAttribute('data-question-number', num);

          // Also tag any inline inputs within this paragraph/cell with the question number
          const inlineInputs = questionP.querySelectorAll('input[type="text"], input.ielts-textfield');
          inlineInputs.forEach(inp => {
            if (!inp.getAttribute('data-question-number')) {
              inp.setAttribute('data-question-number', num);
            }
          });
        }
      }
    }
    // Also tag ALL remaining inputs that might have question numbers in their attributes
    const allInputs = tempDiv.querySelectorAll('input[type="text"], input.ielts-textfield');
    allInputs.forEach(inp => {
      if (inp.getAttribute('data-question-number')) return; // already tagged
      // Try name attribute
      const name = inp.getAttribute('name');
      if (name && /^\d+$/.test(name)) {
        inp.setAttribute('data-question-number', name);
        return;
      }
      // Try extracting from onchange/oninput like handleFillInBlankInput(15, ...)
      const onchange = inp.getAttribute('onchange') || inp.getAttribute('oninput') || '';
      const ocMatch = onchange.match(/handleFillInBlankInput\((\d+)/);
      if (ocMatch) {
        inp.setAttribute('data-question-number', ocMatch[1]);
        return;
      }
      // Try placeholder like "Question 15"
      const ph = inp.getAttribute('placeholder') || '';
      const phMatch = ph.match(/Question\s+(\d+)/i);
      if (phMatch) {
        inp.setAttribute('data-question-number', phMatch[1]);
      }
    });

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
        const isLockedRetake = retakeIncorrectMode && isQuestionCorrectRetake(q.number);
        const isDisabledMC = location.state?.fromResultReview || isLockedRetake;
        contentParts.push(
          <div key={`mc_${q.number}`} className={`mb-4 relative ${isLockedRetake ? 'opacity-60' : ''}`} id={`question-${q.number}`} data-question-number={q.number}

          >

            <p className="mb-2">
              <strong>{q.number}</strong> {q.text}
              {isLockedRetake && <span className="ml-2 text-green-600 text-sm font-medium">✓ Đúng</span>}
              {hardQuestions && hardQuestions[q.number] && (
                <span className="inline-block ml-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
              {/* Locate and Explain icons for multiple choice */}
              {isReviewMode && validation.evaluation && (
                <span className="inline-flex items-center gap-1 ml-2">
                  {validation.locate && onSearchClick && (
                    <button
                      onClick={() => onSearchClick(parseInt(q.number))}
                      className="p-1 rounded hover:bg-blue-100 transition-colors"
                      title="Xem vị trí trong transcript"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  )}
                  {validation.explanation && onExplainClick && (
                    <button
                      onClick={() => onExplainClick(parseInt(q.number))}
                      className="p-1 rounded hover:bg-purple-100 transition-colors"
                      title="Xem giải thích"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </span>
              )}
            </p>
            <div className={`ml-6 space-y-2 ${isLockedRetake ? 'pointer-events-none' : ''}`}>
              {q.options.map((option, i) => {
                const optionValue = String.fromCharCode(65 + i); // A, B, C
                const isSelected = inputs[q.number] === optionValue;
                const isCorrectOption = validation.evaluation && validation.correctAnswer === optionValue;
                const isUserAnswer = validation.evaluation && validation.studentAnswer === optionValue;

                // Determine background color for review mode
                let radioBackgroundClass = '';
                if (isReviewMode && validation.evaluation) {
                  if (validation.evaluation === 'blank') {
                    if (isCorrectOption) {
                      radioBackgroundClass = 'bg-blue-300';
                    }
                  } else if (isSelected && validation.isCorrect) {
                    radioBackgroundClass = 'bg-green-500';
                  } else if (isSelected && !validation.isCorrect) {
                    radioBackgroundClass = 'bg-red-500';
                  } else if (isCorrectOption && !validation.isCorrect) {
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
                      {option}
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
            className="mb-6 relative"
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
            {/* Locate and Explain icons for each question in this checkbox section */}
            {isReviewMode && (
              <div className="mb-4 flex flex-wrap gap-2">
                {Array.from({ length: s.endNum - s.startNum + 1 }, (_, idx) => {
                  const qNum = s.startNum + idx;
                  const validation = getAnswerValidation(qNum.toString());
                  if (!validation || !validation.evaluation) return null;
                  const hasLocate = validation.locate && onSearchClick;
                  const hasExplain = validation.explanation && onExplainClick;
                  if (!hasLocate && !hasExplain) return null;
                  return (
                    <span key={qNum} className="inline-flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                      <span className="text-sm font-medium text-gray-700">Q{qNum}:</span>
                      {hasLocate && (
                        <button
                          onClick={() => onSearchClick(qNum)}
                          className="p-1 rounded hover:bg-blue-100 transition-colors"
                          title="Xem vị trí trong transcript"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      )}
                      {hasExplain && (
                        <button
                          onClick={() => onExplainClick(qNum)}
                          className="p-1 rounded hover:bg-purple-100 transition-colors"
                          title="Xem giải thích"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="ml-6 space-y-2">
              {s.options.map((option, i) => {
                const optionValue = String.fromCharCode(65 + i); // A, B, C, etc.
                const key = `checkbox_${s.startNum}_${optionValue}`;
                const isReviewMode = location.state?.fromResultReview;
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
                      // Split by "OR", "/", or "," to handle combined answers
                      const parts = validation.correctAnswer.toUpperCase().split(/OR|\/|,/i);
                      parts.forEach(p => {
                        const clean = p.trim();
                        if (clean) correctAnswers.push(clean);
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

                // Per-option locking in retake mode
                // Determine if THIS specific option is locked (maps to a correct answer)
                let isLockedOption = false;
                if (retakeIncorrectMode && isSelected) {
                  // Get all checked options for this section, sorted alphabetically
                  const checkedOptions = [];
                  for (let ci = 0; ci < s.options.length; ci++) {
                    const ov = String.fromCharCode(65 + ci);
                    const ck = `checkbox_${s.startNum}_${ov}`;
                    if (inputs[ck]) checkedOptions.push(ov);
                  }
                  checkedOptions.sort();

                  // Map checked options to question numbers in order
                  const questionRange = Array.from(
                    { length: s.endNum - s.startNum + 1 },
                    (_, idx) => s.startNum + idx
                  );
                  const optIdx = checkedOptions.indexOf(optionValue);
                  if (optIdx !== -1 && optIdx < questionRange.length) {
                    const mappedQ = questionRange[optIdx];
                    isLockedOption = isQuestionCorrectRetake(mappedQ);
                  }
                }
                const isDisabledCB = location.state?.fromResultReview || isLockedOption;

                return (
                  <div key={i} className={`flex items-center ${isLockedOption ? 'mb-2 p-2 rounded bg-green-50 border-l-[3px] border-green-500 pl-2' : 'mb-1'}`}>
                    <input
                      autoComplete="off"
                      type="checkbox"
                      id={`checkbox_${s.startNum}_${optionValue}`}
                      checked={inputs[key] || false}
                      onChange={(e) => !isDisabledCB && handleCheckboxChange(s.startNum, optionValue, e.target.checked)}
                      className={`w-4 h-4 ${isDisabledCB ? 'focus:ring-lime-500' : 'focus:ring-2 focus:ring-blue-500'}
                          ${isDisabledCB
                          ? (colorTheme === 'black-on-white'
                            ? 'text-green-500 border-green-400 bg-green-50'
                            : colorTheme === 'white-on-black'
                              ? 'text-yellow-300 border-gray-500 bg-black'
                              : 'text-yellow-300 border-yellow-400 bg-black')
                          : (colorTheme === 'black-on-white'
                            ? 'text-blue-600 border-gray-300 bg-white'
                            : colorTheme === 'white-on-black'
                              ? 'text-blue-400 border-gray-500 bg-gray-800'
                              : 'text-blue-400 border-yellow-400 bg-gray-800')
                        } ${isDisabledCB ? 'cursor-not-allowed opacity-60' : ''}`
                      }
                      disabled={isDisabledCB}
                    />
                    <label htmlFor={`checkbox_${s.startNum}_${optionValue}`} className={`ml-2 ${isLockedOption ? 'text-green-700 font-medium' : checkboxTextClass || ''}`}>
                      {option}
                      {isLockedOption && <span className="ml-1 text-green-500 text-xs">✓ Đúng</span>}
                    </label>
                  </div>
                );
              })}
            </div>

          </div>
        );
      } else if (section.type === 'table_radio') {
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
                  {s.questions[0]?.options.map((option, i) => (
                    <th key={`option-${i}`} className="border border-gray-300 p-2 text-center">{option}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.questions.map((question, qIndex) => {
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
                        {/* Locate and Explain icons for table radio */}
                        {(() => {
                          const validation = getAnswerValidation(questionNum?.toString());
                          const localIsReviewMode = location.state?.fromResultReview;
                          if (!localIsReviewMode || !validation || !validation.evaluation) return null;
                          const hasLocate = validation.locate && onSearchClick;
                          const hasExplain = validation.explanation && onExplainClick;
                          if (!hasLocate && !hasExplain) return null;
                          return (
                            <span className="inline-flex items-center gap-1 ml-2">
                              {hasLocate && (
                                <button
                                  onClick={() => onSearchClick(parseInt(questionNum))}
                                  className="p-1 rounded hover:bg-blue-100 transition-colors"
                                  title="Xem vị trí trong transcript"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                </button>
                              )}
                              {hasExplain && (
                                <button
                                  onClick={() => onExplainClick(parseInt(questionNum))}
                                  className="p-1 rounded hover:bg-purple-100 transition-colors"
                                  title="Xem giải thích"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      {question.options.map((option, oIndex) => {
                        const isReviewMode = location.state?.fromResultReview;
                        const validation = getAnswerValidation(questionNum.toString());
                        const isSelected = currentAnswer === option;
                        const isCorrectOption = validation && validation.correctAnswer === option;

                        let radioBackgroundClass = '';
                        if (isReviewMode && validation) {
                          if (validation.evaluation === 'blank') {
                            if (isCorrectOption) {
                              radioBackgroundClass = 'bg-blue-300';
                            }
                          } else if (isSelected && validation.isCorrect) {
                            radioBackgroundClass = 'bg-green-500';
                          } else if (isSelected && !validation.isCorrect) {
                            radioBackgroundClass = 'bg-red-500';
                          } else if (isCorrectOption && !validation.isCorrect) {
                            radioBackgroundClass = 'bg-green-500';
                          }
                        }

                        const isLockedTR = retakeIncorrectMode && isQuestionCorrectRetake(questionNum);
                        const isDisabledTR = location.state?.fromResultReview || isLockedTR;

                        return (
                          <td key={`${questionNum}-option-${oIndex}`} className={`border border-gray-300 p-2 text-center ${isLockedTR ? 'bg-green-50' : ''}`}>
                            <div className={`${isLockedTR && currentAnswer === option ? 'bg-green-400' : radioBackgroundClass} rounded-full p-1`}>
                              <div
                                onClick={() => !isDisabledTR && handleTableRadioInput(questionNum, option)}
                                className={`w-5 h-5 rounded-full border mx-auto flex items-center justify-center
                                  ${currentAnswer === option
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
                                  } ${isDisabledTR ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {currentAnswer === option && (
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                              </div>
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
                  const isReviewMode = location.state?.fromResultReview;
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
                    } else if (hasAnswer && validation.isCorrect) {
                      // User's answer is correct - show green
                      dropZoneBackgroundClass = 'bg-green-100 border-2 border-green-500';
                      dropZoneTextClass = 'text-green-600 font-semibold';
                    } else if (hasAnswer && !validation.isCorrect) {
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
                        onDragOver={e => !location.state?.fromResultReview && handleDragOver(e, questionNum)}
                        onDrop={e => !location.state?.fromResultReview && handleDrop(e, questionNum)}
                        onDragLeave={() => { if (!location.state?.fromResultReview) { setDragOverZone(null); setDragCursor(null); } }}
                        className={`inline-flex items-center justify-between mx-1 min-w-[100px] h-8 px-2 rounded
                          ${isReviewMode && validation && dropZoneBackgroundClass
                            ? dropZoneBackgroundClass
                            : currentAnswer
                              ? `${colorTheme === 'black-on-white' ? 'bg-blue-100 border border-blue-300' : 'bg-gray-700 border border-gray-500'}`
                              : `${colorTheme === 'black-on-white' ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-800 border-2 border-dashed border-gray-600'}`
                          } ${location.state?.fromResultReview ? 'opacity-50 pointer-events-none' : ''}`
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
                              draggable={!isReviewMode}
                              onDragStart={e => !isReviewMode && handleDragStart(e, currentAnswer, questionNum)}
                              onDragEnd={handleDragEnd}
                              className={`px-3 py-1 rounded ${isReviewMode ? '' : 'cursor-move'} font-medium ${isReviewMode && dropZoneTextClass
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
                              : 'Drop here'}
                          </span>
                        )}
                      </div>
                      {(isReviewMode && validation && validation.evaluation === 'wrong') && (
                        <span className="ml-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                          ✓ {validation.correctAnswer}
                        </span>
                      )}
                      {/* Locate and Explain icons for drag-drop */}
                      {isReviewMode && validation && validation.evaluation && (
                        <span className="inline-flex items-center gap-1 ml-2">
                          {validation.locate && onSearchClick && (
                            <button
                              onClick={() => onSearchClick(questionNum)}
                              className="p-1 rounded hover:bg-blue-100 transition-colors"
                              title="Xem vị trí trong transcript"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </button>
                          )}
                          {validation.explanation && onExplainClick && (
                            <button
                              onClick={() => onExplainClick(questionNum)}
                              className="p-1 rounded hover:bg-purple-100 transition-colors"
                              title="Xem giải thích"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </span>
                      )}
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
                      draggable={!location.state?.fromResultReview}
                      onDragStart={e => !location.state?.fromResultReview && handleDragStart(e, option.label)}
                      onDragEnd={!location.state?.fromResultReview && handleDragEnd}
                      className={`px-3 py-2 rounded-md transition-colors ${!location.state?.fromResultReview ? 'cursor-move' : 'opacity-50'}
                        ${colorTheme === 'black-on-white'
                          ? 'bg-white border border-gray-300 hover:bg-gray-100 text-black'
                          : colorTheme === 'white-on-black'
                            ? 'bg-black border border-gray-500 hover:bg-gray-800 text-white'
                            : 'bg-black border border-yellow-400 hover:bg-yellow-900 text-yellow-300'
                        }`}
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
              const validation = getAnswerValidation(qNum);
              const borderColor = isReviewMode && validation.evaluation ?
                (validation.isCorrect ? 'border-green-500' : 'border-red-500') :
                inputStyles.borderColor;

              return (
                <span key={`input-wrap-${qNum}-${keyPrefix}`} className="inline-flex items-center">
                  <input
                    autoComplete="off"
                    key={`input-${qNum}-${keyPrefix}`}
                    type="text"
                    id={`input-question-${qNum}`}
                    data-question-number={qNum}
                    className={`border rounded-md px-3 py-1.5 mx-1 focus:outline-none focus:ring-2 focus:ring-lime-500 ${inputStyles.bgColor} ${inputStyles.textColor} ${borderColor} ${colorTheme === 'black-on-white' ? 'placeholder-gray' : inputStyles.placeholderColor} transition-all duration-200 ${location.state?.fromResultReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    value={answer}
                    onChange={e => !location.state?.fromResultReview && handleFillInBlankInput(qNum.toString(), e.target.value)}
                    placeholder={`Question ${qNum}`}
                    aria-label={`Question ${qNum}`}
                    style={{ minWidth: 60 }}
                    disabled={location.state?.fromResultReview}
                  />
                  {isReviewMode && validation.evaluation && (
                    <span className="ml-1">
                      {validation.isCorrect ? (
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  )}
                  {/* Display correct answer inline when incorrect */}
                  {isReviewMode && validation.evaluation && !validation.isCorrect && (
                    <div className="mt-1 text-sm">
                      <span className="text-green-600">{validation.correctAnswer}</span>
                    </div>
                  )}
                  {/* Locate and Explain icons */}
                  {isReviewMode && validation.evaluation && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      {validation.locate && onSearchClick && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // If qNum is 1-10, it's local - convert to global. If > 10, it's already global.
                            const globalQNum = parseInt(qNum) <= 10 ? ((currentPart - 1) * 10) + parseInt(qNum) : parseInt(qNum);
                            onSearchClick(globalQNum);
                          }}
                          className="p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Xem vị trí trong transcript"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      )}
                      {validation.explanation && onExplainClick && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // If qNum is 1-10, it's local - convert to global. If > 10, it's already global.
                            const globalQNum = parseInt(qNum) <= 10 ? ((currentPart - 1) * 10) + parseInt(qNum) : parseInt(qNum);
                            onExplainClick(globalQNum);
                          }}
                          className="p-1 rounded hover:bg-purple-100 transition-colors cursor-pointer"
                          title="Xem giải thích"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </span>
                  )}
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
      // Create a new span element for the highlight
      const span = document.createElement('span');
      span.className = colorTheme === 'black-on-white' ? 'ielts-highlight bg-yellow-200' :
        colorTheme === 'white-on-black' ? 'ielts-highlight bg-blue-800' : 'ielts-highlight bg-blue-900';
      span.setAttribute('data-highlight', 'true');
      span.setAttribute('data-part', currentPart.toString());
      span.setAttribute('data-timestamp', new Date().getTime());

      // Create a unique ID for this highlight
      const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      span.setAttribute('id', highlightId);

      // Apply the highlight
      highlightMenu.range.surroundContents(span);

      // Generate a unique signature for this highlight position
      const range = highlightMenu.range;
      const textNode = range.startContainer;
      const text = textNode.textContent;
      const highlightIndex = text.indexOf(highlightMenu.selection);
      const contextBefore = text.slice(Math.max(0, highlightIndex - 20), highlightIndex);
      const contextAfter = text.slice(highlightIndex + highlightMenu.selection.length, Math.min(text.length, highlightIndex + highlightMenu.selection.length + 20));
      const signature = `${contextBefore}|${highlightMenu.selection}|${contextAfter}`;

      // Create rangeInfo to help with restoration
      const rangeInfo = {
        contextBefore,
        contextAfter
      };

      // Save highlight to local storage with signature and rangeInfo
      const timestamp = new Date().getTime();
      const highlightData = {
        id: highlightId,
        text: highlightMenu.selection,
        part: currentPart,
        timestamp: timestamp,
        signature: signature,
        rangeInfo: rangeInfo,
        examId: examData?.exam_id
      };

      // Save to localStorage
      const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
      savedHighlights.push(highlightData);
      localStorage.setItem('ielts-highlights', JSON.stringify(savedHighlights));

      // Add to highlights array
      setHighlights(prev => [...prev, highlightData]);

      // Store the signature in the span element
      span.setAttribute('data-signature', signature);

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

  const handleCopy = () => {
    if (highlightMenu.selection) {
      navigator.clipboard.writeText(highlightMenu.selection)
        .then(() => {
          setHighlightMenu(prev => ({ ...prev, visible: false }));
          // Clear the selection
          window.getSelection().removeAllRanges();
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };

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

      // Remove from localStorage - use the ID directly
      const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
      const updatedHighlights = savedHighlights.filter(h => {
        // Check both id and timestamp-based matching for backward compatibility
        if (h.id === highlightId) return false;

        // Fallback to timestamp matching if IDs don't match
        const highlightTimestamp = highlightId.split('-')[1];
        return h.timestamp?.toString() !== highlightTimestamp;
      });
      localStorage.setItem('ielts-highlights', JSON.stringify(updatedHighlights));
    }
  };

  // Add event listeners for click outside
  useEffect(() => {
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

  // Add listener for highlight interactions
  useEffect(() => {
    // Function to process existing highlights in the DOM
    const processExistingHighlights = () => {
      const contentArea = document.getElementById('ielts-content-area');
      if (!contentArea) return;

      // Find all highlight elements
      const highlightElements = contentArea.querySelectorAll('[data-highlight="true"]');
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

  // Load saved highlights from localStorage
  useEffect(() => {
    const loadSavedHighlights = () => {
      const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
      // Load all highlights for this exam, not just for the current part
      const examHighlights = savedHighlights.filter(h => h.examId === examData?.exam_id);

      // Store in state for reference
      setHighlights(examHighlights.map(h => ({
        id: `highlight-${h.timestamp}-${Math.random().toString(36).substring(2, 9)}`,
        text: h.text,
        part: h.part,
        timestamp: h.timestamp,
        signature: h.signature, // Include the signature for accurate positioning
        rangeInfo: h.rangeInfo // Include range info for better restoration
      })));

      // Actual highlighting of saved content will happen when 
      // the content is rendered and text matches are found
    };

    if (examData?.exam_id) {
      loadSavedHighlights();
    }
  }, [examData?.exam_id, currentPart]); // Add currentPart to dependencies to reload highlights when part changes

  // Load saved notes from localStorage
  useEffect(() => {
    const loadSavedNotes = () => {
      const savedNotes = JSON.parse(localStorage.getItem('ielts-notes') || '[]');
      // Load all notes for this exam, not just for the current part
      const examNotes = savedNotes.filter(n => n.examId === examData?.exam_id);

      // Store in state for reference
      setNotes(examNotes);
    };

    if (examData?.exam_id) {
      loadSavedNotes();
    }
  }, [examData?.exam_id]); // Remove currentPart from dependencies as we want to load all notes once

  // Add this new function to restore highlights and notes to DOM
  useEffect(() => {
    const restoreHighlightsAndNotesToDOM = () => {
      const contentArea = document.getElementById('ielts-content-area');
      if (!contentArea) return;

      // Wait for content to be fully rendered
      setTimeout(() => {
        // Get saved highlights from localStorage to ensure we have the latest
        const savedHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
        const examHighlights = savedHighlights.filter(h => h.examId === examData?.exam_id);

        // Restore highlights
        if (examHighlights.length > 0) {
          // Keep track of which highlights we've already restored
          const processedHighlights = new Set();

          examHighlights.forEach(highlight => {
            // Only restore highlights for the current part
            if (highlight.part !== currentPart) return;

            // Skip if this highlight is already rendered in the DOM
            const highlightId = highlight.id || `highlight-${highlight.timestamp}`;
            const existingHighlightEl = contentArea.querySelector(`#${CSS.escape(highlightId)}`);
            if (existingHighlightEl) return;

            // Find text nodes that match the highlight text
            const walker = document.createTreeWalker(
              contentArea,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );

            // Collect all potential matches
            const potentialMatches = [];
            let textNode;

            while (textNode = walker.nextNode()) {
              const text = textNode.textContent;
              const highlightIndex = text.indexOf(highlight.text);

              // Skip if text not found
              if (highlightIndex === -1) continue;

              // Generate signature for current position
              const contextBefore = text.slice(Math.max(0, highlightIndex - 20), highlightIndex);
              const contextAfter = text.slice(highlightIndex + highlight.text.length, Math.min(text.length, highlightIndex + highlight.text.length + 20));
              const currentSignature = `${contextBefore}|${highlight.text}|${contextAfter}`;

              // Check if this position matches the stored signature
              const isSignatureMatch = highlight.signature === currentSignature;

              // Add to potential matches with context info
              potentialMatches.push({
                textNode,
                highlightIndex,
                contextBefore,
                contextAfter,
                signatureMatch: isSignatureMatch,
                exactMatch: highlight.rangeInfo &&
                  highlight.rangeInfo.contextBefore === contextBefore &&
                  highlight.rangeInfo.contextAfter === contextAfter
              });
            }

            // If we found a signature match, use it directly
            const signatureMatch = potentialMatches.find(match => match.signatureMatch);
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
              const aContextScore = (highlight.rangeInfo?.contextBefore?.includes(a.contextBefore) ? 2 : 0) +
                (highlight.rangeInfo?.contextAfter?.includes(a.contextAfter) ? 2 : 0);

              const bContextScore = (highlight.rangeInfo?.contextBefore?.includes(b.contextBefore) ? 2 : 0) +
                (highlight.rangeInfo?.contextAfter?.includes(b.contextAfter) ? 2 : 0);

              return bContextScore - aContextScore;
            });

            // Process the best match if available
            if (potentialMatches.length > 0 && !processedHighlights.has(highlight.id || highlight.timestamp)) {
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

                // Create highlight span
                const span = document.createElement('span');
                span.className = colorTheme === 'black-on-white' ? 'ielts-highlight bg-yellow-200' :
                  colorTheme === 'white-on-black' ? 'ielts-highlight bg-blue-800' : 'ielts-highlight bg-blue-900';
                span.setAttribute('data-highlight', 'true');
                span.setAttribute('data-part', highlight.part.toString());
                span.setAttribute('data-timestamp', highlight.timestamp);

                // Use existing ID or generate a new one
                const highlightId = highlight.id || `highlight-${highlight.timestamp}-${Math.random().toString(36).substring(2, 9)}`;
                span.setAttribute('id', highlightId);

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

                // Apply the highlight - preserving the original content including blank spaces
                const rangeContents = range.cloneContents();
                span.appendChild(rangeContents);
                range.deleteContents();
                range.insertNode(span);

                // Mark this highlight as processed so we don't highlight it again
                processedHighlights.add(highlight.id || highlight.timestamp);
              } catch (error) {
                console.warn('Could not restore highlight:', error);
              }
            }
          });
        }

        // Restore notes
        if (notes.length > 0) {
          notes.forEach(note => {
            // Only restore notes for the current part
            if (note.part !== currentPart) return;

            // Skip if this note is already rendered in the DOM
            const existingNoteEl = contentArea.querySelector(`[data-note-id="${note.id}"]`);
            if (existingNoteEl) return;

            // Find text nodes that match the note text
            const walker = document.createTreeWalker(
              contentArea,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );

            // Keep track of which notes we've already restored
            const processedNotes = new Set();

            let textNode;
            while (textNode = walker.nextNode()) {
              const text = textNode.textContent;
              const noteIndex = text.indexOf(note.selectedText);

              // Skip if text not found
              if (noteIndex === -1) continue;

              {
                // Generate signature for current position
                const contextBefore = text.slice(Math.max(0, noteIndex - 20), noteIndex);
                const contextAfter = text.slice(noteIndex + note.selectedText.length, Math.min(text.length, noteIndex + note.selectedText.length + 20));
                const currentSignature = `${contextBefore}|${note.selectedText}|${contextAfter}`;

                // Check if signatures match (preferred), or fallback to simple text match
                const isSignatureMatch = !note.signature || note.signature === currentSignature;

                // Only process this note if we haven't already restored it
                // and if the signature matches (or no signature was saved)
                if (isSignatureMatch && !processedNotes.has(note.id)) {
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
                    span.setAttribute('data-timestamp', note.timestamp);
                    span.setAttribute('data-signature', note.signature);
                    span.dataset.noteId = note.id;

                    // Create note indicator
                    const noteIndicator = document.createElement('span');
                    noteIndicator.className = 'note-indicator';
                    noteIndicator.style.position = 'absolute';
                    noteIndicator.style.top = '-8px';
                    noteIndicator.style.right = '-8px';
                    noteIndicator.style.backgroundColor = '#6ee7b7';
                    noteIndicator.style.borderRadius = '50%';
                    noteIndicator.style.width = '16px';
                    noteIndicator.style.height = '16px';
                    noteIndicator.style.display = 'flex';
                    noteIndicator.style.alignItems = 'center';
                    noteIndicator.style.justifyContent = 'center';
                    noteIndicator.style.fontSize = '12px';
                    noteIndicator.innerHTML = '📝';
                    span.appendChild(noteIndicator);

                    // Apply the note - preserving the original content including blank spaces
                    const rangeContents = range.cloneContents();
                    span.appendChild(rangeContents);
                    range.deleteContents();
                    range.insertNode(span);

                    // Mark this note as processed
                    processedNotes.add(note.id);

                    // Store the exact position information
                    span.setAttribute('data-position', JSON.stringify({
                      textContent: text,
                      offset: noteIndex
                    }));

                    // Add click handler to show note
                    span.addEventListener('click', (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setNoteDialog({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        text: note.text,
                        selection: null,
                        noteId: note.id,
                        range: null
                      });
                    });

                    break; // Found and noted, move to next note
                  } catch (error) {
                    console.warn('Could not restore note:', error);
                  }
                }
              }
            }
          });
        }
      }, 100); // Small delay to ensure DOM is ready
    };

    // Restore highlights and notes when content changes
    if (mainText && (highlights.length > 0 || notes.length > 0)) {
      restoreHighlightsAndNotesToDOM();
    }
  }, [highlights, notes, mainText, currentPart, colorTheme, examData?.exam_id]);

  // Effect to apply retake mode styling
  useEffect(() => {
    if (retakeIncorrectMode) {
      // FORCE REMOVE any lingering flags from previous renders/hot-reloads
      document.querySelectorAll('.retake-flag').forEach(el => el.remove());
      document.querySelectorAll('.retake-lock-icon').forEach(el => el.remove());

      // Find all inputs and interactive elements (now including checkboxes)
      const interactiveElements = document.querySelectorAll('input[type="text"], input[type="radio"], input[type="checkbox"], .ielts-drop-zone');

      interactiveElements.forEach(element => {
        let questionNum;

        if (element.tagName === 'INPUT') {
          if (element.type === 'radio') {
            const name = element.getAttribute('name');
            if (name && name.startsWith('question_')) {
              questionNum = parseInt(name.replace('question_', ''));
            } else if (name && name.startsWith('table_question_')) {
              questionNum = parseInt(name.replace('table_question_', ''));
            }

            // For radios: simple disable for correct answers, no heavy styling
            if (questionNum && !isQuestionIncorrect(questionNum)) {
              element.disabled = true;
              element.style.pointerEvents = 'none';
              element.style.opacity = '0.6';
              element.style.cursor = 'not-allowed';
            } else if (questionNum) {
              element.disabled = false;
              element.style.pointerEvents = 'auto';
              element.style.opacity = '1';
            }
            return; // Skip the generic block below for radios

          } else if (element.type === 'checkbox') {
            // Checkbox IDs are like: checkbox_18_A
            const cbId = element.id || '';
            const cbMatch = cbId.match(/checkbox_(\d+)_(.+)/);
            if (cbMatch) {
              const sectionStart = parseInt(cbMatch[1]);
              const optionValue = cbMatch[2];
              const section = checkboxQuestions.find(s => s.startNum === sectionStart);
              if (section) {
                // Determine which selected options map to which question numbers
                // Get all currently checked options for this section (sorted alphabetically)
                const allCheckboxes = document.querySelectorAll(`input[id^="checkbox_${sectionStart}_"]`);
                const checkedOptions = [];
                allCheckboxes.forEach(cb => {
                  if (cb.checked) {
                    const m = cb.id.match(/checkbox_\d+_(.+)/);
                    if (m) checkedOptions.push(m[1]);
                  }
                });
                checkedOptions.sort();

                // Map each checked option to a question number in order
                const questionRange = Array.from(
                  { length: section.endNum - section.startNum + 1 },
                  (_, idx) => section.startNum + idx
                );

                // Check if THIS option is currently checked and maps to a correct question
                const optionIndex = checkedOptions.indexOf(optionValue);
                if (optionIndex !== -1 && optionIndex < questionRange.length) {
                  const mappedQuestion = questionRange[optionIndex];
                  if (isQuestionCorrectRetake(mappedQuestion)) {
                    // This specific option maps to a correct answer — lock it
                    element.disabled = true;
                    element.style.pointerEvents = 'none';
                    element.style.opacity = '0.6';
                    element.style.cursor = 'not-allowed';
                    // Add green styling to parent div
                    const parentDiv = element.closest('div');
                    if (parentDiv) {
                      parentDiv.style.backgroundColor = '#ecfdf5';
                      parentDiv.style.borderLeft = '3px solid #10b981';
                      parentDiv.style.paddingLeft = '8px';
                    }
                  } else {
                    // This option maps to an incorrect answer — keep interactive
                    element.disabled = false;
                    element.style.pointerEvents = 'auto';
                    element.style.opacity = '1';
                  }
                } else {
                  // This option is not currently checked — keep interactive
                  element.disabled = false;
                  element.style.pointerEvents = 'auto';
                  element.style.opacity = '1';
                }
              }
            }
            return; // Skip the generic block below for checkboxes

          } else {
            // Text input — use multiple strategies to find question number
            // Strategy 1: data-question-number attribute
            const dataQNum = element.getAttribute('data-question-number');
            if (dataQNum && /^\d+$/.test(dataQNum)) {
              questionNum = parseInt(dataQNum);
            }
            // Strategy 2: id like input-question-15
            if (!questionNum) {
              const inputId = element.id || '';
              const idMatch = inputId.match(/input-question-(\d+)/);
              if (idMatch) {
                questionNum = parseInt(idMatch[1]);
              }
            }
            // Strategy 3: name attribute
            if (!questionNum) {
              const nameAttr = element.getAttribute('name');
              if (nameAttr && /^\d+$/.test(nameAttr)) {
                questionNum = parseInt(nameAttr);
              }
            }
            // Strategy 4: closest parent with data-question-number
            if (!questionNum) {
              const qParent = element.closest('[data-question-number]');
              if (qParent) {
                questionNum = parseInt(qParent.getAttribute('data-question-number'));
              }
            }
            // Strategy 5 (fallback): <strong> in parent
            if (!questionNum) {
              const parent = element.closest('p, div, td');
              if (parent) {
                const strong = parent.querySelector('strong');
                if (strong && /^\d+$/.test(strong.textContent.trim())) {
                  questionNum = parseInt(strong.textContent.trim());
                }
              }
            }
          }
        } else if (element.classList.contains('ielts-drop-zone')) {
          const parent = element.parentElement;
          if (parent) {
            const strong = parent.querySelector('strong');
            if (strong && /^\d+$/.test(strong.textContent.trim())) {
              questionNum = parseInt(strong.textContent.trim());
            }
          }
        }

        // Generic block for text inputs and drop zones (not radios/checkboxes which return early)
        if (questionNum) {
          const isIncorrect = isQuestionIncorrect(questionNum);

          if (isIncorrect) {
            // Apply incorrect styling - just ensure it's interactive
            element.disabled = false;
            element.readOnly = false;
            element.style.pointerEvents = 'auto';
            element.style.opacity = '1';
            element.style.cursor = 'text';

            // Reset styles that might have been set
            element.style.borderColor = '';
            element.style.borderWidth = '';
            element.style.boxShadow = '';
            element.style.backgroundColor = '';
            element.classList.remove('animate-pulse');
          } else {
            // Apply correct locked styling — disable the input
            element.style.backgroundColor = '#ecfdf5'; // green-50
            element.style.borderColor = '#10b981'; // green-500
            element.style.borderWidth = '2px';
            element.style.color = '#065f46'; // green-800

            // Disable interaction
            element.disabled = true;
            if (element.tagName === 'INPUT') {
              element.readOnly = true;
            }
            element.style.pointerEvents = 'none';
            element.style.opacity = '0.8';
            element.style.cursor = 'not-allowed';

            // Add a small lock icon after the input if not already present
            if (!element.nextElementSibling?.classList?.contains('retake-lock-icon')) {
              const lockIcon = document.createElement('span');
              lockIcon.className = 'retake-lock-icon';
              lockIcon.innerHTML = '🔒';
              lockIcon.style.cssText = 'margin-left: 4px; font-size: 14px; vertical-align: middle;';
              element.parentNode.insertBefore(lockIcon, element.nextSibling);
            }
          }
        }
      });
    }
  }, [retakeIncorrectMode, incorrectQuestionNumbers, mainText, currentPart]);

  return (
    <div className={`${themeClass}`}>
      <div className={`${colorTheme === 'black-on-white' ? 'bg-[#f3f3eb]' : 'bg-gray-800'} m-4 p-3 rounded-lg border ${colorTheme === 'black-on-white' ? 'border-gray-300' : 'border-gray-600'}`}>
        <h3 className="font-bold text-lg mb-2">Part {Math.floor(questionNumber / 10) + 1}</h3>
        <p className={colorTheme === 'black-on-white' ? 'text-black-600' : ''}>Listen and answer questions {questionNumber}-{questionNumber + 9}.</p>
      </div>
      <div
        ref={contentAreaRef}
        className={`p-4 ${colorTheme !== 'black-on-white' ? themeClass : 'bg-white'}`}
        id="ielts-content-area"
        onContextMenu={handleContextMenu}
        onMouseUp={handleTextSelection}
      >
        {renderContent()}
      </div>

      {/* Highlight Menu */}
      {/* YouPass-style Right-Click Context Menu */}
      {highlightMenu.visible && (
        <div
          ref={menuRef}
          className={`fixed z-50 shadow-xl rounded-lg overflow-hidden border ${colorTheme === 'black-on-white' ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-600'}`}
          style={{
            left: `${Math.min(highlightMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(highlightMenu.y, window.innerHeight - 200)}px`,
            minWidth: '160px',
          }}
        >
          <div className="flex flex-col py-1">
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
                  onClick={handleCopy}
                  className={`px-4 py-2.5 text-left text-sm ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'} flex items-center gap-2 transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={handleAddNote}
                  className={`px-4 py-2.5 text-left text-sm ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'} flex items-center gap-2 transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Add Note
                </button>
                {isTranslatorEnabled && (
                  <button
                    onClick={handleTranslate}
                    className={`px-4 py-2.5 text-left text-sm ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'} flex items-center gap-2 transition-colors`}
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
          className="fixed z-50 p-4 rounded-lg shadow-lg bg-yellow-50 border border-yellow-200"
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

export default ListeningTest;
