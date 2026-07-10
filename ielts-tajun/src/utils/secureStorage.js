/**
 * secureStorage.js
 * A utility for securely storing sensitive data in the browser
 * Uses AES encryption to protect data stored in localStorage
 */

import CryptoJS from 'crypto-js';

class SecureStorage {
  constructor() {
    // Generate a unique encryption key for this session if not already present
    // This key will be lost when the tab is closed, making the data unreadable
    if (!sessionStorage.getItem('_encKey')) {
      const randomKey = CryptoJS.lib.WordArray.random(16).toString();
      sessionStorage.setItem('_encKey', randomKey);
    }
    
    this.encryptionKey = sessionStorage.getItem('_encKey');
  }



  /**
   * Encrypt a value before storing
   * @param {string} value - The value to encrypt
   * @returns {string} - The encrypted value
   */
  encrypt(value) {
    if (!value) return null;
    try {
      return CryptoJS.AES.encrypt(value.toString(), this.encryptionKey).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt a stored value
   * @param {string} encryptedValue - The encrypted value to decrypt
   * @returns {string} - The decrypted value
   */
  decrypt(encryptedValue) {
    if (!encryptedValue) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedValue, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  /**
   * Store a value securely
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   */
  setItem(key, value) {
    if (!key || value === undefined) return;
    
    try {
      // For objects and arrays, stringify before encrypting
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const encryptedValue = this.encrypt(valueToStore);
      
      // Store with a prefix to identify secure storage items
      localStorage.setItem(`secure_${key}`, encryptedValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
    }
  }

  /**
   * Retrieve a securely stored value
   * @param {string} key - The key to retrieve
   * @returns {any} - The retrieved value
   */
  getItem(key) {
    try {
      const encryptedValue = localStorage.getItem(`secure_${key}`);
      if (!encryptedValue) return null;
      
      const decryptedValue = this.decrypt(encryptedValue);
      
      // Try to parse as JSON if it looks like an object or array
      if (decryptedValue && (
        (decryptedValue.startsWith('{') && decryptedValue.endsWith('}')) ||
        (decryptedValue.startsWith('[') && decryptedValue.endsWith(']'))
      )) {
        try {
          return JSON.parse(decryptedValue);
        } catch {
          // If parsing fails, return as string
          return decryptedValue;
        }
      }
      
      return decryptedValue;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove a securely stored item
   * @param {string} key - The key to remove
   */
  removeItem(key) {
    try {
      localStorage.removeItem(`secure_${key}`);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  }

  /**
   * Clear all securely stored items
   */
  clearAll() {
    try {
      // Only clear items with our secure prefix
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Also clear the encryption key
      sessionStorage.removeItem('_encKey');
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  }
}

// Create a singleton instance
const secureStorage = new SecureStorage();

export default secureStorage;
