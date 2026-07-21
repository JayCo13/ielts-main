import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { Search, ChevronLeft, ChevronRight, Sparkles, CheckCircle, Filter } from 'lucide-react';
import AIFeedbackDialog from './AiFeedbackDialog';
import EditEssayDialog from './EditEssayDialog';
import secureStorage from '../utils/secureStorage';
import { API_BASE } from '../config/api';

const WritingForecast = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPart = (() => {
    const param = new URLSearchParams(location.search).get('part');
    return param === 'part2' ? 'part2' : 'part1';
  })();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Any active VIP package (writing/reading/listening/all_skills) — unlocks the 6/day AI grading quota
  // even when the user isn't a Writing-VIP. The UI footer text promises this for Reading/Listening VIPs too.
  const [hasAnyVipForAi, setHasAnyVipForAi] = useState(false);
  const [partSort, setPartSort] = useState(initialPart);
  const [sortOrder, setSortOrder] = useState('default');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const TYPE_LABELS = {
    'line': 'Line',
    'bar': 'Bar',
    'pie': 'Pie',
    'table': 'Table',
    'map': 'Map',
    'process': 'Process',
    'mixed_task1': 'Mixed',
    'agree_disagree': 'Agree or disagree',
    'negative_positive': 'Negative or positive',
    'advantages_disadvantages': 'Advantages outweigh disadvantages',
    'discuss_opinion': 'Discuss both views and give your opinion',
    'solutions_effects': 'Two parts: Solutions - effects',
    'two_parts_mixed': 'Two parts: Mixed'
  };
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [evaluatedMap, setEvaluatedMap] = useState({});
  const [aiRemaining, setAiRemaining] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [thumbnails, setThumbnails] = useState({}); // lazy-loaded thumbnail map

  // Sync partSort with ?part= query so navbar links to Task 1 / Task 2 work
  // without remount (e.g., switching tabs while already on this page).
  useEffect(() => {
    const param = new URLSearchParams(location.search).get('part');
    const next = param === 'part2' ? 'part2' : 'part1';
    setPartSort(prev => (prev === next ? prev : next));
    setSelectedType('all');
    setCurrentPage(1);
  }, [location.search]);

  // Phase 1: Load list data fast (no images)
  useEffect(() => {
    const fetchData = async () => {
      const token = secureStorage.getItem('token') || localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      try {
        const [forecastRes, vipRes] = await Promise.all([
          fetch(`${API_BASE}/student/writing/forecasts`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/customer/vip/subscription/status`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const [forecastData, vipData] = await Promise.all([forecastRes.json(), vipRes.json()]);
        setHasAnyVipForAi(!!vipData.is_subscribed && (vipData.package_type === 'all_skills' || vipData.package_type === 'single_skill'));
        const flat = [];
        forecastData.forEach(exam => {
          exam.parts.forEach(p => flat.push({
            task_id: p.task_id,
            part_number: p.part_number,
            title: p.title || `Part ${p.part_number}`,
            exam_title: exam.exam_title,
            exam_id: exam.exam_id,
            word_limit: p.word_limit,
            question_types: p.question_types || []
          }));
        });
        setItems(flat);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const base = items.filter(it => {
    const matchSearch = (it.title + ' ' + it.exam_title).toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = selectedType === 'all' || (it.question_types || []).includes(selectedType);
    return matchSearch && matchType;
  });
  const sorted = base.filter(it => partSort === 'part1' ? it.part_number === 1 : it.part_number === 2).sort((a, b) => {
    if (sortOrder === 'alphabet_asc') {
      const titleA = a.title || a.exam_title || '';
      const titleB = b.title || b.exam_title || '';
      return titleA.localeCompare(titleB);
    } else if (sortOrder === 'alphabet_desc') {
      const titleA = a.title || a.exam_title || '';
      const titleB = b.title || b.exam_title || '';
      return titleB.localeCompare(titleA);
    }
    return 0; // default order
  });

  const allTypes = [...new Set(items.filter(it => it.part_number === (partSort === 'part1' ? 1 : 2)).flatMap(it => it.question_types || []))].filter(Boolean);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginated = sorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;

  // Phase 2: Load visible thumbnails first, then prefetch ALL remaining in background
  const attemptedRef = useRef(new Set());
  const prefetchStartedRef = useRef(false);

  // Helper: fetch a batch of thumbnails
  const fetchThumbBatch = async (taskIds, token) => {
    try {
      const res = await fetch(`${API_BASE}/student/writing/thumbnails`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: taskIds })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnails && Object.keys(data.thumbnails).length > 0) {
          setThumbnails(prev => ({ ...prev, ...data.thumbnails }));
        }
      }
    } catch (e) { /* non-critical */ }
  };

  // Step 1: Load visible page thumbnails immediately
  const visibleTaskIds = paginated.map(it => it.task_id);
  const visibleKey = visibleTaskIds.join(',');

  useEffect(() => {
    if (!visibleKey) return;
    const token = secureStorage.getItem('token') || localStorage.getItem('token');
    if (!token) return;
    const ids = visibleKey.split(',').map(Number);
    const needed = ids.filter(id => !attemptedRef.current.has(id));
    if (needed.length === 0) return;
    needed.forEach(id => attemptedRef.current.add(id));
    fetchThumbBatch(needed, token);
  }, [visibleKey]);

  // Step 2: After items load, prefetch ALL remaining thumbnails in background batches
  useEffect(() => {
    if (items.length === 0 || prefetchStartedRef.current) return;
    prefetchStartedRef.current = true;

    const token = secureStorage.getItem('token') || localStorage.getItem('token');
    if (!token) return;

    const allTaskIds = items.map(it => it.task_id);

    // Wait 500ms for visible page to load first, then prefetch rest in batches of 6
    const timer = setTimeout(async () => {
      const remaining = allTaskIds.filter(id => !attemptedRef.current.has(id));
      for (let i = 0; i < remaining.length; i += 6) {
        const batch = remaining.slice(i, i + 6);
        batch.forEach(id => attemptedRef.current.add(id));
        await fetchThumbBatch(batch, token);
        // Small delay between batches to avoid overwhelming the server
        if (i + 6 < remaining.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [items.length]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const usernameKey = localStorage.getItem('username') || 'unknown';
    const now = new Date();
    const nowUtcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vnMs = nowUtcMs + (7 * 60 * 60 * 1000);
    const vn = new Date(vnMs);
    const dateKey = `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
    const storeKey = `aiEvalCounters:${usernameKey}`;
    const counters = JSON.parse(localStorage.getItem(storeKey) || '{}');
    const isVipOrStudent = hasAnyVipForAi || role === 'student';
    const limit = isVipOrStudent ? 6 : 2;
    const used = isVipOrStudent ? (counters[dateKey]?.total || 0) : (counters[dateKey]?.forecast || 0);
    setAiRemaining(Math.max(0, limit - used));
  }, [hasAnyVipForAi, aiDialogOpen, aiLoading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link to="/" className="text-gray-500 hover:text-[#0096b1]">Home</Link>
              </li>
              <li><span className="text-gray-400 mx-2">/</span></li>
              <li><span className="text-[#0096b1] font-medium">Writing Forecast</span></li>
            </ol>
          </nav>
          <div className="text-xs sm:text-sm font-semibold text-red-700 sm:text-right sm:max-w-md">
            <p>* Nâng cấp VIP Listening và Reading để mở khóa thêm 6 lượt chấm điểm AI Writing miễn phí mỗi ngày. *</p>
            <p>* Số lượt chấm điểm bằng AI miễn phí còn lại trong ngày: {aiRemaining} *</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm dự đoán..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 bg-white text-gray-700 font-medium"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="default">Mới nhất</option>
              <option value="alphabet_asc">A-Z</option>
              <option value="alphabet_desc">Z-A</option>
            </select>
            <select
              className="w-full sm:w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 bg-white text-gray-700 font-medium"
              value={partSort}
              onChange={(e) => { setPartSort(e.target.value); setSelectedType('all'); setCurrentPage(1); }}
            >
              <option value="part1">Part 1</option>
              <option value="part2">Part 2</option>
            </select>
          </div>
        </div>

        {/* Question Type Filter */}
        {allTypes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Lọc theo dạng bài:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setSelectedType('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${selectedType === 'all'
                  ? 'bg-[#0096b1] text-white border-[#0096b1]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#0096b1] hover:text-[#0096b1]'
                  }`}
              >
                Tất cả
              </button>
              {allTypes.map(type => {
                const count = items.filter(it => it.part_number === (partSort === 'part1' ? 1 : 2) && (it.question_types || []).includes(type)).length;
                return (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${selectedType === type
                      ? 'bg-[#0096b1] text-white border-[#0096b1]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0096b1] hover:text-[#0096b1]'
                      }`}
                  >
                    {TYPE_LABELS[type] || type} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No forecast items to display</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((it, index) => (
                <div key={it.task_id} className="bg-white rounded-lg shadow border border-gray-100 p-4 relative">
                  <h3 className="text-lg font-semibold text-gray-800">
                    <span className="text-[#0096b1] italic mr-2">Writing:</span>
                    <span>{it.title}</span>
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">Exam: {it.exam_title}</div>
                  {thumbnails[String(it.task_id)] && (
                    <div className="mt-2 mb-2 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                      <img
                        src={(() => {
                          const url = thumbnails[String(it.task_id)];
                          return url.startsWith('/') ? `${API_BASE}${url}` : url;
                        })()}
                        alt={`${it.title} preview`}
                        loading="lazy"
                        className="w-full h-36 object-contain transition-opacity duration-300"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/writing_test_room', { state: { taskId: it.task_id, testId: it.exam_id, isForecast: true } })}
                    className="mt-4 w-full bg-[#0096b1] text-white py-2 rounded"
                  >
                    Take Forecast
                  </button>
                  <button
                    onClick={() => { setSelectedPart(it); setEditDialogOpen(true); }}
                    className="mt-2 w-full bg-gray-800 text-white py-2 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      const role = localStorage.getItem('role');
                      const usernameKey = localStorage.getItem('username') || 'unknown';
                      const now = new Date();
                      const nowUtcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
                      const vnMs = nowUtcMs + (7 * 60 * 60 * 1000);
                      const vn = new Date(vnMs);
                      const dateKey = `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
                      const storeKey = `aiEvalCounters:${usernameKey}`;
                      const counters = JSON.parse(localStorage.getItem(storeKey) || '{}');
                      if (!counters[dateKey]) counters[dateKey] = { full: 0, forecast: 0, total: 0 };
                      const isVipOrStudent = hasAnyVipForAi || role === 'student';
                      if (aiRemaining <= 0) {
                        setAiResult({ error: 'Bạn đã hết số lượt đánh giá AI trong ngày.' });
                        setAiDialogOpen(true);
                        return;
                      }
                      if (isVipOrStudent) {
                        if (counters[dateKey].total >= 6) {
                          setAiResult({ error: 'Bạn đã vượt quá giới hạn đánh giá AI trong ngày (6).' });
                          setAiDialogOpen(true);
                          return;
                        }
                      } else {
                        if (counters[dateKey].forecast >= 2) {
                          setAiResult({ error: 'Tài khoản thường chỉ được đánh giá 2 bài forecast mỗi ngày.' });
                          setAiDialogOpen(true);
                          return;
                        }
                      }
                      setAiLoading(true);
                      setAiDialogOpen(true);
                      try {
                        const token = secureStorage.getItem('token') || localStorage.getItem('token');
                        const essayResponse = await fetch(`${API_BASE}/student/writing/part/${it.task_id}/essay`, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (!essayResponse.ok) throw new Error('Failed to fetch essay');
                        const essayData = await essayResponse.json();
                        if (!essayData.essay?.answer_text) {
                          setAiResult({ error: 'Không có nội dung bài viết để đánh giá. Vui lòng làm bài trước.' });
                          return;
                        }
                        const response = await fetch(`${API_BASE}/ai/evaluate-and-save/${it.task_id}`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ essay_text: essayData.essay.answer_text, instructions: essayData.instructions || '' })
                        });
                        const responseText = await response.text();
                        let data;
                        try { data = JSON.parse(responseText); } catch { throw new Error('Invalid AI response'); }
                        if (!response.ok) throw new Error(data.detail || 'AI error');
                        if (!data.evaluation_result) throw new Error('Missing evaluation result');
                        setAiResult({
                          task_id: data.task_id,
                          evaluation_timestamp: data.evaluation_timestamp,
                          band_score: data.evaluation_result.band_score,
                          word_count: data.word_count,
                          answer_text: essayData.essay.answer_text,
                          evaluation_result: data.evaluation_result,
                          part_number: it.part_number
                        });
                        setEvaluatedMap(prev => ({ ...prev, [it.task_id]: true }));
                        counters[dateKey].total = (counters[dateKey].total || 0) + 1;
                        counters[dateKey].forecast = (counters[dateKey].forecast || 0) + 1;
                        localStorage.setItem(storeKey, JSON.stringify(counters));
                      } catch (err) {
                        setAiResult({ error: `Không thể xử lý phản hồi AI: ${err.message}` });
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    className={`mt-2 w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white py-2 rounded flex items-center justify-center gap-2 ${aiRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={aiLoading || aiRemaining <= 0}
                  >
                    {evaluatedMap[it.task_id] ? <CheckCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? '...' : 'Evaluate with AI'}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={3} />
              </button>
              <span className="text-gray-600 font-bold">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </>
        )}
        <EditEssayDialog
          isOpen={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setSelectedPart(null); }}
          taskId={selectedPart}
          partNumber={selectedPart?.part_number}
        />
        <AIFeedbackDialog
          isOpen={aiDialogOpen}
          onClose={() => setAiDialogOpen(false)}
          result={aiResult}
          loading={aiLoading}
          setSelectedPart={setSelectedPart}
          setEditDialogOpen={setEditDialogOpen}
        />
      </div>
    </div>
  );
};

export default WritingForecast;
