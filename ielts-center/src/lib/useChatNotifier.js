import { useEffect, useRef } from 'react'
import { API_BASE } from '../config/api'
import { getToken, getRole } from './auth'

// App-wide chat notifier for teachers: mounted in Layout so it works on EVERY
// page (not just the chat page). While the teacher is away from the tab it still
// (a) plays /notify.mp3, (b) shows a browser/OS notification, and (c) blinks the
// browser-tab title ("🔔 (N) Tin nhắn mới") so it's visible on the tab bar.
// No-op for center admins (they don't have chat threads).
export default function useChatNotifier() {
  const audioRef = useRef(null)
  const prevRef = useRef(null)
  const totalRef = useRef(0)          // current unread total (read by the title blinker)
  const baseTitleRef = useRef(null)

  // Ask for permission early + "unlock" audio on the first user gesture so the
  // notification sound can play later even when the tab is in the background.
  useEffect(() => {
    if (getRole() !== 'teacher') return undefined
    const ask = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission().catch(() => {}) } catch (e) { /* ignore */ }
      }
    }
    ask()
    const once = () => {
      ask()
      try {
        if (!audioRef.current) audioRef.current = new Audio('/notify.mp3')
        const a = audioRef.current
        a.muted = true
        const p = a.play()
        if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false }).catch(() => { a.muted = false })
        else a.muted = false
      } catch (e) { /* ignore */ }
      window.removeEventListener('pointerdown', once)
    }
    window.addEventListener('pointerdown', once, { once: true })
    return () => window.removeEventListener('pointerdown', once)
  }, [])

  // Blink the tab title while there are unread messages. When the tab is hidden
  // it alternates "🔔 (N) Tin nhắn mới" / base title; when visible it shows a
  // static "(N) base"; restores the base title once everything is read.
  useEffect(() => {
    if (getRole() !== 'teacher') return undefined
    if (baseTitleRef.current === null) baseTitleRef.current = document.title || 'Trung tâm'
    let flip = false
    const tick = () => {
      const base = baseTitleRef.current
      const total = totalRef.current
      if (total > 0) {
        if (document.hidden) { flip = !flip; document.title = flip ? `🔔 (${total}) Tin nhắn mới` : base }
        else { document.title = `(${total}) ${base}` }
      } else {
        document.title = base
      }
    }
    const id = setInterval(tick, 1000)
    const onVis = () => { if (!document.hidden && totalRef.current === 0) document.title = baseTitleRef.current }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      if (baseTitleRef.current) document.title = baseTitleRef.current
    }
  }, [])

  // Poll unread; on growth play sound + OS notification. Runs on every page.
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
        totalRef.current = total
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
              const n = new Notification(t ? `Tin nhắn mới · ${t.name}` : 'Tin nhắn mới', { body: t?.last || '', tag: 'ielts-chat', renotify: true })
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
