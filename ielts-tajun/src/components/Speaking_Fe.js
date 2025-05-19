import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Clock, BarChart, Search, ChevronLeft, ChevronRight, User, PhoneCall } from 'lucide-react';
import Navbar from './Navbar';
import { checkExamAccess } from '../utils/examAccess';

const Speaking_Fe = () => {
    const navigate = useNavigate();
    const [userStatus, setUserStatus] = useState({
        role: localStorage.getItem('role'),
        isVIP: false
    });
    const [examHistory, setExamHistory] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [username, setUsername] = useState('');
    const dropdownRef = useRef(null);
    const [sortOrder, setSortOrder] = useState('latest');
    const topicsPerPage = 6;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        const currentUser = localStorage.getItem('username');
        if (currentUser) {
            setUsername(currentUser);
        }

        window.addEventListener('scroll', handleScroll);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const [topicsResponse, vipStatusResponse, historyResponse] = await Promise.all([
                    fetch('http://localhost:8000/student/speaking/topics', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8000/customer/vip/subscription/status', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8000/student/my-exam-history', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (topicsResponse.ok) {
                    const data = await topicsResponse.json();
                    const formattedTopics = data.map(topic => ({
                        ...topic,
                        id: topic.topic_id,
                        title: topic.title || 'Untitled Topic',
                        description: topic.description || 'No description available',
                        questions: topic.speaking_questions || [],
                      
                        questionCount: topic.speaking_questions ? topic.speaking_questions.length : 0,
                        created_at: topic.created_at || new Date().toISOString()
                    }));
                    setTopics(formattedTopics);
                } else if (topicsResponse.status === 401) {
                    navigate('/login');
                }

                if (vipStatusResponse.ok) {
                    const vipData = await vipStatusResponse.json();
                    setUserStatus(prev => ({
                        ...prev,
                        isVIP: vipData.is_subscribed
                    }));
                }

                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    setExamHistory(historyData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setTopics([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const filteredTopics = topics
        .filter(topic => topic.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortOrder === 'latest') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else {
                return new Date(a.created_at) - new Date(b.created_at);
            }
        });

    const indexOfLastTopic = currentPage * topicsPerPage;
    const indexOfFirstTopic = indexOfLastTopic - topicsPerPage;
    const currentTopics = filteredTopics.slice(indexOfFirstTopic, indexOfLastTopic);
    const totalPages = Math.ceil(filteredTopics.length / topicsPerPage);

    const renderTopicCard = (topic) => {
        const { canAccess, message } = checkExamAccess(
            userStatus.role,
            userStatus.isVIP,
            topic.exam_access_type,
            examHistory
        );

        return (
            <div key={topic.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="p-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        <span className="text-lime-600 font-normal italic mr-2">Topic:</span>
                        <span className="text-gray-700">{topic.title}</span>
                    </h3>
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center text-gray-600 bg-gray-50 py-2 px-3 rounded-lg">
                            <BarChart className="w-5 h-5 mr-3 text-lime-600" />
                            <span className="font-medium">{topic.questionCount} questions</span>
                        </div>
                    </div>

                    {!canAccess ? (
                        <div className="text-center">
                            <p className="text-red-500 text-sm mb-2">{message}</p>
                            {userStatus.role === 'customer' && !userStatus.isVIP && (
                                <Link
                                    to="/vip-packages"
                                    className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                                >
                                    Upgrade to VIP
                                </Link>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate(`/speaking_test_room`, { 
                                state: { 
                                    topicId: topic.id,
                                    title: topic.title
                                } 
                            })}
                            className="w-full flex items-center justify-center space-x-2 bg-lime-500 text-white px-6 py-3 rounded-lg hover:bg-lime-600 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                        >
                            <Play className="w-5 h-5" />
                            <span>Start Practice</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading speaking topics...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-4">
                <nav className="flex" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2">
                        <li><Link to="/" className="text-gray-500 hover:text-lime-500">Home</Link></li>
                        <li><span className="text-gray-400 mx-2">/</span></li>
                        <li><span className="text-lime-500 font-medium">Speaking Topics</span></li>
                    </ol>
                </nav>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-2">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search topics..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="latest">Latest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentTopics.map(topic => renderTopicCard(topic))}
                </div>

                <div className="flex justify-center items-center space-x-4 mt-5">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={3}/>
                    </button>
                    <span className="text-gray-600 font-bold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5 " strokeWidth={3}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Speaking_Fe;
