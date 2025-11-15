import { StateManager, type AppSettings, type AppMode } from './core/StateManager';
import { apiClient } from './services/ApiClient';
import { VisionService } from './services/VisionService';
import { AudioService } from './services/AudioService';
import { TTSService } from './services/TTSService';
import { MorseService } from './services/MorseService';
import { initI18n, getCurrentLanguage, t } from './utils/i18n';

/**
 * Main Augen application class
 */
export class AugenApp {
  // Services
  private audioService: AudioService | null = null;
  private ttsService: TTSService;

  // State
  private settings: AppSettings;
  private currentImage: string | null = null;
  private imageTimestamp: number | null = null;
  private currentMode: AppMode = 'chat';

  // TTS state checker
  private ttsStateChecker: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Load settings from localStorage
    this.settings = StateManager.loadSettings();

    // Initialize TTS service with event handlers
    this.ttsService = new TTSService();
    this.ttsService.setEventHandlers({
      onStart: () => this.showTTSControls(),
      onEnd: () => this.hideTTSControls(),
      onError: (error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('TTS error:', error);
        }
        this.announceToScreenReader('Speech error occurred');
      },
    });

    // Initialize
    void this.init();
  }

  /**
   * Initialize the application
   */
  private async init(): Promise<void> {
    // Initialize i18n system
    await initI18n();

    // Setup event listeners
    this.setupEventListeners();

    // Load and apply settings
    this.loadSettings();

    // Update UI language
    this.updateUILanguage();

    // Initialize button states
    this.updateButtonStates();

    // Check API health
    void this.checkApiHealth();

    // Set up periodic TTS state checker
    this.ttsStateChecker = setInterval(() => {
      this.ttsService.checkStateConsistency();
    }, 1000);
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    const cameraBtn = document.getElementById('camera-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const describeBtn = document.getElementById('describe-btn');
    const askAboutBtn = document.getElementById('ask-about-btn');
    const resetBtn = document.getElementById('reset-btn');
    const stopTtsBtn = document.getElementById('stop-tts-btn');
    const fileInput = document.getElementById('file-input');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    const morseToggle = document.getElementById('morse-toggle') as HTMLInputElement;
    const hapticToggle = document.getElementById('haptic-toggle') as HTMLInputElement;
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    const fontSizeSelect = document.getElementById('font-size-select') as HTMLSelectElement;
    const ttsEchoToggle = document.getElementById('tts-echo-toggle') as HTMLInputElement;
    const repeatTtsBtn = document.getElementById('repeat-tts-btn');

    // Camera button
    if (cameraBtn) {
      cameraBtn.addEventListener('click', () => this.takePicture());
      cameraBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.takePicture();
        }
      });
    }

    // Voice button
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => void this.handleVoiceClick());
      voiceBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void this.handleVoiceClick();
        }
      });
    }

    // Describe button
    if (describeBtn) {
      describeBtn.addEventListener('click', () => void this.describeCurrentImage());
      describeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void this.describeCurrentImage();
        }
      });
    }

    // Ask about button
    if (askAboutBtn) {
      askAboutBtn.addEventListener('click', () => void this.handleImageVoiceClick());
      askAboutBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void this.handleImageVoiceClick();
        }
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToChat());
      resetBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.resetToChat();
        }
      });
    }

    // Stop TTS button
    if (stopTtsBtn) {
      stopTtsBtn.addEventListener('click', () => this.stopTTS());
      stopTtsBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.stopTTS();
        }
      });
    }

    // Repeat TTS button
    if (repeatTtsBtn) {
      repeatTtsBtn.addEventListener('click', () => this.repeatTTS());
    }

    // File input
    if (fileInput) {
      fileInput.addEventListener('change', (e) => void this.handleImageUpload(e));
    }

    // Settings button
    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => {
        const isHidden = settingsPanel.style.display === 'none';
        settingsPanel.style.display = isHidden ? 'block' : 'none';

        settingsBtn.setAttribute('aria-label', isHidden ? 'Close settings' : 'Open settings');
        settingsBtn.classList.toggle('active', isHidden);

        if (isHidden) {
          this.announceToScreenReader('Settings panel opened');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          settingsPanel.setAttribute('tabindex', '-1');
          setTimeout(() => settingsPanel.focus(), 300);

          if (this.settings.hapticEnabled && navigator.vibrate) {
            navigator.vibrate(50);
          }
        } else {
          this.announceToScreenReader('Settings panel closed');
          if (this.settings.hapticEnabled && navigator.vibrate) {
            navigator.vibrate(30);
          }
        }
      });
    }

    // Language selector
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const selectedLang = target.value;

        StateManager.updateSetting(
          'userLanguage',
          selectedLang as typeof this.settings.userLanguage
        );
        this.settings = StateManager.loadSettings();
        void initI18n(); // Reinitialize with new language
        this.updateUILanguage();
      });
    }

    // Morse toggle
    if (morseToggle) {
      morseToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        StateManager.updateSetting('morseEnabled', target.checked);
        this.settings.morseEnabled = target.checked;
      });
    }

    // Haptic toggle
    if (hapticToggle) {
      hapticToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        StateManager.updateSetting('hapticEnabled', target.checked);
        this.settings.hapticEnabled = target.checked;
      });
    }

    // Theme selector
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        StateManager.updateSetting(
          'currentTheme',
          target.value as typeof this.settings.currentTheme
        );
        this.settings.currentTheme = target.value as typeof this.settings.currentTheme;
        this.applyTheme();
      });
    }

    // Font size selector
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        StateManager.updateSetting('fontSize', target.value as typeof this.settings.fontSize);
        this.settings.fontSize = target.value as typeof this.settings.fontSize;
        this.applyFontSize();
      });
    }

    // TTS echo toggle
    if (ttsEchoToggle) {
      ttsEchoToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        StateManager.updateSetting('ttsEchoEnabled', target.checked);
        this.settings.ttsEchoEnabled = target.checked;
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            this.stopTTS();
            break;
          case 'r':
            e.preventDefault();
            this.repeatTTS();
            break;
        }
      }
    });

    // Announce app ready
    this.announceToScreenReader(t('ready'));
  }

  /**
   * Load settings and apply to UI
   */
  private loadSettings(): void {
    const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    const morseToggle = document.getElementById('morse-toggle') as HTMLInputElement;
    const hapticToggle = document.getElementById('haptic-toggle') as HTMLInputElement;
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    const fontSizeSelect = document.getElementById('font-size-select') as HTMLSelectElement;
    const ttsEchoToggle = document.getElementById('tts-echo-toggle') as HTMLInputElement;

    if (languageSelect) languageSelect.value = this.settings.userLanguage;
    if (morseToggle) morseToggle.checked = this.settings.morseEnabled;
    if (hapticToggle) hapticToggle.checked = this.settings.hapticEnabled;
    if (themeSelect) themeSelect.value = this.settings.currentTheme;
    if (fontSizeSelect) fontSizeSelect.value = this.settings.fontSize;
    if (ttsEchoToggle) ttsEchoToggle.checked = this.settings.ttsEchoEnabled;

    this.applyTheme();
    this.applyFontSize();
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    const body = document.body;
    body.classList.remove(
      'theme-standard',
      'theme-high-contrast',
      'theme-dark',
      'theme-blue',
      'theme-green'
    );
    body.classList.add(`theme-${this.settings.currentTheme}`);
  }

  /**
   * Apply font size to document
   */
  private applyFontSize(): void {
    const body = document.body;
    body.classList.remove(
      'font-size-small',
      'font-size-medium',
      'font-size-large',
      'font-size-xlarge',
      'font-size-xxlarge'
    );
    body.classList.add(`font-size-${this.settings.fontSize}`);
  }

  /**
   * Update UI language strings
   */
  private updateUILanguage(): void {
    document.documentElement.lang = getCurrentLanguage();
    document.title = t('title');

    const cameraBtn = document.getElementById('camera-btn');
    if (cameraBtn) {
      const buttonText = cameraBtn.querySelector('.button-text');
      if (buttonText) {
        buttonText.textContent = t('seeButton').replace(/📷\s*/, '');
      }
      cameraBtn.setAttribute('aria-label', t('buttonAriaLabel'));
    }

    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      const buttonText = voiceBtn.querySelector('.button-text');
      if (buttonText) {
        buttonText.textContent = t('askButton').replace(/🎤\s*/, '');
      }
    }

    const settingsTitle = document.querySelector('#settings-panel h2');
    if (settingsTitle) settingsTitle.textContent = t('settings');

    const languageLabel = document.querySelector('label:has(#language-select) span');
    if (languageLabel) languageLabel.textContent = t('language');

    const morseLabel = document.querySelector('label:has(#morse-toggle) span');
    if (morseLabel) morseLabel.textContent = t('morseCode');

    const hapticLabel = document.querySelector('label:has(#haptic-toggle) span');
    if (hapticLabel) hapticLabel.textContent = t('hapticFeedback');

    // Add RTL support for Arabic
    if (getCurrentLanguage() === 'ar') {
      document.documentElement.dir = 'rtl';
      document.body.classList.add('rtl');
    } else {
      document.documentElement.dir = 'ltr';
      document.body.classList.remove('rtl');
    }
  }

  /**
   * Check API health
   */
  private async checkApiHealth(): Promise<void> {
    try {
      await apiClient.checkHealth();
      if (process.env.NODE_ENV !== 'production') {
        console.warn('API service is healthy');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('API health check failed:', error);
      }
    }
  }

  /**
   * Take picture (open file input)
   */
  private takePicture(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    try {
      fileInput.value = '';

      if (/Mobi|Android/i.test(navigator.userAgent)) {
        setTimeout(() => fileInput.click(), 10);
      } else {
        fileInput.click();
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Error triggering file input:', error);
      }
      this.updateStatus('Camera access failed. Please try again.', 'error');
    }
  }

  /**
   * Handle image upload
   */
  private async handleImageUpload(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return;
    }

    const processingMsg = t('processing');
    this.updateStatus(processingMsg, 'loading');
    this.speak(processingMsg);

    try {
      const compressionResult = await VisionService.fileToBase64(file);

      this.currentImage = compressionResult.base64;
      this.imageTimestamp = Date.now();
      this.updateMode('image');

      this.updateStatus(t('imageCaptured'), 'success');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Image upload error:', error);
      }
      const errorMsg = `${t('error')}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.updateStatus(errorMsg, 'error');
      this.speak(errorMsg);
    }
  }

  /**
   * Describe current image
   */
  private async describeCurrentImage(): Promise<void> {
    if (!this.currentImage) {
      this.updateStatus('No image to describe', 'error');
      return;
    }

    this.updateStatus(t('processing'), 'loading');

    try {
      const description = await VisionService.analyzeImage(this.currentImage, {
        fullDescription: true,
        language: this.settings.userLanguage,
      });

      this.updateStatus(t('imageDescribeSuccess'), 'success');

      if (this.settings.morseEnabled) {
        await MorseService.outputMorse(description, {
          vibration: this.settings.hapticEnabled,
        });
      } else {
        this.speak(description);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Description error:', error);
      }
      const errorMsg = t('error');
      this.updateStatus(errorMsg, 'error');
      this.speak(errorMsg);
    }
  }

  /**
   * Handle voice button click (chat mode)
   */
  private async handleVoiceClick(): Promise<void> {
    if (this.audioService?.isRecording()) {
      await this.stopRecording();
    } else {
      await this.startRecording('voice');
    }
  }

  /**
   * Handle image voice button click (image mode)
   */
  private async handleImageVoiceClick(): Promise<void> {
    if (this.audioService?.isRecording()) {
      await this.stopRecording();
    } else {
      await this.startRecording('image-voice');
    }
  }

  /**
   * Start audio recording
   */
  private async startRecording(mode: 'voice' | 'image-voice'): Promise<void> {
    try {
      this.audioService = new AudioService();
      await this.audioService.startRecording();

      const btnId = mode === 'voice' ? 'voice-btn' : 'ask-about-btn';
      const btn = document.getElementById(btnId);

      if (btn) {
        btn.classList.add('recording');
        const icon = btn.querySelector('.icon');
        const buttonText = btn.querySelector('.button-text');
        if (icon) icon.textContent = 'stop';
        if (buttonText) buttonText.textContent = 'STOP';
      }

      this.updateStatus(t('listening'), 'loading');

      if (this.settings.hapticEnabled && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Error starting recording:', error);
      }
      this.updateStatus(
        error instanceof Error ? error.message : 'Microphone access denied',
        'error'
      );
    }
  }

  /**
   * Stop audio recording
   */
  private async stopRecording(): Promise<void> {
    if (!this.audioService) return;

    try {
      const audioBlob = await this.audioService.stopRecording();

      const isImageMode = this.currentMode === 'image';
      const btnId = isImageMode ? 'ask-about-btn' : 'voice-btn';
      const btn = document.getElementById(btnId);

      if (btn) {
        btn.classList.remove('recording');
        const icon = btn.querySelector('.icon');
        const buttonText = btn.querySelector('.button-text');
        if (icon) icon.textContent = isImageMode ? 'help' : 'mic';
        if (buttonText) {
          buttonText.textContent = isImageMode
            ? 'ASK ABOUT IT'
            : t('askButton').replace(/🎤\s*/, '');
        }
      }

      this.updateStatus(t('processingAudio'), 'loading');

      // Transcribe audio
      const transcript = await AudioService.transcribeAudio(audioBlob, {
        language: this.settings.userLanguage,
      });

      await this.handleVoiceQuery(transcript);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Recording error:', error);
      }
      this.updateStatus(
        error instanceof Error ? error.message : 'Voice transcription failed',
        'error'
      );
    } finally {
      this.audioService = null;
    }
  }

  /**
   * Handle voice query
   */
  private async handleVoiceQuery(transcript: string): Promise<void> {
    const sanitizedTranscript = this.sanitizeInput(transcript);

    this.updateStatus(`You said: "${sanitizedTranscript}"`, 'success');

    if (this.settings.ttsEchoEnabled) {
      this.speak(`Processing your request: ${sanitizedTranscript}`);
    } else {
      this.speak(t('processing'));
    }

    try {
      let response: string;

      if (this.currentImage && this.imageTimestamp && Date.now() - this.imageTimestamp < 300000) {
        // Image + voice query
        const enhancedPrompt = this.enhanceVoiceQueryWithImage(sanitizedTranscript);
        response = await VisionService.analyzeImage(this.currentImage, {
          fullDescription: true,
          language: this.settings.userLanguage,
          customPrompt: enhancedPrompt,
        });
      } else {
        // Voice-only query
        const enhancedPrompt = this.enhanceVoiceQuery(sanitizedTranscript);
        const result = await apiClient.voiceQuery({
          query: enhancedPrompt,
          language: this.settings.userLanguage,
        });
        response = result.response;
      }

      this.updateStatus(t('voiceQuerySuccess'), 'success');

      if (this.settings.morseEnabled) {
        await MorseService.outputMorse(response, {
          vibration: this.settings.hapticEnabled,
        });
      } else {
        this.speak(response);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Voice query error:', error);
      }
      const errorMsg = 'Failed to process voice query. Please try again.';
      this.updateStatus(errorMsg, 'error');
      this.speak(errorMsg);
    }
  }

  /**
   * Enhance voice query for voice-only mode
   */
  private enhanceVoiceQuery(transcript: string): string {
    const cleanTranscript = transcript.trim();
    return `The user asked: "${cleanTranscript}". You are Augen, an AI assistant. Answer their question helpfully and conversationally. You can discuss any topic - technology, advice, explanations, creative tasks, etc. Only mention your vision capabilities if the user specifically asks about analyzing images or visual content.`;
  }

  /**
   * Enhance voice query for image + voice mode
   */
  private enhanceVoiceQueryWithImage(transcript: string): string {
    const cleanTranscript = transcript.trim();
    const lowerTranscript = cleanTranscript.toLowerCase();

    if (
      lowerTranscript.includes('describe') ||
      lowerTranscript.includes('what') ||
      lowerTranscript.includes('see')
    ) {
      return `The user asked: "${cleanTranscript}". Please provide a detailed description of what you see in the image, focusing on answering their specific question.`;
    } else if (lowerTranscript.includes('read') || lowerTranscript.includes('text')) {
      return `The user asked: "${cleanTranscript}". Please read any text visible in the image clearly and completely.`;
    } else if (lowerTranscript.includes('help') || lowerTranscript.includes('assist')) {
      return `The user needs help: "${cleanTranscript}". Please describe what you see and provide relevant assistance based on the image content.`;
    } else if (lowerTranscript.includes('count') || lowerTranscript.includes('how many')) {
      return `The user asked: "${cleanTranscript}". Please count and identify the specific items they're asking about in the image.`;
    } else if (lowerTranscript.includes('color') || lowerTranscript.includes('colour')) {
      return `The user asked: "${cleanTranscript}". Please describe the colors and visual appearance of what they're asking about in the image.`;
    } else {
      return `The user asked: "${cleanTranscript}". Please analyze the image and respond to their specific question as helpfully as possible.`;
    }
  }

  /**
   * Sanitize user input for prompt injection protection
   */
  private sanitizeInput(input: string): string {
    const dangerous = [
      'ignore',
      'forget',
      'system',
      'prompt',
      'instruction',
      'override',
      'bypass',
      'admin',
      'root',
      'execute',
    ];

    const sanitized = input.toLowerCase();
    dangerous.forEach((word) => {
      if (sanitized.includes(word)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Potentially dangerous input detected: ${word}`);
        }
      }
    });

    return input.length > 500 ? input.substring(0, 500) : input;
  }

  /**
   * Speak text using TTS
   */
  private speak(text: string): void {
    try {
      this.ttsService.speak(text, {
        language: this.settings.userLanguage,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('TTS error:', error);
      }
    }
  }

  /**
   * Stop TTS
   */
  private stopTTS(): void {
    try {
      this.ttsService.stop();
      this.updateStatus(t('speechStopped'), 'success');
      this.announceToScreenReader(t('speechStopped'));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to stop TTS:', error);
      }
    }
  }

  /**
   * Repeat last TTS
   */
  private repeatTTS(): void {
    try {
      this.ttsService.repeat({ language: this.settings.userLanguage });
      this.announceToScreenReader('Repeating last message');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('No text to repeat:', error);
      }
      this.announceToScreenReader('No previous message to repeat');
    }
  }

  /**
   * Show TTS controls
   */
  private showTTSControls(): void {
    const ttsControls = document.getElementById('tts-controls');
    if (ttsControls) {
      ttsControls.style.display = 'flex';
    }
  }

  /**
   * Hide TTS controls
   */
  private hideTTSControls(): void {
    const ttsControls = document.getElementById('tts-controls');
    if (ttsControls) {
      ttsControls.style.display = 'none';
    }
  }

  /**
   * Update status message
   */
  private updateStatus(message: string, type: '' | 'loading' | 'success' | 'error' = ''): void {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status-message ${type}`;
      statusDiv.style.display = 'flex';
    }
  }

  /**
   * Update app mode
   */
  private updateMode(newMode: AppMode): void {
    this.currentMode = newMode;

    const chatModeButtons = document.getElementById('chat-mode-buttons');
    const imageModeButtons = document.getElementById('image-mode-buttons');
    const resetBtn = document.getElementById('reset-btn');
    const modeIndicator = document.getElementById('mode-indicator');
    const modeIcon = modeIndicator?.querySelector('.mode-icon');
    const modeText = modeIndicator?.querySelector('.mode-text');
    const modeDescription = modeIndicator?.querySelector('.mode-description');

    if (chatModeButtons) chatModeButtons.style.display = 'none';
    if (imageModeButtons) imageModeButtons.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';

    switch (newMode) {
      case 'chat':
        if (chatModeButtons) chatModeButtons.style.display = 'flex';
        if (modeIcon) modeIcon.textContent = 'chat';
        if (modeText) modeText.textContent = 'Chat Mode';
        if (modeDescription) modeDescription.textContent = 'Ask me anything by voice';
        break;

      case 'image':
        if (imageModeButtons) imageModeButtons.style.display = 'flex';
        if (resetBtn) resetBtn.style.display = 'block';
        if (modeIcon) modeIcon.textContent = 'photo_camera';
        if (modeText) modeText.textContent = 'Image Mode';
        if (modeDescription) modeDescription.textContent = 'Describe or ask about this image';
        break;
    }

    if (modeIndicator) {
      modeIndicator.style.animation = 'none';
      void modeIndicator.offsetHeight; // Trigger reflow
      modeIndicator.style.animation = 'fadeIn 0.3s ease-in-out';
    }
  }

  /**
   * Reset to chat mode
   */
  private resetToChat(): void {
    this.currentImage = null;
    this.imageTimestamp = null;
    this.updateMode('chat');
    this.updateStatus(t('readyNewChat'), 'success');

    if (this.ttsService.isSpeaking()) {
      this.ttsService.stop();
    }
  }

  /**
   * Update button states based on current mode
   */
  private updateButtonStates(): void {
    if (this.currentImage && this.imageTimestamp && Date.now() - this.imageTimestamp < 300000) {
      this.updateMode('image');
    } else {
      this.updateMode('chat');
    }
  }

  /**
   * Announce message to screen readers
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    if (this.ttsStateChecker) {
      clearInterval(this.ttsStateChecker);
    }
    this.ttsService.stop();
    this.audioService?.cancelRecording();
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AugenApp();
});
