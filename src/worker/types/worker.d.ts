import type { LanguageCode } from '../../shared/types/languages';

/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  GROQ_API_KEY: string;
  RATE_LIMITER?: DurableObjectNamespace;
  VISION_CACHE?: KVNamespace;
  ENVIRONMENT?: 'production' | 'development';
}

/**
 * Form data entry that can be a File or string
 */
export type FormDataEntryValue = File | string;

/**
 * Vision API request payload
 */
export interface VisionRequest {
  image: string; // Base64 encoded image
  fullDescription?: boolean;
  language?: LanguageCode;
  customPrompt?: string | null;
}

/**
 * Vision API response payload
 */
export interface VisionResponse {
  description: string;
}

/**
 * Transcription API request (FormData)
 */
export interface TranscriptionRequest {
  file: File | Blob;
  model?: string;
  language?: LanguageCode;
  temperature?: number;
}

/**
 * Transcription API response payload
 */
export interface TranscriptionResponse {
  text: string;
  language: LanguageCode;
}

/**
 * Voice query API request payload
 */
export interface VoiceQueryRequest {
  query: string;
  language?: LanguageCode;
}

/**
 * Voice query API response payload
 */
export interface VoiceQueryResponse {
  response: string;
}

/**
 * Generic API error response
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: number;
  version?: string;
}

/**
 * Groq API chat completion request
 */
export interface GroqChatRequest {
  model: string;
  messages: GroqMessage[];
  max_completion_tokens?: number;
  temperature?: number;
  top_p?: number;
}

/**
 * Groq API message
 */
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | GroqMessageContent[];
}

/**
 * Groq API message content (for multimodal)
 */
export interface GroqMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/**
 * Groq API response
 */
export interface GroqChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  resetAt?: number;
}
