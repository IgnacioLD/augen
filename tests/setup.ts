import { vi } from 'vitest';

// Mock MediaRecorder API
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  ondataavailable: null,
  onstop: null,
  onstart: null,
  onerror: null,
  onpause: null,
  onresume: null,
  state: 'inactive',
  stream: null,
  mimeType: 'audio/webm',
  audioBitsPerSecond: 128000,
  videoBitsPerSecond: 0,
  isTypeSupported: vi.fn().mockReturnValue(true),
})) as any;

(MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);

// Mock SpeechSynthesis API
const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text?: string) => ({
  text: text || '',
  lang: 'en-US',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
}));

global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance as any;

global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    {
      name: 'Google US English',
      lang: 'en-US',
      default: true,
      localService: true,
      voiceURI: 'Google US English',
    },
  ]),
  speaking: false,
  paused: false,
  pending: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onvoiceschanged: null,
} as any;

// Mock Navigator APIs
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        {
          stop: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      ]),
      getAudioTracks: vi.fn().mockReturnValue([]),
      getVideoTracks: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global.navigator, 'vibrate', {
  value: vi.fn().mockReturnValue(true),
  writable: true,
  configurable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock FileReader API
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(function (this: any) {
    // Simulate async file reading
    setTimeout(() => {
      this.result =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  result: null,
  error: null,
  readyState: 0,
  onload: null,
  onerror: null,
  onprogress: null,
  onloadstart: null,
  onloadend: null,
  onabort: null,
})) as any;

// Mock AudioContext for Morse code
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0, setValueAtTime: vi.fn() },
    type: 'sine',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  currentTime: 0,
  destination: {},
  state: 'running',
  sampleRate: 44100,
  close: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Mock fetch API
global.fetch = vi.fn();

// Mock Image
global.Image = vi.fn().mockImplementation(() => ({
  width: 100,
  height: 100,
  src: '',
  onload: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(),
  canvas: {
    width: 100,
    height: 100,
    toDataURL: vi
      .fn()
      .mockReturnValue(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      ),
  },
}) as any;

HTMLCanvasElement.prototype.toDataURL = vi
  .fn()
  .mockReturnValue(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  );

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
