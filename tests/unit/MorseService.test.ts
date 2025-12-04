import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorseService } from '../../src/frontend/services/MorseService';

describe('MorseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('textToMorse', () => {
    it('should convert text to morse code', () => {
      expect(MorseService.textToMorse('SOS')).toBe('... --- ...');
      expect(MorseService.textToMorse('HELLO')).toBe('.... . .-.. .-.. ---');
    });

    it('should handle numbers', () => {
      expect(MorseService.textToMorse('123')).toBe('.---- ..--- ...--');
    });

    it('should handle punctuation', () => {
      expect(MorseService.textToMorse('HELLO!')).toBe('.... . .-.. .-.. --- -.-.--');
    });

    it('should handle spaces as word separators', () => {
      expect(MorseService.textToMorse('HI YOU')).toBe('.... .. / -.-- --- ..-');
    });

    it('should ignore unsupported characters', () => {
      expect(MorseService.textToMorse('A@B')).toBe('.- -...');
    });

    it('should be case-insensitive', () => {
      expect(MorseService.textToMorse('hello')).toBe(MorseService.textToMorse('HELLO'));
    });
  });

  describe('morseToText', () => {
    it('should convert morse code to text', () => {
      expect(MorseService.morseToText('... --- ...')).toBe('SOS');
      expect(MorseService.morseToText('.... . .-.. .-.. ---')).toBe('HELLO');
    });

    it('should handle numbers', () => {
      expect(MorseService.morseToText('.---- ..--- ...--')).toBe('123');
    });

    it('should handle invalid morse codes', () => {
      expect(MorseService.morseToText('.... invalid .-.')).toBe('HR');
    });
  });

  describe('isVibrationSupported', () => {
    it('should return true if navigator.vibrate exists', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });

      expect(MorseService.isVibrationSupported()).toBe(true);
    });

    it('should return false if navigator.vibrate does not exist', () => {
      const original = navigator.vibrate;
      // @ts-expect-error - Deleting for test
      delete navigator.vibrate;

      expect(MorseService.isVibrationSupported()).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('getCodeForCharacter', () => {
    it('should return morse code for valid character', () => {
      expect(MorseService.getCodeForCharacter('A')).toBe('.-');
      expect(MorseService.getCodeForCharacter('B')).toBe('-...');
      expect(MorseService.getCodeForCharacter('1')).toBe('.----');
    });

    it('should be case-insensitive', () => {
      expect(MorseService.getCodeForCharacter('a')).toBe('.-');
      expect(MorseService.getCodeForCharacter('A')).toBe('.-');
    });

    it('should return null for unsupported character', () => {
      expect(MorseService.getCodeForCharacter('@')).toBeNull();
      expect(MorseService.getCodeForCharacter('~')).toBeNull();
    });
  });

  describe('canConvertToMorse', () => {
    it('should return true for valid text', () => {
      expect(MorseService.canConvertToMorse('HELLO WORLD')).toBe(true);
      expect(MorseService.canConvertToMorse('SOS 123')).toBe(true);
    });

    it('should return false for text with unsupported characters', () => {
      expect(MorseService.canConvertToMorse('HELLO@WORLD')).toBe(false);
      expect(MorseService.canConvertToMorse('TEST~')).toBe(false);
    });

    it('should allow spaces', () => {
      expect(MorseService.canConvertToMorse('A B C')).toBe(true);
    });
  });

  describe('getSupportedCharacters', () => {
    it('should return array of supported characters', () => {
      const chars = MorseService.getSupportedCharacters();

      expect(chars).toContain('A');
      expect(chars).toContain('Z');
      expect(chars).toContain('0');
      expect(chars).toContain('9');
      expect(chars).toContain(' ');
      expect(chars).toContain('.');
      expect(chars.length).toBeGreaterThan(40);
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration for simple text', () => {
      const duration = MorseService.estimateDuration('A');
      expect(duration).toBeGreaterThan(0);
    });

    it('should return longer duration for longer text', () => {
      const shortDuration = MorseService.estimateDuration('A');
      const longDuration = MorseService.estimateDuration('HELLO');
      expect(longDuration).toBeGreaterThan(shortDuration);
    });

    it('should account for custom timing', () => {
      const defaultDuration = MorseService.estimateDuration('SOS');
      const customDuration = MorseService.estimateDuration('SOS', {
        dotDuration: 100,
        dashDuration: 300,
        gapDuration: 100,
        letterGap: 300,
        wordGap: 600,
      });

      expect(customDuration).toBeGreaterThan(0);
      expect(customDuration).not.toBe(defaultDuration);
    });
  });

  describe('truncateToFitDuration', () => {
    it('should truncate text to fit within duration', () => {
      const text = 'HELLO WORLD THIS IS A LONG MESSAGE';
      const maxDuration = 5000; // 5 seconds

      const truncated = MorseService.truncateToFitDuration(text, maxDuration);
      const duration = MorseService.estimateDuration(truncated);

      expect(truncated.length).toBeLessThanOrEqual(text.length);
      expect(duration).toBeLessThanOrEqual(maxDuration);
    });

    it('should not truncate if text fits', () => {
      const text = 'HI';
      const maxDuration = 10000; // 10 seconds

      const truncated = MorseService.truncateToFitDuration(text, maxDuration);

      expect(truncated).toBe(text);
    });

    it('should return empty string if no text fits', () => {
      const text = 'HELLO';
      const maxDuration = 0;

      const truncated = MorseService.truncateToFitDuration(text, maxDuration);

      expect(truncated).toBe('');
    });
  });

  describe('outputCharacter', () => {
    it('should throw error for unsupported character', async () => {
      await expect(MorseService.outputCharacter('@')).rejects.toThrow(
        'No Morse code for character: @'
      );
    });
  });
});
