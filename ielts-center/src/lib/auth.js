const TOKEN = 'center_token'
const ROLE = 'center_role'
const NAME = 'center_username'

export const getToken = () => localStorage.getItem(TOKEN)
export const getRole = () => localStorage.getItem(ROLE)
export const getUsername = () => localStorage.getItem(NAME)
export const isAuthed = () => !!getToken()

export function setSession({ access_token, role, username }) {
  localStorage.setItem(TOKEN, access_token)
  localStorage.setItem(ROLE, role)
  localStorage.setItem(NAME, username || '')
}

export function clearSession() {
  localStorage.removeItem(TOKEN)
  localStorage.removeItem(ROLE)
  localStorage.removeItem(NAME)
}
