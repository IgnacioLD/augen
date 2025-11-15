import type { Env, VisionResponse } from '../types/worker';
import { GroqClient } from '../services/groq';
import {
  sanitizeInput,
  sanitizeBase64Image,
  validateLanguageCode,
  validateBoolean,
} from '../services/sanitization';
import { LANGUAGE_NAMES, type LanguageCode } from '../../shared/types/languages';

/**
 * Handle vision analysis requests
 */
export async function handleVisionRequest(request: Request, env: Env): Promise<VisionResponse> {
  const body = await request.json();

  // Validate and sanitize inputs
  if (!body.image) {
    throw new Error('Image data required');
  }

  const image = sanitizeBase64Image(body.image);
  const fullDescription = validateBoolean(body.fullDescription, false);
  const language = validateLanguageCode(body.language) as LanguageCode;
  const customPrompt = body.customPrompt ? sanitizeInput(body.customPrompt, 1000) : null;

  // Build the prompt
  const languageName = LANGUAGE_NAMES[language];
  let prompt: string;

  if (customPrompt) {
    // Use custom prompt for voice queries
    prompt =
      language === 'en'
        ? customPrompt
        : `${customPrompt}\n\nCRITICAL: You MUST respond entirely in ${languageName} language. Do not use English. All descriptions, explanations, and text must be in ${languageName} only.`;
  } else {
    // Use standard prompts for regular image analysis
    const basePrompt = fullDescription
      ? "Describe this image in complete detail. If it contains text (like a menu, sign, or document), read all the text clearly and completely. If it's a scene, describe everything you see in detail. Be thorough and comprehensive as this will be read aloud to a visually impaired person.\n\nIMPORTANT FOR NUMBERS: When you encounter phone numbers (like 654123123), format them as individual digits (6 5 4 1 2 3 1 2 3) for proper text-to-speech reading. For prices and currency, say the amount normally (like 'twenty-five dollars' instead of '2 5 dollar sign'). For large ID numbers or codes, break them into groups."
      : "Provide a concise summary of this image. If it contains text (like a menu, sign, or document), give me the key information and main points only. If it's a scene, describe the most important elements. Keep it brief but informative for a visually impaired person.\n\nIMPORTANT FOR NUMBERS: When you encounter phone numbers (like 654123123), format them as individual digits (6 5 4 1 2 3 1 2 3) for proper text-to-speech reading. For prices and currency, say the amount normally (like 'twenty-five dollars'). For large ID numbers, break them into groups.";

    prompt =
      language === 'en'
        ? basePrompt
        : `${basePrompt}\n\nCRITICAL: You MUST respond entirely in ${languageName} language. Do not use English. All descriptions, explanations, and text must be in ${languageName} only.`;
  }

  // Make Groq API request
  const groqClient = new GroqClient(env.GROQ_API_KEY);

  const response = await groqClient.chatCompletion({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
            },
          },
        ],
      },
    ],
    max_completion_tokens: fullDescription ? 1500 : 500,
    temperature: 0.3,
    top_p: 0.9,
  });

  const description = response.choices[0]?.message?.content || 'No description available';

  return { description };
}
