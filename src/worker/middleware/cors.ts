import { Env } from '../types/worker';

/**
 * Production allowed origins
 */
const PRODUCTION_ORIGINS = ['https://augen.ignacio.tech', 'https://www.augen.ignacio.tech'];

/**
 * Development allowed origins
 */
const DEVELOPMENT_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173', // Vite default
  'http://127.0.0.1:5173',
];

/**
 * Get allowed origin from request
 * Validates origin against whitelist
 */
export function getCorsOrigin(request: Request, env: Env): string {
  const origin = request.headers.get('Origin');

  if (!origin) {
    // No origin header = same-origin request or direct request
    // Return default production origin
    return PRODUCTION_ORIGINS[0] || 'https://augen.ignacio.tech';
  }

  // Determine allowed origins based on environment
  const allowedOrigins =
    env.ENVIRONMENT === 'production'
      ? PRODUCTION_ORIGINS
      : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];

  // Check if origin is in whitelist
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // Origin not allowed - log and return default
  console.warn(`Rejected origin: ${origin}`);
  return PRODUCTION_ORIGINS[0] || 'https://augen.ignacio.tech';
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request, env: Env): Response {
  const allowedOrigin = getCorsOrigin(request, env);

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string, env: Env): boolean {
  const allowedOrigins =
    env.ENVIRONMENT === 'production'
      ? PRODUCTION_ORIGINS
      : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];

  return allowedOrigins.includes(origin);
}
