import DOMPurify from 'dompurify';

// Utility function to save answers to localStorage
export const saveAnswer = (examId, questionId, value) => {
  const savedAnswers = JSON.parse(localStorage.getItem('ielts-answers') || '{}');
  if (!savedAnswers[examId]) {
    savedAnswers[examId] = {};
  }
  savedAnswers[examId][questionId] = value;
  localStorage.setItem('ielts-answers', JSON.stringify(savedAnswers));
};

// Utility function to save highlights to localStorage
export const saveHighlight = (text, part, examId) => {
  const highlightData = {
    text,
    part,
    examId,
    timestamp: new Date().getTime()
  };
  const existingHighlights = JSON.parse(localStorage.getItem('ielts-highlights') || '[]');
  existingHighlights.push(highlightData);
  localStorage.setItem('ielts-highlights', JSON.stringify(existingHighlights));
};

// Utility function to extract multiple choice questions from content
export const extractMultipleChoiceQuestions = (content) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(content);
  const mcQuestions = [];

  // Find all question numbers with bold formatting
  const boldElements = tempDiv.querySelectorAll('strong');

  for (const boldEl of boldElements) {
    const num = boldEl.textContent.trim();

    // Check if this is a question number
    if (/^\d+$/.test(num)) {
      // Find the parent paragraph
      const questionP = boldEl.closest('p');
      if (!questionP) continue;

      const questionText = questionP.textContent.replace(num, '').trim();

      // Check if the next elements are radio inputs
      const options = [];
      let nextEl = questionP.nextElementSibling;
      let hasRadio = false;

      while (nextEl && nextEl.tagName === 'P') {
        if (nextEl.querySelector('input.ielts-radio')) {
          hasRadio = true;
          options.push(nextEl.textContent.trim());
        } else if (hasRadio) {
          // We've reached the end of the options
          break;
        }
        nextEl = nextEl.nextElementSibling;
      }

      // Only add if we found radio options
      if (options.length > 0) {
        mcQuestions.push({
          number: num,
          text: questionText,
          options: options
        });
      }
    }
  }

  return mcQuestions;
};

// Utility function to extract checkbox questions from content
export const extractCheckboxQuestions = (content) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(content);
  const checkboxSections = [];
  
  // Track processed question ranges to avoid duplicates
  const processedRanges = new Set();

  // Find all "Questions X-Y" sections
  const paragraphs = tempDiv.querySelectorAll('p');
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.textContent.trim();

    // Check if this is a section header (Questions X-Y)
    const sectionMatch = text.match(/Questions\s+(\d+)\s*(?:–|-|&ndash;)\s*(\d+)/i);
    if (sectionMatch) {
      const startNum = parseInt(sectionMatch[1]);
      const endNum = parseInt(sectionMatch[2]);
      
      // Validate question range
      if (startNum >= endNum) continue;
      
      // Skip if we've already processed this range
      const rangeKey = `${startNum}-${endNum}`;
      if (processedRanges.has(rangeKey)) {
        continue;
      }

      // Look for checkbox instructions in the next few paragraphs
      let j = i + 1;
      let instructionText = '';
      let options = [];
      let isCheckboxSection = false;
      let selectCount = 0;
      let foundValidSection = false;
      let hasActiveCheckboxes = false;

      // Check the next few paragraphs for checkbox instructions and options
      while (j < paragraphs.length && j < i + 15) {
        const nextP = paragraphs[j];
        const nextText = nextP.textContent.trim();

        // Check if this paragraph contains checkbox instructions
        if (!foundValidSection) {
          if (nextText.includes('Choose THREE') || nextText.includes('Choose THREE letters')) {
            // Check for active checkboxes in the following paragraphs
            let k = j + 1;
            while (k < j + 5 && k < paragraphs.length) {
              if (paragraphs[k].querySelector('input.ielts-checkbox')) {
                hasActiveCheckboxes = true;
                break;
              }
              k++;
            }
            if (hasActiveCheckboxes) {
              isCheckboxSection = true;
              instructionText = nextText;
              selectCount = 3;
              foundValidSection = true;
              options = [];
            }
          } else if (nextText.includes('Choose TWO') || nextText.includes('Choose TWO letters')) {
            // Check for active checkboxes in the following paragraphs
            let k = j + 1;
            while (k < j + 5 && k < paragraphs.length) {
              if (paragraphs[k].querySelector('input.ielts-checkbox')) {
                hasActiveCheckboxes = true;
                break;
              }
              k++;
            }
            if (hasActiveCheckboxes) {
              isCheckboxSection = true;
              instructionText = nextText;
              selectCount = 2;
              foundValidSection = true;
              options = [];
            }
          }
        }

        // Only collect options after finding a valid section with active checkboxes
        if (foundValidSection && hasActiveCheckboxes) {
          const hasCheckbox = nextP.querySelector('input.ielts-checkbox');
          if (hasCheckbox) {
            options.push(nextText);
          }
        }

        // Break if we find another section header
        if (j > i + 1 && nextText.match(/Questions\s+\d+\s*(?:–|-|&ndash;)\s*\d+/i)) {
          break;
        }

        j++;
      }

      // Only add sections that have active checkboxes, valid options, and correct selectCount
      if (isCheckboxSection && hasActiveCheckboxes && options.length > 0 && (selectCount === 2 || selectCount === 3)) {
        // Check if this section is already in the list with the same start and end numbers
        const existingSection = checkboxSections.find(s => 
          s.startNum === startNum && s.endNum === endNum &&
          s.instructionText === instructionText &&
          JSON.stringify(s.options) === JSON.stringify(options)
        );

        // Only add if this section is not already in the list
        if (!existingSection) {
          checkboxSections.push({
            startNum,
            endNum,
            instructionText,
            options,
            selectCount,
            position: i
          });
          // Mark this range as processed only if we found a valid section
          processedRanges.add(rangeKey);
        }
      }
    }
  }

  return checkboxSections;
};


// Utility function to get styling based on color theme

export const getThemeStyles = (colorTheme) => {
  const colorThemeClasses = {
    'black-on-white': 'bg-white text-black',
    'white-on-black': 'bg-black text-white',
    'yellow-on-black': 'bg-black text-yellow-300',
  };

  const inputStyles = {
    bgColor: colorTheme === 'black-on-white' ? 'bg-white' : 'bg-gray-800',
    textColor: colorTheme === 'black-on-white' ? 'text-black' : 
               colorTheme === 'white-on-black' ? 'text-white' : 'text-yellow-300',
    borderColor: colorTheme === 'black-on-white' ? 'border-gray-300' : 'border-gray-600',
    placeholderColor: colorTheme === 'black-on-white' ? 'placeholder-black' : 
                      colorTheme === 'white-on-black' ? 'placeholder-gray-300' : 'placeholder-yellow-200',
    highlightColor: colorTheme === 'black-on-white' ? 'bg-yellow-200' : 
                    colorTheme === 'white-on-black' ? 'bg-blue-800' : 'bg-blue-900'
  };

  return {
    themeClass: colorThemeClasses[colorTheme] || 'bg-white text-black',
    inputStyles
  };
};

// Utility function to extract table radio questions from content
export const extractTableRadioQuestions = (content) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(content);
  const tableRadioSections = [];

  // Find all tables with radio inputs
  const tables = tempDiv.querySelectorAll('table');
  
  for (const table of tables) {
    // Check if this table contains radio inputs
    const radioInputs = table.querySelectorAll('input.ielts-radio');
    if (radioInputs.length === 0) continue;
    
    // Find the question range this table belongs to
    let questionRange = null;
    let prevElement = table.previousElementSibling;
    
    // Look for a heading with question range before the table
    while (prevElement && !questionRange) {
      const text = prevElement.textContent.trim();
      const rangeMatch = text.match(/Questions?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
      
      if (rangeMatch) {
        if (rangeMatch[2]) {
          // Range format: "Questions X-Y"
          questionRange = {
            start: parseInt(rangeMatch[1]),
            end: parseInt(rangeMatch[2])
          };
        } else {
          // Single question format: "Question X"
          questionRange = {
            start: parseInt(rangeMatch[1]),
            end: parseInt(rangeMatch[1])
          };
        }
        break;
      }
      
      prevElement = prevElement.previousElementSibling;
    }
    
    // If we couldn't find a question range, try to extract it from the table rows
    if (!questionRange) {
      const questionCells = table.querySelectorAll('td strong');
      const questionNumbers = [];
      
      for (const cell of questionCells) {
        const num = parseInt(cell.textContent.trim());
        if (!isNaN(num)) {
          questionNumbers.push(num);
        }
      }
      
      if (questionNumbers.length > 0) {
        questionRange = {
          start: Math.min(...questionNumbers),
          end: Math.max(...questionNumbers)
        };
      }
    }
    
    // Skip if we couldn't determine the question range
    if (!questionRange) continue;
    
    // Extract questions and options from the table
    const questions = [];
    const rows = table.querySelectorAll('tr');
    
    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      if (cells.length < 2) continue;
      
      // Extract question number and text
      const questionCell = cells[0];
      const strongElement = questionCell.querySelector('strong');
      
      if (!strongElement) continue;
      
      const questionNum = strongElement.textContent.trim();
      if (!/^\d+$/.test(questionNum)) continue;
      
      const questionText = questionCell.textContent.replace(questionNum, '').trim();
      
      // Extract options (A, B, C, etc.)
      const options = [];
      for (let j = 1; j < cells.length; j++) {
        const radio = cells[j].querySelector('input.ielts-radio');
        if (radio) {
          options.push(radio.value);
        }
      }
      
      questions.push({
        number: questionNum,
        text: questionText,
        options: options
      });
    }
    
    // Only add if we found valid questions
    if (questions.length > 0) {
      tableRadioSections.push({
        type: 'table_radio',
        startNum: questionRange.start,
        endNum: questionRange.end,
        questions: questions,
        tableElement: table
      });
    }
  }
  
  return tableRadioSections;
};
export function extractFillInBlanks(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(html);
  
  const blanks = {};
  const tableQuestionNumbers = new Set(); // Track all question numbers in tables

  // Process tables first
  const tables = tempDiv.querySelectorAll('table');
  tables.forEach(table => {
    const inputs = table.querySelectorAll('input.ielts-textfield');
    if (inputs.length === 0) return;
    
    // Find the question range from the table
    let questionRange = null;
    let prevElement = table.previousElementSibling;
    
    // Look for a heading with question range before the table
    while (prevElement && !questionRange) {
      const text = prevElement.textContent.trim();
      const rangeMatch = text.match(/Questions?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
      
      if (rangeMatch) {
        if (rangeMatch[2]) {
          // Range format: "Questions X-Y"
          questionRange = {
            start: parseInt(rangeMatch[1]),
            end: parseInt(rangeMatch[2])
          };
        } else {
          // Single question format: "Question X"
          questionRange = {
            start: parseInt(rangeMatch[1]),
            end: parseInt(rangeMatch[1])
          };
        }
        break;
      }
      
      prevElement = prevElement.previousElementSibling;
    }
    
    // If we couldn't find a question range, try to extract it from the table rows
    if (!questionRange) {
      const questionCells = table.querySelectorAll('td strong');
      const questionNumbers = [];
      
      for (const cell of questionCells) {
        const num = parseInt(cell.textContent.trim());
        if (!isNaN(num)) {
          questionNumbers.push(num);
        }
      }
      
      if (questionNumbers.length > 0) {
        questionRange = {
          start: Math.min(...questionNumbers),
          end: Math.max(...questionNumbers)
        };
      }
    }
    
    // Skip if we couldn't determine the question range
    if (!questionRange) return;
    
    // Find all question numbers in the table and mark as processed
    for (let q = questionRange.start; q <= questionRange.end; q++) {
      tableQuestionNumbers.add(q);
    }
    // Find the first question number in the table
    const firstQuestionNum = questionRange.start;
    
    blanks[firstQuestionNum] = {
      questionNumber: firstQuestionNum,
      element: table,
      originalHTML: table.outerHTML,
      cleanedHTML: table.outerHTML,
      placeholder: firstQuestionNum.toString(),
      isTable: true,
      styles: {}
    };
  });
  
  // Process non-table elements
  const processedElements = new Set(); // Track processed elements
  
  // Process all elements with input fields
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(element => {
    // Skip if element has already been processed
    if (processedElements.has(element)) return;
    
    const inputField = element.querySelector('input.ielts-textfield');
    if (!inputField) return;
    
    // Find the question number
    const strongTag = element.querySelector('strong');
    if (!strongTag) return;
    
    const questionNumber = parseInt(strongTag.textContent.trim());
    if (isNaN(questionNumber)) return;
    
    // Skip if this question is already processed or is in a table
    if (blanks[questionNumber] || tableQuestionNumbers.has(questionNumber)) return;
    
    // Mark this element and its children as processed
    processedElements.add(element);
    element.querySelectorAll('*').forEach(child => processedElements.add(child));
    
    // Create a clean version of the content
    const cleanedElement = element.cloneNode(true);
    
    // Find dots pattern and replace with input
    const text = cleanedElement.textContent;
    const dotsPattern = /(\d+)\s*\.{3,}/g;
    const matches = text.match(dotsPattern);
    
    if (matches) {
      // Get the input that belongs to this element
      const input = cleanedElement.querySelector('input.ielts-textfield');
      if (input) {
        // Create a wrapper div to maintain layout
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexWrap = 'wrap';
        wrapper.style.gap = '8px';
        wrapper.style.alignItems = 'baseline';
        
        // Split content by dots pattern and reconstruct
        const parts = text.split(dotsPattern);
        parts.forEach((part, index) => {
          if (part.trim()) {
            const textSpan = document.createElement('span');
            textSpan.textContent = part.trim();
            wrapper.appendChild(textSpan);
          }
          
          if (index < parts.length - 1) {
            const inputContainer = document.createElement('span');
            inputContainer.style.display = 'inline-flex';
            inputContainer.style.alignItems = 'center';
            inputContainer.style.whiteSpace = 'nowrap';
            
            const qNum = matches[index].match(/\d+/)[0];
            const numSpan = document.createElement('span');
            numSpan.textContent = qNum + ' ';
            inputContainer.appendChild(numSpan);
            
            const newInput = input.cloneNode(true);
            newInput.style.width = '120px';
            newInput.style.padding = '4px 8px';
            newInput.style.border = '1px solid #d1d5db';
            newInput.style.borderRadius = '4px';
            newInput.style.margin = '0 4px';
            newInput.style.fontSize = '14px';
            newInput.style.display = 'inline-block';
            newInput.style.verticalAlign = 'middle';
            newInput.style.backgroundColor = 'white';
            inputContainer.appendChild(newInput);
            
            const dotsSpan = document.createElement('span');
            dotsSpan.textContent = ' .............';
            dotsSpan.style.whiteSpace = 'pre';
            inputContainer.appendChild(dotsSpan);
            
            wrapper.appendChild(inputContainer);
          }
        });
        
        cleanedElement.innerHTML = '';
        cleanedElement.appendChild(wrapper);
      }
    }
    
    blanks[questionNumber] = {
      questionNumber,
      element: cleanedElement,
      originalHTML: element.outerHTML,
      cleanedHTML: cleanedElement.outerHTML,
      placeholder: questionNumber.toString(),
      isTable: false,
      styles: {
        wrapper: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'baseline'
        },
        input: {
          width: '120px',
          padding: '4px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          margin: '0 4px',
          fontSize: '14px',
          display: 'inline-block',
          verticalAlign: 'middle',
          backgroundColor: 'white'
        }
      }
    };
  });
  
  return blanks;
}
export function extractDragDropQuestions(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(html);
  
  const sections = [];
  
  // Find all drag-drop question containers
  const dragDropContainers = tempDiv.querySelectorAll('.ielts-dragdrop-question');
  
  dragDropContainers.forEach(container => {
    // Find the question range from the preceding paragraph
    let questionRange = "";
    let prevElement = container.previousElementSibling;
    while (prevElement) {
      if (prevElement.tagName === 'P' && prevElement.textContent.includes('Question')) {
        const match = prevElement.textContent.match(/Question\s+(\d+)[-–](\d+)/i);
        if (match) {
          questionRange = `${match[1]}-${match[2]}`;
          break;
        }
      }
      prevElement = prevElement.previousElementSibling;
    }
    
    // Find all question numbers within the container
    const questionNumbers = [];
    const strongTags = container.querySelectorAll('strong');
    
    strongTags.forEach(tag => {
      // Skip if it's not a number
      const num = parseInt(tag.textContent.trim());
      if (!isNaN(num)) {
        questionNumbers.push(num);
      }
    });
    
    // Sort question numbers
    questionNumbers.sort((a, b) => a - b);
    
    if (questionNumbers.length === 0) return;
    
    const startNum = questionNumbers[0];
    const endNum = questionNumbers[questionNumbers.length - 1];
    
    // Get all article content to preserve the original format
    const articleElements = container.querySelectorAll('.ielts-article');
    const articleContents = [];
    
    articleElements.forEach(article => {
      articleContents.push(article.innerHTML);
    });
    
    // Get instruction text
    let instructionText = "";
    if (articleElements.length > 0) {
      instructionText = articleElements[0].textContent.trim();
    }
    
    // Get all drag items
    const dragItems = container.querySelectorAll('.ielts-drag-item');
    const options = [];
    
    dragItems.forEach(item => {
      options.push({
        label: item.textContent.trim(),
        text: item.textContent.trim(),
        dataAnswer: item.getAttribute('data-answer')
      });
    });
    
    // Get all drop zones and associate them with question numbers
    const dropZones = container.querySelectorAll('.ielts-drop-zone');
    const dropZoneMap = {};
    
    // Map each drop zone to its corresponding question number
    dropZones.forEach((zone, index) => {
      // Find the closest strong tag (question number)
      const strongTag = zone.parentElement.querySelector('strong');
      if (strongTag) {
        const num = parseInt(strongTag.textContent.trim());
        if (!isNaN(num)) {
          dropZoneMap[num] = zone;
        }
      }
    });
    
    sections.push({
      startNum,
      endNum,
      questionRange,
      articleContents,
      instructionText,
      options,
      dropZoneMap,
      element: container
    });
  });
  
  // Find positions of drag and drop sections
  const allSections = [];
  const allElements = Array.from(tempDiv.children);
  
  sections.forEach(section => {
    // Find the position of this section in the DOM
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
  
  return sections;
}
