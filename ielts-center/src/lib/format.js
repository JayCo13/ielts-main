export const vnd = (n) =>
  (Number(n) || 0).toLocaleString('vi-VN') + '₫'

export const dateVN = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const dateTimeVN = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return '—'
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const initials = (name = '') =>
  (name.trim()[0] || '?').toUpperCase()
