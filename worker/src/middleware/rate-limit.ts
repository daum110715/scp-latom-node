import type { Context, Next } from 'hono'
import type { Env, RateLimitConfig } from '../types'
import { checkRateLimit, extractIp } from '../utils/rate-limit'

/**
 * Hono middleware factory for IP-based rate limiting.
 *
 * Usage:
 *   app.post('/login', rateLimit({ windowSec: 900, max: 20, action: 'login' }), handler)
 *
 * Sets standard rate-limit response headers:
 *   - X-RateLimit-Limit     — max attempts allowed in the window
 *   - X-RateLimit-Remaining — attempts remaining
 *   - X-RateLimit-Reset     — Unix timestamp when the window resets
 *   - Retry-After           — seconds to wait (only on 429)
 */
export function rateLimit(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = extractIp(c.req.raw.headers)
    const result = await checkRateLimit(c.env.DB, ip, null, config)

    // Always set informational headers
    c.header('X-RateLimit-Limit', config.max.toString())
    c.header('X-RateLimit-Remaining', result.remaining.toString())

    if (!result.allowed) {
      const resetAt = Math.floor(Date.now() / 1000) + result.retryAfter
      c.header('X-RateLimit-Reset', resetAt.toString())
      c.header('Retry-After', result.retryAfter.toString())

      return c.json(
        {
          success: false,
          error: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        429,
      )
    }

    await next()
  }
}
