import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting configuration using Upstash Redis
 *
 * SETUP REQUIRED:
 * 1. Create account at https://upstash.com
 * 2. Create a Redis database
 * 3. Add to .env.local:
 *    UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=your-token-here
 */

// Check if Upstash is configured
const isConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis client only if configured
const redis = isConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Login rate limiter
 * 5 attempts per 15 minutes per IP address
 * Prevents brute force password attacks
 */
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:login',
    })
  : null;

/**
 * API rate limiter
 * 100 requests per minute per user
 * Prevents API abuse and DoS
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * Password reset rate limiter
 * 3 attempts per hour per IP address
 * Prevents email spam and account enumeration
 */
export const passwordResetRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:password-reset',
    })
  : null;

/**
 * User invitation rate limiter
 * 10 invitations per hour per admin user
 * Prevents invitation spam
 */
export const invitationRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: 'ratelimit:invitation',
    })
  : null;

/**
 * Helper to check rate limit and return appropriate response
 *
 * @param identifier - Usually IP address or user ID
 * @param limiter - The rate limiter to use
 * @returns Object with success status and limit info
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}> {
  // If rate limiting is not configured, allow the request
  if (!limiter) {
    console.warn('Rate limiting not configured - allowing request');
    return { success: true };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Example usage in API route:
 *
 * ```typescript
 * import { loginRateLimit, checkRateLimit, getClientIp } from '@/lib/rate-limit';
 *
 * export async function POST(request: Request) {
 *   const ip = getClientIp(request);
 *   const { success, limit, remaining, reset } = await checkRateLimit(ip, loginRateLimit);
 *
 *   if (!success) {
 *     return new Response(
 *       JSON.stringify({ error: 'Too many requests. Please try again later.' }),
 *       {
 *         status: 429,
 *         headers: {
 *           'X-RateLimit-Limit': limit?.toString() || '',
 *           'X-RateLimit-Remaining': remaining?.toString() || '',
 *           'X-RateLimit-Reset': reset?.toString() || '',
 *         }
 *       }
 *     );
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
