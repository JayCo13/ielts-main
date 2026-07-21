import { X, Loader2, Inbox } from 'lucide-react'
import { initials } from '../lib/format'

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate2 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ className = '', children }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function StatCard({ icon: Icon, label, value, tone = 'brand', hint }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-orange-50 text-accent',
    green: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate2',
  }
  return (
    <div className="card p-5 flex items-center gap-4 animate-fade-in">
      <div className={`h-12 w-12 shrink-0 rounded-xl grid place-items-center ${tones[tone]}`}>
        {Icon && <Icon className="h-6 w-6" />}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate2 leading-tight truncate">{value}</div>
        <div className="text-sm text-slate-500 truncate">{label}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  )
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    accent: 'bg-orange-50 text-accent',
  }
  return <span className={`chip ${tones[tone]}`}>{children}</span>
}

export function Avatar({ name, src, size = 40 }) {
  const s = { width: size, height: size }
  if (src) return <img src={src} alt={name} style={s} className="rounded-full object-cover border border-slate-200" />
  return (
    <div style={s} className="rounded-full grid place-items-center bg-brand-50 text-brand-600 font-bold"
         title={name}>
      {initials(name)}
    </div>
  )
}

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin ${className}`} />
}

export function Loading({ label = 'Đang tải…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Spinner className="h-7 w-7 text-brand-500" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 grid place-items-center text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <p className="mt-4 font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-400 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-white rounded-t-3xl sm:rounded-2xl shadow-pop
                       animate-scale-in max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate2">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  )
}
