import axios from 'axios';
import { getDeviceId, getDeviceFingerprintHeaders } from './deviceUtils';
import { logout } from './authUtils';
import { API_BASE } from '../config/api';

/**
 * Check session status with the backend
 * @returns {Promise<object>} API response
 */
export const checkSessionStatus = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${API_BASE}/check-device`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response?.status === 409 && error.response?.data?.detail === 'ACCOUNT_SHARING_DETECTED') {
      // Handle account sharing detected
      throw new Error('ACCOUNT_SHARING_DETECTED');
    }
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      throw new Error('UNAUTHORIZED');
    }
    
    throw error;
  }
};

// Keep the old function name for backward compatibility
export const checkDeviceStatus = checkSessionStatus;

/**
 * Handle session check before form submissions
 * @param {Function} onAccountSharing - Callback for account sharing detected
 * @param {Function} onUnauthorized - Callback for unauthorized access
 * @returns {Promise<boolean>} True if session check passed, false otherwise
 */
export const handleSessionCheck = async (onAccountSharing, onUnauthorized) => {
  try {
    await checkSessionStatus();
    return true;
  } catch (error) {
    if (error.message === 'ACCOUNT_SHARING_DETECTED') {
      if (onAccountSharing) {
        onAccountSharing();
      }
      return false;
    }
    
    if (error.message === 'UNAUTHORIZED') {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Default behavior: logout and redirect to login
        logout();
        window.location.href = '/login';
      }
      return false;
    }
    
    console.error('Session check failed:', error);
    return false;
  }
};

// Keep the old function name for backward compatibility
export const handleDeviceCheck = handleSessionCheck;

/**
 * Create a higher-order function to wrap form submissions with device checking
 * @param {Function} originalSubmitFunction - The original form submit function
 * @param {Function} onMultipleDevices - Callback for multiple devices detected
 * @returns {Function} Wrapped submit function
 */
export const withDeviceCheck = (originalSubmitFunction, onMultipleDevices) => {
  return async (...args) => {
    const deviceCheckPassed = await handleDeviceCheck(onMultipleDevices);
    
    if (deviceCheckPassed) {
      return originalSubmitFunction(...args);
    }
    
    // Device check failed, don't proceed with submission
    return false;
  };
};

/**
 * Enhanced axios interceptor for automatic device checking
 */
export const setupDeviceCheckInterceptor = (onMultipleDevices) => {
  // Request interceptor to add device ID and fingerprint headers to requests
  axios.interceptors.request.use(
    (config) => {
      // Add device fingerprint headers to authentication endpoints
      const authEndpoints = ['/login', '/check-device', '/submit', '/save', '/update'];
      const needsDeviceFingerprint = authEndpoints.some(endpoint => 
        config.url?.includes(endpoint)
      );
      
      if (needsDeviceFingerprint) {
        // Add device fingerprint headers
        const fingerprintHeaders = getDeviceFingerprintHeaders();
        config.headers = {
          ...config.headers,
          ...fingerprintHeaders
        };
        
        // Add device ID to request data for specific endpoints
        const deviceCheckEndpoints = ['/submit', '/save', '/update'];
        const needsDeviceCheck = deviceCheckEndpoints.some(endpoint => 
          config.url?.includes(endpoint)
        );
        
        if (needsDeviceCheck) {
          const deviceId = getDeviceId();
          if (config.data) {
            config.data.device_id = deviceId;
          } else {
            config.data = { device_id: deviceId };
          }
        }
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle session conflicts
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 409 && 
          error.response?.data?.detail === 'ACCOUNT_SHARING_DETECTED') {
        if (onMultipleDevices) {
          onMultipleDevices();
        }
      }
      
      return Promise.reject(error);
    }
  );
};