class TranslatorService {
  constructor() {
    // You should replace this with your actual Groq API key
    // For production, consider using environment variables
    this.apiKey = process.env.REACT_APP_GROQ_API_KEY;
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async translateText(text, sourceLanguage = 'English', targetLanguage = 'Vietnamese') {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text to translate cannot be empty');
      }

      if (!this.apiKey) {
        throw new Error('Translation service is not properly configured. Please contact support.');
      }

      const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}. Provide only the translation without any additional explanation or formatting. Consider the context and provide the most appropriate translation:

"${text}"`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator specializing in English to Vietnamese translation. Provide accurate, contextually appropriate translations. For IELTS exam content, maintain the academic tone and precision.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 500,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Translation failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from translation service');
      }

      const translation = data.choices[0].message.content.trim();

      // Remove quotes if the translation is wrapped in them
      const cleanedTranslation = translation.replace(/^["']|["']$/g, '');

      return {
        originalText: text,
        translatedText: cleanedTranslation,
        sourceLanguage,
        targetLanguage,
        timestamp: new Date().toISOString()
      };

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

      if (!this.apiKey) {
        throw new Error('Translation service is not properly configured.');
      }

      const prompt = `Provide a detailed dictionary entry for the English word "${word}". Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "word": "${word}",
  "phonetics": {
    "uk": "/phonetic transcription UK/",
    "us": "/phonetic transcription US/"
  },
  "meanings": [
    {
      "partOfSpeech": "part of speech in Vietnamese (e.g., Danh từ, Động từ, Tính từ)",
      "definitions": [
        {
          "meaning": "Vietnamese translation/definition",
          "example": "Example sentence in English if available",
          "exampleTrans": "Vietnamese translation of example"
        }
      ]
    }
  ]
}

Rules:
- Use IPA for phonetics
- Translate part of speech to Vietnamese (Danh từ, Động từ, Tính từ, Trạng từ, Giới từ, etc.)
- Provide Vietnamese meanings/definitions
- Include examples when relevant
- Return ONLY the JSON object, no other text`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a professional English-Vietnamese dictionary. Return ONLY valid JSON with no markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Dictionary lookup failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Parse JSON, handling potential markdown code blocks
      let jsonStr = content;
      if (content.includes('```')) {
        jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      return JSON.parse(jsonStr);

    } catch (error) {
      console.error('Dictionary lookup error:', error);
      throw error;
    }
  }

  // Method to detect if text is likely English
  isEnglishText(text) {
    // Simple heuristic to detect English text
    const englishPattern = /^[a-zA-Z0-9\s.,!?;:()\-"']+$/;
    return englishPattern.test(text.trim());
  }

  // Method to clean and prepare text for translation
  prepareTextForTranslation(text) {
    // Remove extra whitespace and clean the text
    return text.trim().replace(/\s+/g, ' ');
  }

  // Method to validate API key format (basic validation)
  validateApiKey() {
    // Reject the placeholder/leaked default key (real key must come from env)
    if (!this.apiKey || this.apiKey === 'gsk_REVOKED_DO_NOT_USE') {
      return false;
    }
    // Basic format check for Groq API keys (they typically start with 'gsk_')
    return this.apiKey.startsWith('gsk_') && this.apiKey.length > 20;
  }
}

// Create and export a singleton instance
const translatorService = new TranslatorService();
export default translatorService;