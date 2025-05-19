import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CreateSpeakingTest = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const editorRef = useRef(null);
    const [activeQuestion, setActiveQuestion] = useState(0);
    const questionsRef = useRef([]);
    const [topicId, setTopicId] = useState(null);
    const [topics, setTopics] = useState([]);
    const [showNewTopicForm, setShowNewTopicForm] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        questions: [{
            question_text: '',
            sample_answer: '',
            order_number: 1,
            part_type: 'part1' // Add default part_type
        }]
    });

    const fetchTopics = async () => {
        try {
            const response = await fetch('http://localhost:8000/admin/speaking/topics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setTopics(data);
            }
        } catch (error) {
            console.error('Error fetching topics:', error);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, []);

    const handleCreateTopic = async () => {
        if (!formData.title.trim()) {
            toast.error('Please enter a topic title');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/admin/speaking/topics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ title: formData.title })
            });

            if (!response.ok) {
                throw new Error('Failed to create topic');
            }

            const data = await response.json();
            setTopicId(data.topic_id);
            await fetchTopics();
            setShowNewTopicForm(false);
            setFormData({ ...formData, title: '' });
            toast.success('Topic created successfully!');
        } catch (error) {
            toast.error('Failed to create topic');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestions = async () => {
        if (!topicId) {
            toast.error('Please select or create a topic first');
            return;
        }

        if (formData.questions.some(q => !q.question_text.trim())) {
            toast.error('Please fill in all question texts');
            return;
        }

        setLoading(true);
        try {
            for (const [index, question] of formData.questions.entries()) {
                const response = await fetch(`http://localhost:8000/admin/speaking/topics/${topicId}/questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    },
                    body: JSON.stringify({
                        question_text: question.question_text,
                        sample_answer: question.sample_answer,
                        order_number: index + 1,
                        part_type: question.part_type // Include part_type in the request
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to add question');
                }
            }
            toast.success('Questions saved successfully!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to save questions');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuestionChange = (index, field, content) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index] = {
            ...updatedQuestions[index],
            [field]: content
        };
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const scrollToQuestion = (index) => {
        questionsRef.current[index]?.scrollIntoView({ behavior: 'smooth' });
        setActiveQuestion(index);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <nav className="bg-white border-b border-gray-200 flex-none">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center space-x-2 py-4">
                        <Link to="/" className="text-gray-400 hover:text-violet-600">
                            <Home size={20} />
                        </Link>
                        <ChevronRight className="text-gray-400" size={20} />
                        <span className="text-violet-600">Create Speaking Test</span>
                    </div>
                </div>
            </nav>

            <div className="flex-1 overflow-hidden">
                <div className="h-full max-w-4xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-xl shadow h-full flex flex-col">
                        <div className="p-6 border-b">
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <select
                                        value={topicId || ''}
                                        onChange={(e) => {
                                            setTopicId(e.target.value);
                                            setShowNewTopicForm(false);
                                        }}
                                        className="w-full px-4 py-2 rounded-lg border"
                                        disabled={showNewTopicForm}
                                    >
                                        <option value="">Select A Topic</option>
                                        {topics.map(topic => (
                                            <option key={topic.topic_id} value={topic.topic_id}>
                                                {topic.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewTopicForm(!showNewTopicForm);
                                        setTopicId(null);
                                    }}
                                    className="px-4 py-2 text-violet-600 border border-violet-600 rounded-lg hover:bg-violet-50"
                                >
                                    {showNewTopicForm ? 'Cancel' : 'Create New Topic'}
                                </button>
                            </div>

                            {showNewTopicForm && (
                                <div className="space-y-4 mt-4">
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border"
                                        placeholder="Enter new topic title"
                                        required
                                    />
                                    <button
                                        onClick={handleCreateTopic}
                                        disabled={loading || !formData.title}
                                        className="w-full bg-violet-600 text-white py-2 rounded-lg disabled:bg-violet-400"
                                    >
                                        {loading ? 'Creating...' : 'Create Topic'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {topicId && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Add this new question navigation bar */}
                                <div className="px-6 py-3 border-b bg-gray-50 flex gap-2 overflow-x-auto">
                                    {formData.questions.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => scrollToQuestion(index)}
                                            className={`px-3 py-1 rounded-md min-w-[40px] ${activeQuestion === index
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-white border hover:border-violet-600'
                                                }`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="space-y-4">
                                        {formData.questions.map((question, index) => (
                                            <div
                                                key={index}
                                                ref={el => questionsRef.current[index] = el}
                                                className="space-y-4 p-4 border rounded-lg"
                                                onFocus={() => setActiveQuestion(index)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquare size={20} className="text-blue-500" />
                                                        <span className="font-bold text-blue-500">Question {index + 1}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* Add part type selector */}
                                                        <select
                                                            value={question.part_type}
                                                            onChange={(e) => {
                                                                const updatedQuestions = [...formData.questions];
                                                                updatedQuestions[index] = {
                                                                    ...updatedQuestions[index],
                                                                    part_type: e.target.value
                                                                };
                                                                setFormData({ ...formData, questions: updatedQuestions });
                                                            }}
                                                            className="px-2 py-1 text-sm border rounded bg-gray-50"
                                                        >
                                                            <option value="part1">Part 1</option>
                                                            <option value="part2">Part 2</option>
                                                            <option value="part3">Part 3</option>
                                                        </select>
                                                        
                                                        {index > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
                                                                    setFormData({ ...formData, questions: updatedQuestions });
                                                                }}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Question Text</label>
                                                    <Editor
                                                        apiKey="mbitaig1o57ii8l8aa8wx4b4le9cc1e0aw5t2c1lo4axii6u"
                                                        value={question.question_text}
                                                        init={{
                                                            height: 200,
                                                            menubar: false,
                                                            plugins: [
                                                                'advlist', 'autolink', 'lists', 'link', 'charmap',
                                                                'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                                                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                                            ],
                                                            toolbar: 'undo redo | blocks | bold italic | bullist numlist | removeformat | help',
                                                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                                                        }}
                                                        onEditorChange={(content) => handleQuestionChange(index, 'question_text', content)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Sample Answer</label>
                                                    <Editor
                                                        apiKey="mbitaig1o57ii8l8aa8wx4b4le9cc1e0aw5t2c1lo4axii6u"
                                                        value={question.sample_answer}
                                                        init={{
                                                            height: 200,
                                                            menubar: false,
                                                            plugins: [
                                                                'advlist', 'autolink', 'lists', 'link', 'charmap',
                                                                'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                                                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                                            ],
                                                            toolbar: 'undo redo | blocks | bold italic | bullist numlist | removeformat | help',
                                                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                                                        }}
                                                        onEditorChange={(content) => handleQuestionChange(index, 'sample_answer', content)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 border-t space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            questions: [...formData.questions, { 
                                                question_text: '', 
                                                sample_answer: '', 
                                                order_number: formData.questions.length + 1,
                                                part_type: 'part1' // Default part type for new questions
                                            }]
                                        })}
                                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-violet-500 hover:text-violet-500"
                                    >
                                        Add Question
                                    </button>

                                    <button
                                        onClick={handleAddQuestions}
                                        disabled={loading || formData.questions.some(q => !q.question_text)}
                                        className="w-full bg-violet-600 text-white py-2 rounded-lg disabled:bg-violet-400"
                                    >
                                        {loading ? 'Saving...' : 'Save Questions'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateSpeakingTest;