import CryptoJS from 'crypto-js';

/**
 * Device fingerprinting utility for tracking user devices
 */

/**
 * Generate a unique device ID based on browser characteristics
 * @returns {string} Unique device identifier
 */
export const generateDeviceId = () => {
  try {
    // Collect device characteristics
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      screenColorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
    };

    // Create a string from device characteristics
    const deviceString = Object.values(deviceInfo).join('|');
    
    // Generate MD5 hash of the device string
    const deviceId = CryptoJS.MD5(deviceString).toString();
    
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    // Fallback to a random ID if fingerprinting fails
    return CryptoJS.MD5(Math.random().toString()).toString();
  }
};

/**
 * Get device information for logging/debugging
 * @returns {object} Device information object
 */
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
};

/**
 * Store device ID in local storage
 * @param {string} deviceId - The device ID to store
 */
export const storeDeviceId = (deviceId) => {
  try {
    localStorage.setItem('device_id', deviceId);
  } catch (error) {
    console.error('Error storing device ID:', error);
  }
};

/**
 * Get stored device ID from local storage
 * @returns {string|null} Stored device ID or null if not found
 */
export const getStoredDeviceId = () => {
  try {
    return localStorage.getItem('device_id');
  } catch (error) {
    console.error('Error retrieving device ID:', error);
    return null;
  }
};

/**
 * Get or generate device ID
 * @returns {string} Device ID
 */
export const getDeviceId = () => {
  let deviceId = getStoredDeviceId();
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    storeDeviceId(deviceId);
  }
  
  return deviceId;
};

/**
 * Clear stored device ID (useful for logout)
 */
export const clearDeviceId = () => {
  try {
    localStorage.removeItem('device_id');
  } catch (error) {
    console.error('Error clearing device ID:', error);
  }
};

/**
 * Get comprehensive device fingerprint headers for backend
 * @returns {object} Headers object with device fingerprint data
 */
export const getDeviceFingerprintHeaders = () => {
  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      screenColorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      deviceMemory: navigator.deviceMemory || 'unknown',
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : 'unknown',
      webgl: getWebGLFingerprint(),
      canvas: getCanvasFingerprint(),
      audio: getAudioFingerprint()
    };

    // Convert to headers format
    return {
      'X-Device-Fingerprint': JSON.stringify(deviceInfo),
      'X-Screen-Resolution': deviceInfo.screenResolution,
      'X-Timezone': deviceInfo.timezone,
      'X-Platform': deviceInfo.platform,
      'X-Hardware-Concurrency': deviceInfo.hardwareConcurrency.toString(),
      'X-Device-Memory': deviceInfo.deviceMemory.toString(),
      'X-Color-Depth': deviceInfo.screenColorDepth.toString()
    };
  } catch (error) {
    console.error('Error generating device fingerprint headers:', error);
    return {};
  }
};

/**
 * Get WebGL fingerprint
 * @returns {string} WebGL fingerprint
 */
const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    return `${vendor}|${renderer}`;
  } catch (error) {
    return 'webgl-error';
  }
};

/**
 * Get Canvas fingerprint
 * @returns {string} Canvas fingerprint
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test 🔒', 2, 2);
    return canvas.toDataURL().slice(-50); // Last 50 chars for uniqueness
  } catch (error) {
    return 'canvas-error';
  }
};

/**
 * Get Audio fingerprint
 * @returns {string} Audio fingerprint
 */
const getAudioFingerprint = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1000;
    gainNode.gain.value = 0;
    
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);
    
    audioContext.close();
    
    return Array.from(frequencyData.slice(0, 10)).join(',');
  } catch (error) {
    return 'audio-error';
  }
};