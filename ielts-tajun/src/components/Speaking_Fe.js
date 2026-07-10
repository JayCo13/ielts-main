import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Play, Search, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import Navbar from './Navbar';
import { API_BASE } from '../config/api';
const toAbsoluteUrl = (u) => (u && u.startsWith('/')) ? `${API_BASE}${u}` : u;

const Speaking_Fe = () => {
    const navigate = useNavigate();
    const [userStatus, setUserStatus] = useState({
        role: localStorage.getItem('role'),
        isVIP: false
    });
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [username, setUsername] = useState('');
    const dropdownRef = useRef(null);
    const topicsPerPage = 6;
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const selectedPart = params.get('part') || 'part1';

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
                // Always fetch Part 1 only (Speaking Forecast)
                const materialsResponse = await fetch(`${API_BASE}/student/speaking/materials?part=part1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (materialsResponse.ok) {
                    const data = await materialsResponse.json();
                    const formatted = data.map(m => ({
                        id: m.material_id,
                        title: m.title || 'Untitled',
                        part_type: m.part_type,
                        pdf_url: toAbsoluteUrl(m.pdf_url),
                        created_at: m.created_at || new Date().toISOString(),
                        has_access: m.has_access
                    }));
                    setMaterials(formatted);
                } else if (materialsResponse.status === 401) {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setMaterials([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);
    const [sortOrder, setSortOrder] = useState('alphabet');

    const filteredTopics = materials
        .filter(test => test.has_access)
        .filter(test => test.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            switch (sortOrder) {
                case 'alphabet':
                    return a.title.localeCompare(b.title);
                case 'latest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                default:
                    return a.title.localeCompare(b.title);
            }
        });

    const indexOfLastTopic = currentPage * topicsPerPage;
    const indexOfFirstTopic = indexOfLastTopic - topicsPerPage;
    const currentTopics = filteredTopics.slice(indexOfFirstTopic, indexOfLastTopic);
    const totalPages = Math.max(1, Math.ceil(filteredTopics.length / topicsPerPage));

    const renderTopicCard = (m) => (
        <div key={m.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    <span className="text-[#0096b1] font-normal italic mr-2">Speaking:</span>
                    <span className="text-gray-700">{m.title}</span>
                </h3>
                <div className="space-y-4 mb-8">
                    <div className="flex items-center text-gray-600 bg-gray-50 py-2 px-3 rounded-lg">
                        <span className="font-medium">Speaking Forecast</span>
                    </div>
                </div>
                <button
                    disabled={!m.has_access}
                    onClick={() => {
                        if (m.has_access) {
                            navigate(`/speaking_test_room`, {
                                state: {
                                    title: m.title,
                                    pdfUrl: m.pdf_url,
                                    partType: m.part_type
                                }
                            });
                        }
                    }}
                    className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 font-semibold shadow-md ${m.has_access
                        ? 'bg-[#0096b1] text-white hover:bg-[#eb7e37] hover:shadow-lg'
                        : 'bg-gray-400 text-gray-100 cursor-not-allowed'
                        }`}
                >
                    {m.has_access ? <Play className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    <span>{m.has_access ? 'View PDF' : 'Locked'}</span>
                </button>
            </div>
        </div>
    );

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
                        <li><Link to="/" className="text-[#0096b1] hover:text-lime-500">Home</Link></li>
                        <li><span className="text-gray-400 mx-2">/</span></li>
                        <li><span className="text-[#0096b1] font-medium">Speaking Forecast</span></li>
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
                        <option value="alphabet">Theo Alphabet</option>
                        <option value="latest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentTopics.length === 0 ? (
                        <div className="col-span-full text-center text-lime-600 py-12">Chưa có dữ liệu để hiển thị</div>
                    ) : (
                        currentTopics.map(topic => renderTopicCard(topic))
                    )}
                </div>

                <div className="flex justify-center items-center space-x-4 mt-5">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={3} />
                    </button>
                    <span className="text-gray-600 font-bold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5 " strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Speaking_Fe;
