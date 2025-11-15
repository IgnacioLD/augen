import type { Env, TranscriptionResponse } from '../types/worker';
import { GroqClient } from '../services/groq';
import { validateLanguageCode, validateNumber } from '../services/sanitization';
import type { LanguageCode } from '../../shared/types/languages';

/**
 * Handle audio transcription requests
 */
export async function handleTranscriptionRequest(
  request: Request,
  env: Env
): Promise<TranscriptionResponse> {
  const formData = await request.formData();

  // Get and validate inputs
  const audioFile = formData.get('file');
  if (!audioFile || !(audioFile instanceof Blob)) {
    throw new Error('Audio file required');
  }

  const model = (formData.get('model') as string) || 'whisper-large-v3-turbo';
  const language = validateLanguageCode(formData.get('language')) as LanguageCode;
  const temperatureStr = formData.get('temperature');
  const temperature = validateNumber(temperatureStr ? parseFloat(temperatureStr) : 0, 0, 1, 0);

  // Convert the audio to a Blob
  const audioBuffer = await audioFile.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

  // Make Groq API request
  const groqClient = new GroqClient(env.GROQ_API_KEY);

  const result = await groqClient.transcribeAudio(audioBlob, {
    model,
    language,
    temperature,
  });

  return {
    text: result.text,
    language: result.language as LanguageCode,
  };
}
