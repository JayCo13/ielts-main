import React, { useState, useEffect } from 'react';
import { X, Volume2, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import translatorService from './translatorService';

const TranslatorDialog = ({
    isOpen,
    onClose,
    selectedText,
    position = { x: 0, y: 0 },
    colorTheme = 'black-on-white'
}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        if (isOpen && selectedText) {
            handleLookup();
        } else {
            setData(null);
            setError(null);
            setLoading(false);
            setExpandedSections({});
        }
    }, [isOpen, selectedText]);

    const handleLookup = async () => {
        if (!selectedText || selectedText.trim().length === 0) return;

        setLoading(true);
        setError(null);
        setData(null);

        try {
            const result = await translatorService.getDetailedDefinition(selectedText.trim());
            setData(result);
            // Expand all sections by default
            const expanded = {};
            result.meanings?.forEach((_, idx) => {
                expanded[idx] = true;
            });
            setExpandedSections(expanded);
        } catch (err) {
            console.error('Dictionary lookup error:', err);
            // Fallback to simple translation
            try {
                const simpleResult = await translatorService.translateText(selectedText);
                setData({
                    word: selectedText,
                    phonetics: { uk: '', us: '' },
                    meanings: [{
                        partOfSpeech: 'Dịch nghĩa',
                        definitions: [{ meaning: simpleResult.translatedText }]
                    }]
                });
                setExpandedSections({ 0: true });
            } catch (fallbackErr) {
                setError('Không thể tra cứu từ này. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSpeak = (text, lang) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            window.speechSynthesis.speak(utterance);
        }
    };

    const toggleSection = (idx) => {
        setExpandedSections(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-gray-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Dictionary Tab */}
                <div className="flex items-center border-b border-gray-100 px-4 pt-3 pb-0 bg-white">
                    <button
                        className="px-4 py-2 font-semibold text-sm text-emerald-600 border-b-2 border-emerald-500 -mb-px"
                    >
                        Dictionary
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-white p-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p className="text-sm">Đang tra cứu...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-8 text-red-500 space-y-2">
                            <AlertCircle className="w-8 h-8" />
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : data ? (
                        <div className="animate-fade-in">
                            {/* Word Title */}
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">{data.word}</h2>

                            {/* Phonetics Row */}
                            <div className="flex flex-wrap gap-4 mb-5 text-sm">
                                {/* UK Pronunciation */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleSpeak(data.word, 'en-GB')}
                                        className="p-1.5 hover:bg-emerald-50 rounded-full transition-colors text-emerald-600"
                                        title="UK Pronunciation"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </button>
                                    <span className="text-gray-600 font-mono">{data.phonetics?.uk || '/.../'}</span>
                                    <span className="text-xs text-gray-400">- UK</span>
                                </div>

                                {/* US Pronunciation */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleSpeak(data.word, 'en-US')}
                                        className="p-1.5 hover:bg-emerald-50 rounded-full transition-colors text-emerald-600"
                                        title="US Pronunciation"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </button>
                                    <span className="text-gray-600 font-mono">{data.phonetics?.us || '/.../'}</span>
                                    <span className="text-xs text-gray-400">- US</span>
                                </div>
                            </div>

                            {/* Meanings by Part of Speech */}
                            <div className="space-y-3">
                                {data.meanings?.map((meaning, idx) => (
                                    <div
                                        key={idx}
                                        className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50"
                                    >
                                        {/* Part of Speech Header (Collapsible) */}
                                        <button
                                            onClick={() => toggleSection(idx)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 transition-colors"
                                        >
                                            <span className="font-semibold text-gray-800">{meaning.partOfSpeech}</span>
                                            {expandedSections[idx] ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>

                                        {/* Definitions List */}
                                        {expandedSections[idx] && (
                                            <div className="px-4 pb-4 space-y-3 bg-white">
                                                {meaning.definitions?.map((def, dIdx) => (
                                                    <div key={dIdx} className="flex gap-3">
                                                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                                                        <div className="space-y-1.5 flex-1">
                                                            {/* Vietnamese Meaning */}
                                                            <p className="text-gray-800 font-medium leading-relaxed">
                                                                {def.meaning}
                                                            </p>

                                                            {/* Example Sentence */}
                                                            {def.example && (
                                                                <div className="text-sm">
                                                                    <p className="text-gray-700 italic">
                                                                        {def.example}
                                                                    </p>
                                                                    {def.exampleTrans && (
                                                                        <p className="text-gray-500 italic">
                                                                            {def.exampleTrans}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                    IELTS Tajun Dictionary
                </div>
            </div>
        </div>
    );
};

export default TranslatorDialog;
