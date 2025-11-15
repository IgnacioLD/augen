import type { LanguageCode } from '../../shared/types/languages';

/**
 * Translation strings type
 */
export interface LocaleStrings {
  ready: string;
  title: string;
  seeButton: string;
  askButton: string;
  settings: string;
  language: string;
  morseCode: string;
  hapticFeedback: string;
  processing: string;
  listening: string;
  processingAudio: string;
  error: string;
  buttonAriaLabel: string;
  imageCaptured: string;
  speechStopped: string;
  readyNewChat: string;
  imageDescribeSuccess: string;
  voiceQuerySuccess: string;
}

/**
 * Translation key type
 */
export type TranslationKey = keyof LocaleStrings;

/**
 * Loaded locales cache
 */
const loadedLocales: Partial<Record<LanguageCode, LocaleStrings>> = {};

/**
 * Current active language
 */
let currentLanguage: LanguageCode = 'en';

/**
 * Detect user's preferred language from browser settings
 */
export function detectUserLanguage(): LanguageCode {
  // Try to get saved language preference first
  const savedLanguage = localStorage.getItem('user-language');
  if (savedLanguage && savedLanguage !== 'auto') {
    return savedLanguage as LanguageCode;
  }

  // Auto-detect from browser/phone settings
  const browserLang = navigator.language || '';

  // Extract just the language code (e.g., 'en' from 'en-US')
  const langCode = browserLang ? browserLang.split('-')[0]?.toLowerCase() || 'en' : 'en';

  // Supported languages
  const supportedLanguages: LanguageCode[] = [
    'en',
    'es',
    'fr',
    'de',
    'it',
    'pt',
    'ru',
    'ja',
    'ko',
    'zh',
    'ar',
    'hi',
  ];

  const detectedLang: LanguageCode = supportedLanguages.includes(langCode as LanguageCode)
    ? (langCode as LanguageCode)
    : 'en';

  // Auto-save the detected language as user preference
  localStorage.setItem('user-language', detectedLang);

  return detectedLang;
}

/**
 * Load locale file dynamically
 */
export async function loadLocale(lang: LanguageCode): Promise<LocaleStrings> {
  // Return cached locale if already loaded
  const cachedLocale = loadedLocales[lang];
  if (cachedLocale) {
    return cachedLocale;
  }

  try {
    // Dynamic import of JSON locale file
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const locale: { default?: LocaleStrings } & Partial<LocaleStrings> = await import(
      `../../../locales/${lang}.json`
    );
    const strings: LocaleStrings = (locale.default || locale) as LocaleStrings;
    loadedLocales[lang] = strings;
    return strings;
  } catch (error) {
    console.warn(`Failed to load locale '${lang}', falling back to English:`, error);

    // Fallback to English
    if (lang !== 'en') {
      return loadLocale('en');
    }

    // If even English fails, return empty object (shouldn't happen)
    throw new Error('Failed to load English locale');
  }
}

/**
 * Initialize i18n system
 */
export async function initI18n(): Promise<void> {
  const detectedLang = detectUserLanguage();
  await setLanguage(detectedLang);
}

/**
 * Set current language and load its locale
 */
export async function setLanguage(lang: LanguageCode): Promise<void> {
  currentLanguage = lang;
  await loadLocale(lang);

  // Update HTML lang attribute
  document.documentElement.lang = lang;

  // Save to localStorage
  localStorage.setItem('user-language', lang);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): LanguageCode {
  return currentLanguage;
}

/**
 * Get localized string by key
 * Returns the string in current language or falls back to English
 */
export function t(key: TranslationKey): string {
  const locale = loadedLocales[currentLanguage];

  if (!locale) {
    console.warn(`Locale not loaded for '${currentLanguage}'`);
    return key;
  }

  return locale[key] || loadedLocales['en']?.[key] || key;
}

/**
 * Get localized string with fallback
 */
export function getLocalizedString(key: TranslationKey, lang?: LanguageCode): string {
  const targetLang = lang || currentLanguage;
  const locale = loadedLocales[targetLang];

  if (!locale) {
    console.warn(`Locale not loaded for '${targetLang}'`);
    return loadedLocales['en']?.[key] || key;
  }

  return locale[key] || loadedLocales['en']?.[key] || key;
}

/**
 * Preload multiple locales
 */
export async function preloadLocales(langs: LanguageCode[]): Promise<void> {
  await Promise.all(langs.map((lang) => loadLocale(lang)));
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageCode[] {
  return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
}
