import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioService } from '../../src/frontend/services/AudioService';

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  mimeType: string;

  constructor(stream: MediaStream, options: { mimeType: string }) {
    this.mimeType = options.mimeType;
  }

  start(timeslice?: number) {
    this.state = 'recording';
    // Simulate data available
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob(['audio data'], { type: this.mimeType }),
        });
      }
    }, 10);
  }

  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      if (this.onstop) this.onstop();
    }, 10);
  }

  static isTypeSupported(type: string): boolean {
    return type.includes('webm') || type.includes('ogg');
  }
}

global.MediaRecorder = MockMediaRecorder as any;

// Mock getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
});

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
  configurable: true,
});

describe('AudioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasNativeSpeechRecognition', () => {
    it('should return true if SpeechRecognition is available', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });

      expect(AudioService.hasNativeSpeechRecognition()).toBe(true);
    });

    it('should return true if webkitSpeechRecognition is available', () => {
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });

      expect(AudioService.hasNativeSpeechRecognition()).toBe(true);
    });
  });

  describe('isMediaRecorderSupported', () => {
    it('should return true when MediaRecorder is defined', () => {
      expect(AudioService.isMediaRecorderSupported()).toBe(true);
    });
  });

  describe('getSupportedMimeType', () => {
    it('should return supported MIME type', () => {
      const mimeType = AudioService.getSupportedMimeType();
      expect(mimeType).toBeTruthy();
      expect(typeof mimeType).toBe('string');
    });

    it('should return a webm or ogg type', () => {
      const mimeType = AudioService.getSupportedMimeType();
      expect(mimeType.includes('webm') || mimeType.includes('ogg')).toBe(true);
    });
  });

  describe('startRecording', () => {
    it('should start recording successfully', async () => {
      const service = new AudioService();
      await service.startRecording();

      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(service.isRecording()).toBe(true);
    });

    it('should request correct audio constraints', async () => {
      const service = new AudioService();
      await service.startRecording({
        sampleRate: 48000,
        channelCount: 2,
        echoCancellation: false,
        noiseSuppression: false,
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            sampleRate: 48000,
            channelCount: 2,
            echoCancellation: false,
            noiseSuppression: false,
          }),
        })
      );
    });

    it('should throw error if already recording', async () => {
      const service = new AudioService();
      await service.startRecording();

      await expect(service.startRecording()).rejects.toThrow('Already recording');
    });

    it('should handle permission denied error', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      const service = new AudioService();

      await expect(service.startRecording()).rejects.toThrow(
        'Microphone access denied. Please allow microphone access.'
      );
    });

    it('should handle no microphone found error', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('No device'), { name: 'NotFoundError' })
      );

      const service = new AudioService();

      await expect(service.startRecording()).rejects.toThrow(
        'No microphone found. Please connect a microphone.'
      );
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and return audio blob', async () => {
      const service = new AudioService();
      await service.startRecording();

      const blob = await service.stopRecording();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      expect(service.isRecording()).toBe(false);
    });

    it('should throw error if not recording', async () => {
      const service = new AudioService();

      await expect(service.stopRecording()).rejects.toThrow('Not recording');
    });

    it('should clean up resources after stopping', async () => {
      const service = new AudioService();
      await service.startRecording();
      await service.stopRecording();

      expect(service.getState()).toBeNull();
    });
  });

  describe('isRecording', () => {
    it('should return true when recording', async () => {
      const service = new AudioService();
      await service.startRecording();

      expect(service.isRecording()).toBe(true);
    });

    it('should return false when not recording', () => {
      const service = new AudioService();

      expect(service.isRecording()).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return recording state', async () => {
      const service = new AudioService();
      await service.startRecording();

      expect(service.getState()).toBe('recording');
    });

    it('should return null when no recorder', () => {
      const service = new AudioService();

      expect(service.getState()).toBeNull();
    });
  });

  describe('cancelRecording', () => {
    it('should cancel recording without returning blob', async () => {
      const service = new AudioService();
      await service.startRecording();

      service.cancelRecording();

      expect(service.isRecording()).toBe(false);
      expect(service.getState()).toBeNull();
    });

    it('should not throw when not recording', () => {
      const service = new AudioService();

      expect(() => service.cancelRecording()).not.toThrow();
    });
  });

  describe('getSpeechRecognitionLang', () => {
    it('should map language codes correctly', () => {
      expect(AudioService.getSpeechRecognitionLang('en')).toBe('en-US');
      expect(AudioService.getSpeechRecognitionLang('es')).toBe('es-ES');
      expect(AudioService.getSpeechRecognitionLang('fr')).toBe('fr-FR');
      expect(AudioService.getSpeechRecognitionLang('ja')).toBe('ja-JP');
      expect(AudioService.getSpeechRecognitionLang('zh')).toBe('zh-CN');
    });

    it('should default to en-US for unknown language', () => {
      expect(AudioService.getSpeechRecognitionLang('unknown' as any)).toBe('en-US');
    });
  });

  describe('validateAudioBlob', () => {
    it('should validate correct audio blob', () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      const result = AudioService.validateAudioBlob(blob);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null blob', () => {
      const result = AudioService.validateAudioBlob(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No audio blob provided');
    });

    it('should reject empty blob', () => {
      const blob = new Blob([], { type: 'audio/webm' });
      const result = AudioService.validateAudioBlob(blob);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audio blob is empty');
    });

    it('should reject blob that is too large', () => {
      const largeData = new Array(11 * 1024 * 1024).fill('a').join('');
      const blob = new Blob([largeData], { type: 'audio/webm' });
      const result = AudioService.validateAudioBlob(blob);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audio file too large (max 10MB)');
    });
  });

  describe('recordAndTranscribe', () => {
    it('should throw error for manual control requirement', async () => {
      await expect(AudioService.recordAndTranscribe()).rejects.toThrow(
        'Use startRecording() and stopRecording() separately for manual control'
      );
    });
  });
});
