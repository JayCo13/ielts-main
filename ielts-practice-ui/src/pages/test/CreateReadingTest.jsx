import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Home, Plus, Save, Trash2 } from 'lucide-react';
import InitializationForm from '../../components/reading/InitializationForm';
import TestEditor from '../../components/reading/TestEditor';

const CreateReadingTest = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [isInitializing, setIsInitializing] = useState(!examId);
  const [activeTab, setActiveTab] = useState("part1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Default 50%
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  // Test initialization state
  const [testTitle, setTestTitle] = useState("");
  const [testDuration, setTestDuration] = useState(60); // Default 60 minutes
  const [totalMarks, setTotalMarks] = useState(40); // Default 40 marks

  // New state for batch question creation
  const [batchQuestionData, setBatchQuestionData] = useState({
    questionType: "multiple_choice",
    count: 1,
    marks: 1,
    startNumber: 1
  });

  // State for instruction modal
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [instructionData, setInstructionData] = useState({
    startQuestion: 1,
    endQuestion: 4,
    instruction: "Look at the following ideas and the list of researchers below.\n\nMatch each idea with the correct researcher, A, B, C or D.\n\nWrite the correct letter, A, B C or D, in the boxes on your answer sheet.",
    index: null
  });

  // Reading test state
  const [examData, setExamData] = useState({
    exam_id: examId || null,
    title: "",
    parts: [
      {
        part_number: 1,
        passage: { title: "", content: "" },
        questions: [],
        instructions: []
      },
      {
        part_number: 2,
        passage: { title: "", content: "" },
        questions: [],
        instructions: []
      },
      {
        part_number: 3,
        passage: { title: "", content: "" },
        questions: [],
        instructions: []
      }
    ]
  });

  // Question types
  const questionTypes = [
    { value: "multiple_choice", label: "Multiple Choice" },
    { value: "true_false", label: "True/False/Not Given" },
    { value: "matching_headings", label: "Matching Headings" },
    { value: "matching_names", label: "Matching Names" },
    { value: "matching", label: "Matching (Other)" },
    { value: "fill_blank", label: "Fill in the Blank" },
    { value: "short_answer", label: "Short Answer" }
  ];

  // Save instruction
  const saveInstruction = () => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    
    // Validate instruction data
    if (!instructionData.instruction.trim()) {
      setError("Instruction text is required");
      return;
    }
    
    if (instructionData.startQuestion > instructionData.endQuestion) {
      setError("Start question number must be less than or equal to end question number");
      return;
    }
    
    // Check if we're editing an existing instruction or adding a new one
    if (instructionData.index !== null) {
      // Update existing instruction
      const updatedInstructions = [...updatedParts[partNumber - 1].instructions];
      updatedInstructions[instructionData.index] = {
        startQuestion: instructionData.startQuestion,
        endQuestion: instructionData.endQuestion,
        instruction: instructionData.instruction
      };
      
      updatedParts[partNumber - 1] = {
        ...updatedParts[partNumber - 1],
        instructions: updatedInstructions
      };
    } else {
      // Add new instruction
      updatedParts[partNumber - 1] = {
        ...updatedParts[partNumber - 1],
        instructions: [
          ...updatedParts[partNumber - 1].instructions || [],
          {
            startQuestion: instructionData.startQuestion,
            endQuestion: instructionData.endQuestion,
            instruction: instructionData.instruction
          }
        ]
      };
    }
    
    setExamData({ ...examData, parts: updatedParts });
    setShowInstructionModal(false);
    
    // Reset instruction data for next time
    setInstructionData({
      startQuestion: 1,
      endQuestion: 4,
      instruction: "Look at the following ideas and the list of researchers below.\n\nMatch each idea with the correct researcher, A, B, C or D.\n\nWrite the correct letter, A, B C or D, in the boxes on your answer sheet.",
      index: null
    });
    
    setSuccess("Instructions saved successfully");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Update batch question data
  const updateBatchQuestionData = (field, value) => {
    setBatchQuestionData({
      ...batchQuestionData,
      [field]: value
    });
  };

  // Add batch questions
  const addBatchQuestions = () => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    const newQuestions = [];
    
    // Calculate the base question number for this part
    const baseQuestionNumber = partNumber === 1 ? 1 : (partNumber === 2 ? 14 : 27);
    
    // Adjust startNumber if needed to ensure it's in the correct range for this part
    let startNumber = batchQuestionData.startNumber;
    const maxQuestionNumber = partNumber === 3 ? 40 : (partNumber === 2 ? 26 : 13);
    
    // If startNumber is outside the valid range for this part, reset it to the base
    if (startNumber < baseQuestionNumber || startNumber > maxQuestionNumber) {
      startNumber = baseQuestionNumber;
    }
    
    // Get the current number of questions in this part
    const currentQuestionCount = updatedParts[partNumber - 1].questions.length;
    
    // Calculate how many more questions can be added to this part
    const expectedCount = partNumber < 3 ? 13 : 14;
    const remainingQuestions = expectedCount - currentQuestionCount;
    
    // Check if we're trying to add more questions than allowed
    if (batchQuestionData.count > remainingQuestions) {
      setError(`Cannot add ${batchQuestionData.count} questions. Only ${remainingQuestions} more questions allowed for Part ${partNumber}.`);
      return;
    }
    
    // Check if adding these questions would exceed the limit for this part
    if (startNumber + batchQuestionData.count - 1 > maxQuestionNumber) {
      setError(`Cannot add ${batchQuestionData.count} questions starting at ${startNumber}. Would exceed the limit for Part ${partNumber}.`);
      return;
    }
    
    for (let i = 0; i < batchQuestionData.count; i++) {
      const questionNumber = startNumber + i;
      const newQuestion = {
        question_text: `Question ${questionNumber}`,
        question_type: batchQuestionData.questionType,
        correct_answer: "",
        marks: batchQuestionData.marks,
        options: [],
        isBatchQuestion: true
      };
      
      // Add options for multiple choice questions
      if (batchQuestionData.questionType === "multiple_choice") {
        newQuestion.options = [
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false }
        ];
      }
      
      // Add radio options for true/false/not given questions
      if (batchQuestionData.questionType === "true_false") {
        newQuestion.options = [
          { option_text: "TRUE", is_correct: false },
          { option_text: "FALSE", is_correct: false },
          { option_text: "NOT GIVEN", is_correct: false }
        ];
      }
      
      // Initialize matching options for matching questions
      if (batchQuestionData.questionType === "matching_headings" || 
          batchQuestionData.questionType === "matching_names" || 
          batchQuestionData.questionType === "matching") {
        
        // Only add matching options to the first question in the batch
        if (i === 0) {
          if (batchQuestionData.questionType === "matching_headings") {
            // For matching headings, we don't need option_text (A, B, C)
            newQuestion.matching_options = [
              { description: "Heading 1", correct_for: "" },
              { description: "Heading 2", correct_for: "" },
              { description: "Heading 3", correct_for: "" },
              { description: "Heading 4", correct_for: "" },
              { description: "Heading 5", correct_for: "" },
              { description: "Heading 6", correct_for: "" },
              { description: "Heading 7", correct_for: "" }
            ];
          } else {
            // For other matching types, initialize with A, B, C, D
            newQuestion.matching_options = [
              { option_text: "A", description: "", correct_for: "" },
              { option_text: "B", description: "", correct_for: "" },
              { option_text: "C", description: "", correct_for: "" },
              { option_text: "D", description: "", correct_for: "" }
            ];
          }
        } else {
          newQuestion.matching_options = [];
        }
        
        // For matching headings, add paragraph number
        if (batchQuestionData.questionType === "matching_headings") {
          newQuestion.paragraph_number = i + 1;
        }
      }
      
      newQuestions.push(newQuestion);
    }
    
    // Add questions to the part
    updatedParts[partNumber - 1] = {
      ...updatedParts[partNumber - 1],
      questions: [
        ...updatedParts[partNumber - 1].questions,
        ...newQuestions
      ]
    };
    
    setExamData({ ...examData, parts: updatedParts });
    
    // Update start number for next batch
    setBatchQuestionData({
      ...batchQuestionData,
      startNumber: startNumber + batchQuestionData.count
    });
    
    // Prepare instruction data for this question range
    setInstructionData({
      startQuestion: startNumber,
      endQuestion: startNumber + batchQuestionData.count - 1,
      instruction: "",
      index: null
    });
    
    // Show instruction modal for admin to add instructions
    setShowInstructionModal(true);
  };

  // Initialize a new reading test
  const initializeTest = async () => {
    if (!testTitle.trim()) {
      setError("Test title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/admin/reading/initialize-reading-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          title: testTitle,
          duration: testDuration,
          total_marks: totalMarks
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to initialize test");
      }

      setExamData({
        ...examData,
        exam_id: data.exam_id,
        title: data.title
      });

      setSuccess("Reading test initialized successfully");
      setIsInitializing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get active part data
  const getActivePart = () => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    return examData.parts[partNumber - 1];
  };

  // Update passage
  const updatePassage = (field, value) => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    updatedParts[partNumber - 1] = {
      ...updatedParts[partNumber - 1],
      passage: {
        ...updatedParts[partNumber - 1].passage,
        [field]: value
      }
    };
    setExamData({ ...examData, parts: updatedParts });
  };

  // Add a new question
  const addQuestion = () => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    updatedParts[partNumber - 1] = {
      ...updatedParts[partNumber - 1],
      questions: [
        ...updatedParts[partNumber - 1].questions,
        {
          question_text: "",
          question_type: "multiple_choice",
          correct_answer: "",
          marks: 1,
          options: [
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false }
          ],
          isBatchQuestion: false
        }
      ]
    };
    setExamData({ ...examData, parts: updatedParts });
  };

  // Update question
  const updateQuestion = (index, field, value) => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    updatedParts[partNumber - 1] = {
      ...updatedParts[partNumber - 1],
      questions: updatedParts[partNumber - 1].questions.map((q, i) => {
        if (i === index) {
          return { ...q, [field]: value };
        }
        return q;
      })
    };
    setExamData({ ...examData, parts: updatedParts });
  };

  // Update question option
  const updateQuestionOption = (questionIndex, optionIndex, field, value) => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    
    // Deep clone the questions array
    const updatedQuestions = [...updatedParts[partNumber - 1].questions];
    
    // Deep clone the options array for the specific question
    const updatedOptions = [...updatedQuestions[questionIndex].options];
    
    // Update the specific option
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      [field]: value
    };
    
    // If we're setting this option as correct, make others incorrect (for multiple choice)
    if (field === 'is_correct' && value === true) {
      updatedOptions.forEach((opt, idx) => {
        if (idx !== optionIndex) {
          updatedOptions[idx] = { ...opt, is_correct: false };
        }
      });
    }
    
    // Update the question with the new options
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: updatedOptions
    };
    
    // Update the part with the new questions
    updatedParts[partNumber - 1] = {
      ...updatedParts[partNumber - 1],
      questions: updatedQuestions
    };
    
    setExamData({ ...examData, parts: updatedParts });
  };

  // Remove question
  const removeQuestion = (index) => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const updatedParts = [...examData.parts];
    updatedParts[partNumber - 1] = {
      ...updatedParts[partNumber - 1],
      questions: updatedParts[partNumber - 1].questions.filter((_, i) => i !== index)
    };
    setExamData({ ...examData, parts: updatedParts });
  };

  // Save the current part
  const savePart = async () => {
    const partNumber = parseInt(activeTab.replace("part", ""));
    const activePart = getActivePart();
    
    if (!activePart.passage.content.trim()) {
      setError("Passage content is required");
      return;
    }
    
    if (activePart.questions.length === 0) {
      setError("At least one question is required");
      return;
    }
    
    // Expected question count based on part number
    const expectedCount = partNumber < 3 ? 13 : 14;
    if (activePart.questions.length !== expectedCount) {
      setError(`Part ${partNumber} must have exactly ${expectedCount} questions, but got ${activePart.questions.length}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Group questions by instruction ranges
      const questionGroups = [];
      
      // Sort instructions by startQuestion
      const sortedInstructions = [...activePart.instructions].sort(
        (a, b) => a.startQuestion - b.startQuestion
      );
      
      // Check if we have any instructions
      if (sortedInstructions.length === 0) {
        setError("Please add at least one instruction for the questions");
        setLoading(false);
        return;
      }
      
      // Inside the savePart function, update the questions mapping in the questionGroups.push call
      // Create question groups based on instructions
      sortedInstructions.forEach((instr, index) => {
        const questionsInRange = activePart.questions.filter(
          q => {
            const qNum = parseInt(q.question_text.replace("Question ", ""));
            return qNum >= instr.startQuestion && qNum <= instr.endQuestion;
          }
        );
        
        if (questionsInRange.length > 0) {
          // For matching types, collect all options in the first question
          let groupMatchingOptions = [];
          
          if (questionsInRange[0].question_type === 'matching_headings' || 
              questionsInRange[0].question_type === 'matching_names' || 
              questionsInRange[0].question_type === 'matching') {
            
            // Get matching options from the first question in the group
            const firstQuestionWithOptions = questionsInRange.find(q => q.matching_options && q.matching_options.length > 0);
            
            if (firstQuestionWithOptions) {
              groupMatchingOptions = firstQuestionWithOptions.matching_options.map(option => {
                // Parse the correct_for field to determine which questions this option is correct for
                const correctForQuestions = option.correct_for ? 
                  option.correct_for.split(',').map(num => parseInt(num.trim())) : 
                  [];
                
                return {
                  ...option,
                  correctForQuestions
                };
              });
            }
          }
          
          questionGroups.push({
            instruction: instr.instruction,
            question_range: `${instr.startQuestion}-${instr.endQuestion}`,
            group_type: questionsInRange[0].question_type,
            order_number: index + 1,
            questions: questionsInRange.map(q => {
              const questionNumber = parseInt(q.question_text.replace("Question ", ""));
              const questionData = {
                question_text: q.question_text,
                question_type: q.question_type,
                correct_answer: q.correct_answer || "",
                marks: q.marks,
                question_number: questionNumber,
                options: q.options || []
              };
              
              // Inside the savePart function, in the questionGroups.push call
              // For matching questions, determine the correct answer based on the groupMatchingOptions
              if ((q.question_type === 'matching_headings' || 
                   q.question_type === 'matching_names' || 
                   q.question_type === 'matching') && 
                  groupMatchingOptions.length > 0) {
                
                // Find all options that are correct for this question
                const correctOptions = groupMatchingOptions.filter(option => 
                  option.correctForQuestions && option.correctForQuestions.includes(questionNumber)
                );
                
                // Set the correct answer(s) for this question
                if (correctOptions.length > 0) {
                  if (q.question_type === 'matching_headings') {
                    // For matching headings, use the description as the answer
                    questionData.correct_answer = correctOptions.map(opt => opt.description).join(',');
                    questionData.matching_answer = correctOptions[0].description; // Primary answer
                  } else {
                    // For other matching types, use the option_text (A, B, C) as the answer
                    questionData.correct_answer = correctOptions.map(opt => opt.option_text).join(',');
                    questionData.matching_answer = correctOptions[0].option_text; // Primary answer
                  }
                }
              }
              
              // Add paragraph number for matching headings
              if (q.question_type === 'matching_headings') {
                questionData.paragraph_number = q.paragraph_number || 1;
              }
              
              return questionData;
            }),
            // Add matching options at the group level
            matching_options: (questionsInRange[0].question_type === 'matching_headings' || 
                              questionsInRange[0].question_type === 'matching_names' || 
                              questionsInRange[0].question_type === 'matching') ? 
              groupMatchingOptions.map(opt => {
                if (questionsInRange[0].question_type === 'matching_headings') {
                  // For matching headings, we only need the description
                  return {
                    description: opt.description || ''
                  };
                } else {
                  // For other matching types, include both option_text and description
                  return {
                    option_text: opt.option_text || '',
                    description: opt.description || ''
                  };
                }
              }) : []
          });
        }
      });
      
      // Check if all questions are covered by instruction groups
      const coveredQuestions = new Set();
      const allQuestionNumbers = activePart.questions.map(q => 
        parseInt(q.question_text.replace("Question ", ""))
      );
      
      questionGroups.forEach(group => {
        group.questions.forEach(q => {
          coveredQuestions.add(q.question_number);
        });
      });
      
      // Find uncovered questions
      const uncoveredQuestions = allQuestionNumbers.filter(num => !coveredQuestions.has(num));
      
      if (uncoveredQuestions.length > 0) {
        setError(`Questions ${uncoveredQuestions.join(', ')} are not covered by any instruction group. Please add instructions for all question ranges.`);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`http://localhost:8000/admin/reading/reading-test/${examData.exam_id}/part/${partNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          passage: activePart.passage,
          question_groups: questionGroups
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to save part");
      }
      
      setSuccess(`Part ${partNumber} saved successfully. ${data.is_exam_active ? "All parts completed! Exam is now active." : ""}`);
      
      // If all parts are completed, redirect to exams list after a delay
      if (data.is_exam_active) {
        setTimeout(() => {
          navigate('/admin/exams');
        }, 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle resizing
  const handleMouseDown = (e) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit the minimum and maximum width
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftPanelWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isInitializing ? (
        <InitializationForm
          testTitle={testTitle}
          setTestTitle={setTestTitle}
          testDuration={testDuration}
          setTestDuration={setTestDuration}
          totalMarks={totalMarks}
          setTotalMarks={setTotalMarks}
          initializeTest={initializeTest}
          loading={loading}
          error={error}
        />
      ) : (
        <TestEditor
          examData={examData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          error={error}
          success={success}
          loading={loading}
          leftPanelWidth={leftPanelWidth}
          containerRef={containerRef}
          handleMouseDown={handleMouseDown}
          getActivePart={getActivePart}
          updatePassage={updatePassage}
          batchQuestionData={batchQuestionData}
          updateBatchQuestionData={updateBatchQuestionData}
          addBatchQuestions={addBatchQuestions}
          addQuestion={addQuestion}
          questionTypes={questionTypes}
          updateQuestion={updateQuestion}
          updateQuestionOption={updateQuestionOption}
          removeQuestion={removeQuestion}
          savePart={savePart}
          showInstructionModal={showInstructionModal}
          setShowInstructionModal={setShowInstructionModal}
          instructionData={instructionData}
          setInstructionData={setInstructionData}
          saveInstruction={saveInstruction}
        />
      )}
    </div>
  );
};

export default CreateReadingTest;