import { useEffect, useState, useCallback } from 'react'
import { Users, GraduationCap, School, FileText, Target, X } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader, Card, Loading, EmptyState, Badge, Avatar, StatCard, Modal } from '../../components/ui'

function accTone(a) { return a >= 80 ? 'green' : a >= 50 ? 'amber' : 'red' }
function fmtDate(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('vi-VN') } catch { return '—' } }

function HistoryModal({ member, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.get(`/center/reports/members/${member.user_id}/history`).then(setData).catch(() => setData({ history: [] }))
  }, [member])
  return (
    <Modal open onClose={onClose} title={`Lịch sử: ${member.username}`} size="lg">
      {!data ? <Loading /> : (
        <div>
          <div className="flex gap-3 mb-4">
            <StatCard icon={Target} label="Chính xác" value={`${data.overall?.accuracy ?? 0}%`} tone="green" />
            <StatCard icon={FileText} label="Bài đã làm" value={data.history?.length ?? 0} tone="brand" />
          </div>
          {(!data.history || data.history.length === 0) ? (
            <EmptyState icon={FileText} title="Chưa có bài làm" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Đề</th>
                    <th className="px-3 py-2 text-left">Ngày</th>
                    <th className="px-3 py-2 text-right">Điểm</th>
                    <th className="px-3 py-2 text-right">Chính xác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.history.map((h) => (
                    <tr key={h.result_id}>
                      <td className="px-3 py-2 text-slate2">{h.exam_title || '—'}{h.is_forecast && <Badge tone="accent">Forecast</Badge>}</td>
                      <td className="px-3 py-2 text-slate-500">{fmtDate(h.completion_date)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{h.total_score ?? '—'}</td>
                      <td className="px-3 py-2 text-right"><Badge tone={accTone(h.accuracy)}>{h.accuracy}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function Reports() {
  const [overview, setOverview] = useState(null)
  const [kind, setKind] = useState('student')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  useEffect(() => { api.get('/center/reports/overview').then(setOverview).catch(() => {}) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try { setMembers(await api.get(`/center/reports/members?member_type=${kind}`)) }
    catch { setMembers([]) } finally { setLoading(false) }
  }, [kind])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title="Dữ liệu toàn trung tâm" subtitle="Tỉ lệ chính xác và lịch sử làm bài của giáo viên & học viên" />

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={GraduationCap} label="Giáo viên" value={overview.teachers} tone="brand" />
          <StatCard icon={Users} label="Học viên" value={overview.students} tone="accent" />
          <StatCard icon={School} label="Lớp học" value={overview.classes} tone="slate" />
          <StatCard icon={FileText} label="Lượt làm bài" value={overview.total_exams} tone="green" />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setKind('student')} className={`chip ${kind === 'student' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Học viên</button>
        <button onClick={() => setKind('teacher')} className={`chip ${kind === 'teacher' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Giáo viên</button>
      </div>

      {loading ? <Loading /> : members.length === 0 ? (
        <Card className="p-2"><EmptyState icon={Users} title="Chưa có thành viên" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{kind === 'teacher' ? 'Giáo viên' : 'Học viên'}</th>
                  <th className="px-3 py-2 text-left font-semibold">Lớp</th>
                  <th className="px-3 py-2 text-right font-semibold">Bài đã làm</th>
                  <th className="px-3 py-2 text-right font-semibold">Chính xác</th>
                  <th className="px-3 py-2 text-center font-semibold">VIP</th>
                  <th className="px-3 py-2 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((m) => (
                  <tr key={m.user_id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setActive(m)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={m.username} size={32} />
                        <div className="min-w-0">
                          <div className="font-medium text-slate2 truncate">{m.username}</div>
                          {m.email && <div className="text-xs text-slate-400 truncate">{m.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {m.classes?.length ? m.classes.map((c) => <Badge key={c.class_id} tone="brand">{c.name}</Badge>) : <span className="text-slate-400">Khách lẻ</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{m.exams_completed}</td>
                    <td className="px-3 py-2.5 text-right"><Badge tone={accTone(m.accuracy)}>{m.accuracy}%</Badge></td>
                    <td className="px-3 py-2.5 text-center">{m.vip?.is_vip ? <Badge tone="green">VIP · {m.vip.remaining_days}d</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-2.5 text-right text-brand-600 text-xs font-medium">Xem lịch sử →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {active && <HistoryModal member={active} onClose={() => setActive(null)} />}
    </div>
  )
}
