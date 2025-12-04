import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/frontend/core/StateManager';

describe('StateManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      const settings = StateManager.loadSettings();

      expect(settings.morseEnabled).toBe(false);
      expect(settings.hapticEnabled).toBe(true);
      expect(settings.userLanguage).toBe('en');
      expect(settings.currentTheme).toBe('standard');
      expect(settings.fontSize).toBe('large');
      expect(settings.ttsEchoEnabled).toBe(false);
    });

    it('should load settings from localStorage', () => {
      localStorage.setItem('morse-enabled', 'true');
      localStorage.setItem('haptic-enabled', 'false');
      localStorage.setItem('user-language', 'es');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('font-size', 'xlarge');
      localStorage.setItem('tts-echo-enabled', 'true');

      const settings = StateManager.loadSettings();

      expect(settings.morseEnabled).toBe(true);
      expect(settings.hapticEnabled).toBe(false);
      expect(settings.userLanguage).toBe('es');
      expect(settings.currentTheme).toBe('dark');
      expect(settings.fontSize).toBe('xlarge');
      expect(settings.ttsEchoEnabled).toBe(true);
    });

    it('should use defaults for invalid values', () => {
      localStorage.setItem('morse-enabled', 'invalid');
      localStorage.setItem('haptic-enabled', 'notboolean');

      const settings = StateManager.loadSettings();

      expect(settings.morseEnabled).toBe(false);
      expect(settings.hapticEnabled).toBe(false);
    });
  });

  describe('saveSettings', () => {
    it('should save all settings to localStorage', () => {
      const settings = {
        morseEnabled: true,
        hapticEnabled: false,
        userLanguage: 'fr' as const,
        currentTheme: 'high-contrast' as const,
        fontSize: 'xxlarge' as const,
        ttsEchoEnabled: true,
      };

      StateManager.saveSettings(settings);

      expect(localStorage.getItem('morse-enabled')).toBe('true');
      expect(localStorage.getItem('haptic-enabled')).toBe('false');
      expect(localStorage.getItem('user-language')).toBe('fr');
      expect(localStorage.getItem('theme')).toBe('high-contrast');
      expect(localStorage.getItem('font-size')).toBe('xxlarge');
      expect(localStorage.getItem('tts-echo-enabled')).toBe('true');
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', () => {
      StateManager.updateSetting('morseEnabled', true);

      expect(localStorage.getItem('morse-enabled')).toBe('true');
      expect(StateManager.loadSettings().morseEnabled).toBe(true);
    });

    it('should preserve other settings when updating one', () => {
      StateManager.saveSettings({
        morseEnabled: true,
        hapticEnabled: true,
        userLanguage: 'en',
        currentTheme: 'standard',
        fontSize: 'large',
        ttsEchoEnabled: false,
      });

      StateManager.updateSetting('userLanguage', 'de');

      const settings = StateManager.loadSettings();
      expect(settings.userLanguage).toBe('de');
      expect(settings.morseEnabled).toBe(true);
      expect(settings.hapticEnabled).toBe(true);
    });
  });

  describe('loadState', () => {
    it('should return default state when localStorage is empty', () => {
      const state = StateManager.loadState();

      expect(state.currentMode).toBe('chat');
      expect(state.currentImage).toBeNull();
      expect(state.imageTimestamp).toBeNull();
    });

    it('should load state from localStorage', () => {
      localStorage.setItem('state-mode', 'image');
      localStorage.setItem('state-image', 'base64imagedata');
      localStorage.setItem('state-image-timestamp', '1234567890');

      const state = StateManager.loadState();

      expect(state.currentMode).toBe('image');
      expect(state.currentImage).toBe('base64imagedata');
      expect(state.imageTimestamp).toBe(1234567890);
    });
  });

  describe('saveState', () => {
    it('should save state to localStorage', () => {
      const state = {
        currentMode: 'image' as const,
        currentImage: 'base64data',
        imageTimestamp: 9876543210,
      };

      StateManager.saveState(state);

      expect(localStorage.getItem('state-mode')).toBe('image');
      expect(localStorage.getItem('state-image')).toBe('base64data');
      expect(localStorage.getItem('state-image-timestamp')).toBe('9876543210');
    });

    it('should handle null values', () => {
      const state = {
        currentMode: 'chat' as const,
        currentImage: null,
        imageTimestamp: null,
      };

      StateManager.saveState(state);

      expect(localStorage.getItem('state-mode')).toBe('chat');
      expect(localStorage.getItem('state-image')).toBeNull();
      expect(localStorage.getItem('state-image-timestamp')).toBeNull();
    });
  });

  describe('updateState', () => {
    it('should update a single state property', () => {
      StateManager.updateState('currentMode', 'image');

      expect(localStorage.getItem('state-mode')).toBe('image');
      expect(StateManager.loadState().currentMode).toBe('image');
    });

    it('should preserve other state when updating one property', () => {
      StateManager.saveState({
        currentMode: 'image',
        currentImage: 'data',
        imageTimestamp: 123456,
      });

      StateManager.updateState('currentMode', 'chat');

      const state = StateManager.loadState();
      expect(state.currentMode).toBe('chat');
      expect(state.currentImage).toBe('data');
      expect(state.imageTimestamp).toBe(123456);
    });
  });

  describe('clearAll', () => {
    it('should clear all localStorage data', () => {
      localStorage.setItem('morse-enabled', 'true');
      localStorage.setItem('user-language', 'es');
      localStorage.setItem('state-mode', 'image');

      StateManager.clearAll();

      expect(localStorage.length).toBe(0);
    });
  });

  describe('clearState', () => {
    it('should reset state to defaults but keep settings', () => {
      StateManager.saveSettings({
        morseEnabled: true,
        hapticEnabled: true,
        userLanguage: 'fr',
        currentTheme: 'dark',
        fontSize: 'xlarge',
        ttsEchoEnabled: true,
      });

      StateManager.saveState({
        currentMode: 'image',
        currentImage: 'data',
        imageTimestamp: 123456,
      });

      StateManager.clearState();

      const state = StateManager.loadState();
      const settings = StateManager.loadSettings();

      expect(state.currentMode).toBe('chat');
      expect(state.currentImage).toBeNull();
      expect(state.imageTimestamp).toBeNull();

      expect(settings.morseEnabled).toBe(true);
      expect(settings.userLanguage).toBe('fr');
    });
  });
});
