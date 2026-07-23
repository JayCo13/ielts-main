import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'
import { getUsername, getRole, clearSession } from '../lib/auth'
import useChatNotifier from '../lib/useChatNotifier'
import { Avatar } from './ui'

const LOGO = 'https://thiieltstrenmay.com/img/logo-ielts.png'

function SidebarContent({ nav, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#1c2b2e] to-[#0d1719] text-white">
      <div className="flex items-center gap-3 px-5 h-[68px] shrink-0 border-b border-white/10">
        <img src={LOGO} alt="logo" className="h-12 w-12 rounded-xl bg-white p-1 object-contain shadow-sm" />
        <div className="leading-tight">
          <div className="font-extrabold text-base">Trung tâm</div>
          <div className="text-[11px] text-white/60">Thi IELTS Trên Máy</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white hover:text-slate2'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-40 transition" />
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-[11px] text-white/40 border-t border-white/10">
        © 2026 · thiieltstrenmay.com
      </div>
    </div>
  )
}

export default function Layout({ nav, title }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const username = getUsername()
  const role = getRole()
  useChatNotifier()  // app-wide teacher chat notifications + early permission

  const logout = () => { clearSession(); navigate('/login') }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        <SidebarContent nav={nav} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-scale-in">
            <SidebarContent nav={nav} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-[68px] bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-600">
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-semibold text-slate2 truncate">{title}</div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold text-slate-700">{username}</span>
              <span className="text-[11px] text-slate-400">{role === 'center' ? 'Trung tâm' : 'Giáo viên'}</span>
            </div>
            <Avatar name={username} size={38} />
            <button onClick={logout} title="Đăng xuất"
                    className="h-9 w-9 grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
