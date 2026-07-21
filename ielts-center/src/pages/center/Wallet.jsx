import { useEffect, useState } from 'react'
import { Wallet, Plus, ArrowDownCircle, Crown, Percent } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { vnd, dateTimeVN } from '../../lib/format'
import { PageHeader, Card, Badge, Loading, EmptyState, Modal, Field, Spinner, StatCard } from '../../components/ui'

const QUICK = [200000, 500000, 1000000, 2000000, 5000000]

export default function WalletPage() {
  const [me, setMe] = useState(null)
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [depositOpen, setDepositOpen] = useState(false)

  const load = async () => {
    const [meRes, t] = await Promise.all([api.get('/center/me'), api.get('/center/wallet/transactions')])
    setMe(meRes); setTxns(t)
  }
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  if (loading) return <Loading />
  if (!me) return null

  return (
    <div>
      <PageHeader title="Ví & VIP" subtitle="Nạp tiền và theo dõi giao dịch"
        action={<button className="btn-primary px-4 py-2.5" onClick={() => setDepositOpen(true)}><Plus className="h-5 w-5" /> Nạp tiền</button>} />

      <div className="rounded-2xl p-6 sm:p-7 mb-6 text-white bg-gradient-to-br from-brand-600 to-slate2 shadow-card relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-2 text-white/80 text-sm"><Wallet className="h-4 w-4" /> Số dư khả dụng</div>
        <div className="text-4xl font-extrabold mt-1">{vnd(me.wallet.balance)}</div>
        <button className="btn bg-white text-brand-700 hover:bg-white/90 px-5 py-2.5 mt-4" onClick={() => setDepositOpen(true)}>
          <Plus className="h-5 w-5" /> Nạp qua PayOS
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={ArrowDownCircle} label="Tổng đã nạp" value={vnd(me.wallet.deposited)} tone="green" />
        <StatCard icon={Crown} label="Tổng đã dùng" value={vnd(me.wallet.used)} tone="accent" />
        <StatCard icon={Percent} label="Chiết khấu VIP" value={`${me.discount_rate}%`} tone="brand" hint={`${me.vip_purchase_count} lượt đã mua`} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate2">Lịch sử giao dịch</h3></div>
        {txns.length === 0 ? (
          <EmptyState icon={Wallet} title="Chưa có giao dịch" subtitle="Các lần nạp tiền và mua VIP sẽ hiển thị ở đây." />
        ) : (
          <div className="divide-y divide-slate-100">
            {txns.map((t) => (
              <div key={t.transaction_id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`h-10 w-10 rounded-xl grid place-items-center ${t.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-accent'}`}>
                  {t.type === 'deposit' ? <ArrowDownCircle className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-700 truncate">
                    {t.type === 'deposit' ? 'Nạp tiền vào ví' : (t.note || 'Mua VIP')}
                  </div>
                  <div className="text-xs text-slate-400">{dateTimeVN(t.created_at)}{t.discount_rate ? ` · -${t.discount_rate}%` : ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-bold ${t.type === 'deposit' ? 'text-emerald-600' : 'text-slate2'}`}>
                    {t.type === 'deposit' ? '+' : '−'}{vnd(t.amount)}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {depositOpen && <DepositModal onClose={() => setDepositOpen(false)} />}
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'completed') return <Badge tone="green">Thành công</Badge>
  if (status === 'pending') return <Badge tone="amber">Đang chờ</Badge>
  return <Badge tone="red">Thất bại</Badge>
}

function DepositModal({ onClose }) {
  const [amount, setAmount] = useState(500000)
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (amount < 10000) { toast.error('Số tiền tối thiểu 10.000₫'); return }
    setSaving(true)
    try {
      const r = await api.post('/center/wallet/deposit', { amount: Number(amount) })
      toast.success('Đang chuyển tới trang thanh toán…')
      window.location.href = r.checkoutUrl
    } catch (err) { toast.error(err.message); setSaving(false) }
  }
  return (
    <Modal open title="Nạp tiền vào ví" onClose={onClose}
      footer={<>
        <button className="btn-ghost px-4 py-2.5" onClick={onClose}>Huỷ</button>
        <button className="btn-primary px-4 py-2.5" onClick={submit} disabled={saving}>{saving ? <Spinner className="h-5 w-5" /> : 'Tới thanh toán'}</button>
      </>}>
      <Field label="Số tiền (₫)">
        <input className="input text-lg font-semibold" type="number" min={10000} step={10000} value={amount}
               onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2 mt-3">
        {QUICK.map((v) => (
          <button key={v} onClick={() => setAmount(v)}
            className={`chip px-3 py-1.5 border ${Number(amount) === v ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {vnd(v)}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">Bạn sẽ được chuyển tới cổng PayOS. Ví được cộng tự động sau khi thanh toán thành công.</p>
    </Modal>
  )
}
