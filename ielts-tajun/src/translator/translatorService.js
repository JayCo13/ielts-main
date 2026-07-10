import { API_BASE } from '../config/api';
import secureStorage from '../utils/secureStorage';

// Translator/dictionary now goes through OUR backend (/student/translate,
// /student/dictionary) instead of calling Groq directly from the browser.
// The Groq key lives server-side only — never in this bundle. See
// app/routes/student/translate_routes.py.
class TranslatorService {
  _authHeaders() {
    const token = secureStorage.getItem('token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async translateText(text, sourceLanguage = 'English', targetLanguage = 'Vietnamese') {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text to translate cannot be empty');
      }

      const response = await fetch(`${API_BASE}/student/translate`, {
        method: 'POST',
        headers: this._authHeaders(),
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Translation failed: ${response.status} - ${errorData.detail || 'Unknown error'}`);
      }

      // Backend already returns the processed shape.
      return await response.json();
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  async getDetailedDefinition(word) {
    try {
      if (!word || word.trim().length === 0) {
        throw new Error('Word cannot be empty');
      }

      const response = await fetch(`${API_BASE}/student/dictionary`, {
        method: 'POST',
        headers: this._authHeaders(),
        body: JSON.stringify({ word }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Dictionary lookup failed: ${response.status} - ${errorData.detail || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dictionary lookup error:', error);
      throw error;
    }
  }

  // Method to detect if text is likely English
  isEnglishText(text) {
    const englishPattern = /^[a-zA-Z0-9\s.,!?;:()\-"']+$/;
    return englishPattern.test(text.trim());
  }

  // Method to clean and prepare text for translation
  prepareTextForTranslation(text) {
    return text.trim().replace(/\s+/g, ' ');
  }
}

// Create and export a singleton instance
const translatorService = new TranslatorService();
export default translatorService;
