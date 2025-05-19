import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Update user status
export const updateUserStatus = async (status) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    await axios.put(
      `${API_URL}/student/status/update?status=${status}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error updating status:', error);
    return false;
  }
};

// Set up periodic status ping
let pingInterval = null;

export const startStatusPing = () => {
  // Clear any existing interval
  if (pingInterval) clearInterval(pingInterval);
  
  // Set status to online immediately
  updateUserStatus('online');
  
  // Set up interval to ping every 3 minutes
  pingInterval = setInterval(() => {
    updateUserStatus('online');
  }, 3 * 60 * 1000); // 3 minutes
};

export const stopStatusPing = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  updateUserStatus('offline');
};