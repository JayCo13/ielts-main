import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react'
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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden
                      bg-gradient-to-br from-slate2 to-deep">
        <div className="flex items-center gap-3">
          <img src={LOGO} className="h-11 w-11 rounded-xl bg-white/10 object-contain" alt="logo" />
          <span className="font-extrabold text-lg">Thi IELTS Trên Máy</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight">Quản lý<br />Trung tâm của bạn</h1>
          <p className="mt-4 text-white/70 max-w-md">
            Quản lý giáo viên, học viên, lớp học, ví và gói VIP — tất cả trong một bảng điều khiển hiện đại.
          </p>
        </div>
        <div className="text-white/40 text-sm relative z-10">© 2026 thiieltstrenmay.com</div>
        {/* decorative blobs */}
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#f4f7f8]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={LOGO} className="h-11 w-11 rounded-xl object-contain" alt="logo" />
            <span className="font-extrabold text-lg text-slate2">Thi IELTS Trên Máy</span>
          </div>

          <div className="inline-flex items-center gap-2 chip bg-brand-50 text-brand-700 mb-4">
            <Building2 className="h-3.5 w-3.5" /> Cổng Trung tâm
          </div>
          <h2 className="text-2xl font-bold text-slate2">Đăng nhập</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Dành cho tài khoản trung tâm và giáo viên.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Tên đăng nhập</label>
              <input className="input" value={form.username} autoFocus
                     onChange={(e) => setForm({ ...form, username: e.target.value })}
                     placeholder="Nhập tên đăng nhập" required />
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <input className="input pr-11" type={show ? 'text' : 'password'} value={form.password}
                       onChange={(e) => setForm({ ...form, password: e.target.value })}
                       placeholder="Nhập mật khẩu" required />
                <button type="button" onClick={() => setShow(!show)} tabIndex={-1}
                        className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? <Spinner className="h-5 w-5" /> : <><LogIn className="h-5 w-5" /> Đăng nhập</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
