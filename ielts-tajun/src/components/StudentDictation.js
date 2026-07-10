import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Headphones, ChevronLeft, ChevronRight, CheckCircle, XCircle, Play, RotateCcw, Volume2, Loader2, Star, Settings, Search } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { toast, Toaster } from 'react-hot-toast';
import TranslatorDialog from '../translator/TranslatorDialog';
import { API_BASE } from '../config/api';

const ITEMS_PER_PAGE = 5;
const REVIEW_ITEMS_PER_PAGE = 20;

const StudentDictation = () => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [unitWords, setUnitWords] = useState([]);

    // Dictation mode states
    const [mode, setMode] = useState('select'); // 'select', 'dictation', 'result'
    const [dictationWords, setDictationWords] = useState([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [dictationStatus, setDictationStatus] = useState('idle'); // 'idle', 'playing', 'waiting', 'finished'
    const [results, setResults] = useState(null);
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'important'
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination for results
    const [resultsPage, setResultsPage] = useState(1);
    const [reviewPage, setReviewPage] = useState(1);

    // Audio refs
    const shouldStopRef = useRef(false);
    const inputRefs = useRef({});

    // Translator dialog state
    const [translatorOpen, setTranslatorOpen] = useState(false);
    const [selectedWord, setSelectedWord] = useState('');

    // Voice & Speed settings
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [speechRate, setSpeechRate] = useState(1.0);
    const [showSettings, setShowSettings] = useState(false);

    const getToken = () => localStorage.getItem('token');

    const fetchUnits = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/student/dictation/units`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnits(data);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách bài');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUnitWords = useCallback(async (unitId) => {
        try {
            const res = await fetch(`${API_BASE}/student/dictation/units/${unitId}/words`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnitWords(data.words);
            }
        } catch (error) {
            toast.error('Không thể tải từ vựng');
        }
    }, []);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

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

    // Load available voices — pick top 10 curated voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            const englishVoices = voices.filter(v => v.lang.startsWith('en'));

            // Sort by preferred list order, then take top 10
            const sorted = [...englishVoices].sort((a, b) => {
                const aIdx = PREFERRED_VOICES.findIndex(p => a.name.includes(p));
                const bIdx = PREFERRED_VOICES.findIndex(p => b.name.includes(p));
                const aRank = aIdx >= 0 ? aIdx : 999;
                const bRank = bIdx >= 0 ? bIdx : 999;
                return aRank - bRank;
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

    // Get the selected voice object
    const getSelectedVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return voices.find(v => v.voiceURI === selectedVoiceURI) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    };

    // Shuffle array utility
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const startDictation = async (unit) => {
        setSelectedUnit(unit);
        await fetchUnitWords(unit.unit_id);
        setMode('dictation');
        setCurrentWordIndex(0);
        setUserAnswers({});
        setDictationStatus('idle');
        shouldStopRef.current = false;
    };

    useEffect(() => {
        if (mode === 'dictation' && unitWords.length > 0) {
            let wordsToUse = unitWords;
            if (filterMode === 'important') {
                wordsToUse = unitWords.filter(w => w.is_important);
            }
            const shuffled = shuffleArray(wordsToUse);
            setDictationWords(shuffled);
        }
    }, [mode, unitWords, filterMode]);

    // Auto-focus input when current word changes
    useEffect(() => {
        if (dictationStatus === 'playing' && dictationWords.length > 0) {
            const word = dictationWords[currentWordIndex];
            if (word && inputRefs.current[word.word_id]) {
                inputRefs.current[word.word_id].focus();
                inputRefs.current[word.word_id].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentWordIndex, dictationStatus, dictationWords]);

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
        if (isPhoneNumber(word)) {
            return phoneToSpoken(word);
        }
        if (isAllUppercase(word)) {
            return word.toLowerCase(); // Speak normally
        }
        return word;
    };

    // Get speech text for second pronunciation
    const getSecondSpeechText = (word) => {
        if (isPhoneNumber(word)) {
            return phoneToSpoken(word);
        }
        if (isAllUppercase(word)) {
            return spellOut(word); // Spell out letter by letter
        }
        return word;
    };

    const runDictationSequence = async (words) => {
        const synth = window.speechSynthesis;
        const voice = getSelectedVoice();

        const speak = (text, rateOverride) => {
            return new Promise((resolve) => {
                if (shouldStopRef.current) {
                    resolve();
                    return;
                }
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = voice;
                utterance.rate = rateOverride !== undefined ? rateOverride : speechRate;
                utterance.onend = resolve;
                utterance.onerror = resolve;
                synth.speak(utterance);
            });
        };

        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        setDictationStatus('playing');

        for (let i = 0; i < words.length; i++) {
            if (shouldStopRef.current) break;

            setCurrentWordIndex(i);

            const wordText = words[i].word;

            // First pronunciation
            await speak(getFirstSpeechText(wordText));
            await wait(2000);

            if (shouldStopRef.current) break;

            // Second pronunciation (spelling for uppercase words)
            const secondText = getSecondSpeechText(wordText);
            const secondRate = isAllUppercase(wordText) ? Math.max(0.5, speechRate - 0.15) : undefined;
            await speak(secondText, secondRate);
            await wait(3000);
        }

        if (!shouldStopRef.current) {
            setDictationStatus('finished');
        }
    };

    const handleStartDictation = () => {
        if (dictationWords.length === 0) return;
        shouldStopRef.current = false;
        runDictationSequence(dictationWords);
    };

    const handleRepeatWord = () => {
        if (dictationStatus !== 'playing' && dictationStatus !== 'finished') return;
        const currentWord = dictationWords[currentWordIndex];
        if (!currentWord) return;

        const synth = window.speechSynthesis;
        const voice = getSelectedVoice();

        // When repeating, use the first speech text (normal pronunciation)
        const utterance = new SpeechSynthesisUtterance(getFirstSpeechText(currentWord.word));
        utterance.voice = voice;
        utterance.rate = speechRate;
        synth.speak(utterance);
    };

    const handleAnswerChange = (wordId, value) => {
        setUserAnswers(prev => ({ ...prev, [wordId]: value }));
    };

    const submitDictation = () => {
        shouldStopRef.current = true;
        window.speechSynthesis.cancel();

        let correct = 0;
        let incorrect = 0;
        const wordResults = dictationWords.map(word => {
            const userAnswer = (userAnswers[word.word_id] || '').trim().toLowerCase();
            const correctAnswer = word.word.trim().toLowerCase();
            const isCorrect = userAnswer === correctAnswer;
            if (isCorrect) correct++;
            else incorrect++;
            return {
                ...word,
                userAnswer: userAnswers[word.word_id] || '',
                isCorrect
            };
        });

        setResults({
            total: dictationWords.length,
            correct,
            incorrect,
            words: wordResults
        });
        setMode('result');
        setResultsPage(1);
    };

    const closeDictationMode = () => {
        shouldStopRef.current = true;
        window.speechSynthesis.cancel();
        setMode('select');
        setSelectedUnit(null);
        setUnitWords([]);
        setDictationWords([]);
        setUserAnswers({});
        setDictationStatus('idle');
        setResults(null);
    };

    const toggleImportant = async (wordId, currentValue) => {
        try {
            const res = await fetch(`${API_BASE}/student/dictation/words/${wordId}/important`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ is_important: !currentValue })
            });
            if (res.ok) {
                const newValue = !currentValue;
                // Update unitWords
                setUnitWords(prev => prev.map(w =>
                    w.word_id === wordId ? { ...w, is_important: newValue } : w
                ));
                // Update dictationWords
                setDictationWords(prev => prev.map(w =>
                    w.word_id === wordId ? { ...w, is_important: newValue } : w
                ));
                // Update results if exists
                if (results) {
                    setResults(prev => ({
                        ...prev,
                        words: prev.words.map(w =>
                            w.word_id === wordId ? { ...w, is_important: newValue } : w
                        )
                    }));
                }
                toast.success(newValue ? 'Đánh dấu quan trọng' : 'Bỏ đánh dấu');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        }
    };

    const totalResultPages = results ? Math.ceil(results.words.length / ITEMS_PER_PAGE) : 1;
    const currentResultsPage = results?.words.slice(
        (resultsPage - 1) * ITEMS_PER_PAGE,
        resultsPage * ITEMS_PER_PAGE
    ) || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Toaster position="top-center" />
            <Navbar />

            <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
                {mode === 'select' && (
                    <>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Luyện nghe chép chính tả</h1>
                        <p className="text-gray-600 mb-4">Chọn một bài để bắt đầu luyện tập</p>

                        {/* Search bar */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm bài luyện tập..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500 bg-white text-gray-700"
                            />
                        </div>

                        {units.length === 0 ? (
                            <div className="text-center py-16">
                                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Chưa có bài luyện tập nào</p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {units
                                    .filter(unit => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return (unit.name && unit.name.toLowerCase().includes(q)) ||
                                            (unit.description && unit.description.toLowerCase().includes(q));
                                    })
                                    .sort((a, b) => {
                                        const normalize = (s) => (s || '').split(/(\d+)/).map(part =>
                                            /^\d+$/.test(part) ? part.padStart(10, '0') : part
                                        ).join('');
                                        return normalize(a.name).localeCompare(normalize(b.name));
                                    })
                                    .map(unit => (
                                        <div
                                            key={unit.unit_id}
                                            onClick={() => startDictation(unit)}
                                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                                                    <Headphones className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold text-gray-900">{unit.name}</h3>
                                            </div>
                                            {unit.description && (
                                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{unit.description}</p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500">{unit.word_count} từ</span>
                                                    {unit.important_count > 0 && (
                                                        <span className="flex items-center gap-1 text-sm text-amber-600">
                                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                            {unit.important_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm text-cyan-600 font-medium group-hover:underline">
                                                    Bắt đầu →
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </>
                )}

                {mode === 'dictation' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        {/* Header */}
                        <div className="relative flex flex-col items-center justify-center mb-8 text-center">
                            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                                {selectedUnit?.name}
                            </h2>
                            <p className="text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full text-sm">
                                {dictationWords.length} từ • Từ {currentWordIndex + 1}/{dictationWords.length}
                            </p>
                            <button
                                onClick={closeDictationMode}
                                className="absolute right-0 top-0 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                            >
                                Thoát
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        {dictationStatus === 'idle' && (
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setFilterMode('all')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterMode === 'all'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    Tất cả ({unitWords.length})
                                </button>
                                <button
                                    onClick={() => setFilterMode('important')}
                                    disabled={unitWords.filter(w => w.is_important).length === 0}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${filterMode === 'important'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        }`}
                                >
                                    <Star className="w-4 h-4" />
                                    Quan trọng ({unitWords.filter(w => w.is_important).length})
                                </button>
                            </div>
                        )}

                        {/* Word Review List - shown before starting dictation */}
                        {dictationStatus === 'idle' && dictationWords.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">
                                    Bấm vào từ để xem nghĩa • Bấm ⭐ để đánh dấu quan trọng:
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {dictationWords.slice((reviewPage - 1) * REVIEW_ITEMS_PER_PAGE, reviewPage * REVIEW_ITEMS_PER_PAGE).map(word => (
                                        <div
                                            key={word.word_id}
                                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${word.is_important
                                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleImportant(word.word_id, word.is_important);
                                                }}
                                                className={`p-0.5 rounded transition-colors ${word.is_important
                                                    ? 'text-amber-500 hover:text-amber-600'
                                                    : 'text-gray-400 hover:text-amber-500'
                                                    }`}
                                                title={word.is_important ? 'Bỏ đánh dấu' : 'Đánh dấu quan trọng'}
                                            >
                                                <Star className={`w-3.5 h-3.5 ${word.is_important ? 'fill-amber-400' : ''}`} />
                                            </button>
                                            <span
                                                className="cursor-pointer hover:text-cyan-600"
                                                onClick={() => {
                                                    setSelectedWord(word.word);
                                                    setTranslatorOpen(true);
                                                }}
                                            >
                                                {word.word}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {Math.ceil(dictationWords.length / REVIEW_ITEMS_PER_PAGE) > 1 && (
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                                            disabled={reviewPage === 1}
                                            className="p-1 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            {reviewPage} / {Math.ceil(dictationWords.length / REVIEW_ITEMS_PER_PAGE)}
                                        </span>
                                        <button
                                            onClick={() => setReviewPage(p => Math.min(Math.ceil(dictationWords.length / REVIEW_ITEMS_PER_PAGE), p + 1))}
                                            disabled={reviewPage === Math.ceil(dictationWords.length / REVIEW_ITEMS_PER_PAGE)}
                                            className="p-1 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Voice & Speed Settings */}
                        {dictationStatus === 'idle' && (
                            <div className="mb-6">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-xl hover:bg-cyan-100 transition-colors mb-3 font-medium text-sm"
                                >
                                    <Settings className="w-4 h-4" />
                                    Cài đặt giọng nói & tốc độ
                                    <span className="ml-1 px-2 py-0.5 bg-cyan-600 text-white text-xs font-bold rounded-full">{speechRate}x</span>
                                </button>
                                {showSettings && (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                        {/* Voice Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giọng đọc</label>
                                            <select
                                                value={selectedVoiceURI}
                                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500 outline-none"
                                            >
                                                {availableVoices.map(v => (
                                                    <option key={v.voiceURI} value={v.voiceURI}>
                                                        {v.name} ({v.lang})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Speed Slider */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tốc độ: <span className="text-cyan-600 font-bold">{speechRate}x</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2.0"
                                                step="0.05"
                                                value={speechRate}
                                                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                <span>Chậm (0.5x)</span>
                                                <span>Bình thường (1.0x)</span>
                                                <span>Nhanh (2.0x)</span>
                                            </div>
                                        </div>
                                        {/* Preview Button */}
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
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex gap-3 mb-6">
                            {dictationStatus === 'idle' && (
                                <button
                                    onClick={handleStartDictation}
                                    className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-semibold"
                                >
                                    <Play className="w-5 h-5" />
                                    Bắt đầu
                                </button>
                            )}
                            {(dictationStatus === 'playing' || dictationStatus === 'finished') && (
                                <>
                                    <button
                                        onClick={handleRepeatWord}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                        Nghe lại
                                    </button>
                                    <button
                                        onClick={submitDictation}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Nộp bài
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Status */}
                        {dictationStatus === 'playing' && (
                            <div className="mb-6 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
                                    <span className="text-cyan-700 font-medium">
                                        Đang phát từ {currentWordIndex + 1}...
                                    </span>
                                </div>
                            </div>
                        )}

                        {dictationStatus === 'finished' && (
                            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-green-700 font-medium">
                                    Đã phát hết! Kiểm tra lại và nộp bài khi sẵn sàng.
                                </p>
                            </div>
                        )}

                        {/* Answer Inputs */}
                        {(dictationStatus === 'playing' || dictationStatus === 'finished') && (
                            <div className="grid gap-3">
                                {dictationWords.map((word, idx) => (
                                    <div key={word.word_id} className="flex items-center gap-4">
                                        <span className="w-8 text-gray-400 text-sm">{idx + 1}.</span>
                                        <input
                                            ref={el => inputRefs.current[word.word_id] = el}
                                            type="text"
                                            value={userAnswers[word.word_id] || ''}
                                            onChange={(e) => handleAnswerChange(word.word_id, e.target.value)}
                                            placeholder="Nhập từ nghe được..."
                                            className={`flex-1 px-4 py-3 border rounded-lg outline-none transition-all ${currentWordIndex === idx && dictationStatus === 'playing'
                                                ? 'border-cyan-500 ring-2 ring-cyan-200 bg-cyan-50'
                                                : 'border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {mode === 'result' && results && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Kết quả</h2>
                            <button
                                onClick={closeDictationMode}
                                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                            >
                                Quay lại
                            </button>
                        </div>

                        {/* Score Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-gray-900">{results.total}</p>
                                <p className="text-sm text-gray-500">Tổng số</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-green-600">{results.correct}</p>
                                <p className="text-sm text-green-600">Đúng</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-red-600">{results.incorrect}</p>
                                <p className="text-sm text-red-600">Sai</p>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="space-y-3">
                            {currentResultsPage.map((item, idx) => (
                                <div
                                    key={item.word_id}
                                    className={`flex items-center gap-4 p-4 rounded-xl ${item.isCorrect ? 'bg-green-50' : 'bg-red-50'
                                        }`}
                                >
                                    <span className="w-6 text-gray-500">
                                        {(resultsPage - 1) * ITEMS_PER_PAGE + idx + 1}.
                                    </span>
                                    {item.isCorrect ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                    <div className="flex-1">
                                        <p className={`font-medium ${item.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                            {item.word}
                                        </p>
                                        {!item.isCorrect && (
                                            <p className="text-sm text-gray-500">
                                                Bạn nhập: <span className="text-red-600">{item.userAnswer || '(bỏ trống)'}</span>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => toggleImportant(item.word_id, item.is_important)}
                                        className={`p-2 rounded-lg transition-colors ${item.is_important
                                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                                            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                                            }`}
                                        title={item.is_important ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu quan trọng'}
                                    >
                                        <Star className={`w-5 h-5 ${item.is_important ? 'fill-amber-400' : ''}`} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalResultPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                                    disabled={resultsPage === 1}
                                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Trang {resultsPage} / {totalResultPages}
                                </span>
                                <button
                                    onClick={() => setResultsPage(p => Math.min(totalResultPages, p + 1))}
                                    disabled={resultsPage === totalResultPages}
                                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Try Again */}
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => startDictation(selectedUnit)}
                                className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-semibold"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Làm lại
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <Footer />

            {/* Translator Dialog */}
            <TranslatorDialog
                isOpen={translatorOpen}
                onClose={() => setTranslatorOpen(false)}
                selectedText={selectedWord}
            />
        </div>
    );
};

export default StudentDictation;
