import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight, BookOpen, Loader2, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE } from '../config/api';

const WORDS_PER_PAGE = 5;

const DictationAdmin = () => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [unitWords, setUnitWords] = useState([]);
    const [wordsPage, setWordsPage] = useState(1);

    // Form states
    const [showUnitForm, setShowUnitForm] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [unitName, setUnitName] = useState('');
    const [unitDescription, setUnitDescription] = useState('');

    // Word input states
    const [wordInputs, setWordInputs] = useState(Array(5).fill(''));
    const [saving, setSaving] = useState(false);

    const getToken = () => localStorage.getItem('token');

    const fetchUnits = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/dictation/units`, {
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
            const res = await fetch(`${API_BASE}/admin/dictation/units/${unitId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnitWords(data.words);
                setWordsPage(1);
            }
        } catch (error) {
            toast.error('Không thể tải từ vựng');
        }
    }, []);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    useEffect(() => {
        if (selectedUnit) {
            fetchUnitWords(selectedUnit.unit_id);
        }
    }, [selectedUnit, fetchUnitWords]);

    const handleCreateUnit = async () => {
        if (!unitName.trim()) {
            toast.error('Vui lòng nhập tên bài');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/dictation/units`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ name: unitName, description: unitDescription })
            });

            if (res.ok) {
                toast.success('Tạo bài thành công');
                setShowUnitForm(false);
                setUnitName('');
                setUnitDescription('');
                fetchUnits();
            } else {
                toast.error('Không thể tạo bài');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        }
    };

    const handleUpdateUnit = async () => {
        if (!unitName.trim()) {
            toast.error('Vui lòng nhập tên bài');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/dictation/units/${editingUnit.unit_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ name: unitName, description: unitDescription })
            });

            if (res.ok) {
                toast.success('Cập nhật thành công');
                setEditingUnit(null);
                setUnitName('');
                setUnitDescription('');
                fetchUnits();
            } else {
                toast.error('Không thể cập nhật');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        }
    };

    const handleDeleteUnit = async (unitId) => {
        if (!window.confirm('Bạn có chắc muốn xóa bài này?')) return;

        try {
            const res = await fetch(`${API_BASE}/admin/dictation/units/${unitId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.ok) {
                toast.success('Đã xóa bài');
                if (selectedUnit?.unit_id === unitId) {
                    setSelectedUnit(null);
                    setUnitWords([]);
                }
                fetchUnits();
            } else {
                toast.error('Không thể xóa');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        }
    };

    const handleAddWords = async () => {
        const wordsToAdd = wordInputs.filter(w => w.trim());
        if (wordsToAdd.length === 0) {
            toast.error('Vui lòng nhập ít nhất 1 từ');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/admin/dictation/units/${selectedUnit.unit_id}/words`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ words: wordsToAdd })
            });

            if (res.ok) {
                toast.success(`Đã thêm ${wordsToAdd.length} từ`);
                setWordInputs(Array(5).fill(''));
                fetchUnitWords(selectedUnit.unit_id);
                fetchUnits();
            } else {
                toast.error('Không thể thêm từ');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWord = async (wordId) => {
        try {
            const res = await fetch(`${API_BASE}/admin/dictation/words/${wordId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.ok) {
                toast.success('Đã xóa từ');
                fetchUnitWords(selectedUnit.unit_id);
                fetchUnits();
            } else {
                toast.error('Không thể xóa');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        }
    };

    const handleToggleImportant = async (wordId, currentValue) => {
        try {
            const res = await fetch(`${API_BASE}/admin/dictation/words/${wordId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ is_important: !currentValue })
            });

            if (res.ok) {
                toast.success(!currentValue ? 'Đánh dấu quan trọng' : 'Bỏ đánh dấu');
                fetchUnitWords(selectedUnit.unit_id);
                fetchUnits();
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        }
    };

    const totalWordsPages = Math.ceil(wordInputs.length / WORDS_PER_PAGE);
    const currentPageInputs = wordInputs.slice(
        (wordsPage - 1) * WORDS_PER_PAGE,
        wordsPage * WORDS_PER_PAGE
    );

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

            <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý bài chép chính tả</h1>
                    <button
                        onClick={() => setShowUnitForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Tạo bài mới
                    </button>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Units List */}
                    <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Danh sách bài</h2>

                        {units.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Chưa có bài nào</p>
                        ) : (
                            <div className="space-y-2">
                                {units.map(unit => (
                                    <div
                                        key={unit.unit_id}
                                        onClick={() => setSelectedUnit(unit)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${selectedUnit?.unit_id === unit.unit_id
                                            ? 'bg-cyan-50 border-2 border-cyan-500'
                                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{unit.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">{unit.word_count} từ</span>
                                                    {unit.important_count > 0 && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600">
                                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                            {unit.important_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingUnit(unit);
                                                        setUnitName(unit.name);
                                                        setUnitDescription(unit.description || '');
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-cyan-600 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteUnit(unit.unit_id);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Word Editor */}
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        {selectedUnit ? (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    <BookOpen className="w-6 h-6 text-cyan-600" />
                                    <h2 className="text-xl font-semibold text-gray-900">{selectedUnit.name}</h2>
                                </div>

                                {/* Existing Words */}
                                {unitWords.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Từ đã thêm ({unitWords.length})</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {unitWords.map(word => (
                                                <span
                                                    key={word.word_id}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${word.is_important
                                                        ? 'bg-amber-100 border border-amber-300'
                                                        : 'bg-gray-100'
                                                        }`}
                                                >
                                                    <button
                                                        onClick={() => handleToggleImportant(word.word_id, word.is_important)}
                                                        className={`p-0.5 rounded transition-colors ${word.is_important
                                                            ? 'text-amber-500 hover:text-amber-600'
                                                            : 'text-gray-300 hover:text-amber-400'
                                                            }`}
                                                        title={word.is_important ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu quan trọng'}
                                                    >
                                                        <Star className={`w-3.5 h-3.5 ${word.is_important ? 'fill-amber-400' : ''}`} />
                                                    </button>
                                                    {word.word}
                                                    <button
                                                        onClick={() => handleDeleteWord(word.word_id)}
                                                        className="ml-1 text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Word Input Fields */}
                                <div className="mb-4">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Thêm từ mới</h3>
                                    <div className="grid gap-3">
                                        {currentPageInputs.map((value, idx) => {
                                            const actualIdx = (wordsPage - 1) * WORDS_PER_PAGE + idx;
                                            return (
                                                <input
                                                    key={actualIdx}
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => {
                                                        const newInputs = [...wordInputs];
                                                        newInputs[actualIdx] = e.target.value;
                                                        setWordInputs(newInputs);
                                                    }}
                                                    placeholder={`Từ ${actualIdx + 1}`}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Pagination */}
                                {totalWordsPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <button
                                            onClick={() => setWordsPage(p => Math.max(1, p - 1))}
                                            disabled={wordsPage === 1}
                                            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Trang {wordsPage} / {totalWordsPages}
                                        </span>
                                        <button
                                            onClick={() => setWordsPage(p => Math.min(totalWordsPages, p + 1))}
                                            disabled={wordsPage === totalWordsPages}
                                            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Save */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleAddWords}
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                        ) : (
                                            <Save className="w-4 h-4 inline mr-2" />
                                        )}
                                        Lưu từ
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                                <p>Chọn một bài để thêm từ vựng</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            {/* Create/Edit Unit Modal */}
            {(showUnitForm || editingUnit) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingUnit ? 'Chỉnh sửa bài' : 'Tạo bài mới'}
                        </h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={unitName}
                                onChange={(e) => setUnitName(e.target.value)}
                                placeholder="Tên bài (VD: Unit 1 - Vocabulary)"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                            <textarea
                                value={unitDescription}
                                onChange={(e) => setUnitDescription(e.target.value)}
                                placeholder="Mô tả (tùy chọn)"
                                rows={3}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowUnitForm(false);
                                    setEditingUnit(null);
                                    setUnitName('');
                                    setUnitDescription('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={editingUnit ? handleUpdateUnit : handleCreateUnit}
                                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                            >
                                {editingUnit ? 'Cập nhật' : 'Tạo bài'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DictationAdmin;
