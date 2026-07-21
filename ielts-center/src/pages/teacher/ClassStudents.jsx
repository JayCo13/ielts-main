import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Target, Users, ChevronRight, FileText } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader, Card, Loading, EmptyState, Badge, Avatar, StatCard } from '../../components/ui'

function accTone(a) { return a >= 80 ? 'green' : a >= 50 ? 'amber' : 'red' }

export default function ClassStudents() {
  const { classId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/teacher/classes/${classId}/students`).then(setData).finally(() => setLoading(false))
  }, [classId])

  if (loading) return <Loading />
  if (!data) return null

  return (
    <div>
      <Link to="/teacher" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Lớp của tôi
      </Link>
      <PageHeader title={data.name} subtitle="Danh sách học viên và tỉ lệ chính xác" />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard icon={Users} label="Học viên" value={data.students.length} tone="brand" />
        <StatCard icon={Target} label="Chính xác TB" value={`${data.average_accuracy}%`} tone="green" />
      </div>

      {data.students.length === 0 ? (
        <Card className="p-2"><EmptyState icon={Users} title="Lớp chưa có học viên" /></Card>
      ) : (
        <div className="space-y-3">
          {data.students.map((s) => (
            <Link key={s.user_id} to={`/teacher/students/${s.user_id}`}>
              <Card className="p-4 flex items-center gap-4 hover:shadow-pop transition-shadow">
                <Avatar name={s.username} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate2 truncate">{s.username}</div>
                  <div className="text-sm text-slate-500 inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {s.exams_completed} bài đã làm</div>
                </div>
                <Badge tone={accTone(s.accuracy)}><Target className="h-3.5 w-3.5" /> {s.accuracy}%</Badge>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
