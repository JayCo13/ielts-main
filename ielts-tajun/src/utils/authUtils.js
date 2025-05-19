import { stopStatusPing } from './statusManager';

export const logout = () => {
  // Set status to offline before clearing token
  stopStatusPing();
  
  // Clear all auth data from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
};