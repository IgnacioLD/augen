/**
 * Augen API Worker
 * TypeScript-powered Cloudflare Workers backend with enhanced security
 */

import type { Env, HealthResponse } from './types/worker';
import { getCorsOrigin, handleCorsPreflightRequest } from './middleware/cors';
import { createSecureJsonResponse, createSecureErrorResponse } from './middleware/security';
import { checkRateLimit, RateLimiter } from './middleware/rateLimit';
import { handleVisionRequest } from './handlers/vision';
import { handleTranscriptionRequest } from './handlers/transcribe';
import { handleVoiceQueryRequest } from './handlers/voiceQuery';

// Export the Durable Object for rate limiting
export { RateLimiter };

/**
 * Main worker export
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const allowedOrigin = getCorsOrigin(request, env);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request, env);
    }

    const url = new URL(request.url);

    try {
      // Health check endpoint
      if (url.pathname === '/api/health') {
        const healthData: HealthResponse = {
          status: 'ok',
          timestamp: Date.now(),
          version: '2.0.0-ts',
        };
        return createSecureJsonResponse(healthData, allowedOrigin);
      }

      // Check rate limit for API endpoints
      if (url.pathname.startsWith('/api/')) {
        const rateLimitResult = await checkRateLimit(request, url.pathname, env);

        if (!rateLimitResult.success) {
          return createSecureErrorResponse(
            'Rate limit exceeded',
            allowedOrigin,
            429,
            `Limit: ${rateLimitResult.limit}, Try again at: ${new Date(rateLimitResult.resetAt || 0).toISOString()}`
          );
        }
      }

      // Vision API endpoint
      if (url.pathname === '/api/analyze' && request.method === 'POST') {
        const result = await handleVisionRequest(request, env);
        return createSecureJsonResponse(result, allowedOrigin);
      }

      // Transcription API endpoint
      if (url.pathname === '/api/transcribe' && request.method === 'POST') {
        const result = await handleTranscriptionRequest(request, env);
        return createSecureJsonResponse(result, allowedOrigin);
      }

      // Voice query API endpoint
      if (url.pathname === '/api/voice-query' && request.method === 'POST') {
        const result = await handleVoiceQueryRequest(request, env);
        return createSecureJsonResponse(result, allowedOrigin);
      }

      // 404 for unknown endpoints
      return createSecureErrorResponse('Endpoint not found', allowedOrigin, 404);
    } catch (error) {
      // Global error handler
      console.error('Worker error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      const errorDetails = error instanceof Error ? error.stack : undefined;

      return createSecureErrorResponse(errorMessage, allowedOrigin, 500, errorDetails);
    }
  },
};
