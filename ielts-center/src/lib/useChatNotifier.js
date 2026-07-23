import { useEffect, useRef } from 'react'
import { API_BASE } from '../config/api'
import { getToken, getRole } from './auth'

// App-wide chat notifier for teachers: mounted in Layout so it works on EVERY
// page (not just the chat page). Requests notification permission early, then
// polls unread and plays /notify.mp3 + shows a browser notification when a new
// message arrives. No-op for center admins (they don't have chat threads).
export default function useChatNotifier() {
  const audioRef = useRef(null)
  const prevRef = useRef(null)

  // Ask for permission as soon as the dashboard loads.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return
    const ask = () => { try { Notification.requestPermission().catch(() => {}) } catch (e) { /* ignore */ } }
    ask()
    const once = () => { ask(); window.removeEventListener('pointerdown', once) }
    window.addEventListener('pointerdown', once, { once: true })
    return () => window.removeEventListener('pointerdown', once)
  }, [])

  useEffect(() => {
    if (getRole() !== 'teacher') return undefined
    let alive = true
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/threads`, { headers: { Authorization: `Bearer ${getToken()}` } })
        if (!res.ok) return
        const data = await res.json()
        const threads = data?.threads || []
        const total = threads.reduce((n, t) => n + (t.unread || 0), 0)
        const prev = prevRef.current
        if (alive && prev !== null && total > prev) {
          const t = threads.find((x) => (x.unread || 0) > 0)
          try {
            if (!audioRef.current) audioRef.current = new Audio('/notify.mp3')
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
          } catch (e) { /* ignore */ }
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(t ? `Tin nhắn mới · ${t.name}` : 'Tin nhắn mới', { body: t?.last || '', tag: 'ielts-chat' })
              n.onclick = () => { window.focus(); window.location.href = '/teacher/chat'; n.close() }
            }
          } catch (e) { /* ignore */ }
        }
        prevRef.current = total
      } catch (e) { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 8000)
    return () => { alive = false; clearInterval(id) }
  }, [])
}
