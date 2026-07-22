import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, User, Lock } from 'lucide-react'
import Lottie from 'lottie-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { setSession, isAuthed, getRole } from '../lib/auth'
import { Spinner } from '../components/ui'

const LOGO = 'https://thiieltstrenmay.com/img/logo-ielts.png'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [anim, setAnim] = useState(null)

  useEffect(() => {
    fetch('/login.lottie.json').then((r) => r.json()).then(setAnim).catch(() => {})
  }, [])

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
    <div className="min-h-screen w-full bg-white grid lg:grid-cols-[1.1fr_1fr]">
      {/* ── Lottie brand panel ── */}
      <div className="relative hidden lg:flex flex-col p-12 xl:p-16 lg:border-r border-slate-100
                      bg-gradient-to-b from-slate-50 to-white">
        {/* brand top */}
        <div className="flex items-center gap-3">
          <img src={LOGO} className="h-11 w-11 rounded-xl object-contain" alt="logo" />
          <span className="font-semibold tracking-tight text-slate2">Thi IELTS Trên Máy</span>
        </div>

        {/* One left-aligned block: illustration + headline + subtitle */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-lg">
            {anim
              ? <Lottie animationData={anim} loop className="w-full max-w-[480px] -ml-2" />
              : <div className="w-full max-w-[480px] aspect-[16/9] rounded-3xl bg-slate-100 animate-pulse" />}
            <h1 className="mt-6 text-[38px] font-extrabold leading-[1.12] tracking-tight text-slate2">
              Trung tâm của bạn,<br />
              <span className="text-slate-400">gọn trong một nơi.</span>
            </h1>
            <p className="mt-4 text-slate-500 text-[17px] leading-relaxed max-w-md">
              Một bảng điều khiển đẹp và nhanh để vận hành toàn bộ trung tâm luyện thi IELTS.
            </p>
          </div>
        </div>

        <div className="text-slate-400 text-sm">© 2026 · thiieltstrenmay.com</div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* logo only on mobile (desktop shows the brand panel) */}
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
  )
}
