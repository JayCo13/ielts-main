import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, MoreVertical, Pencil, Crown, School, Pause, Play, Ban, CheckCircle2,
  GraduationCap, Users, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { vnd } from '../../lib/format'
import { PageHeader, Card, Badge, Avatar, Loading, EmptyState, Modal, Field, Spinner } from '../../components/ui'

function useClickOutside(cb) {
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [cb])
  return ref
}

function ActionsMenu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
              className="h-9 w-9 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-pop border border-slate-100 py-1.5 z-30 animate-scale-in">
          {items.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick() }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-slate-50 ${it.danger ? 'text-red-600' : 'text-slate-700'}`}>
              <it.icon className="h-4 w-4" /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Members({ kind }) {
  const isTeacher = kind === 'teacher'
  const [list, setList] = useState([])
  const [classes, setClasses] = useState([])
  const [packages, setPackages] = useState([])
  const [wallet, setWallet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState(null)     // member being edited
  const [vip, setVip] = useState(null)       // member buying VIP
  const [assign, setAssign] = useState(null) // member assigning classes

  const load = async () => {
    const [m, c, meRes, pkgs] = await Promise.all([
      api.get(isTeacher ? '/center/teachers' : '/center/students'),
      api.get('/center/classes'),
      api.get('/center/me'),
      api.get('/center/vip/packages'),
    ])
    setList(m); setClasses(c); setWallet(meRes.wallet.balance); setPackages(pkgs)
  }

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)) }, [kind])

  const filtered = useMemo(
    () => list.filter((m) => m.username.toLowerCase().includes(q.toLowerCase())),
    [list, q]
  )

  const refresh = async () => { await load() }

  const togglePause = async (m) => {
    await api.put(`/center/members/${m.user_id}`, { is_paused: !m.is_paused })
    toast.success(m.is_paused ? 'Đã bỏ tạm dừng' : 'Đã tạm dừng')
    refresh()
  }
  const toggleDisable = async (m) => {
    await api.put(`/center/members/${m.user_id}`, { is_disabled: !m.is_disabled })
    toast.success(m.is_disabled ? 'Đã kích hoạt lại' : 'Đã vô hiệu hoá')
    refresh()
  }

  const Icon = isTeacher ? GraduationCap : Users

  return (
    <div>
      <PageHeader
        title={isTeacher ? 'Giáo viên' : 'Học viên'}
        subtitle={isTeacher ? 'Quản lý tài khoản giáo viên của trung tâm' : 'Quản lý tài khoản học viên của trung tâm'}
        action={
          <button className="btn-primary px-4 py-2.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-5 w-5" /> Thêm {isTeacher ? 'giáo viên' : 'học viên'}
          </button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input className="input pl-9" placeholder="Tìm theo tên đăng nhập…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={Icon} title={`Chưa có ${isTeacher ? 'giáo viên' : 'học viên'} nào`}
                      subtitle="Nhấn nút thêm để tạo tài khoản mới."
                      action={<button className="btn-primary px-4 py-2.5" onClick={() => setCreateOpen(true)}><Plus className="h-5 w-5" /> Thêm mới</button>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.user_id} className="p-4 flex items-center gap-4">
              <Avatar name={m.username} src={m.image_url} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate2 truncate">{m.username}</span>
                  {m.is_disabled && <Badge tone="red">Vô hiệu hoá</Badge>}
                  {m.is_paused && !m.is_disabled && <Badge tone="amber">Tạm dừng</Badge>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {m.vip?.is_vip
                    ? <Badge tone="green"><Crown className="h-3 w-3" /> VIP · {m.vip.remaining_days} ngày</Badge>
                    : <Badge tone="amber">Chưa có VIP</Badge>}
                  {m.classes?.length
                    ? m.classes.map((c) => <Badge key={c.class_id} tone="brand">{c.name}</Badge>)
                    : !isTeacher && <Badge tone="slate">Khách lẻ</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button className="btn-accent px-3 py-2 text-sm hidden sm:inline-flex" onClick={() => setVip(m)}>
                  <Crown className="h-4 w-4" /> Mua VIP
                </button>
                <ActionsMenu items={[
                  { icon: Pencil, label: 'Đổi tên / mật khẩu', onClick: () => setEdit(m) },
                  { icon: School, label: 'Gán lớp', onClick: () => setAssign(m) },
                  { icon: Crown, label: 'Mua VIP', onClick: () => setVip(m) },
                  { icon: m.is_paused ? Play : Pause, label: m.is_paused ? 'Bỏ tạm dừng' : 'Tạm dừng', onClick: () => togglePause(m) },
                  { icon: m.is_disabled ? CheckCircle2 : Ban, label: m.is_disabled ? 'Kích hoạt lại' : 'Vô hiệu hoá', danger: !m.is_disabled, onClick: () => toggleDisable(m) },
                ]} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {createOpen && <CreateModal kind={kind} classes={classes} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); refresh() }} />}
      {edit && <EditModal member={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); refresh() }} />}
      {vip && <VipModal member={vip} packages={packages} wallet={wallet} onClose={() => setVip(null)} onDone={() => { setVip(null); refresh() }} />}
      {assign && <AssignModal member={assign} classes={classes} onClose={() => setAssign(null)} onDone={() => { setAssign(null); refresh() }} />}
    </div>
  )
}

function CreateModal({ kind, classes, onClose, onDone }) {
  const isTeacher = kind === 'teacher'
  const [f, setF] = useState({ username: '', password: '', email: '', class_id: '' })
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const body = { username: f.username, password: f.password }
      if (f.email) body.email = f.email
      if (f.class_id) body.class_id = Number(f.class_id)
      await api.post(isTeacher ? '/center/teachers' : '/center/students', body)
      toast.success(`Đã tạo ${isTeacher ? 'giáo viên' : 'học viên'}`)
      onDone()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={`Thêm ${isTeacher ? 'giáo viên' : 'học viên'}`} onClose={onClose}
      footer={<>
        <button className="btn-ghost px-4 py-2.5" onClick={onClose}>Huỷ</button>
        <button className="btn-primary px-4 py-2.5" onClick={submit} disabled={saving}>{saving ? <Spinner className="h-5 w-5" /> : 'Tạo'}</button>
      </>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên đăng nhập"><input className="input" required minLength={3} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="vd: hocvien_a" /></Field>
        <Field label="Mật khẩu"><input className="input" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Tối thiểu 6 ký tự" /></Field>
        <Field label="Email (tuỳ chọn)"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Có thể để trống" /></Field>
        <Field label="Gán lớp (tuỳ chọn)">
          <select className="input" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
            <option value="">— Không gán —</option>
            {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  )
}

function EditModal({ member, onClose, onDone }) {
  const [f, setF] = useState({ username: member.username, password: '' })
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const body = {}
      if (f.username && f.username !== member.username) body.username = f.username
      if (f.password) body.password = f.password
      if (Object.keys(body).length === 0) { onClose(); return }
      await api.put(`/center/members/${member.user_id}`, body)
      toast.success('Đã cập nhật')
      onDone()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }
  return (
    <Modal open title="Đổi tên / mật khẩu" onClose={onClose} size="sm"
      footer={<>
        <button className="btn-ghost px-4 py-2.5" onClick={onClose}>Huỷ</button>
        <button className="btn-primary px-4 py-2.5" onClick={submit} disabled={saving}>{saving ? <Spinner className="h-5 w-5" /> : 'Lưu'}</button>
      </>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên đăng nhập"><input className="input" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
        <Field label="Mật khẩu mới" hint="Để trống nếu không đổi mật khẩu">
          <input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="••••••" />
        </Field>
      </form>
    </Modal>
  )
}

function VipModal({ member, packages, wallet, onClose, onDone }) {
  const [pkgId, setPkgId] = useState(packages[0]?.package_id || '')
  const [saving, setSaving] = useState(false)
  const pkg = packages.find((p) => p.package_id === Number(pkgId))
  const submit = async () => {
    if (!pkg) return
    if (wallet < pkg.discounted_price) { toast.error('Số dư ví không đủ, vui lòng nạp thêm'); return }
    setSaving(true)
    try {
      const r = await api.post('/center/vip/purchase', { target_user_id: member.user_id, package_id: pkg.package_id })
      toast.success(`Đã mua VIP cho ${r.target_username}`)
      onDone()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={`Mua VIP cho ${member.username}`} onClose={onClose}
      footer={<>
        <button className="btn-ghost px-4 py-2.5" onClick={onClose}>Huỷ</button>
        <button className="btn-accent px-4 py-2.5" onClick={submit} disabled={saving || !pkg}>{saving ? <Spinner className="h-5 w-5" /> : 'Xác nhận mua'}</button>
      </>}>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-500">Số dư ví</span>
        <span className="font-bold text-slate2">{vnd(wallet)}</span>
      </div>
      <Field label="Chọn gói VIP">
        <div className="space-y-2">
          {packages.map((p) => (
            <label key={p.package_id}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${Number(pkgId) === p.package_id ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="pkg" className="accent-brand-500" checked={Number(pkgId) === p.package_id} onChange={() => setPkgId(p.package_id)} />
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-500">{p.duration_months} tháng</div>
              </div>
              <div className="text-right">
                {p.discount_rate > 0 && <div className="text-xs text-slate-400 line-through">{vnd(p.price)}</div>}
                <div className="font-bold text-accent">{vnd(p.discounted_price)}</div>
                {p.discount_rate > 0 && <div className="text-[11px] text-emerald-600">-{p.discount_rate}%</div>}
              </div>
            </label>
          ))}
          {packages.length === 0 && <p className="text-sm text-slate-400">Chưa có gói VIP khả dụng.</p>}
        </div>
      </Field>
    </Modal>
  )
}

function AssignModal({ member, classes, onClose, onDone }) {
  const inClass = (c) => (member.classes || []).some((x) => x.class_id === c.class_id)
  const [busy, setBusy] = useState(null)
  const toggle = async (c) => {
    setBusy(c.class_id)
    try {
      if (inClass(c)) {
        await api.del(`/center/classes/${c.class_id}/members/${member.user_id}`)
        member.classes = (member.classes || []).filter((x) => x.class_id !== c.class_id)
      } else {
        await api.post(`/center/classes/${c.class_id}/members`, { user_id: member.user_id })
        member.classes = [...(member.classes || []), { class_id: c.class_id, name: c.name }]
      }
    } catch (err) { toast.error(err.message) } finally { setBusy(null) }
  }
  return (
    <Modal open title={`Gán lớp cho ${member.username}`} onClose={onClose}
      footer={<button className="btn-primary px-4 py-2.5" onClick={onDone}>Xong</button>}>
      {classes.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có lớp nào. Hãy tạo lớp trước.</p>
      ) : (
        <div className="space-y-2">
          {classes.map((c) => (
            <button key={c.class_id} onClick={() => toggle(c)} disabled={busy === c.class_id}
              className={`w-full flex items-center justify-between rounded-xl border p-3 transition ${inClass(c) ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <span className="font-medium text-slate-700">{c.name}</span>
              {busy === c.class_id ? <Spinner className="h-4 w-4 text-brand-500" />
                : inClass(c) ? <Badge tone="brand"><CheckCircle2 className="h-3.5 w-3.5" /> Đã gán</Badge>
                : <span className="text-sm text-slate-400">Thêm</span>}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
