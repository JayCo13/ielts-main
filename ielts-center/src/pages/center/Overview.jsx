import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Users, School, Wallet, TrendingUp, ArrowUpRight, Percent } from 'lucide-react'
import api from '../../lib/api'
import { vnd } from '../../lib/format'
import { PageHeader, StatCard, Card, Loading, Badge } from '../../components/ui'

export default function Overview() {
  const [me, setMe] = useState(null)
  const [counts, setCounts] = useState({ teachers: 0, students: 0, classes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [meRes, t, s, c] = await Promise.all([
          api.get('/center/me'),
          api.get('/center/teachers'),
          api.get('/center/students'),
          api.get('/center/classes'),
        ])
        setMe(meRes)
        setCounts({ teachers: t.length, students: s.length, classes: c.length })
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <Loading />
  if (!me) return null

  const tier = me.discount_rate
  const nextThreshold = tier === 0 ? 6 : tier === 5 ? 21 : null

  return (
    <div>
      <PageHeader title={`Xin chào, ${me.name} 👋`} subtitle="Tổng quan hoạt động trung tâm của bạn" />

      {/* Wallet hero */}
      <div className="rounded-2xl p-6 sm:p-7 mb-6 text-white bg-gradient-to-br from-slate2 to-deep shadow-card relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-white/70 text-sm"><Wallet className="h-4 w-4" /> Số dư ví</div>
            <div className="text-4xl font-extrabold mt-1">{vnd(me.wallet.balance)}</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-white/70">
              <span>Đã nạp: <b className="text-white">{vnd(me.wallet.deposited)}</b></span>
              <span>Đã dùng: <b className="text-white">{vnd(me.wallet.used)}</b></span>
            </div>
          </div>
          <Link to="/wallet" className="btn bg-white text-slate2 hover:bg-white/90 px-5 py-3 shrink-0 self-start">
            <TrendingUp className="h-5 w-5" /> Nạp tiền & mua VIP
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/teachers"><StatCard icon={GraduationCap} label="Giáo viên" value={counts.teachers} tone="brand" /></Link>
        <Link to="/students"><StatCard icon={Users} label="Học viên" value={counts.students} tone="green" /></Link>
        <Link to="/classes"><StatCard icon={School} label="Lớp học" value={counts.classes} tone="accent" /></Link>
        <StatCard icon={Percent} label="Chiết khấu hiện tại" value={`${tier}%`} tone="slate"
                  hint={`${me.vip_purchase_count} lượt đã mua VIP`} />
      </div>

      {/* Discount tier explainer */}
      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate2">Bậc chiết khấu VIP</h3>
          <Badge tone="brand">Đang ở mức {tier}%</Badge>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { range: 'Lượt 1 – 5', rate: '0%', active: tier === 0 },
            { range: 'Lượt 6 – 20', rate: '5%', active: tier === 5 },
            { range: 'Từ lượt 21', rate: '10%', active: tier === 10 },
          ].map((t) => (
            <div key={t.range} className={`rounded-xl border p-4 ${t.active ? 'border-brand-400 bg-brand-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="text-sm text-slate-500">{t.range}</div>
              <div className={`text-2xl font-bold ${t.active ? 'text-brand-600' : 'text-slate-700'}`}>{t.rate}</div>
            </div>
          ))}
        </div>
        {nextThreshold && (
          <p className="text-sm text-slate-500 mt-4 flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-brand-500" />
            Mua thêm {nextThreshold - 1 - me.vip_purchase_count < 0 ? 0 : nextThreshold - 1 - me.vip_purchase_count} lượt nữa để lên bậc chiết khấu cao hơn.
          </p>
        )}
      </Card>
    </div>
  )
}
