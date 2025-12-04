import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectUserLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  t,
} from '../../src/frontend/utils/i18n';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('detectUserLanguage', () => {
    it('should return saved language if exists', () => {
      localStorage.setItem('user-language', 'fr');

      const lang = detectUserLanguage();

      expect(lang).toBe('fr');
    });

    it('should detect from browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'es-ES',
        writable: true,
        configurable: true,
      });

      const lang = detectUserLanguage();

      expect(lang).toBe('es');
    });

    it('should default to en for unsupported language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'xx-XX',
        writable: true,
        configurable: true,
      });

      const lang = detectUserLanguage();

      expect(lang).toBe('en');
    });

    it('should extract language code from locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-CA',
        writable: true,
        configurable: true,
      });

      const lang = detectUserLanguage();

      expect(lang).toBe('fr');
    });

    it('should save detected language to localStorage', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'de-DE',
        writable: true,
        configurable: true,
      });

      detectUserLanguage();

      expect(localStorage.getItem('user-language')).toBe('de');
    });
  });

  describe('getCurrentLanguage', () => {
    it('should return current language', () => {
      const lang = getCurrentLanguage();

      expect(typeof lang).toBe('string');
      expect(lang.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const langs = getSupportedLanguages();

      expect(Array.isArray(langs)).toBe(true);
      expect(langs).toContain('en');
      expect(langs).toContain('es');
      expect(langs).toContain('fr');
      expect(langs).toContain('de');
      expect(langs).toContain('ja');
      expect(langs).toContain('zh');
      expect(langs).toContain('ar');
      expect(langs).toContain('hi');
      expect(langs.length).toBe(12);
    });
  });

  describe('t (translation)', () => {
    it('should return translation key if locale not loaded', () => {
      const result = t('ready');

      // Before locale is loaded, it should return the key
      expect(result).toBe('ready');
    });

    it('should not throw error for missing translation', () => {
      expect(() => t('nonexistent' as any)).not.toThrow();
    });
  });
});
