import { useEffect, useState } from 'react'
import { Plus, School, Pencil, Power, Users, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Card, Badge, Loading, EmptyState, Modal, Field, Spinner } from '../../components/ui'

export default function Classes() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState(null)

  const load = async () => setList(await api.get('/center/classes'))
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const toggleActive = async (c) => {
    await api.put(`/center/classes/${c.class_id}`, { is_active: !c.is_active })
    toast.success(c.is_active ? 'Đã vô hiệu hoá lớp' : 'Đã kích hoạt lớp')
    load()
  }

  return (
    <div>
      <PageHeader title="Lớp học" subtitle="Tạo và quản lý các lớp của trung tâm"
        action={<button className="btn-primary px-4 py-2.5" onClick={() => setCreateOpen(true)}><Plus className="h-5 w-5" /> Tạo lớp</button>} />

      {loading ? <Loading /> : list.length === 0 ? (
        <Card className="p-2"><EmptyState icon={School} title="Chưa có lớp nào" subtitle="Tạo lớp để gán giáo viên và học viên."
          action={<button className="btn-primary px-4 py-2.5" onClick={() => setCreateOpen(true)}><Plus className="h-5 w-5" /> Tạo lớp</button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <Card key={c.class_id} className="p-5 flex flex-col animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center"><School className="h-6 w-6" /></div>
                {c.is_active ? <Badge tone="green">Hoạt động</Badge> : <Badge tone="red">Đã tắt</Badge>}
              </div>
              <h3 className="font-bold text-slate2 mt-3 text-lg">{c.name}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {c.student_count} học viên</span>
                <span className="inline-flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {c.teachers?.length || 0} GV</span>
              </div>
              {c.teachers?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.teachers.map((t) => <Badge key={t.user_id} tone="brand">{t.username}</Badge>)}
                </div>
              )}
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <button className="btn-outline flex-1 py-2 text-sm" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /> Sửa</button>
                <button className={`${c.is_active ? 'btn-danger' : 'btn-ghost'} px-3 py-2 text-sm`} onClick={() => toggleActive(c)}>
                  <Power className="h-4 w-4" /> {c.is_active ? 'Tắt' : 'Bật'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {createOpen && <ClassModal onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load() }} />}
      {edit && <ClassModal cls={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load() }} />}
    </div>
  )
}

function ClassModal({ cls, onClose, onDone }) {
  const [name, setName] = useState(cls?.name || '')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (cls) await api.put(`/center/classes/${cls.class_id}`, { name })
      else await api.post('/center/classes', { name })
      toast.success(cls ? 'Đã cập nhật lớp' : 'Đã tạo lớp')
      onDone()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={cls ? 'Sửa lớp' : 'Tạo lớp mới'} onClose={onClose} size="sm"
      footer={<>
        <button className="btn-ghost px-4 py-2.5" onClick={onClose}>Huỷ</button>
        <button className="btn-primary px-4 py-2.5" onClick={submit} disabled={saving}>{saving ? <Spinner className="h-5 w-5" /> : 'Lưu'}</button>
      </>}>
      <form onSubmit={submit}>
        <Field label="Tên lớp"><input className="input" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="vd: IELTS 6.0" /></Field>
      </form>
    </Modal>
  )
}
