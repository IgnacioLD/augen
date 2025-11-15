import { apiClient, type TranscriptionRequest } from './ApiClient';
import type { LanguageCode } from '../../shared/types/languages';

/**
 * Audio recording state
 */
export interface AudioRecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  error: Error | null;
}

/**
 * Audio recording options
 */
export interface AudioRecordingOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  mimeType?: string;
  timeslice?: number;
}

/**
 * Audio Service for recording and transcribing audio
 */
export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  private static readonly DEFAULT_OPTIONS: Required<AudioRecordingOptions> = {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    mimeType: 'audio/webm;codecs=opus',
    timeslice: 100,
  };

  /**
   * Check if native Web Speech API is available
   */
  static hasNativeSpeechRecognition(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Check if MediaRecorder is supported
   */
  static isMediaRecorderSupported(): boolean {
    return typeof MediaRecorder !== 'undefined';
  }

  /**
   * Get supported MIME type for audio recording
   */
  static getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(options: AudioRecordingOptions = {}): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      throw new Error('Already recording');
    }

    const opts = { ...AudioService.DEFAULT_OPTIONS, ...options };

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: opts.sampleRate,
          channelCount: opts.channelCount,
          echoCancellation: opts.echoCancellation,
          noiseSuppression: opts.noiseSuppression,
        },
      });

      // Reset audio chunks
      this.audioChunks = [];

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported(opts.mimeType)
        ? opts.mimeType
        : AudioService.getSupportedMimeType();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(opts.timeslice);
    } catch (error) {
      // Clean up on error
      this.cleanup();

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone access denied. Please allow microphone access.');
        }
        if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone.');
        }
        throw new Error(`Failed to start recording: ${error.message}`);
      }

      throw new Error('Failed to start recording');
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Not recording'));
        return;
      }

      if (this.mediaRecorder.state === 'inactive') {
        reject(new Error('Recording already stopped'));
        return;
      }

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length === 0) {
          this.cleanup();
          reject(new Error('No audio data recorded'));
          return;
        }

        // Create blob from chunks
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Clean up
        this.cleanup();

        resolve(audioBlob);
      };

      // Handle errors
      this.mediaRecorder.onerror = (event: Event) => {
        this.cleanup();
        reject(new Error(`Recording error: ${event.type}`));
      };

      // Stop the recorder
      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Get current recording state
   */
  getState(): 'inactive' | 'recording' | 'paused' | null {
    return this.mediaRecorder?.state || null;
  }

  /**
   * Cancel recording without returning audio
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Clear recorder
    this.mediaRecorder = null;

    // Clear chunks
    this.audioChunks = [];
  }

  /**
   * Transcribe audio blob using the API
   */
  static async transcribeAudio(
    audioBlob: Blob,
    options: {
      language?: LanguageCode;
      model?: string;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const request: TranscriptionRequest = {
      audioBlob,
      model: options.model || 'whisper-large-v3-turbo',
      language: options.language || 'en',
      temperature: options.temperature || 0,
    };

    const response = await apiClient.transcribeAudio(request);
    return response.text;
  }

  /**
   * Record and transcribe in one step
   */
  static async recordAndTranscribe(
    recordingOptions: AudioRecordingOptions = {},
    _transcriptionOptions: {
      language?: LanguageCode;
      model?: string;
      temperature?: number;
    } = {}
  ): Promise<{ text: string; audioBlob: Blob }> {
    const service = new AudioService();

    await service.startRecording(recordingOptions);

    // Wait for user to stop recording manually
    // This is typically called from UI event handlers
    throw new Error('Use startRecording() and stopRecording() separately for manual control');
  }

  /**
   * Map language code to Speech Recognition language code
   */
  static getSpeechRecognitionLang(lang: LanguageCode): string {
    const langMap: Record<LanguageCode, string> = {
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

    return langMap[lang] || 'en-US';
  }

  /**
   * Use native Web Speech API for transcription (privacy-friendly, but less accurate)
   */
  static async transcribeWithNativeSpeechAPI(language: LanguageCode = 'en'): Promise<string> {
    if (!AudioService.hasNativeSpeechRecognition()) {
      throw new Error('Native speech recognition not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const recognition = new SpeechRecognition();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      recognition.continuous = false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      recognition.interimResults = false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      recognition.lang = AudioService.getSpeechRecognitionLang(language);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const transcript = event.results[0][0].transcript;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(transcript);
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      recognition.start();
    });
  }

  /**
   * Get audio duration from blob (in seconds)
   */
  static async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(audioBlob);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load audio metadata'));
      };

      audio.src = objectUrl;
    });
  }

  /**
   * Validate audio blob
   */
  static validateAudioBlob(blob: Blob): { valid: boolean; error?: string } {
    if (!blob) {
      return { valid: false, error: 'No audio blob provided' };
    }

    if (blob.size === 0) {
      return { valid: false, error: 'Audio blob is empty' };
    }

    // Max 10MB for audio
    const maxSize = 10 * 1024 * 1024;
    if (blob.size > maxSize) {
      return { valid: false, error: 'Audio file too large (max 10MB)' };
    }

    return { valid: true };
  }
}
