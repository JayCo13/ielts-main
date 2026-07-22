import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, User, Lock,
  Users, Wallet, LineChart,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { setSession, isAuthed, getRole } from '../lib/auth'
import { Spinner } from '../components/ui'

const LOGO = 'https://thiieltstrenmay.com/img/logo-ielts.png'

const FEATURES = [
  { icon: Users, text: 'Quản lý giáo viên & học viên không giới hạn' },
  { icon: Wallet, text: 'Ví điện tử & mua VIP theo bậc chiết khấu' },
  { icon: LineChart, text: 'Theo dõi tiến độ và tỉ lệ chính xác' },
]

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
    <div className="min-h-screen w-full bg-gradient-to-br from-[#eef6f7] via-white to-[#f3f0ea] grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-14 overflow-hidden text-white
                      bg-gradient-to-br from-brand-400 via-brand-600 to-deep">
        {/* single soft light source — no busy decoration */}
        <div className="pointer-events-none absolute -top-1/4 -right-1/4 h-[70%] w-[70%] rounded-full
                        bg-white/10 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />

        {/* top brand */}
        <div className="relative flex items-center gap-3">
          <img src={LOGO} className="h-11 w-11 rounded-xl bg-white p-1 object-contain shadow-sm" alt="logo" />
          <span className="font-semibold tracking-tight text-[15px]">Thi IELTS Trên Máy</span>
        </div>

        {/* hero */}
        <div className="relative max-w-md">
          <h1 className="text-[44px] font-extrabold leading-[1.08] tracking-tight">
            Trung tâm của bạn,<br />
            <span className="text-white/60">gọn trong một nơi.</span>
          </h1>
          <p className="mt-6 text-white/80 text-lg leading-relaxed">
            Một bảng điều khiển đẹp và nhanh để vận hành toàn bộ trung tâm luyện thi IELTS.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-white/15 ring-1 ring-white/20 grid place-items-center shrink-0">
                  <f.icon className="h-[22px] w-[22px]" />
                </div>
                <span className="text-white/90">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-white/45 text-sm">© 2026 · thiieltstrenmay.com</div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <img src={LOGO} className="h-11 w-11 rounded-xl object-contain shadow-sm" alt="logo" />
            <span className="font-extrabold text-lg text-slate2 lg:hidden">Thi IELTS Trên Máy</span>
            <span className="chip bg-brand-50 text-brand-700 hidden lg:inline-flex">Cổng Trung tâm</span>
          </div>

          <h2 className="text-[26px] font-bold text-slate2 tracking-tight">Chào mừng trở lại 👋</h2>
          <p className="text-slate-500 mt-1.5 mb-8">Đăng nhập để quản lý trung tâm của bạn.</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Tên đăng nhập</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                <input className="input pl-11 py-3" value={form.username} autoFocus
                       onChange={(e) => setForm({ ...form, username: e.target.value })}
                       placeholder="Nhập tên đăng nhập" required />
              </div>
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                <input className="input pl-11 pr-11 py-3" type={show ? 'text' : 'password'} value={form.password}
                       onChange={(e) => setForm({ ...form, password: e.target.value })}
                       placeholder="Nhập mật khẩu" required />
                <button type="button" onClick={() => setShow(!show)} tabIndex={-1}
                        className="absolute inset-y-0 right-0 px-3.5 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <button
              className="group w-full py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-brand-500/25
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
  )
}
