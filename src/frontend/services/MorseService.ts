/**
 * Morse code timing options
 */
export interface MorseTimingOptions {
  dotDuration?: number;
  dashDuration?: number;
  gapDuration?: number;
  letterGap?: number;
  wordGap?: number;
}

/**
 * Morse output options
 */
export interface MorseOutputOptions {
  audio?: boolean;
  vibration?: boolean;
  dotFrequency?: number;
  dashFrequency?: number;
  volume?: number;
  timing?: MorseTimingOptions;
}

/**
 * Morse Service for outputting text as Morse code with audio and haptic feedback
 */
export class MorseService {
  private static readonly MORSE_CODE: Record<string, string> = {
    A: '.-',
    B: '-...',
    C: '-.-.',
    D: '-..',
    E: '.',
    F: '..-.',
    G: '--.',
    H: '....',
    I: '..',
    J: '.---',
    K: '-.-',
    L: '.-..',
    M: '--',
    N: '-.',
    O: '---',
    P: '.--.',
    Q: '--.-',
    R: '.-.',
    S: '...',
    T: '-',
    U: '..-',
    V: '...-',
    W: '.--',
    X: '-..-',
    Y: '-.--',
    Z: '--..',
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    '8': '---..',
    '9': '----.',
    ' ': '/',
    '.': '.-.-.-',
    ',': '--..--',
    '?': '..--..',
    "'": '.----.',
    '!': '-.-.--',
    '/': '-..-.',
    '(': '-.--.',
    ')': '-.--.-',
    '&': '.-...',
    ':': '---...',
    ';': '-.-.-.',
    '=': '-...-',
    '+': '.-.-.',
    '-': '-....-',
    _: '..--.-',
    '"': '.-..-.',
  };

  private static readonly DEFAULT_TIMING: Required<MorseTimingOptions> = {
    dotDuration: 200, // milliseconds
    dashDuration: 600,
    gapDuration: 200,
    letterGap: 600,
    wordGap: 1200,
  };

  private static readonly DEFAULT_OPTIONS: Required<Omit<MorseOutputOptions, 'timing'>> = {
    audio: true,
    vibration: true,
    dotFrequency: 800, // Hz
    dashFrequency: 600, // Hz
    volume: 0.3,
  };

  /**
   * Convert text to Morse code string
   */
  static textToMorse(text: string): string {
    const morseText = text
      .toUpperCase()
      .split('')
      .map((char) => MorseService.MORSE_CODE[char] || '')
      .filter((code) => code !== '')
      .join(' ');

    return morseText;
  }

  /**
   * Convert Morse code to text
   */
  static morseToText(morse: string): string {
    // Reverse lookup in the morse code dictionary
    const reverseMap: Record<string, string> = {};
    for (const [char, code] of Object.entries(MorseService.MORSE_CODE)) {
      reverseMap[code] = char;
    }

    return morse
      .split(' ')
      .map((code) => reverseMap[code] || '')
      .join('');
  }

  /**
   * Check if vibration API is supported
   */
  static isVibrationSupported(): boolean {
    return 'vibrate' in navigator;
  }

  /**
   * Play a morse beep with specified frequency and duration
   */
  private static playMorseBeep(frequency: number, duration: number, volume: number): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Audio error:', error);
      }
    }
  }

  /**
   * Sleep utility for timing
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Output text as Morse code with audio and vibration
   */
  static async outputMorse(text: string, options: MorseOutputOptions = {}): Promise<void> {
    const opts = {
      ...MorseService.DEFAULT_OPTIONS,
      ...options,
      timing: {
        ...MorseService.DEFAULT_TIMING,
        ...options.timing,
      },
    };

    // Convert text to morse
    const morseText = MorseService.textToMorse(text);

    // Output morse code with audio and vibration
    for (let i = 0; i < morseText.length; i++) {
      const char = morseText[i];

      if (char === '.') {
        // Dot: short beep and vibration
        if (opts.audio) {
          MorseService.playMorseBeep(opts.dotFrequency, opts.timing.dotDuration, opts.volume);
        }

        if (opts.vibration && MorseService.isVibrationSupported()) {
          navigator.vibrate(opts.timing.dotDuration);
        }

        await MorseService.sleep(opts.timing.dotDuration + opts.timing.gapDuration);
      } else if (char === '-') {
        // Dash: long beep and vibration
        if (opts.audio) {
          MorseService.playMorseBeep(opts.dashFrequency, opts.timing.dashDuration, opts.volume);
        }

        if (opts.vibration && MorseService.isVibrationSupported()) {
          navigator.vibrate(opts.timing.dashDuration);
        }

        await MorseService.sleep(opts.timing.dashDuration + opts.timing.gapDuration);
      } else if (char === ' ') {
        // Letter gap
        await MorseService.sleep(opts.timing.letterGap);
      } else if (char === '/') {
        // Word gap
        await MorseService.sleep(opts.timing.wordGap);
      }
    }
  }

  /**
   * Output a single Morse character
   */
  static async outputCharacter(char: string, options: MorseOutputOptions = {}): Promise<void> {
    const morse = MorseService.MORSE_CODE[char.toUpperCase()];
    if (!morse) {
      throw new Error(`No Morse code for character: ${char}`);
    }

    await MorseService.outputMorse(char, options);
  }

  /**
   * Get Morse code for a character
   */
  static getCodeForCharacter(char: string): string | null {
    return MorseService.MORSE_CODE[char.toUpperCase()] || null;
  }

  /**
   * Validate if text can be converted to Morse
   */
  static canConvertToMorse(text: string): boolean {
    const upperText = text.toUpperCase();
    for (const char of upperText) {
      if (!MorseService.MORSE_CODE[char] && char !== ' ') {
        return false;
      }
    }
    return true;
  }

  /**
   * Get supported characters
   */
  static getSupportedCharacters(): string[] {
    return Object.keys(MorseService.MORSE_CODE);
  }

  /**
   * Estimate output duration for text (in milliseconds)
   */
  static estimateDuration(text: string, timing?: MorseTimingOptions): number {
    const opts = {
      ...MorseService.DEFAULT_TIMING,
      ...timing,
    };

    const morseText = MorseService.textToMorse(text);
    let duration = 0;

    for (const char of morseText) {
      if (char === '.') {
        duration += opts.dotDuration + opts.gapDuration;
      } else if (char === '-') {
        duration += opts.dashDuration + opts.gapDuration;
      } else if (char === ' ') {
        duration += opts.letterGap;
      } else if (char === '/') {
        duration += opts.wordGap;
      }
    }

    return duration;
  }

  /**
   * Truncate text to fit within a maximum duration
   */
  static truncateToFitDuration(
    text: string,
    maxDuration: number,
    timing?: MorseTimingOptions
  ): string {
    let truncated = text;

    while (MorseService.estimateDuration(truncated, timing) > maxDuration && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }

    return truncated;
  }
}
