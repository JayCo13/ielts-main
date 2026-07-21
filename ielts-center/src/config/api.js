// Backend API base — baked at Docker build time via VITE_API_BASE_URL,
// defaults to localhost for bare local dev. Never hardcode the prod URL.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export default API_BASE
