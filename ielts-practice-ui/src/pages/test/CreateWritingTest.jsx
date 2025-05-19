import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Home, FileText } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import '../../css/split.css';
import Split from 'react-split';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CreateWritingTest = () => {
    const TASK_TYPES = [
        { value: 'essay', label: 'Essay' },
        { value: 'report', label: 'Graph' },
        { value: 'letter', label: 'Table' }
    ];

    const navigate = useNavigate();
    const editorRef = useRef(null);
    // Remove fileInputRef

    const [currentStep, setCurrentStep] = useState(1);
    const [examId, setExamId] = useState(null);
    const [editorContent, setEditorContent] = useState('');

    const [testData, setTestData] = useState({
        title: ''
    });

    const [currentPart, setCurrentPart] = useState({
        part_number: 1,
        task_type: 'essay',
        instructions: '',
        word_limit: 250,
        total_marks: 20.0,
        duration: 60
    });

    const handleEditorChange = (content) => {
        setEditorContent(content);
        setCurrentPart({
            ...currentPart,
            instructions: content
        });
    };

    const handleInitializeTest = async () => {
        if (!testData.title.trim()) {
            toast.error('Please enter a test title');
            return;
        }
    
        try {
            const response = await fetch('http://localhost:8000/admin/initialize-writing-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(testData)
            });
            const data = await response.json();
            setExamId(data.exam_id);
            setCurrentStep(2);
            toast.success('Test initialized successfully!');
        } catch (error) {
            toast.error('Failed to initialize test');
            console.error('Error initializing test:', error);
        }
    };

    const handleUpdatePart = async () => {
        if (!currentPart.instructions.trim()) {
            toast.error('Please input instructions');
            return;
        }
    
        try {
            const response = await fetch(`http://localhost:8000/admin/writing-test/${examId}/part`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(currentPart)
            });
            const data = await response.json();
    
            if (currentPart.part_number === 1) {
                setCurrentPart({
                    part_number: 2,
                    task_type: 'essay',
                    instructions: '',
                    word_limit: 250,
                    total_marks: 20.0,
                    duration: 60
                });
                setEditorContent('');
                setCurrentStep(3);
                toast.success('Part 1 saved successfully!');
            } else {
                toast.success('Test completed successfully!');
                navigate('/');
            }
        } catch (error) {
            toast.error('Failed to save part');
            console.error('Error updating part:', error);
        }
    };

    // Add ToastContainer in the return statement (right after the first div)
    return (
        <div className="min-h-screen bg-gray-50">
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
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center space-x-2 py-4">
                        <Link to="/" className="text-gray-400 hover:text-violet-600">
                            <Home size={20} />
                        </Link>
                        <ChevronRight className="text-gray-400" size={20} />
                        <span className="text-violet-600">Create Writing Test</span>
                    </div>
                </div>
            </nav>

            {currentStep === 1 ? (
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="space-y-6">
                            <input
                                type="text"
                                value={testData.title}
                                onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border"
                                placeholder="Enter test title"
                            />
                            <button
                                onClick={handleInitializeTest}
                                className="w-full bg-violet-600 text-white py-2 rounded-lg"
                            >
                                Initialize Test
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <Split
                    className="flex h-[calc(100vh-64px)]"
                    sizes={[60, 40]}
                    minSize={300}
                >
                    <div className="h-full">
                        <div className="bg-white p-4 border-b">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">
                                    Part {currentPart.part_number}
                                </h2>
                                <select
                                    value={currentPart.task_type}
                                    onChange={(e) => setCurrentPart({
                                        ...currentPart,
                                        task_type: e.target.value
                                    })}
                                    className="px-3 py-2 rounded border"
                                >
                                    {TASK_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="h-[calc(100vh-180px)]">
                            <Editor
                                apiKey="mbitaig1o57ii8l8aa8wx4b4le9cc1e0aw5t2c1lo4axii6u"
                                onInit={(evt, editor) => editorRef.current = editor}
                                value={editorContent}
                                init={{
                                    height: '100%',
                                    menubar: false,
                                    plugins: [
                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                    ],
                                    toolbar: 'undo redo | blocks | bold italic | ' +
                                        'alignleft aligncenter alignright alignjustify | ' +
                                        'bullist numlist outdent indent | ' +
                                        'removeformat | help',
                                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                                }}
                                onEditorChange={handleEditorChange}
                            />
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Remove image upload div */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Word Limit</label>
                                <input
                                    type="number"
                                    value={currentPart.word_limit}
                                    onChange={(e) => setCurrentPart({
                                        ...currentPart,
                                        word_limit: parseInt(e.target.value)
                                    })}
                                    className="mt-1 w-full px-3 py-2 rounded border"
                                />
                            </div>
                         
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={handleUpdatePart}
                                className="px-6 py-2 bg-violet-600 text-white rounded-lg"
                            >
                                {currentPart.part_number === 2 ? 'Finish' : 'Next Part'}
                            </button>
                        </div>
                    </div>
                </Split>
            )}
        </div>
    );
};

export default CreateWritingTest;