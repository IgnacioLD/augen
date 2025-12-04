import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTSService } from '../../src/frontend/services/TTSService';

// Mock speechSynthesis
const mockUtterance = {
  text: '',
  lang: '',
  rate: 1,
  volume: 1,
  pitch: 1,
  onstart: null as (() => void) | null,
  onend: null as (() => void) | null,
  onpause: null as (() => void) | null,
  onresume: null as (() => void) | null,
  onerror: null as ((event: any) => void) | null,
};

const mockSpeechSynthesis = {
  speaking: false,
  paused: false,
  pending: false,
  speak: vi.fn((utterance: any) => {
    mockSpeechSynthesis.speaking = true;
    setTimeout(() => {
      if (utterance.onstart) utterance.onstart();
      setTimeout(() => {
        mockSpeechSynthesis.speaking = false;
        if (utterance.onend) utterance.onend();
      }, 10);
    }, 0);
  }),
  cancel: vi.fn(() => {
    mockSpeechSynthesis.speaking = false;
    mockSpeechSynthesis.paused = false;
  }),
  pause: vi.fn(() => {
    mockSpeechSynthesis.paused = true;
  }),
  resume: vi.fn(() => {
    mockSpeechSynthesis.paused = false;
  }),
  getVoices: vi.fn(() => []),
};

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text: string) => {
  return { ...mockUtterance, text };
}) as any;

Object.defineProperty(global, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true,
});

describe('TTSService', () => {
  let service: TTSService;

  beforeEach(() => {
    service = new TTSService();
    mockSpeechSynthesis.speaking = false;
    mockSpeechSynthesis.paused = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.stop();
  });

  describe('isSupported', () => {
    it('should return true when speechSynthesis is available', () => {
      expect(TTSService.isSupported()).toBe(true);
    });
  });

  describe('mapLanguageCode', () => {
    it('should map language codes correctly', () => {
      expect(TTSService.mapLanguageCode('en')).toBe('en-US');
      expect(TTSService.mapLanguageCode('es')).toBe('es-ES');
      expect(TTSService.mapLanguageCode('fr')).toBe('fr-FR');
      expect(TTSService.mapLanguageCode('de')).toBe('de-DE');
      expect(TTSService.mapLanguageCode('ja')).toBe('ja-JP');
      expect(TTSService.mapLanguageCode('zh')).toBe('zh-CN');
    });

    it('should fallback to en-US for unknown language', () => {
      expect(TTSService.mapLanguageCode('unknown' as any)).toBe('en-US');
    });
  });

  describe('formatNumbersForSpeech', () => {
    it('should format phone numbers', () => {
      const result = TTSService.formatNumbersForSpeech('Call 123-456-7890');
      expect(result).toContain('1 2 3 4 5 6 7 8 9 0');
    });

    it('should format currency', () => {
      const result = TTSService.formatNumbersForSpeech('Price is $1,234.56');
      expect(result).toContain('1,234.56 dollars');
    });

    it('should format credit card numbers', () => {
      const result = TTSService.formatNumbersForSpeech('Card: 1234-5678-9012-3456');
      expect(result).toContain('1 2 3 4');
      expect(result).toContain('5 6 7 8');
    });

    it('should handle plain text without numbers', () => {
      const text = 'Hello world';
      expect(TTSService.formatNumbersForSpeech(text)).toBe(text);
    });
  });

  describe('speak', () => {
    it('should speak text', async () => {
      const onStart = vi.fn();
      const onEnd = vi.fn();

      service.setEventHandlers({ onStart, onEnd });
      service.speak('Hello world');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(onStart).toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
    });

    it('should format numbers by default', () => {
      service.speak('Call 123-456-7890');

      const utteranceCall = (global.SpeechSynthesisUtterance as any).mock.calls[0];
      expect(utteranceCall[0]).toContain('1 2 3 4 5 6 7 8 9 0');
    });

    it('should not format numbers when disabled', () => {
      service.speak('Call 123-456-7890', {}, false);

      const utteranceCall = (global.SpeechSynthesisUtterance as any).mock.calls[0];
      expect(utteranceCall[0]).toBe('Call 123-456-7890');
    });

    it('should apply custom options', () => {
      service.speak('Test', {
        rate: 1.5,
        volume: 0.5,
        pitch: 1.2,
        language: 'es',
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should cancel previous speech before starting new', () => {
      mockSpeechSynthesis.speaking = true;

      service.speak('First');
      service.speak('Second');

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop speaking', () => {
      service.speak('Test');
      service.stop();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should work when not speaking', () => {
      expect(() => service.stop()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should pause speaking', () => {
      mockSpeechSynthesis.speaking = true;
      mockSpeechSynthesis.paused = false;

      service.pause();

      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should resume paused speech', () => {
      mockSpeechSynthesis.paused = true;

      service.resume();

      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });
  });

  describe('repeat', () => {
    it('should repeat last spoken text', async () => {
      service.speak('Hello');
      await new Promise((resolve) => setTimeout(resolve, 50));

      vi.clearAllMocks();
      service.repeat();

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should throw error when no text to repeat', () => {
      expect(() => service.repeat()).toThrow('No text to repeat');
    });

    it('should not reformat on repeat', () => {
      service.speak('Call 123-456-7890');
      vi.clearAllMocks();
      (global.SpeechSynthesisUtterance as any).mockClear();

      service.repeat();

      // Should use already formatted text
      const utteranceCall = (global.SpeechSynthesisUtterance as any).mock.calls[0];
      expect(utteranceCall[0]).toContain('1 2 3 4 5 6 7 8 9 0');
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = service.getState();

      expect(state).toHaveProperty('speaking');
      expect(state).toHaveProperty('paused');
      expect(state).toHaveProperty('lastSpokenText');
    });

    it('should reflect speaking state', () => {
      mockSpeechSynthesis.speaking = true;
      mockSpeechSynthesis.paused = false;

      const state = service.getState();

      expect(state.speaking).toBe(true);
      expect(state.paused).toBe(false);
    });
  });

  describe('isSpeaking', () => {
    it('should return true when speaking', () => {
      mockSpeechSynthesis.speaking = true;
      expect(service.isSpeaking()).toBe(true);
    });

    it('should return false when not speaking', () => {
      mockSpeechSynthesis.speaking = false;
      expect(service.isSpeaking()).toBe(false);
    });
  });

  describe('isPaused', () => {
    it('should return true when paused', () => {
      mockSpeechSynthesis.paused = true;
      expect(service.isPaused()).toBe(true);
    });

    it('should return false when not paused', () => {
      mockSpeechSynthesis.paused = false;
      expect(service.isPaused()).toBe(false);
    });
  });

  describe('getLastSpokenText', () => {
    it('should return last spoken text', async () => {
      service.speak('Test message');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const lastText = service.getLastSpokenText();
      expect(lastText).toContain('Test message');
    });

    it('should return null when no text spoken', () => {
      expect(service.getLastSpokenText()).toBeNull();
    });
  });

  describe('clearLastSpokenText', () => {
    it('should clear last spoken text', async () => {
      service.speak('Test');
      await new Promise((resolve) => setTimeout(resolve, 50));

      service.clearLastSpokenText();

      expect(service.getLastSpokenText()).toBeNull();
    });
  });

  describe('checkStateConsistency', () => {
    it('should detect inconsistent state', () => {
      // Simulate inconsistent state
      const utterance = new SpeechSynthesisUtterance('test');
      (service as any).currentUtterance = utterance;
      mockSpeechSynthesis.speaking = false;
      mockSpeechSynthesis.paused = false;

      const wasInconsistent = service.checkStateConsistency();

      expect(wasInconsistent).toBe(true);
      expect((service as any).currentUtterance).toBeNull();
    });

    it('should return false when state is consistent', () => {
      const wasInconsistent = service.checkStateConsistency();
      expect(wasInconsistent).toBe(false);
    });
  });
});
