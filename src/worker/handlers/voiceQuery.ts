import type { Env, VoiceQueryResponse } from '../types/worker';
import { GroqClient } from '../services/groq';
import { sanitizeInput, validateLanguageCode } from '../services/sanitization';
import { LANGUAGE_NAMES, type LanguageCode } from '../../shared/types/languages';

/**
 * Handle voice query requests (chat without images)
 */
export async function handleVoiceQueryRequest(
  request: Request,
  env: Env
): Promise<VoiceQueryResponse> {
  const body = await request.json();

  // Validate inputs
  if (!body.query) {
    throw new Error('Query required');
  }

  const query = sanitizeInput(body.query, 1000);
  const language = validateLanguageCode(body.language) as LanguageCode;

  // Build system prompt
  const languageName = LANGUAGE_NAMES[language];
  const systemPrompt =
    language === 'en'
      ? `You are Augen, an AI vision assistant. The user has asked a voice question but no image is currently being analyzed. Respond helpfully to their query and if they're asking about visual content, politely explain that you need an image to analyze. Be concise and helpful.`
      : `You are Augen, an AI vision assistant. The user has asked a voice question but no image is currently being analyzed. Respond helpfully to their query and if they're asking about visual content, politely explain that you need an image to analyze. Be concise and helpful.\n\nCRITICAL: You MUST respond entirely in ${languageName} language. Do not use English.`;

  // Make Groq API request
  const groqClient = new GroqClient(env.GROQ_API_KEY);

  const groqResponse = await groqClient.chatCompletion({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: query,
      },
    ],
    max_completion_tokens: 300,
    temperature: 0.3,
    top_p: 0.9,
  });

  const responseText =
    groqResponse.choices[0]?.message?.content || 'I could not process your request.';

  return { response: responseText };
}
