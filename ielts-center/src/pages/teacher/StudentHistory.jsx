import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Target, FileText, ListChecks } from 'lucide-react'
import api from '../../lib/api'
import { dateVN } from '../../lib/format'
import { PageHeader, Card, Loading, EmptyState, Badge, Avatar, StatCard } from '../../components/ui'

function accTone(a) { return a >= 80 ? 'green' : a >= 50 ? 'amber' : 'red' }

export default function StudentHistory() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/teacher/students/${userId}/history`).then(setData).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Loading />
  if (!data) return null

  return (
    <div>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      <div className="flex items-center gap-4 mb-6">
        <Avatar name={data.username} size={56} />
        <div>
          <h1 className="text-2xl font-bold text-slate2">{data.username}</h1>
          <p className="text-sm text-slate-500">Lịch sử làm bài</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard icon={Target} label="Chính xác tổng" value={`${data.overall.accuracy}%`} tone="green" />
        <StatCard icon={ListChecks} label="Câu đã làm" value={data.overall.answered} tone="brand" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate2">Các bài đã làm</h3></div>
        {data.history.length === 0 ? (
          <EmptyState icon={FileText} title="Chưa có bài làm nào" />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.history.map((h) => (
              <div key={h.result_id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate2 grid place-items-center"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-700 truncate">{h.exam_title || 'Bài thi'}</div>
                  <div className="text-xs text-slate-400">{dateVN(h.completion_date)}{h.is_forecast ? ' · Forecast' : ''}</div>
                </div>
                <div className="text-right shrink-0">
                  {h.total_score != null && <div className="font-bold text-slate2">{h.total_score}</div>}
                  <Badge tone={accTone(h.accuracy)}>{h.accuracy}%</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
