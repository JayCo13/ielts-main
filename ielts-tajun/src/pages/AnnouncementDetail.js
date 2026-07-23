import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API_BASE } from '../config/api';

// Reading page for a single "Thông tin mới" item. The homepage list shows only
// the title; clicking opens this page which renders the full rich content
// (may embed images). Image URLs are stored absolute (…/static/…) by the admin
// editor, so the HTML renders as-is.
export default function AnnouncementDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | notfound

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetch(`${API_BASE}/announcements/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => { if (!cancelled) { setItem(data); setState('ok'); } })
      .catch(() => { if (!cancelled) setState('notfound'); });
    return () => { cancelled = true; };
  }, [id]);

  const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return ''; }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#0096b1] hover:text-[#2b5356] mb-5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Về trang chủ
        </Link>

        {state === 'loading' && (
          <div className="text-center text-gray-400 py-20">Đang tải…</div>
        )}

        {state === 'notfound' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-600 font-semibold">Không tìm thấy thông tin này</p>
            <Link to="/" className="inline-block mt-4 text-[#0096b1] font-medium">← Về trang chủ</Link>
          </div>
        )}

        {state === 'ok' && item && (
          <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <header className="px-6 md:px-8 pt-7 pb-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{item.icon || '📢'}</span>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#2b5356]">{item.title || 'Thông tin mới'}</h1>
                  {item.created_at && <p className="text-sm text-gray-400 mt-1">{fmtDate(item.created_at)}</p>}
                </div>
              </div>
            </header>
            <div
              className="announcement-content px-6 md:px-8 py-6 text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.content || '<p>(Chưa có nội dung)</p>' }}
            />
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
