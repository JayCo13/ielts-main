import { API_BASE } from '../config/api'
import { getToken, clearSession } from './auth'

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) { try { data = JSON.parse(text) } catch { data = text } }

  // A 401 on an AUTHENTICATED request (we sent a token) means the session is no
  // longer valid → clear it and bounce to login. A 401 on the login request
  // itself (no token) is just bad credentials — surface the server's message.
  if (res.status === 401 && token && !path.startsWith('/center/login')) {
    clearSession()
    if (!location.pathname.startsWith('/login')) location.href = '/login'
    throw new Error('Phiên đăng nhập đã hết hạn')
  }

  if (!res.ok) {
    const detail = (data && data.detail) || `Lỗi ${res.status}`
    throw new Error(typeof detail === 'string' ? detail : 'Đã xảy ra lỗi')
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
}
export default api
