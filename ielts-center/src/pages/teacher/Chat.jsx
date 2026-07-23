import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Pin, PinOff, School, User as UserIcon, Megaphone } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader, Card, Loading, EmptyState, Badge, Avatar } from '../../components/ui'

function timeShort(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function Chat() {
  const [params, setParams] = useSearchParams()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)      // { type, id, name }
  const [messages, setMessages] = useState([])
  const [pinned, setPinned] = useState([])
  const [text, setText] = useState('')
  const [asHomework, setAsHomework] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  // Open a direct thread passed from the realtime board (?type=direct&id=&name=)
  useEffect(() => {
    const type = params.get('type'); const id = params.get('id'); const name = params.get('name')
    if (type && id) {
      setActive({ type, id: Number(id), name: name || `#${id}` })
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadThreads = useCallback(async () => {
    try {
      const data = await api.get('/chat/threads')
      setThreads(data?.threads || [])
    } catch { /* ignore poll errors */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadThreads()
    const id = setInterval(loadThreads, 5000)
    return () => clearInterval(id)
  }, [loadThreads])

  const loadMessages = useCallback(async () => {
    if (!active) return
    try {
      const data = await api.get(`/chat/messages?scope=${active.type}&target_id=${active.id}&after_id=0`)
      setMessages(data?.messages || [])
      setPinned(data?.pinned || [])
    } catch { /* ignore */ }
  }, [active])

  useEffect(() => {
    if (!active) return undefined
    setMessages([]); setPinned([]); setAsHomework(false)
    loadMessages()
    const id = setInterval(loadMessages, 3000)
    return () => clearInterval(id)
  }, [active, loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const body = text.trim()
    if (!body || !active || sending) return
    setSending(true)
    try {
      await api.post('/chat/messages', {
        scope: active.type,
        target_id: active.id,
        content: body,
        is_pinned: active.type === 'class' ? asHomework : false,
      })
      setText(''); setAsHomework(false)
      await loadMessages(); loadThreads()
    } catch (e) { alert(e.message || 'Không gửi được') } finally { setSending(false) }
  }

  const togglePin = async (m) => {
    try {
      await api.post(`/chat/messages/${m.message_id}/pin`, { pinned: !m.is_pinned })
      loadMessages()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <Loading />

  return (
    <div>
      <PageHeader title="Tin nhắn" subtitle="Nhắn với học viên và cả lớp · ghim tin để giao bài" />
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4" style={{ height: 'calc(100vh - 210px)' }}>
        {/* Thread list */}
        <Card className="overflow-y-auto p-2">
          {threads.length === 0 ? (
            <EmptyState icon={School} title="Chưa có hội thoại" subtitle="Lớp và học viên sẽ hiện ở đây." />
          ) : threads.map((t) => {
            const on = active && active.type === t.type && active.id === t.id
            return (
              <button
                key={`${t.type}:${t.id}`}
                onClick={() => setActive({ type: t.type, id: t.id, name: t.name })}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${on ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
              >
                <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center ${t.type === 'class' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                  {t.type === 'class' ? <School className="h-4.5 w-4.5" /> : <UserIcon className="h-4.5 w-4.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate2 truncate text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400 truncate">{t.last || 'Chưa có tin nhắn'}</div>
                </div>
                {t.unread > 0 && <span className="shrink-0 text-[11px] font-bold text-white bg-brand-600 rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">{t.unread}</span>}
              </button>
            )
          })}
        </Card>

        {/* Conversation */}
        <Card className="flex flex-col overflow-hidden">
          {!active ? (
            <EmptyState icon={Send} title="Chọn một hội thoại" subtitle="Chọn lớp hoặc học viên bên trái để bắt đầu." />
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                {active.type === 'class' ? <School className="h-4 w-4 text-brand-600" /> : <UserIcon className="h-4 w-4 text-slate-500" />}
                <span className="font-bold text-slate2">{active.name}</span>
                {active.type === 'class' && <Badge tone="brand">Cả lớp</Badge>}
              </div>

              {/* Pinned homework */}
              {pinned.length > 0 && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 space-y-1.5">
                  {pinned.map((m) => (
                    <div key={m.message_id} className="flex items-start gap-2 text-sm">
                      <Pin className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0"><span className="font-semibold text-amber-700">Giao bài:</span> <span className="text-amber-800">{m.content}</span></div>
                      <button onClick={() => togglePin(m)} title="Bỏ ghim" className="text-amber-400 hover:text-amber-600"><PinOff className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-slate-50/40">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 py-8">Chưa có tin nhắn</div>
                ) : messages.map((m) => (
                  <div key={m.message_id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group max-w-[75%] rounded-2xl px-3.5 py-2 ${m.mine ? 'bg-brand-600 text-white' : 'bg-white border border-slate-100 text-slate2'}`}>
                      {!m.mine && active.type === 'class' && <div className="text-[11px] font-semibold text-brand-600 mb-0.5">{m.sender_name}</div>}
                      <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>
                        {m.is_pinned && <Pin className="h-2.5 w-2.5" />}{timeShort(m.created_at)}
                        {active.type === 'class' && (
                          <button onClick={() => togglePin(m)} title={m.is_pinned ? 'Bỏ ghim' : 'Ghim (giao bài)'} className={`opacity-0 group-hover:opacity-100 ml-1 ${m.mine ? 'text-white/70' : 'text-slate-400'} hover:opacity-100`}>
                            <Pin className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-slate-100 p-3">
                {active.type === 'class' && (
                  <label className="flex items-center gap-2 text-xs text-slate-500 mb-2 cursor-pointer">
                    <input type="checkbox" checked={asHomework} onChange={(e) => setAsHomework(e.target.checked)} className="accent-brand-600" />
                    <Megaphone className="h-3.5 w-3.5" /> Ghim làm bài tập (không bị trôi)
                  </label>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    rows={1}
                    placeholder="Nhập tin nhắn…"
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 max-h-28"
                  />
                  <button onClick={send} disabled={sending || !text.trim()} className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700">
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
