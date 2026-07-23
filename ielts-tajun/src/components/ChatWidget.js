import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE } from '../config/api';

// Bottom-right chat widget for CENTER students only. It probes /chat/threads on
// mount; a 403 (not a center member) hides it entirely. Students can chat with
// their teacher(s) and their class channels only — never chat-all (enforced by
// the backend). Hidden during exams so it never covers the test UI.
const token = () => localStorage.getItem('token');

async function authed(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const e = new Error('req'); e.status = res.status; throw e; }
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function timeShort(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

export default function ChatWidget() {
  const location = useLocation();
  const [available, setAvailable] = useState(null); // null unknown, false hide, true show
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const wrapRef = useRef(null);
  const sendingRef = useRef(false);
  const audioRef = useRef(null);
  const prevUnreadRef = useRef(null);

  const onExam = location.pathname.includes('test_room');
  const loggedIn = !!token();

  const loadThreads = useCallback(async () => {
    try {
      const data = await authed('/chat/threads');
      setThreads(data?.threads || []);
      setAvailable(true);
    } catch (e) {
      if (e.status === 403 || e.status === 401) setAvailable(false);
    }
  }, []);

  // The widget lives ONLY inside the exam/study room — probe + poll only there.
  // Once a 403 marks the user as non-center (available === false), stop entirely.
  useEffect(() => {
    if (!loggedIn || !onExam) return undefined;
    if (available === false) return undefined;
    loadThreads();
    const id = setInterval(loadThreads, 8000);
    return () => clearInterval(id);
  }, [loggedIn, onExam, available, loadThreads]);

  const loadMessages = useCallback(async () => {
    if (!active) return;
    try {
      const data = await authed(`/chat/messages?scope=${active.type}&target_id=${active.id}&after_id=0`);
      setMessages(data?.messages || []);
      setPinned(data?.pinned || []);
    } catch (e) { /* ignore */ }
  }, [active]);

  useEffect(() => {
    if (!active || !open) return undefined;
    setMessages([]); setPinned([]);
    loadMessages();
    const id = setInterval(loadMessages, 3000);
    return () => clearInterval(id);
  }, [active, open, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Ask for browser-notification permission once the widget is available.
  useEffect(() => {
    if (available === true && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [available]);

  // Sound + browser notification whenever total unread grows (a new incoming msg).
  useEffect(() => {
    const total = threads.reduce((n, t) => n + (t.unread || 0), 0);
    const prev = prevUnreadRef.current;
    if (prev !== null && total > prev) {
      const t = threads.find((x) => (x.unread || 0) > 0);
      try {
        if (!audioRef.current) audioRef.current = new Audio('/notify.mp3');
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch (e) { /* ignore */ }
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(t ? `Tin nhắn mới · ${t.name}` : 'Tin nhắn mới', {
            body: t?.last || '', icon: '/img/logo-ielts.png', tag: 'ielts-chat',
          });
          n.onclick = () => {
            window.focus(); setOpen(true);
            if (t) setActive({ type: t.type, id: t.id, name: t.name });
            n.close();
          };
        }
      } catch (e) { /* ignore */ }
    }
    prevUnreadRef.current = total;
  }, [threads]);

  // Click outside the widget closes the open panel.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const send = async () => {
    const body = text.trim();
    if (!body || !active || sendingRef.current) return;  // guard double-send (IME/Enter)
    sendingRef.current = true;
    try {
      await authed('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ scope: active.type, target_id: active.id, content: body, is_pinned: false }),
      });
      setText('');
      loadMessages(); loadThreads();
    } catch (e) { /* ignore */ } finally { sendingRef.current = false; }
  };

  // Only inside the exam/study room (not marketing pages, lists or dashboard).
  // Lifted above the exam footer / Submit button.
  if (!loggedIn || !onExam || available === false || available === null) return null;

  const unreadTotal = threads.reduce((n, t) => n + (t.unread || 0), 0);

  return (
    <div ref={wrapRef} className="fixed right-4 bottom-24 z-[1000]">
      {open && (
        <div className="mb-3 w-[340px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0096b1] to-[#2b5356] text-white">
            {active && (
              <button onClick={() => setActive(null)} className="mr-1 text-white/90 hover:text-white">←</button>
            )}
            <span className="font-bold text-sm flex-1 truncate">{active ? active.name : 'Tin nhắn'}</span>
            <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white text-lg leading-none">×</button>
          </div>

          {!active ? (
            <div className="flex-1 overflow-y-auto p-2">
              {threads.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-10">Chưa có hội thoại</div>
              ) : threads.map((t) => (
                <button
                  key={`${t.type}:${t.id}`}
                  onClick={() => setActive({ type: t.type, id: t.id, name: t.name })}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50"
                >
                  <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-white ${t.type === 'class' ? 'bg-[#0096b1]' : 'bg-[#2b5356]'}`}>
                    {t.type === 'class' ? '👥' : '👩‍🏫'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-800 truncate text-sm">{t.name}{t.type === 'class' ? ' (lớp)' : ''}</div>
                    <div className="text-xs text-gray-400 truncate">{t.last || 'Chưa có tin nhắn'}</div>
                  </div>
                  {t.unread > 0 && <span className="shrink-0 text-[11px] font-bold text-white bg-[#eb7e37] rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">{t.unread}</span>}
                </button>
              ))}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 space-y-1">
                  {pinned.map((m) => (
                    <div key={m.message_id} className="text-xs text-amber-800"><span className="font-semibold">📌 Giao bài:</span> {m.content}</div>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50/50">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-8">Chưa có tin nhắn</div>
                ) : messages.map((m) => (
                  <div key={m.message_id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${m.mine ? 'bg-[#0096b1] text-white' : 'bg-white border border-gray-100 text-gray-800'}`}>
                      {!m.mine && active.type === 'class' && <div className="text-[11px] font-semibold text-[#0096b1] mb-0.5">{m.sender_name}</div>}
                      <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`text-[10px] mt-0.5 ${m.mine ? 'text-white/70' : 'text-gray-400'}`}>{timeShort(m.created_at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-gray-100 p-2 flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder="Nhập tin nhắn…"
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0096b1]/40 max-h-24"
                />
                <button onClick={send} disabled={!text.trim()} className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-[#0096b1] text-white disabled:opacity-40">➤</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative h-14 w-14 rounded-full bg-gradient-to-br from-[#0096b1] to-[#2b5356] text-white shadow-xl grid place-items-center hover:scale-105 transition-transform"
        aria-label="Tin nhắn"
      >
        <span className="text-2xl">💬</span>
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 text-[11px] font-bold text-white bg-[#eb7e37] rounded-full min-w-[20px] h-[20px] grid place-items-center px-1 border-2 border-white">{unreadTotal}</span>
        )}
      </button>
    </div>
  );
}
