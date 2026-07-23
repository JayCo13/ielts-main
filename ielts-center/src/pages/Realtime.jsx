import { useEffect, useRef, useState } from 'react'
import { Activity, MessageSquare, ArrowUpDown } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Card, Loading, EmptyState, Badge, Avatar } from '../components/ui'

const SKILLS = {
  listening: { label: 'Listening', tone: 'brand' },
  reading: { label: 'Reading', tone: 'green' },
  writing: { label: 'Writing', tone: 'accent' },
  speaking: { label: 'Speaking', tone: 'amber' },
}

function fmtElapsed(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function SortHeader({ label, col, sort, setSort, className = '' }) {
  const active = sort.col === col
  return (
    <th className={`px-3 py-2 text-left font-semibold ${className}`}>
      <button
        onClick={() => setSort({ col, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
        className={`inline-flex items-center gap-1 hover:text-brand-600 ${active ? 'text-brand-600' : ''}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </th>
  )
}

// scope: 'teacher' -> /teacher/realtime (own classes) | 'center' -> /center/realtime (all)
export default function Realtime({ scope = 'teacher' }) {
  const endpoint = scope === 'center' ? '/center/realtime' : '/teacher/realtime'
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [sort, setSort] = useState({ col: 'class_name', dir: 'asc' })
  const inFlight = useRef(false)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const data = await api.get(endpoint)
        if (!alive) return
        setStudents(Array.isArray(data?.students) ? data.students : [])
        setErr(null)
        setUpdatedAt(new Date())
      } catch (e) {
        if (alive) setErr(e.message || 'Không tải được dữ liệu')
      } finally {
        inFlight.current = false
        if (alive) setLoading(false)
      }
    }
    tick()
    const id = setInterval(tick, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [endpoint])

  const sorted = [...students].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1
    let av = a[sort.col]
    let bv = b[sort.col]
    if (sort.col === 'elapsed_seconds' || sort.col === 'questions_done') {
      return ((av ?? 0) - (bv ?? 0)) * dir
    }
    av = (av ?? '').toString().toLowerCase()
    bv = (bv ?? '').toString().toLowerCase()
    return av < bv ? -dir : av > bv ? dir : 0
  })

  if (loading) return <Loading />

  return (
    <div>
      <PageHeader
        title="Theo dõi trực tuyến"
        subtitle={scope === 'center' ? 'Học viên toàn trung tâm đang làm bài' : 'Học viên lớp bạn đang làm bài'}
        action={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            {students.length} đang làm
            {updatedAt && <span className="text-slate-400">· cập nhật {updatedAt.toLocaleTimeString()}</span>}
          </div>
        }
      />

      {err && (
        <Card className="p-4 mb-4 bg-red-50 text-red-600 text-sm border border-red-100">{err}</Card>
      )}

      {sorted.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={Activity} title="Chưa có ai đang làm bài"
            subtitle="Bảng sẽ tự cập nhật khi học viên bắt đầu làm bài (mỗi 4 giây)." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <SortHeader label="Học viên" col="name" sort={sort} setSort={setSort} />
                  <SortHeader label="Lớp" col="class_name" sort={sort} setSort={setSort} />
                  <SortHeader label="Thời gian" col="elapsed_seconds" sort={sort} setSort={setSort} />
                  <th className="px-3 py-2 text-left font-semibold">Kỹ năng</th>
                  <th className="px-3 py-2 text-left font-semibold">Đề</th>
                  <th className="px-3 py-2 text-left font-semibold">Nội dung</th>
                  <SortHeader label="Số câu" col="questions_done" sort={sort} setSort={setSort} />
                  <th className="px-3 py-2 text-left font-semibold">Câu hiện tại</th>
                  <th className="px-3 py-2 text-right font-semibold">Nhắn tin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((s) => {
                  const sk = SKILLS[s.skill] || { label: s.skill || '—', tone: 'slate' }
                  return (
                    <tr key={s.user_id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={s.name} size={32} />
                          <span className="font-medium text-slate2 truncate">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{s.class_name ? <Badge tone="brand">{s.class_name}</Badge> : <span className="text-slate-400">Khách lẻ</span>}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">{fmtElapsed(s.elapsed_seconds)}</td>
                      <td className="px-3 py-2.5"><Badge tone={sk.tone}>{sk.label}</Badge></td>
                      <td className="px-3 py-2.5 text-slate-500">{s.exam_id != null ? `#${s.exam_id}` : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[220px] truncate" title={s.title || ''}>{s.title || '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">
                        {s.questions_done ?? 0}{s.total_questions ? `/${s.total_questions}` : ''}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">{s.last_question ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          disabled
                          title="Tính năng nhắn tin sắp ra mắt"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 bg-slate-100 cursor-not-allowed"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Nhắn
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
