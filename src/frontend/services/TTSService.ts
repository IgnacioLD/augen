import type { LanguageCode } from '../../shared/types/languages';

/**
 * TTS options
 */
export interface TTSOptions {
  rate?: number;
  volume?: number;
  pitch?: number;
  language?: LanguageCode;
}

/**
 * TTS state
 */
export interface TTSState {
  speaking: boolean;
  paused: boolean;
  lastSpokenText: string | null;
}

/**
 * TTS event handlers
 */
export interface TTSEventHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Text-to-Speech Service for speaking text in multiple languages
 */
export class TTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private lastSpokenText: string = '';
  private eventHandlers: TTSEventHandlers = {};

  private static readonly DEFAULT_OPTIONS: Required<Omit<TTSOptions, 'language'>> = {
    rate: 0.8,
    volume: 1.0,
    pitch: 1.0,
  };

  /**
   * Check if speech synthesis is supported
   */
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available voices
   */
  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!TTSService.isSupported()) {
      return [];
    }

    return speechSynthesis.getVoices();
  }

  /**
   * Get voices for a specific language
   */
  static getVoicesForLanguage(language: LanguageCode): SpeechSynthesisVoice[] {
    const langCode = TTSService.mapLanguageCode(language);
    const voices = TTSService.getAvailableVoices();

    return voices.filter((voice) => voice.lang.startsWith(langCode.split('-')[0] || 'en'));
  }

  /**
   * Map language code to speech synthesis language code
   */
  static mapLanguageCode(lang: LanguageCode): string {
    const speechLangMap: Record<LanguageCode, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ru: 'ru-RU',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      ar: 'ar-SA',
      hi: 'hi-IN',
    };

    return speechLangMap[lang] || 'en-US';
  }

  /**
   * Format numbers intelligently for speech
   */
  static formatNumbersForSpeech(text: string): string {
    let formattedText = text;

    // Phone numbers (various patterns)
    const phonePatterns = [
      /\b(\d{3})[ -]?(\d{3})[ -]?(\d{4})\b/g, // 123-456-7890 or 123 456 7890
      /\b(\d{3})(\d{3})(\d{3})\b/g, // 654123123 (9 digits)
      /\b(\d{2})[ -]?(\d{4})[ -]?(\d{4})\b/g, // 12-3456-7890
      /\b(\d{4})[ -]?(\d{3})[ -]?(\d{3})\b/g, // 1234-567-890
      /\b(\d{3})[ -]?(\d{2})[ -]?(\d{2})[ -]?(\d{2})\b/g, // 123-45-67-89
    ];

    phonePatterns.forEach((pattern) => {
      formattedText = formattedText.replace(pattern, (match) => {
        // Convert to individual digits
        return match.replace(/\D/g, '').split('').join(' ');
      });
    });

    // Currency amounts
    const currencyPatterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // $1,234.56
      /(\d+(?:,\d{3})*(?:\.\d{2})?)€/g, // 1,234.56€
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(euros?|dollars?|pounds?)/gi,
    ];

    currencyPatterns.forEach((pattern) => {
      formattedText = formattedText.replace(pattern, (match, amount) => {
        if (match.includes('$')) return `${amount} dollars`;
        if (match.includes('€')) return `${amount} euros`;
        return match; // Keep original for other currency words
      });
    });

    // Credit card numbers (16 digits grouped)
    formattedText = formattedText.replace(
      /\b(\d{4})[ -]?(\d{4})[ -]?(\d{4})[ -]?(\d{4})\b/g,
      (_match: string, g1: string, g2: string, g3: string, g4: string) => {
        return `${g1.split('').join(' ')} ${g2.split('').join(' ')} ${g3.split('').join(' ')} ${g4.split('').join(' ')}`;
      }
    );

    // Large numbers (avoid reading as huge numbers)
    // Convert numbers with 6+ digits to grouped format
    formattedText = formattedText.replace(/\b(\d{6,})\b/g, (match) => {
      // Don't format if it's already been processed as phone/credit card
      if (match.includes(' ')) return match;

      // Group by 3 digits from right to left
      const reversed = match.split('').reverse();
      const groups = [];
      for (let i = 0; i < reversed.length; i += 3) {
        groups.push(
          reversed
            .slice(i, i + 3)
            .reverse()
            .join('')
        );
      }
      return groups.reverse().join(' thousand, ') + (groups.length > 1 ? '' : '');
    });

    return formattedText;
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: TTSEventHandlers): void {
    this.eventHandlers = handlers;
  }

  /**
   * Speak text with optional formatting
   */
  speak(text: string, options: TTSOptions = {}, formatNumbers: boolean = true): void {
    if (!TTSService.isSupported()) {
      throw new Error('Speech synthesis not supported in this browser');
    }

    // Cancel any existing speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // Apply intelligent number formatting if enabled
    const processedText = formatNumbers ? TTSService.formatNumbersForSpeech(text) : text;
    this.lastSpokenText = processedText;

    // Merge with default options
    const opts = { ...TTSService.DEFAULT_OPTIONS, ...options };

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.rate = opts.rate;
    utterance.volume = opts.volume;
    utterance.pitch = opts.pitch;

    // Set language
    if (options.language) {
      utterance.lang = TTSService.mapLanguageCode(options.language);
    }

    // Store current utterance reference
    this.currentUtterance = utterance;

    // Event handlers
    utterance.onstart = () => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Speech started');
      }
      this.eventHandlers.onStart?.();
    };

    utterance.onend = () => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Speech ended');
      }
      this.currentUtterance = null;
      this.eventHandlers.onEnd?.();
    };

    utterance.onpause = () => {
      this.eventHandlers.onPause?.();
    };

    utterance.onresume = () => {
      this.eventHandlers.onResume?.();
    };

    utterance.onerror = (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Speech error:', event);
      }
      this.currentUtterance = null;
      const error = new Error(`Speech synthesis error: ${event.error}`);
      this.eventHandlers.onError?.(error);
    };

    try {
      speechSynthesis.speak(utterance);
    } catch (error) {
      this.currentUtterance = null;
      if (error instanceof Error) {
        this.eventHandlers.onError?.(error);
        throw error;
      }
      throw new Error('Failed to start speech synthesis');
    }
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (!TTSService.isSupported()) {
      return;
    }

    try {
      if (speechSynthesis.speaking || speechSynthesis.paused) {
        speechSynthesis.cancel();
      }
      this.currentUtterance = null;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to stop speech:', error);
      }
      throw new Error('Failed to stop speech synthesis');
    }
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (!TTSService.isSupported()) {
      return;
    }

    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (!TTSService.isSupported()) {
      return;
    }

    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  /**
   * Repeat the last spoken text
   */
  repeat(options?: TTSOptions): void {
    if (!this.lastSpokenText) {
      throw new Error('No text to repeat');
    }

    this.speak(this.lastSpokenText, options, false); // Don't reformat on repeat
  }

  /**
   * Get current TTS state
   */
  getState(): TTSState {
    return {
      speaking: TTSService.isSupported() ? speechSynthesis.speaking : false,
      paused: TTSService.isSupported() ? speechSynthesis.paused : false,
      lastSpokenText: this.lastSpokenText || null,
    };
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return TTSService.isSupported() && speechSynthesis.speaking;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return TTSService.isSupported() && speechSynthesis.paused;
  }

  /**
   * Get last spoken text
   */
  getLastSpokenText(): string | null {
    return this.lastSpokenText || null;
  }

  /**
   * Clear last spoken text
   */
  clearLastSpokenText(): void {
    this.lastSpokenText = '';
  }

  /**
   * Check TTS state consistency (useful for periodic checks)
   * Returns true if state was inconsistent and was cleaned up
   */
  checkStateConsistency(): boolean {
    if (!TTSService.isSupported()) {
      return false;
    }

    const actualSpeaking = speechSynthesis.speaking;
    const actualPaused = speechSynthesis.paused;

    if (this.currentUtterance && !actualSpeaking && !actualPaused) {
      // Speech ended but our state doesn't reflect that
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Speech ended unexpectedly, cleaning up state');
      }
      this.currentUtterance = null;
      this.eventHandlers.onEnd?.();
      return true;
    }

    return false;
  }

  /**
   * Get current utterance (for advanced use cases)
   */
  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }
}
