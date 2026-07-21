import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { School, Users, Target, ChevronRight } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader, Card, Loading, EmptyState, Badge } from '../../components/ui'

function accTone(a) { return a >= 80 ? 'green' : a >= 50 ? 'amber' : 'red' }

export default function TeacherOverview() {
  const [me, setMe] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [meRes, cls] = await Promise.all([api.get('/teacher/me'), api.get('/teacher/classes')])
        setMe(meRes); setClasses(cls)
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <Loading />

  return (
    <div>
      <PageHeader title={`Chào ${me?.username || ''} 👋`}
        subtitle={me?.center ? `Giáo viên tại ${me.center.name}` : 'Lớp bạn đang phụ trách'} />

      {classes.length === 0 ? (
        <Card className="p-2"><EmptyState icon={School} title="Bạn chưa được gán lớp" subtitle="Liên hệ trung tâm để được thêm vào lớp." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Link key={c.class_id} to={`/teacher/classes/${c.class_id}`}>
              <Card className="p-5 hover:shadow-pop transition-shadow animate-fade-in h-full flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center"><School className="h-6 w-6" /></div>
                  <Badge tone={accTone(c.average_accuracy)}><Target className="h-3.5 w-3.5" /> {c.average_accuracy}%</Badge>
                </div>
                <h3 className="font-bold text-slate2 mt-3 text-lg">{c.name}</h3>
                <div className="text-sm text-slate-500 mt-1 inline-flex items-center gap-1"><Users className="h-4 w-4" /> {c.student_count} học viên</div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-brand-600 font-semibold inline-flex items-center gap-1 mt-auto">
                  Xem học viên <ChevronRight className="h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
