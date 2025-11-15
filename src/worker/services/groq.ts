import { GroqChatRequest, GroqChatResponse } from '../types/worker';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Groq API client
 */
export class GroqClient {
  constructor(private apiKey: string) {}

  /**
   * Make a chat completion request
   */
  async chatCompletion(request: GroqChatRequest): Promise<GroqChatResponse> {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(
    audioBlob: Blob,
    options: {
      model?: string;
      language?: string;
      temperature?: number;
    } = {}
  ): Promise<{ text: string; language: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', options.model || 'whisper-large-v3-turbo');
    formData.append('language', options.language || 'en');
    formData.append('temperature', (options.temperature || 0).toString());

    const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Transcription API error (${response.status}): ${errorText}`);
    }

    const data: unknown = await response.json();
    const jsonData = data as { text?: string; transcript?: string; language?: string };

    return {
      text: jsonData.text || jsonData.transcript || '',
      language: jsonData.language || options.language || 'en',
    };
  }
}
