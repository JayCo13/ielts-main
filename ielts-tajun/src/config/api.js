// Central API base URL for the student site.
//
// Local dev (CRA `npm start`): no env set → defaults to localhost:8000.
// Production: the Docker build injects REACT_APP_API_BASE_URL=https://api.thiieltstrenmay.com
// (see Dockerfile build-arg + docker-compose `args`), baked into the bundle at build time.
//
// Import this everywhere instead of hardcoding a URL:
//   import { API_BASE } from '../config/api';
//   fetch(`${API_BASE}/student/...`)
export const API_BASE =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export default API_BASE;
