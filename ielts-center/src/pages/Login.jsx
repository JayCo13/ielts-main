import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, User, Lock, Wallet, TrendingUp,
  Users, GraduationCap, ShieldCheck, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { setSession, isAuthed, getRole } from '../lib/auth'
import { Spinner } from '../components/ui'

const LOGO = 'https://thiieltstrenmay.com/img/logo-ielts.png'
const DOTS = {
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
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
    <div className="min-h-screen w-full bg-gradient-to-br from-[#eef6f7] via-white to-[#f3f0ea] grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand / preview panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden text-white
                      bg-gradient-to-br from-brand-600 via-slate2 to-deep">
        <div className="absolute inset-0 opacity-60" style={DOTS} />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        {/* top brand */}
        <div className="relative flex items-center gap-3">
          <img src={LOGO} className="h-12 w-12 rounded-xl bg-white p-1 object-contain shadow" alt="logo" />
          <div className="leading-tight">
            <div className="font-extrabold">Thi IELTS Trên Máy</div>
            <div className="text-xs text-white/60">Trung tâm quản lý</div>
          </div>
        </div>

        {/* headline + preview card */}
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 mb-5 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Bảng điều khiển thế hệ mới
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.15] max-w-md">
            Vận hành trung tâm<br />mượt mà & hiện đại
          </h1>
          <p className="mt-4 text-white/70 max-w-md">
            Quản lý giáo viên, học viên, lớp học, ví điện tử và gói VIP — trong một giao diện duy nhất.
          </p>

          {/* glass preview card */}
          <div className="mt-8 max-w-sm rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70 text-sm"><Wallet className="h-4 w-4" /> Số dư ví</div>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><TrendingUp className="h-3.5 w-3.5" /> +12%</span>
            </div>
            <div className="text-3xl font-extrabold mt-1">12.500.000₫</div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="flex items-center gap-1.5 text-white/60 text-xs"><GraduationCap className="h-3.5 w-3.5" /> Giáo viên</div>
                <div className="text-xl font-bold mt-0.5">08</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="flex items-center gap-1.5 text-white/60 text-xs"><Users className="h-3.5 w-3.5" /> Học viên</div>
                <div className="text-xl font-bold mt-0.5">124</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-white/50 text-sm">
          <ShieldCheck className="h-4 w-4" /> Bảo mật · © 2026 thiieltstrenmay.com
        </div>
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
