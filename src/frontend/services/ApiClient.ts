import type { LanguageCode } from '../../shared/types/languages';

/**
 * Vision analysis request
 */
export interface VisionAnalysisRequest {
  image: string; // Base64 encoded
  fullDescription?: boolean;
  language?: LanguageCode;
  customPrompt?: string | null;
}

/**
 * Vision analysis response
 */
export interface VisionAnalysisResponse {
  description: string;
}

/**
 * Transcription request (uses FormData)
 */
export interface TranscriptionRequest {
  audioBlob: Blob;
  model?: string;
  language?: LanguageCode;
  temperature?: number;
}

/**
 * Transcription response
 */
export interface TranscriptionResponse {
  text: string;
  language: LanguageCode;
}

/**
 * Voice query request
 */
export interface VoiceQueryRequest {
  query: string;
  language?: LanguageCode;
}

/**
 * Voice query response
 */
export interface VoiceQueryResponse {
  response: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: string;
  timestamp: number;
  version?: string;
}

/**
 * API error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Client for communicating with the Augen backend
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Default to production worker URL
    this.baseUrl = baseUrl || 'https://augen-api-prod.ignacioeloyola.workers.dev/api';
  }

  /**
   * Set API base URL (useful for testing or custom deployments)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get API base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Make a JSON API request
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        const typedError = errorData as { error?: string };
        throw new ApiError(
          typedError.error || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network error or other issue
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        undefined,
        error
      );
    }
  }

  /**
   * Make a FormData API request (for file uploads)
   */
  private async makeFormDataRequest<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        const typedError = errorData as { error?: string };
        throw new ApiError(
          typedError.error || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        undefined,
        error
      );
    }
  }

  /**
   * Analyze an image
   */
  async analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
    return this.makeRequest<VisionAnalysisResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Transcribe audio
   */
  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', request.audioBlob, 'recording.webm');
    formData.append('model', request.model || 'whisper-large-v3-turbo');
    formData.append('language', request.language || 'en');
    formData.append('temperature', (request.temperature || 0).toString());

    return this.makeFormDataRequest<TranscriptionResponse>('/transcribe', formData);
  }

  /**
   * Send a voice query (text-only chat)
   */
  async voiceQuery(request: VoiceQueryRequest): Promise<VoiceQueryResponse> {
    return this.makeRequest<VoiceQueryResponse>('/voice-query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/health', {
      method: 'GET',
    });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
