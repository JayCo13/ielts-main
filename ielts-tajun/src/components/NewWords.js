import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight, Star, Trash2, BookOpen, Headphones, Filter, Languages, ChevronLeft, Play, RotateCcw, CheckCircle, XCircle, Clock, PenTool, Settings, Volume2 } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { toast, Toaster } from 'react-hot-toast';
import { TranslatorDialog } from '../translator';
import ConfirmDialog from './ConfirmDialog';
import { API_BASE } from '../config/api';

const ITEMS_PER_PAGE = 5;

const NewWords = () => {
    const [vocabulary, setVocabulary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('listening'); // 'listening', 'reading', 'important'
    const [importantSubFilter, setImportantSubFilter] = useState('listening'); // 'listening', 'reading'

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Dictionary dialog state
    const [selectedWord, setSelectedWord] = useState(null);
    const [showDictionary, setShowDictionary] = useState(false);

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [wordToDelete, setWordToDelete] = useState(null);

    // Dictation Mode State
    const [mode, setMode] = useState('list'); // 'list' | 'dictation'
    const [dictationStatus, setDictationStatus] = useState('idle'); // 'idle' | 'countdown' | 'playing' | 'submitted'
    const [countdown, setCountdown] = useState(3);
    const [activeWordIndex, setActiveWordIndex] = useState(-1);
    const [userAnswers, setUserAnswers] = useState({});
    const [dictationResults, setDictationResults] = useState(null);

    // Voice & Speed settings
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [speechRate, setSpeechRate] = useState(1.0);
    const [showSettings, setShowSettings] = useState(false);

    // Preferred voices ranked by popularity/quality
    const PREFERRED_VOICES = [
        'Google US English',
        'Google UK English Female',
        'Google UK English Male',
        'Microsoft Zira',
        'Microsoft David',
        'Microsoft Mark',
        'Samantha',
        'Daniel',
        'Karen',
        'Moira',
        'Alex',
        'Tessa',
        'Fiona',
        'Victoria',
    ];

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            const englishVoices = voices.filter(v => v.lang.startsWith('en'));
            const sorted = [...englishVoices].sort((a, b) => {
                const aIdx = PREFERRED_VOICES.findIndex(p => a.name.includes(p));
                const bIdx = PREFERRED_VOICES.findIndex(p => b.name.includes(p));
                return (aIdx >= 0 ? aIdx : 999) - (bIdx >= 0 ? bIdx : 999);
            });
            const curated = sorted.slice(0, 10);
            setAvailableVoices(curated.length > 0 ? curated : voices.slice(0, 10));
            if (!selectedVoiceURI && curated.length > 0) {
                setSelectedVoiceURI(curated[0].voiceURI);
            } else if (!selectedVoiceURI && voices.length > 0) {
                setSelectedVoiceURI(voices[0].voiceURI);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const getSelectedVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return voices.find(v => v.voiceURI === selectedVoiceURI) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    };

    useEffect(() => {
        fetchVocabulary();
    }, []);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const fetchVocabulary = async () => {
        try {
            const response = await fetch(`${API_BASE}/student/vocabulary`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setVocabulary(data);
            } else {
                toast.error('Failed to load vocabulary');
            }
        } catch (error) {
            console.error('Error fetching vocabulary:', error);
            toast.error('Error loading vocabulary');
        } finally {
            setLoading(false);
        }
    };

    const toggleImportant = async (id, currentValue) => {
        try {
            const response = await fetch(`${API_BASE}/student/vocabulary/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_important: !currentValue })
            });
            if (response.ok) {
                setVocabulary(prev => prev.map(v =>
                    v.id === id ? { ...v, is_important: !currentValue } : v
                ));
                toast.success(!currentValue ? 'Marked as important' : 'Unmarked');
            }
        } catch (error) {
            console.error('Error updating vocabulary:', error);
            toast.error('Error updating word');
        }
    };

    const handleDeleteClick = (id) => {
        setWordToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!wordToDelete) return;

        try {
            const response = await fetch(`${API_BASE}/student/vocabulary/${wordToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                setVocabulary(prev => prev.filter(v => v.id !== wordToDelete));
                toast.success('Word deleted');

                // Adjust page if deleting the last item on the page
                const newFilteredCount = vocabulary.filter(v => v.id !== wordToDelete).length;
                const maxPage = Math.ceil(newFilteredCount / ITEMS_PER_PAGE);
                if (currentPage > maxPage && maxPage > 0) {
                    setCurrentPage(maxPage);
                }
            }
        } catch (error) {
            console.error('Error deleting vocabulary:', error);
            toast.error('Error deleting word');
        } finally {
            setShowDeleteConfirm(false);
            setWordToDelete(null);
        }
    };

    const openDictionary = (word) => {
        setSelectedWord(word);
        setShowDictionary(true);
    };

    const closeDictionary = () => {
        setShowDictionary(false);
        setSelectedWord(null);
    };

    const filteredVocabulary = vocabulary.filter(v => {
        if (filter === 'all') return true;
        if (filter === 'important') {
            if (!v.is_important) return false;
            if (importantSubFilter === 'all') return true;
            return v.source_type === importantSubFilter;
        }
        return v.source_type === filter;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredVocabulary.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const displayedVocabulary = filteredVocabulary.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const getSourceBadge = (sourceType) => {
        return sourceType === 'listening' ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <Headphones className="w-3 h-3" />
                Listening
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <BookOpen className="w-3 h-3" />
                Reading
            </span>
        );
    };

    // --- Dictation Mode Logic ---

    // Dictation Pagination
    const DICTATION_PAGE_SIZE = 3;
    const [dictationPage, setDictationPage] = useState(0);
    const inputRefs = useRef({});

    // Shuffled words for dictation - MUST be before useMemo that uses it
    const [shuffledWords, setShuffledWords] = useState([]);

    // Ref to stop audio loop when submitted
    const shouldStopRef = useRef(false);

    // Auto-focus effect
    useEffect(() => {
        if (mode === 'dictation' && activeWordIndex !== -1 && inputRefs.current[activeWordIndex]) {
            inputRefs.current[activeWordIndex].focus();
        }
    }, [activeWordIndex, mode, dictationPage]);

    const displayedDictationWords = useMemo(() => {
        const start = dictationPage * DICTATION_PAGE_SIZE;
        return shuffledWords.slice(start, start + DICTATION_PAGE_SIZE);
    }, [shuffledWords, dictationPage]);

    // Shuffle function
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };


    const startDictation = () => {
        if (filteredVocabulary.length === 0) {
            toast.error('No words to practice!');
            return;
        }

        // Shuffle words for this dictation session
        const shuffled = shuffleArray(filteredVocabulary);
        setShuffledWords(shuffled);

        // Reset stop flag
        shouldStopRef.current = false;

        setMode('dictation');
        setDictationStatus('idle');
        setUserAnswers({});
        setDictationResults(null);
        setActiveWordIndex(-1);
        setDictationPage(0);
    };

    const beginDictation = () => {
        shouldStopRef.current = false;
        setShowSettings(false);
        runDictationSequence(shuffledWords);
    };

    // Helper: Check if a word is a phone number (digits only, optionally with spaces/dashes)
    const isPhoneNumber = (text) => /^\d[\d\s\-]{5,}$/.test(text.trim());

    // Helper: Check if a word is all uppercase letters (at least 2 chars)
    const isAllUppercase = (text) => /^[A-Z]{2,}$/.test(text.trim());

    // Helper: Convert phone number to spoken digit string
    const phoneToSpoken = (text) => {
        return text.trim().replace(/[\s\-]/g, '').split('').join(', ');
    };

    // Helper: Spell out letters
    const spellOut = (text) => {
        return text.trim().split('').join(', ');
    };

    // Get speech text for first pronunciation
    const getFirstSpeechText = (word) => {
        if (isPhoneNumber(word)) return phoneToSpoken(word);
        if (isAllUppercase(word)) return word.toLowerCase();
        return word;
    };

    // Get speech text for second pronunciation
    const getSecondSpeechText = (word) => {
        if (isPhoneNumber(word)) return phoneToSpoken(word);
        if (isAllUppercase(word)) return spellOut(word);
        return word;
    };

    const runDictationSequence = async (words) => {
        setDictationStatus('playing');
        const voice = getSelectedVoice();

        const speak = (text, rateOverride) => {
            return new Promise((resolve) => {
                let resolved = false;
                const done = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                };

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = voice;
                utterance.rate = rateOverride !== undefined ? rateOverride : speechRate;
                utterance.pitch = 1;

                utterance.onend = done;
                utterance.onerror = (e) => {
                    console.error('Speech error:', e);
                    done();
                };

                window.speechSynthesis.speak(utterance);
                setTimeout(done, 4000);
            });
        };

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < words.length; i++) {
            // Check if should stop (user submitted)
            if (shouldStopRef.current) break;

            // Auto-slide page
            const newPage = Math.floor(i / DICTATION_PAGE_SIZE);
            setDictationPage(newPage);

            setActiveWordIndex(i);

            // Check again before speaking
            if (shouldStopRef.current) break;

            // Speak word first time (phone → digit-by-digit, UPPERCASE → normal)
            await speak(getFirstSpeechText(words[i].word));
            await wait(2000);

            // Check again before second speak
            if (shouldStopRef.current) break;

            // Speak word second time (phone → digit-by-digit, UPPERCASE → spell out, slower)
            const secondText = getSecondSpeechText(words[i].word);
            const secondRate = isAllUppercase(words[i].word) ? Math.max(speechRate - 0.15, 0.4) : undefined;
            await speak(secondText, secondRate);
            await wait(2000);
        }

        if (!shouldStopRef.current) {
            setActiveWordIndex(-1);
            toast.success('Dictation completed! Please submit when ready.');
        }
    };

    const handleAnswerChange = (wordId, value) => {
        setUserAnswers(prev => ({
            ...prev,
            [wordId]: value
        }));
    };

    const submitDictation = () => {
        // Stop audio loop
        shouldStopRef.current = true;
        window.speechSynthesis.cancel();

        let correctCount = 0;
        const results = shuffledWords.map(item => {
            const userAnswer = (userAnswers[item.id] || '').trim().toLowerCase();
            const correctWord = item.word.toLowerCase();
            const isCorrect = userAnswer === correctWord;
            if (isCorrect) correctCount++;
            return {
                ...item,
                userAnswer: userAnswers[item.id],
                isCorrect
            };
        });

        setDictationResults({
            total: shuffledWords.length,
            correct: correctCount,
            details: results
        });
        setDictationStatus('submitted');
    };

    const closeDictationMode = () => {
        shouldStopRef.current = true; // Stop the audio loop immediately
        window.speechSynthesis.cancel(); // Stop any playing audio
        setMode('list');
        setDictationStatus('idle');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <Navbar />
            <Toaster position="top-right" />

            {/* Dictionary Dialog */}
            <TranslatorDialog
                isOpen={showDictionary}
                onClose={closeDictionary}
                selectedText={selectedWord}
                position={{ x: 0, y: 0 }}
                colorTheme="black-on-white"
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                message="Are you sure you want to delete this word?"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center text-sm text-gray-500 mb-6">
                    <Link to="/" className="hover:text-[#0096b1] flex items-center">
                        <Home className="w-4 h-4 mr-1" />
                        Trang chủ
                    </Link>
                    <ChevronRight className="w-4 h-4 mx-2" />
                    <span className="text-gray-900 font-medium">New Words</span>
                </nav>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">New Words</h1>
                    <p className="text-gray-600">Từ vựng bạn đã lưu từ các bài tập Nghe và Đọc. Nhấp vào bất kỳ từ nào để xem định nghĩa của nó. Sử dụng tính năng Luyện Nghe Chép Chính Tả để ôn tập.</p>
                </div>

                {mode === 'list' && (
                    <div className="mb-8">
                        {/* Dictation Button - Left aligned */}
                        <button
                            onClick={startDictation}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0096b1] to-[#007d94] text-white rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 transition-all font-bold text-sm tracking-wide"
                        >
                            <PenTool className="w-4 h-4" />
                            LUYỆN NGHE CHÉP CHÍNH TẢ
                        </button>
                    </div>
                )}

                {/* Clickable Stats as Filters */}
                <div className="grid grid-cols-3 gap-4 mb-8">

                    <button
                        onClick={() => setFilter('listening')}
                        className={`text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${filter === 'listening'
                            ? 'bg-purple-600 border-purple-600 ring-2 ring-purple-600 ring-offset-2'
                            : 'bg-gradient-to-br from-white to-purple-50 border-purple-100'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${filter === 'listening' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600'}`}>
                                <Headphones className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${filter === 'listening' ? 'text-purple-200' : 'text-purple-600'}`}>Listening</span>
                        </div>
                        <div className={`text-3xl font-bold ml-1 ${filter === 'listening' ? 'text-white' : 'text-gray-900'}`}>{vocabulary.filter(v => v.source_type === 'listening').length}</div>
                    </button>

                    <button
                        onClick={() => setFilter('reading')}
                        className={`text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${filter === 'reading'
                            ? 'bg-blue-600 border-blue-600 ring-2 ring-blue-600 ring-offset-2'
                            : 'bg-gradient-to-br from-white to-blue-50 border-blue-100'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${filter === 'reading' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${filter === 'reading' ? 'text-blue-200' : 'text-blue-600'}`}>Reading</span>
                        </div>
                        <div className={`text-3xl font-bold ml-1 ${filter === 'reading' ? 'text-white' : 'text-gray-900'}`}>{vocabulary.filter(v => v.source_type === 'reading').length}</div>
                    </button>

                    <button
                        onClick={() => setFilter('important')}
                        className={`text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${filter === 'important'
                            ? 'bg-amber-500 border-amber-500 ring-2 ring-amber-500 ring-offset-2'
                            : 'bg-gradient-to-br from-white to-amber-50 border-amber-100'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Star className={`w-5 h-5 ${filter === 'important' ? 'text-white fill-white' : 'text-amber-500 fill-amber-500'}`} />
                                    <span className={`text-sm font-medium ${filter === 'important' ? 'text-amber-100' : 'text-amber-600'}`}>Important</span>
                                </div>
                                <div className={`text-3xl font-bold ${filter === 'important' ? 'text-white' : 'text-gray-900'}`}>
                                    {vocabulary.filter(v => v.is_important).length}
                                </div>
                            </div>
                        </div>

                        {/* Sub-filter - pill style below */}
                        {filter === 'important' && (
                            <div className="mt-4" onClick={e => e.stopPropagation()}>
                                <div className="flex bg-amber-600/50 rounded-full p-0.5">
                                    {[
                                        { value: 'listening', label: 'Listening' },
                                        { value: 'reading', label: 'Reading' }
                                    ].map(subTab => (
                                        <button
                                            key={subTab.value}
                                            onClick={(e) => { e.stopPropagation(); setImportantSubFilter(subTab.value); }}
                                            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${importantSubFilter === subTab.value
                                                ? 'bg-white text-amber-600 shadow-sm'
                                                : 'text-white/80 hover:text-white'
                                                }`}
                                        >
                                            {subTab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </button>
                </div>

                {/* Content Area */}
                {mode === 'dictation' ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <PenTool className="w-6 h-6 text-purple-600" />
                                Dictation Practice
                            </h2>
                            <button
                                onClick={closeDictationMode}
                                className="text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Exit Mode
                            </button>
                        </div>

                        {/* Voice & Speed Settings */}
                        {(dictationStatus === 'idle' || dictationStatus === 'countdown') && (
                            <div className="mb-6">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors mb-3 font-medium text-sm"
                                >
                                    <Settings className="w-4 h-4" />
                                    Cài đặt giọng nói & tốc độ
                                    <span className="ml-1 px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">{speechRate}x</span>
                                </button>
                                {showSettings && (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giọng đọc</label>
                                            <select
                                                value={selectedVoiceURI}
                                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
                                            >
                                                {availableVoices.map(v => (
                                                    <option key={v.voiceURI} value={v.voiceURI}>
                                                        {v.name} ({v.lang})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tốc độ: <span className="text-purple-600 font-bold">{speechRate}x</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2.0"
                                                step="0.05"
                                                value={speechRate}
                                                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                <span>Chậm (0.5x)</span>
                                                <span>Bình thường (1.0x)</span>
                                                <span>Nhanh (2.0x)</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const synth = window.speechSynthesis;
                                                synth.cancel();
                                                const voice = getSelectedVoice();
                                                const utterance = new SpeechSynthesisUtterance('This is a preview of the selected voice');
                                                utterance.voice = voice;
                                                utterance.rate = speechRate;
                                                synth.speak(utterance);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                            Nghe thử
                                        </button>
                                    </div>
                                )}

                                {/* Start Button */}
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <p className="text-gray-500">Cấu hình giọng nói và tốc độ xong thì bấm Bắt đầu</p>
                                    <button
                                        onClick={beginDictation}
                                        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#0096b1] to-[#007d94] text-white rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all font-bold text-lg"
                                    >
                                        <Play className="w-6 h-6" />
                                        Bắt đầu
                                    </button>
                                    <p className="text-xs text-gray-400">{shuffledWords.length} từ • Đã xáo trộn</p>
                                </div>
                            </div>
                        )}

                        {(dictationStatus === 'playing' || dictationStatus === 'waiting_submit') && (
                            <div className="max-w-2xl mx-auto">
                                <div className="mb-6 flex justify-between items-center bg-blue-50 px-4 py-3 rounded-xl">
                                    <div className="flex items-center gap-2 text-blue-800">
                                        <Clock className={`w-5 h-5 ${activeWordIndex !== -1 ? 'animate-pulse' : ''}`} />
                                        {activeWordIndex !== -1
                                            ? `Playing word ${activeWordIndex + 1} of ${shuffledWords.length}...`
                                            : 'Audio completed. Review and submit.'}
                                    </div>
                                    <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                        3s Interval
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-center text-gray-500 text-sm mb-4">
                                        Page {dictationPage + 1} of {Math.ceil(shuffledWords.length / DICTATION_PAGE_SIZE)}
                                    </div>
                                    {displayedDictationWords.map((word, idx) => {
                                        const globalIndex = dictationPage * DICTATION_PAGE_SIZE + idx;
                                        return (
                                            <div key={word.id} className={`transition-all duration-300 ${globalIndex === activeWordIndex ? 'scale-105' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 text-right font-mono text-gray-400 font-bold">{globalIndex + 1}.</span>
                                                    <input
                                                        ref={el => inputRefs.current[globalIndex] = el}
                                                        type="text"
                                                        value={userAnswers[word.id] || ''}
                                                        onChange={(e) => handleAnswerChange(word.id, e.target.value)}
                                                        placeholder={`Type word ${globalIndex + 1}...`}
                                                        disabled={dictationStatus === 'submitted'}
                                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${globalIndex === activeWordIndex
                                                            ? 'border-purple-500 shadow-md bg-purple-50'
                                                            : 'border-gray-200 focus:border-[#0096b1] focus:ring-4 focus:ring-[#0096b1]/10'
                                                            }`}
                                                        autoComplete="off"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Page Navigation */}
                                <div className="flex justify-center gap-4 mt-6">
                                    <button
                                        onClick={() => setDictationPage(p => Math.max(0, p - 1))}
                                        disabled={dictationPage === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                    <button
                                        onClick={() => setDictationPage(p => Math.min(Math.ceil(shuffledWords.length / DICTATION_PAGE_SIZE) - 1, p + 1))}
                                        disabled={dictationPage >= Math.ceil(shuffledWords.length / DICTATION_PAGE_SIZE) - 1}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="mt-8 flex justify-center">
                                    <button
                                        onClick={submitDictation}
                                        className="px-8 py-3 bg-[#0096b1] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-[#007d94] transition-all transform hover:-translate-y-1"
                                    >
                                        Submit Answers
                                    </button>
                                </div>
                            </div>
                        )}

                        {dictationStatus === 'submitted' && dictationResults && (
                            <div className="animate-fade-in">
                                <div className="text-center mb-8">
                                    <div className="inline-block p-6 rounded-full bg-gray-50 mb-4 border-2 border-dashed border-gray-200">
                                        <div className="text-4xl font-bold text-gray-800">
                                            {dictationResults.correct} <span className="text-gray-400 text-2xl">/ {dictationResults.total}</span>
                                        </div>
                                        <div className="text-gray-500 font-medium">Correct Answers</div>
                                    </div>

                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={startDictation}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Try Again
                                        </button>
                                        <button
                                            onClick={closeDictationMode}
                                            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Back to List
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-3 max-w-3xl mx-auto">
                                    {dictationResults.details.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`p-4 rounded-xl border flex items-center justify-between ${item.isCorrect
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`p-2 rounded-full shrink-0 ${item.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    {item.isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-bold text-gray-900">{item.word}</span>
                                                        {!item.isCorrect && (
                                                            <span className="text-red-500 line-through text-sm opacity-70">
                                                                {item.userAnswer || '(empty)'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.context && (
                                                        <p className="text-xs text-gray-500 truncate mt-1">{item.context}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Save to Important Action */}
                                            {(() => {
                                                const currentWord = vocabulary.find(v => v.id === item.id);
                                                const isImportant = currentWord?.is_important || false;
                                                return (
                                                    <button
                                                        onClick={() => toggleImportant(item.id, isImportant)}
                                                        className={`p-2 rounded-lg transition-all ${isImportant
                                                            ? 'text-amber-500 bg-amber-100 hover:bg-amber-200'
                                                            : 'text-gray-400 hover:text-amber-500 hover:bg-white'
                                                            }`}
                                                        title={isImportant ? "Important" : "Mark as Important"}
                                                    >
                                                        <Star className={`w-5 h-5 ${isImportant ? 'fill-current' : ''}`} />
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0096b1]"></div>
                        </div>
                    ) : filteredVocabulary.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                                {filter === 'all'
                                    ? 'No words saved yet. Select text in your exam reviews to add them!'
                                    : `No ${filter === 'important' ? 'important' : filter} words found.`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* NEW: Grid Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                {displayedVocabulary.map((word) => (
                                    <div
                                        key={word.id}
                                        className="group bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex flex-col">
                                                <button
                                                    onClick={() => openDictionary(word.word)}
                                                    className="text-xl font-bold text-gray-900 group-hover:text-[#0096b1] transition-colors text-left flex items-center gap-2"
                                                    title="Click to see definition"
                                                >
                                                    {word.word}
                                                    <Languages className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#0096b1]" />
                                                </button>
                                                <div className="mt-1">
                                                    {getSourceBadge(word.source_type)}
                                                </div>
                                            </div>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleImportant(word.id, word.is_important)}
                                                    className={`p-2 rounded-lg transition-all ${word.is_important
                                                        ? 'text-amber-500 bg-amber-500/10'
                                                        : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                                                        }`}
                                                    title={word.is_important ? 'Unmark important' : 'Mark as important'}
                                                >
                                                    <Star className={`w-5 h-5 ${word.is_important ? 'fill-current' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(word.id)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title="Delete word"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            {word.context && (
                                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic border border-gray-100 mb-2">
                                                    "{word.context}"
                                                </div>
                                            )}
                                        </div>

                                        {word.source_exam_title && (
                                            <div className="pt-3 mt-auto border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                <span className="truncate">{word.source_exam_title}</span>
                                            </div>
                                        )}

                                        {/* Always visible important/delete on mobile */}
                                        <div className="flex md:hidden justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => toggleImportant(word.id, word.is_important)}
                                                className={`p-2 rounded-lg ${word.is_important ? 'text-amber-500' : 'text-gray-400'}`}
                                            >
                                                <Star className={`w-5 h-5 ${word.is_important ? 'fill-current' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(word.id)}
                                                className="p-2 rounded-lg text-gray-400"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-xl shadow-sm">
                                    <div className="text-sm text-gray-500">
                                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredVocabulary.length)} of {filteredVocabulary.length}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <span className="flex items-center px-4 py-1 text-sm font-bold bg-gray-100 rounded-lg text-gray-700">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
            </div>

            <Footer />
        </div >
    );
};

export default NewWords;

