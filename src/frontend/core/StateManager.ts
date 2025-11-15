import type { LanguageCode } from '../../shared/types/languages';

/**
 * Theme variants
 */
export type ThemeVariant = 'standard' | 'high-contrast' | 'dark' | 'blue' | 'green';

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';

/**
 * App mode
 */
export type AppMode = 'chat' | 'image';

/**
 * App settings (persisted in localStorage)
 */
export interface AppSettings {
  morseEnabled: boolean;
  hapticEnabled: boolean;
  userLanguage: LanguageCode;
  currentTheme: ThemeVariant;
  fontSize: FontSize;
  ttsEchoEnabled: boolean;
}

/**
 * App state (runtime, may or may not be persisted)
 */
export interface AppState {
  currentMode: AppMode;
  currentImage: string | null;
  imageTimestamp: number | null;
}

/**
 * State Manager for type-safe localStorage access
 */
export class StateManager {
  private static readonly SETTINGS_PREFIX = '';
  private static readonly STATE_PREFIX = 'state-';

  /**
   * Default settings
   */
  private static readonly DEFAULT_SETTINGS: AppSettings = {
    morseEnabled: false,
    hapticEnabled: true, // Default true for accessibility
    userLanguage: 'en',
    currentTheme: 'standard',
    fontSize: 'large', // Default to large for accessibility
    ttsEchoEnabled: false,
  };

  /**
   * Default state
   */
  private static readonly DEFAULT_STATE: AppState = {
    currentMode: 'chat',
    currentImage: null,
    imageTimestamp: null,
  };

  /**
   * Load all settings from localStorage
   */
  static loadSettings(): AppSettings {
    return {
      morseEnabled: this.getBoolean('morse-enabled', this.DEFAULT_SETTINGS.morseEnabled),
      hapticEnabled: this.getBoolean('haptic-enabled', this.DEFAULT_SETTINGS.hapticEnabled),
      userLanguage: this.getString(
        'user-language',
        this.DEFAULT_SETTINGS.userLanguage
      ) as LanguageCode,
      currentTheme: this.getString('theme', this.DEFAULT_SETTINGS.currentTheme) as ThemeVariant,
      fontSize: this.getString('font-size', this.DEFAULT_SETTINGS.fontSize) as FontSize,
      ttsEchoEnabled: this.getBoolean('tts-echo-enabled', this.DEFAULT_SETTINGS.ttsEchoEnabled),
    };
  }

  /**
   * Save all settings to localStorage
   */
  static saveSettings(settings: AppSettings): void {
    this.setBoolean('morse-enabled', settings.morseEnabled);
    this.setBoolean('haptic-enabled', settings.hapticEnabled);
    this.setString('user-language', settings.userLanguage);
    this.setString('theme', settings.currentTheme);
    this.setString('font-size', settings.fontSize);
    this.setBoolean('tts-echo-enabled', settings.ttsEchoEnabled);
  }

  /**
   * Update a single setting
   */
  static updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const settings = this.loadSettings();
    settings[key] = value;
    this.saveSettings(settings);
  }

  /**
   * Load app state
   */
  static loadState(): AppState {
    return {
      currentMode: this.getString(
        `${this.STATE_PREFIX}mode`,
        this.DEFAULT_STATE.currentMode
      ) as AppMode,
      currentImage: this.getString(`${this.STATE_PREFIX}image`, null),
      imageTimestamp: this.getNumber(`${this.STATE_PREFIX}image-timestamp`, null),
    };
  }

  /**
   * Save app state
   */
  static saveState(state: AppState): void {
    this.setString(`${this.STATE_PREFIX}mode`, state.currentMode);
    this.setString(`${this.STATE_PREFIX}image`, state.currentImage);
    this.setNumber(`${this.STATE_PREFIX}image-timestamp`, state.imageTimestamp);
  }

  /**
   * Update a single state property
   */
  static updateState<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const state = this.loadState();
    state[key] = value;
    this.saveState(state);
  }

  /**
   * Clear all app data
   */
  static clearAll(): void {
    localStorage.clear();
  }

  /**
   * Clear only state (keep settings)
   */
  static clearState(): void {
    const state = this.DEFAULT_STATE;
    this.saveState(state);
  }

  // ===== Private Helper Methods =====

  private static getBoolean(key: string, defaultValue: boolean): boolean {
    const value = localStorage.getItem(this.SETTINGS_PREFIX + key);
    if (value === null) return defaultValue;
    return value === 'true';
  }

  private static setBoolean(key: string, value: boolean): void {
    localStorage.setItem(this.SETTINGS_PREFIX + key, value.toString());
  }

  private static getString(key: string, defaultValue: string | null): string | null {
    const value = localStorage.getItem(this.SETTINGS_PREFIX + key);
    return value !== null ? value : defaultValue;
  }

  private static setString(key: string, value: string | null): void {
    if (value === null) {
      localStorage.removeItem(this.SETTINGS_PREFIX + key);
    } else {
      localStorage.setItem(this.SETTINGS_PREFIX + key, value);
    }
  }

  private static getNumber(key: string, defaultValue: number | null): number | null {
    const value = localStorage.getItem(this.SETTINGS_PREFIX + key);
    if (value === null) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private static setNumber(key: string, value: number | null): void {
    if (value === null) {
      localStorage.removeItem(this.SETTINGS_PREFIX + key);
    } else {
      localStorage.setItem(this.SETTINGS_PREFIX + key, value.toString());
    }
  }
}

/**
 * Settings helper hook (if migrating to React/Vue later)
 */
export function useSettings(): [AppSettings, (settings: AppSettings) => void] {
  const settings = StateManager.loadSettings();
  const setSettings = (newSettings: AppSettings) => {
    StateManager.saveSettings(newSettings);
  };
  return [settings, setSettings];
}

/**
 * State helper hook (if migrating to React/Vue later)
 */
export function useState(): [AppState, (state: AppState) => void] {
  const state = StateManager.loadState();
  const setState = (newState: AppState) => {
    StateManager.saveState(newState);
  };
  return [state, setState];
}
