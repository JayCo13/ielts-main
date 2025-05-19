import React, { useState, useEffect, useRef } from 'react';
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
}) => {
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
    range: null
  });
  const [highlights, setHighlights] = useState([]);
  const contentAreaRef = useRef(null);
  const menuRef = useRef(null);

  // Get theme styles
  const { themeClass, inputStyles } = getThemeStyles(colorTheme);

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

      setQuestionMap(qMap);

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

      // Also load checkbox answers
      Object.keys(examAnswers).forEach(questionId => {
        const answer = examAnswers[questionId];
        if (answer && answer.length === 1 && answer >= 'A' && answer <= 'Z') {
          const questionNum = Object.entries(qMap).find(([num, id]) => id.toString() === questionId.toString())?.[0];
          if (questionNum) {
            const section = checkboxQuestions.find(s =>
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

      // Extract all question types
      setMultipleChoiceQuestions(extractMultipleChoiceQuestions(tempDiv.innerHTML));
      setCheckboxQuestions(extractCheckboxQuestions(tempDiv.innerHTML));
      setTableRadioSections(extractTableRadioQuestions(tempDiv.innerHTML));
      setDragDropSections(extractDragDropQuestions(tempDiv.innerHTML));
      setFilledInBlanks(extractFillInBlanks(tempDiv.innerHTML));
    }
  }, [question, examData, currentPart, textSize, colorTheme]);

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
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
    }
  };

  const handleFillInBlankInput = (number, value) => {
    setInputs(prev => ({ ...prev, [number]: value }));
    const questionId = questionMap[number];
    if (questionId) {
      onAnswerChange(questionId, value);
      saveAnswer(examData?.exam_id, questionId, value);
    }
  };
  const handleTableRadioInput = (number, value) => {
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
        return (
          <span key={`input-wrap-${qNum}-${keyPrefix}`} className="inline-flex items-center">
            <input
              key={`input-${qNum}-${keyPrefix}`}
              type="text"
              id={`input-question-${qNum}`}
              data-question-number={qNum}
              className={`border rounded-md px-3 py-1.5 mx-1 focus:outline-none focus:ring-2 focus:ring-lime-500 ${inputStyles.bgColor} ${inputStyles.textColor} ${inputStyles.borderColor} ${colorTheme === 'black-on-white' ? 'placeholder-gray' : inputStyles.placeholderColor} transition-all duration-200`}
              value={answer}
              onChange={e => handleFillInBlankInput(qNum ? qNum.toString() : '', e.target.value)}
              placeholder={qNum ? `Question ${qNum}` : 'Question'}
              aria-label={qNum ? `Question ${qNum}` : 'Question'}
              style={{ minWidth: 60 }}
            />
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
        contentParts.push(
          <div key={`mc_${q.number}`} className="mb-4" id={`question-${q.number}`} data-question-number={q.number}>
            <p className="mb-2">
              <strong>{q.number}</strong> {q.text}
              {hardQuestions && hardQuestions[q.number] && (
                <span className="inline-block ml-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </p>
            <div className="ml-6 space-y-2">
              {q.options.map((option, i) => {
                const optionValue = String.fromCharCode(65 + i); // A, B, C
                return (
                  <div key={i} className="flex items-center mb-2">
                    <input
                      type="radio"
                      name={`question_${q.number}`}
                      id={`question_${q.number}_${optionValue}`}
                      value={optionValue}
                      checked={inputs[q.number] === optionValue}
                      onChange={() => handleRadioInput(q.number, optionValue)}
                      className={`w-4 h-4 focus:ring-lime-500
                        ${colorTheme === 'black-on-white'
                          ? 'text-lime-500 border-gray-300 bg-white'
                          : colorTheme === 'white-on-black'
                            ? 'text-yellow-300 border-gray-500 bg-black'
                            : 'text-yellow-300 border-yellow-400 bg-black'
                        }`
                      }
                    />
                    <label htmlFor={`question_${q.number}_${optionValue}`} className="ml-2">
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
                // The question number for this option (distribute sequentially)
                const questionNum = s.startNum + i;
                return (
                  <div key={i} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`checkbox_${s.startNum}_${optionValue}`}
                      checked={inputs[key] || false}
                      onChange={(e) => handleCheckboxChange(s.startNum, optionValue, e.target.checked)}
                      className={`w-4 h-4 focus:ring-lime-500
                        ${colorTheme === 'black-on-white'
                          ? 'text-lime-500 border-gray-300 bg-white'
                          : colorTheme === 'white-on-black'
                            ? 'text-yellow-300 border-gray-500 bg-black'
                            : 'text-yellow-300 border-yellow-400 bg-black'
                        }`
                      }
                    />
                    <label htmlFor={`checkbox_${s.startNum}_${optionValue}`} className="ml-2">
                      {option}
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
            className={`mb-6 p-4 rounded-lg shadow-sm border ${themeClass} ${colorTheme === 'black-on-white' ? 'border-gray-200' : 'border-gray-700'}`}
            id={`question-section-${s.startNum}-${s.endNum}`}
            data-question-range={`${s.startNum}-${s.endNum}`}
          >
            <table className={`w-full border-collapse border ${colorTheme === 'black-on-white' ? 'border-gray-300' : 'border-gray-600'} ${themeClass}`}>
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
                      </td>
                      {question.options.map((option, oIndex) => (
                        <td key={`${questionNum}-option-${oIndex}`} className="border border-gray-300 p-2 text-center">
                          <div
                            onClick={() => handleTableRadioInput(questionNum, option)}
                            className={`w-5 h-5 rounded-full border mx-auto cursor-pointer flex items-center justify-center
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
                              }`}
                          >
                            {currentAnswer === option && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                        </td>
                      ))}
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

                  return (
                    <div key={`article-${i}`} className="ielts-article flex items-center flex-wrap">
                      <span dangerouslySetInnerHTML={{ __html: beforeDropZone }} />
                      <div
                        onDragOver={e => handleDragOver(e, questionNum)}
                        onDrop={e => handleDrop(e, questionNum)}
                        onDragLeave={() => { setDragOverZone(null); setDragCursor(null); }}
                        className={`inline-flex items-center justify-between mx-1 min-w-[100px] h-8 px-2 rounded
                          ${currentAnswer
                            ? `${colorTheme === 'black-on-white' ? 'bg-blue-100 border border-blue-300' : 'bg-gray-700 border border-gray-500'}`
                            : `${colorTheme === 'black-on-white' ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-800 border-2 border-dashed border-gray-600'}`
                          }`
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
                              draggable
                              onDragStart={e => handleDragStart(e, currentAnswer, questionNum)}
                              onDragEnd={handleDragEnd}
                              className={`px-3 py-1 rounded cursor-move font-medium ${
                                colorTheme === 'black-on-white'
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
                            className={`text-center w-full text-sm flex items-center justify-center min-h-[24px] ${
                              colorTheme === 'black-on-white'
                                ? 'text-gray-400'
                                : colorTheme === 'white-on-black'
                                  ? 'text-yellow-200'
                                  : 'text-yellow-300'
                            }`}
                          >
                            Drop here
                          </span>
                        )}
                      </div>
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
                      draggable={true}
                      onDragStart={e => handleDragStart(e, option.label)}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-2 rounded-md transition-colors cursor-move
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

              return (
                <span key={`input-wrap-${qNum}-${keyPrefix}`} className="inline-flex items-center">
                  <input
                    key={`input-${qNum}-${keyPrefix}`}
                    type="text"
                    id={`input-question-${qNum}`}
                    data-question-number={qNum}
                    className={`border rounded-md px-3 py-1.5 mx-1 focus:outline-none focus:ring-2 focus:ring-lime-500 ${inputStyles.bgColor} ${inputStyles.textColor} ${inputStyles.borderColor} ${colorTheme === 'black-on-white' ? 'placeholder-gray' : inputStyles.placeholderColor} transition-all duration-200`}
                    value={answer}
                    onChange={e => handleFillInBlankInput(qNum.toString(), e.target.value)}
                    placeholder={`Question ${qNum}`}
                    aria-label={`Question ${qNum}`}
                    style={{ minWidth: 60 }}
                  />
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
            <path d="M16 9v14M9 16h14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
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

  // Add new highlight handlers
  const handleContextMenu = (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectionText = selection.toString().trim();
    
    if (selectionText.length > 0) {
      // Get the range of the selection
      const range = selection.getRangeAt(0);
      
      // Show the highlight menu at the cursor position
      setHighlightMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selection: selectionText,
        range: range
      });
    }
  };
  
  const handleClickOutside = (e) => {
    // Close the highlight menu if clicked outside
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setHighlightMenu(prev => ({...prev, visible: false}));
    }
  };
  
  const handleHighlight = () => {
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
      
      // Add title for the tooltip
      span.setAttribute('title', 'Hover to remove highlight');
      
      // Apply the highlight
      highlightMenu.range.surroundContents(span);
      
      // Add event listener to this specific highlight for removal
      const highlightElement = document.getElementById(highlightId);
      if (highlightElement) {
        highlightElement.addEventListener('click', (e) => {
          // If holding Ctrl key when clicking, remove the highlight
          if (e.ctrlKey) {
            removeHighlight(highlightId);
          }
        });
        
        // Add hover effect
        highlightElement.addEventListener('mouseenter', () => {
          highlightElement.classList.add('highlight-hover');
        });
        
        highlightElement.addEventListener('mouseleave', () => {
          highlightElement.classList.remove('highlight-hover');
        });
      }
      
      // Save highlight to local storage
      saveHighlight(highlightMenu.selection, currentPart, examData?.exam_id);
      
      // Add to highlights array
      setHighlights(prev => [...prev, {
        id: highlightId,
        text: highlightMenu.selection,
        part: currentPart,
        timestamp: new Date().getTime()
      }]);
      
      // Close the menu
      setHighlightMenu(prev => ({...prev, visible: false}));
      
      // Clear the selection
      window.getSelection().removeAllRanges();
    } catch (e) {
      console.error('Error applying highlight:', e);
    }
  };
  
  const handleCopy = () => {
    if (highlightMenu.selection) {
      navigator.clipboard.writeText(highlightMenu.selection)
        .then(() => {
          setHighlightMenu(prev => ({...prev, visible: false}));
          // Clear the selection
          window.getSelection().removeAllRanges();
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };
  
  const removeHighlight = (highlightId) => {
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
      .highlight-hover {
        background-color: rgba(239, 68, 68, 0.2) !important;
      }
      .highlight-hover::after {
        content: 'Remove';
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        background-color: white;
        color: #ef4444;
        border: 1px solid #ef4444;
        border-radius: 4px;
        padding: 2px 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.9;
        white-space: nowrap;
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
        el.setAttribute('title', 'Click to remove highlight');
        
        // Add ID if missing
        if (!el.id) {
          const timestamp = el.getAttribute('data-timestamp') || Date.now();
          const highlightId = `highlight-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
          el.id = highlightId;
        }
        
        // Add click event for removal
        el.addEventListener('click', () => {
          removeHighlight(el.id);
        });
        
        // Add hover effects
        el.addEventListener('mouseenter', () => {
          el.classList.add('highlight-hover');
        });
        
        el.addEventListener('mouseleave', () => {
          el.classList.remove('highlight-hover');
        });
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
      const examHighlights = savedHighlights.filter(h => h.examId === examData?.exam_id);
      
      // Store in state for reference
      setHighlights(examHighlights.map(h => ({
        id: `highlight-${h.timestamp}-${Math.random().toString(36).substring(2, 9)}`,
        text: h.text,
        part: h.part,
        timestamp: h.timestamp
      })));
      
      // Actual highlighting of saved content will happen when 
      // the content is rendered and text matches are found
    };
    
    if (examData?.exam_id) {
      loadSavedHighlights();
    }
  }, [examData?.exam_id]);

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
      >
        {renderContent()}
      </div>
      
      {/* Highlight Menu */}
      {highlightMenu.visible && (
        <div 
          ref={menuRef}
          className={`fixed z-50 shadow-lg rounded-md overflow-hidden ${colorTheme === 'black-on-white' ? 'bg-white' : 'bg-gray-800'}`} 
          style={{
            left: `${highlightMenu.x}px`,
            top: `${highlightMenu.y}px`,
          }}
        >
          <div className="flex flex-col">
            <button 
              onClick={handleCopy}
              className={`px-4 py-2 text-left hover:bg-gray-100 ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-gray-700 text-white'} flex items-center`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
            <button 
              onClick={handleHighlight}
              className={`px-4 py-2 text-left hover:bg-gray-100 ${colorTheme === 'black-on-white' ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-gray-700 text-white'} flex items-center`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Highlight
            </button>
      </div>
        </div>
      )}
    </div>
  );
};

export default ListeningTest;