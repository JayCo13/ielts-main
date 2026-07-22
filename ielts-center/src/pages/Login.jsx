import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, User, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { setSession, isAuthed, getRole } from '../lib/auth'
import { Spinner } from '../components/ui'

const LOGO = 'https://thiieltstrenmay.com/img/logo-ielts.png'

function DashboardArt() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      <div className="absolute inset-8 rounded-[36px] bg-brand-300/30 blur-3xl" />

      {/* main card */}
      <div className="float-a relative rounded-2xl bg-white border border-white p-5
                      shadow-[0_28px_70px_-24px_rgba(15,60,62,0.30)]">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 mb-5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <div className="ml-3 h-5 flex-1 rounded-md bg-slate-100" />
        </div>

        {/* headline stat */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xs text-slate-400">Số dư ví trung tâm</div>
            <div className="text-2xl font-extrabold text-slate2">12.500.000₫</div>
          </div>
          <span className="chip bg-emerald-50 text-emerald-600 text-[11px]">▲ 12%</span>
        </div>

        {/* chart */}
        <svg viewBox="0 0 300 108" className="w-full h-[108px]">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0096b1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0096b1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,86 C40,64 62,76 92,56 C120,38 150,50 182,30 C214,12 244,24 296,10 L296,108 L0,108 Z" fill="url(#area)" />
          <path className="draw-line" d="M0,86 C40,64 62,76 92,56 C120,38 150,50 182,30 C214,12 244,24 296,10"
                fill="none" stroke="#0096b1" strokeWidth="3" strokeLinecap="round" />
          <circle cx="296" cy="10" r="4.5" fill="#0096b1" className="pulse-dot" />
        </svg>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {[['Giáo viên', '08'], ['Học viên', '124'], ['Lớp', '06']].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3">
              <div className="text-[11px] text-slate-400">{l}</div>
              <div className="text-lg font-bold text-slate2">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* floating accent pill */}
      <div className="float-b absolute -right-3 -top-4 rounded-2xl bg-white shadow-lg border border-slate-100 px-3.5 py-2.5 flex items-center gap-2.5">
        <span className="h-8 w-8 rounded-xl bg-orange-50 text-accent grid place-items-center text-[11px] font-extrabold">VIP</span>
        <div className="leading-tight text-left">
          <div className="text-[10px] text-slate-400">Chiết khấu</div>
          <div className="text-sm font-bold text-slate2">10%</div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthed()) {
    return void navigate(getRole() === 'teacher' ? '/teacher' : '/', { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.post('/center/login', form)
      setSession(data)
      toast.success('Đăng nhập thành công')
      navigate(data.role === 'teacher' ? '/teacher' : '/', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Shared animated background — spans both panels so they feel connected */}
      <div className="animated-gradient fixed inset-0 -z-10" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* ── Left: open onto the aurora, fully centered ── */}
        <div className="relative hidden lg:flex flex-col items-center text-center p-12 xl:p-16">
          <div className="self-start flex items-center gap-3">
            <img src={LOGO} className="h-12 w-12 rounded-xl object-contain" alt="logo" />
            <span className="font-semibold tracking-tight text-slate2">Thi IELTS Trên Máy</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <DashboardArt />
            <h1 className="mt-12 text-[38px] font-extrabold leading-[1.12] tracking-tight text-slate2">
              Trung tâm của bạn,<br />
              <span className="text-slate-400">gọn trong một nơi.</span>
            </h1>
            <p className="mt-4 text-slate-500 text-[17px] leading-relaxed max-w-md mx-auto">
              Một bảng điều khiển đẹp và nhanh để vận hành toàn bộ trung tâm luyện thi IELTS.
            </p>
          </div>

          <div className="text-slate-400 text-sm">© 2026 · thiieltstrenmay.com</div>
        </div>

        {/* ── Right: frosted glass over the same aurora — the split ── */}
        <div className="relative flex items-center justify-center p-6 sm:p-10
                        bg-white/70 backdrop-blur-2xl lg:border-l border-white/70
                        shadow-[-24px_0_70px_-30px_rgba(15,60,62,0.18)]">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-10 lg:hidden">
              <img src={LOGO} className="h-11 w-11 rounded-xl object-contain" alt="logo" />
              <span className="font-extrabold text-lg text-slate2">Thi IELTS Trên Máy</span>
            </div>

            <span className="chip bg-brand-50 text-brand-700 mb-5">Cổng Trung tâm</span>
            <h2 className="text-3xl font-bold text-slate2 tracking-tight">Chào mừng trở lại 👋</h2>
            <p className="text-slate-500 mt-2 mb-9 text-[15px]">Đăng nhập để quản lý trung tâm của bạn.</p>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label">Tên đăng nhập</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input className="input pl-12 py-3.5 text-[15px]" value={form.username} autoFocus
                         onChange={(e) => setForm({ ...form, username: e.target.value })}
                         placeholder="Nhập tên đăng nhập" required />
                </div>
              </div>
              <div>
                <label className="label">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input className="input pl-12 pr-12 py-3.5 text-[15px]" type={show ? 'text' : 'password'} value={form.password}
                         onChange={(e) => setForm({ ...form, password: e.target.value })}
                         placeholder="Nhập mật khẩu" required />
                  <button type="button" onClick={() => setShow(!show)} tabIndex={-1}
                          className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                className="group w-full py-4 rounded-xl font-semibold text-white text-[15px] shadow-lg shadow-brand-500/25
                           bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700
                           transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
                disabled={loading}>
                {loading ? <Spinner className="h-5 w-5" /> : <>Đăng nhập <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" /></>}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-8">
              Tài khoản do trung tâm hoặc quản trị viên cấp.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
