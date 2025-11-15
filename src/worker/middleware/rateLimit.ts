import { Env, RateLimitResult } from '../types/worker';

/**
 * Rate limit configuration per endpoint
 */
export const RATE_LIMITS: Record<
  string,
  {
    requests: number;
    window: number; // in seconds
    cost: number; // cost per request
  }
> = {
  '/api/analyze': {
    requests: 20, // 20 requests per minute
    window: 60,
    cost: 10, // Vision is expensive
  },
  '/api/transcribe': {
    requests: 30, // 30 requests per minute
    window: 60,
    cost: 5,
  },
  '/api/voice-query': {
    requests: 60, // 60 requests per minute
    window: 60,
    cost: 1,
  },
};

/**
 * Simple in-memory rate limiter fallback
 * Use when Durable Objects are not available
 */
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();

  check(key: string, limit: number, window: number, cost: number): RateLimitResult {
    const now = Date.now();
    const record = this.requests.get(key);

    // Clean up expired entries
    if (record && record.resetAt < now) {
      this.requests.delete(key);
    }

    const current = this.requests.get(key) || {
      count: 0,
      resetAt: now + window * 1000,
    };

    if (current.count + cost > limit) {
      return {
        success: false,
        limit,
        remaining: Math.max(0, limit - current.count),
        resetAt: current.resetAt,
      };
    }

    current.count += cost;
    this.requests.set(key, current);

    return {
      success: true,
      limit,
      remaining: limit - current.count,
      resetAt: current.resetAt,
    };
  }
}

// Global instance for fallback
const inMemoryLimiter = new InMemoryRateLimiter();

/**
 * Check rate limit for a request
 * Uses Durable Objects if available, falls back to in-memory
 */
export async function checkRateLimit(
  request: Request,
  endpoint: string,
  env: Env
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint];

  if (!config) {
    // No rate limit configured for this endpoint
    return { success: true };
  }

  // Get client IP (Cloudflare provides this)
  const ip =
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

  const key = `${ip}:${endpoint}`;

  // Try using Durable Object if available
  if (env.RATE_LIMITER) {
    try {
      const id = env.RATE_LIMITER.idFromName(key);
      const stub = env.RATE_LIMITER.get(id);

      const response = await stub.fetch('http://limiter/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          limit: config.requests,
          window: config.window,
          cost: config.cost,
        }),
      });

      return await response.json();
    } catch (error) {
      console.warn('Rate limiter error, falling back to in-memory:', error);
    }
  }

  // Fallback to in-memory rate limiter
  return inMemoryLimiter.check(key, config.requests, config.window, config.cost);
}

/**
 * Durable Object for distributed rate limiting
 * This allows rate limiting across multiple worker instances
 */
export class RateLimiter implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { key, limit, window, cost } = await request.json<{
      key: string;
      limit: number;
      window: number;
      cost: number;
    }>();

    const now = Date.now();
    const record = await this.state.storage.get<{ count: number; resetAt: number }>(key);

    // Check if record exists and is still valid
    if (record && record.resetAt > now) {
      // Record exists and is valid
      if (record.count + cost > limit) {
        // Rate limit exceeded
        return Response.json({
          success: false,
          limit,
          remaining: Math.max(0, limit - record.count),
          resetAt: record.resetAt,
        });
      }

      // Update count
      record.count += cost;
      await this.state.storage.put(key, record);

      return Response.json({
        success: true,
        limit,
        remaining: limit - record.count,
        resetAt: record.resetAt,
      });
    }

    // Create new record
    const newRecord = {
      count: cost,
      resetAt: now + window * 1000,
    };

    await this.state.storage.put(key, newRecord);

    // Schedule cleanup
    await this.state.storage.setAlarm(newRecord.resetAt);

    return Response.json({
      success: true,
      limit,
      remaining: limit - cost,
      resetAt: newRecord.resetAt,
    });
  }

  async alarm(): Promise<void> {
    // Clean up expired records
    const now = Date.now();
    const entries = await this.state.storage.list();

    for (const [key, value] of entries) {
      const record = value as { count: number; resetAt: number };
      if (record.resetAt < now) {
        await this.state.storage.delete(key);
      }
    }
  }
}
