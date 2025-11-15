/**
 * Dangerous patterns that indicate prompt injection attempts
 */
const DANGEROUS_PATTERNS = [
  // Direct instruction manipulation
  /ignore\s+(previous|all|above|prior)/gi,
  /forget\s+(everything|all|previous|instructions)/gi,
  /disregard\s+(previous|all|above)/gi,

  // Role manipulation
  /system:/gi,
  /assistant:/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|system\|>/gi,
  /<\|assistant\|>/gi,

  // Command injection
  /override\s+(instructions|settings|rules)/gi,
  /bypass\s+(security|safety|rules)/gi,

  // Privilege escalation keywords
  /\b(admin|root|superuser|sudo)\b/gi,

  // Multiple newlines for role injection
  /\n{3,}/g,

  // Executable commands (basic protection)
  /\bexecute\s+/gi,
  /\beval\s*\(/gi,
  /\brequire\s*\(/gi,
  /\bimport\s+/gi,
];

/**
 * Suspicious keywords that should be logged
 */
const SUSPICIOUS_KEYWORDS = [
  'ignore',
  'forget',
  'disregard',
  'override',
  'bypass',
  'jailbreak',
  'DAN mode',
  'developer mode',
  'god mode',
];

/**
 * Enhanced input sanitization
 * Blocks dangerous patterns and limits input length
 */
export function sanitizeInput(input: unknown, maxLength: number = 1000): string {
  // Type check
  if (typeof input !== 'string') {
    console.warn('Non-string input provided to sanitizeInput');
    return '';
  }

  // Length limit
  let sanitized = input.substring(0, maxLength);

  // Check for dangerous patterns and BLOCK them
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn(`Blocked dangerous pattern: ${pattern.source}`);
      // Remove the matched content
      sanitized = sanitized.replace(pattern, '');
    }
  }

  // Log suspicious keywords (but don't block)
  const lowerInput = sanitized.toLowerCase();
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      console.warn(`Suspicious keyword detected: ${keyword}`);
    }
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Validate and sanitize base64 image data
 */
export function sanitizeBase64Image(base64: unknown): string {
  if (typeof base64 !== 'string') {
    throw new Error('Invalid image data: must be a string');
  }

  // Remove data URL prefix if present
  const cleaned = base64.replace(/^data:image\/[a-z]+;base64,/, '');

  // Validate base64 format
  if (!/^[A-Za-z0-9+/]+=*$/.test(cleaned)) {
    throw new Error('Invalid base64 format');
  }

  // Check size (max ~10MB encoded)
  if (cleaned.length > 13_500_000) {
    throw new Error('Image too large (max 10MB)');
  }

  return cleaned;
}

/**
 * Validate language code
 */
export function validateLanguageCode(lang: unknown): string {
  if (typeof lang !== 'string') {
    return 'en';
  }

  const validLangs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];

  if (validLangs.includes(lang)) {
    return lang;
  }

  console.warn(`Invalid language code: ${lang}, defaulting to 'en'`);
  return 'en';
}

/**
 * Validate and sanitize boolean
 */
export function validateBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return defaultValue;
}

/**
 * Validate and sanitize number
 */
export function validateNumber(
  value: unknown,
  min: number = 0,
  max: number = 1,
  defaultValue: number = 0
): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num)) {
    return defaultValue;
  }

  return Math.max(min, Math.min(max, num));
}
