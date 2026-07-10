import { stopStatusPing } from './statusManager';
import secureStorage from './secureStorage';
import { clearDeviceId, getDeviceId } from './deviceUtils';

export const logout = () => {  
   // Clear all auth data from secure storage
  secureStorage.removeItem('token');
  secureStorage.removeItem('role');
  secureStorage.removeItem('username');
  secureStorage.removeItem('user_id');
  secureStorage.removeItem('email');
  secureStorage.removeItem('sessionId');
  secureStorage.removeItem('unique_session_id');
  
  // For backward compatibility, also clear from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
  localStorage.removeItem('email');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('unique_session_id');
  
  // Clear device ID
  clearDeviceId();
};

export const initializeAuth = () => {
  // Try to get token from secure storage first, then fall back to localStorage for backward compatibility
  let token = secureStorage.getItem('token');
  
  // If token exists in localStorage but not in secure storage, migrate it
  if (!token) {
    token = localStorage.getItem('token');
    if (token) {
      // Migrate data from localStorage to secure storage
      migrateToSecureStorage();
    }
  }
  
  // Initialize device ID for device tracking
  getDeviceId();
};

// Function to migrate data from localStorage to secure storage
export const migrateToSecureStorage = () => {
  const keys = ['token', 'role', 'username', 'user_id', 'email', 'sessionId'];
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      // Store in secure storage
      secureStorage.setItem(key, value);
    }
  });
  
  console.log('Auth data migrated to secure storage');
};

export const checkTokenExpiration = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return { isValid: false, reason: 'no_token' };
  }

  try {
    // Parse JWT token to get expiration time
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const expirationTime = payload.exp; // Token expiration time in seconds
    const timeRemaining = expirationTime - currentTime; // Time remaining in seconds
    const oneHourInSeconds = 3600; // 1 hour = 3600 seconds

    // Log token remaining time in a readable format
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    console.log(`Token remaining time: ${hours}h ${minutes}m ${seconds}s (${timeRemaining} seconds total)`);

    if (timeRemaining <= 0) {
      console.log('Token has expired');
      return { isValid: false, reason: 'expired' };
    }

    // Only warn if token expires in less than 1 hour, but still consider it valid
    if (timeRemaining < oneHourInSeconds) {
      console.log('Token expires in less than 1 hour - warning user but still valid');
      return { isValid: true, reason: 'expires_soon', timeRemaining };
    }

    console.log('Token is valid');
    return { isValid: true, timeRemaining };
  } catch (error) {
    console.error('Error parsing token:', error);
    return { isValid: false, reason: 'invalid_token' };
  }
};
