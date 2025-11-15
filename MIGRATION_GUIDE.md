# Augen Modernization - Migration Guide

## Overview

This guide documents the modernization of Augen from vanilla JavaScript to a
TypeScript-powered stack with enhanced security, testing, and CI/CD.

## What's Been Completed

### ✅ Phase 1: Foundation & Build System

#### TypeScript Configuration

- **tsconfig.json**: Strict mode enabled for frontend code
- **tsconfig.worker.json**: Cloudflare Workers-specific TypeScript config
- Path aliases configured: `@/`, `@shared/`, `@worker/`

#### Build System (Vite)

- Multi-page bundling (index, about, help, contact)
- Terser minification with console.log removal in production
- Source maps enabled
- Code splitting configured
- Asset optimization (inline < 4KB assets)

#### Code Quality Tools

- **ESLint**: Flat config (v9) with TypeScript support
- **Prettier**: Consistent formatting across TypeScript, JavaScript, JSON, CSS,
  HTML, MD
- **Husky**: Pre-commit hooks with lint-staged
- Git hooks automatically run linting and formatting before commits

#### Testing Infrastructure

- **Vitest**: Unit testing with 60% coverage target
- **Playwright**: E2E testing across Chromium, Firefox, WebKit, Mobile
  Chrome/Safari
- **Browser API mocks**: MediaRecorder, SpeechSynthesis, FileReader,
  AudioContext, localStorage
- Test setup file with comprehensive mocking

### ✅ Phase 2: Security Hardening & Worker Migration

#### TypeScript Worker (src/worker/)

Complete rewrite with modular architecture:

```
src/worker/
├── index.ts              # Main worker entry
├── types/
│   └── worker.d.ts       # Request/response types, Env interface
├── middleware/
│   ├── security.ts       # Security headers (CSP, HSTS, X-Frame-Options, etc.)
│   ├── cors.ts           # Strict CORS validation
│   └── rateLimit.ts      # Durable Object-based rate limiting
├── services/
│   ├── groq.ts           # Groq API client
│   └── sanitization.ts   # Enhanced input validation
└── handlers/
    ├── vision.ts         # Image analysis endpoint
    ├── transcribe.ts     # Audio transcription endpoint
    └── voiceQuery.ts     # Voice chat endpoint
```

#### Security Enhancements

**Rate Limiting** (NEW):

- `/api/analyze`: 20 requests/min (cost: 10 tokens)
- `/api/transcribe`: 30 requests/min (cost: 5 tokens)
- `/api/voice-query`: 60 requests/min (cost: 1 token)
- Durable Objects for distributed rate limiting
- In-memory fallback when Durable Objects unavailable

**Security Headers** (NEW):

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()...
Cache-Control: no-store, no-cache, must-revalidate
```

**Enhanced Input Sanitization** (IMPROVED):

- **Blocks** (not just warns) dangerous prompt injection patterns
- Removes role manipulation attempts (`system:`, `<|im_start|>`, etc.)
- Blocks instruction override attempts
- Base64 image validation (format, size limits)
- Language code validation
- Number/boolean validation with safe defaults

**CORS Validation** (IMPROVED):

- Environment-aware origin whitelisting
- Production vs development origins
- Logs suspicious origin attempts

#### Shared Types

- `src/shared/types/languages.ts`: LanguageCode type, LANGUAGE_NAMES constant

### ✅ Phase 3: CI/CD Pipeline

#### GitHub Actions Workflows

**.github/workflows/ci.yml**:

- Lint & Type Check (ESLint + Prettier + TypeScript)
- Unit Tests with coverage upload (Codecov)
- Frontend build with bundle size reporting
- E2E tests (Playwright) with artifact uploads
- Runs on every push to main/develop and all PRs

**.github/workflows/deploy.yml**:

- Automated Cloudflare Workers deployment
- Automated Cloudflare Pages deployment
- Deployment notifications
- Only runs on main branch push or manual trigger

## Updated Configuration Files

### package.json

New scripts:

```json
{
  "dev": "concurrently \"vite\" \"wrangler dev src/worker/index.ts\"",
  "build": "tsc && vite build",
  "test": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "lint": "eslint src --ext .ts,.js",
  "lint:fix": "eslint src --ext .ts,.js --fix",
  "format": "prettier --write \"**/*.{ts,js,json,css,html,md}\"",
  "type-check": "tsc --noEmit && tsc -p tsconfig.worker.json --noEmit"
}
```

### wrangler.toml

Updated to use TypeScript worker with Durable Objects:

```toml
main = "src/worker/index.ts"

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
script_name = "augen-api"
```

## Migration Path (Not Yet Done)

The following phases are planned but not yet implemented:

### Phase 3: Frontend Refactoring (PENDING)

- Extract services from monolithic `assets/js/script.js`
- Create TypeScript services: AudioService, VisionService, TTSService,
  MorseService
- Create StateManager for type-safe localStorage
- Extract i18n strings to `locales/*.json` files
- Maintain all theme and accessibility features

### Phase 4: Unit Tests (PENDING)

- Write tests for critical functions (~60% coverage target)
- Test image compression, API calls, audio recording, TTS, theme switching
- Test sanitization functions
- Test worker middleware and handlers

### Phase 5: E2E Tests (PENDING)

- Image upload → analysis → TTS flow
- Voice recording flow
- Mode switching tests
- Accessibility keyboard navigation tests

## How to Use the New Stack

### Development

```bash
# Install dependencies
npm install

# Start development (frontend + worker)
npm run dev

# Or start separately:
npm run dev:frontend  # Vite on localhost:8080
npm run dev:worker    # Wrangler on localhost:8787

# Run tests
npm test              # Unit tests (watch mode)
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests

# Code quality
npm run lint          # Check for errors
npm run lint:fix      # Auto-fix errors
npm run format        # Format all files
npm run type-check    # TypeScript validation
```

### Production Build

```bash
# Build frontend
npm run build         # Output: dist/

# Build worker
npm run build:worker  # Deploys to Cloudflare

# Build both
npm run deploy
```

### Setting Up CI/CD

**Required GitHub Secrets**:

1. `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers & Pages
   permissions
2. `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

**Optional**: Configure Codecov for coverage reports

### Setting Up Durable Objects

First deployment requires creating Durable Object classes:

```bash
# Create the rate limiter Durable Object
wrangler deployments list  # Verify deployment

# Durable Objects are automatically created on first deployment
# No manual migration needed
```

## Breaking Changes

### For Developers

1. **Worker file location changed**:
   - OLD: `src/worker/worker.js`
   - NEW: `src/worker/index.ts`

2. **CORS origins now environment-aware**:
   - Set `ENVIRONMENT=production` in Cloudflare Workers env vars for production

3. **Rate limiting is now enforced**:
   - Exceeding limits returns `429 Too Many Requests`
   - Adjust limits in `src/worker/middleware/rateLimit.ts` if needed

4. **Input sanitization now blocks dangerous patterns**:
   - Prompt injection attempts are removed, not just logged
   - May affect edge cases with legitimate input containing keywords

### For End Users

**No breaking changes** - The frontend HTML/CSS/JS remains untouched in Phase
1-2. All changes are backend/tooling improvements.

## Security Improvements Summary

| Feature            | Before           | After                                   |
| ------------------ | ---------------- | --------------------------------------- |
| Rate Limiting      | ❌ None          | ✅ Durable Object-based (20-60 req/min) |
| Security Headers   | ❌ CORS only     | ✅ CSP, HSTS, X-Frame-Options, etc.     |
| Input Sanitization | ⚠️ Logs warnings | ✅ Blocks dangerous patterns            |
| CORS Validation    | ⚠️ Basic         | ✅ Environment-aware whitelist          |
| Type Safety        | ❌ JavaScript    | ✅ TypeScript strict mode               |
| Error Handling     | ⚠️ Basic         | ✅ Typed errors with stack traces       |

## Performance Improvements

| Metric         | Before            | After                        |
| -------------- | ----------------- | ---------------------------- |
| Bundle Size    | 72KB (unminified) | ~40KB (minified + gzipped)   |
| Console Logs   | 43 in production  | 0 in production (removed)    |
| Build Process  | None              | Optimized with Vite + Terser |
| Code Splitting | No                | Yes (lazy loading ready)     |
| Source Maps    | No                | Yes (debugging)              |

## Testing Coverage Goals

- **Unit Tests**: 60% coverage minimum
  - Focus: services, utils, sanitization, handlers
- **Integration Tests**: Key user flows
  - Image analysis, voice recording, mode switching
- **E2E Tests**: Critical paths
  - Upload → analyze → TTS, accessibility navigation

## Next Steps

To complete the modernization:

1. **Extract frontend services** (Phase 3)
   - Refactor `assets/js/script.js` into TypeScript modules
   - Create i18n JSON files from embedded strings

2. **Write unit tests** (Phase 4)
   - Achieve 60% coverage
   - Test all middleware, handlers, services

3. **Add E2E tests** (Phase 5)
   - Test complete user flows
   - Accessibility testing with axe-playwright

4. **Deploy and monitor**
   - Set up Cloudflare secrets
   - Configure GitHub Actions
   - Monitor error rates

## Rollback Plan

If issues arise:

1. **Immediate**: Change `wrangler.toml` back to `worker.js`
2. **Deploy**: `wrangler deploy src/worker/worker.js`
3. **Verify**: Check `/api/health` endpoint

The old worker file remains untouched, allowing instant rollback.

## Support

- **Issues**: https://github.com/sortedmess/augen/issues
- **Documentation**: See README.md for user-facing docs
- **Contributing**: See CONTRIBUTING.md

---

**Status**: Phase 1 & 2 Complete ✅ | Phase 3-5 Pending ⏳
