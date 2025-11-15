/**
 * Security headers middleware
 * Adds comprehensive security headers to all responses
 */
export function addSecurityHeaders(response: Response, allowedOrigin: string): Response {
  const headers = new Headers(response.headers);

  // CORS headers
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  // Note: Kept lenient for API responses (JSON only)
  headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  );

  // Strict Transport Security (HTTPS only)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Permissions Policy
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Cache control for API responses
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create JSON response with security headers
 */
export function createSecureJsonResponse(
  data: unknown,
  allowedOrigin: string,
  status: number = 200
): Response {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return addSecurityHeaders(response, allowedOrigin);
}

/**
 * Create error response with security headers
 */
export function createSecureErrorResponse(
  error: string,
  allowedOrigin: string,
  status: number = 500,
  details?: string
): Response {
  const errorData = details ? { error, details } : { error };
  return createSecureJsonResponse(errorData, allowedOrigin, status);
}
