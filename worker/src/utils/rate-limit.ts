import type { D1Database } from '@cloudflare/workers-types'
import type { RateLimitConfig, RateLimitResult, DelayThreshold } from '../types'

// ─── Key Builder ──────────────────────────────────────────

/**
 * Build a composite key for rate limit lookups.
 * Format: "action:ip" (IP-only) or "action:ip:identifier" (account-level).
 */
export function buildKey(action: string, ip: string, identifier?: string | null): string {
  const base = `${action}:${ip}`
  return identifier ? `${base}:${identifier}` : base
}

// ─── IP Extraction ────────────────────────────────────────

/**
 * Extract the real client IP from request headers.
 * Cloudflare sets `cf-connecting-ip` on every request.
 */
export function extractIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

// ─── Check Rate Limit ─────────────────────────────────────

/**
 * Check whether an action is allowed under the rate limit.
 * Counts rows in `rate_limits` matching the key within the sliding window.
 */
export async function checkRateLimit(
  db: D1Database,
  ip: string,
  identifier: string | null,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = buildKey(config.action, ip, identifier)
  const windowStart = `datetime('now', '-${config.windowSec} seconds')`

  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND created_at >= ${windowStart}`,
    )
    .bind(key)
    .first<{ count: number }>()

  const total = row?.count ?? 0
  const remaining = Math.max(0, config.max - total)
  const allowed = total < config.max

  // If blocked, calculate when the oldest attempt in the window expires
  let retryAfter = 0
  if (!allowed) {
    const oldest = await db
      .prepare(`SELECT created_at FROM rate_limits WHERE key = ? ORDER BY created_at ASC LIMIT 1`)
      .bind(key)
      .first<{ created_at: string }>()

    if (oldest) {
      const expiresAt = new Date(oldest.created_at).getTime() + config.windowSec * 1000
      retryAfter = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
    }
  }

  return { allowed, remaining, retryAfter, total }
}

// ─── Record Attempt ───────────────────────────────────────

/**
 * Record a rate-limited attempt (success or failure).
 */
export async function recordAttempt(
  db: D1Database,
  ip: string,
  identifier: string | null,
  action: string,
): Promise<void> {
  const key = buildKey(action, ip, identifier)

  // Fire-and-forget: insert the attempt record
  await db
    .prepare('INSERT INTO rate_limits (key, action, ip, identifier) VALUES (?, ?, ?, ?)')
    .bind(key, action, ip, identifier ?? null)
    .run()

  // Prune old rows to keep the table bounded (best-effort)
  cleanupOldRecords(db, action).catch(() => {
    // Swallow — cleanup is best-effort
  })
}

// ─── Progressive Delay ────────────────────────────────────

/**
 * Calculate the progressive delay (in seconds) based on failure count.
 * Returns 0 if no threshold is exceeded.
 *
 * Example: thresholds = [{ afterAttempts: 3, delaySec: 2 }, { afterAttempts: 5, delaySec: 5 }]
 *   - 2 failures → 0s delay
 *   - 3 failures → 2s delay
 *   - 6 failures → 5s delay
 */
export function getProgressiveDelay(failCount: number, thresholds: DelayThreshold[]): number {
  let delay = 0
  for (const t of thresholds) {
    if (failCount >= t.afterAttempts) {
      delay = t.delaySec
    }
  }
  return delay
}

/**
 * Sleep for the given milliseconds. Used for progressive delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Account Lockout Check ────────────────────────────────

/**
 * Check if a specific account/IP combination is locked out.
 * Counts failed attempts (action ending in `_fail`) within the window.
 */
export async function checkAccountLockout(
  db: D1Database,
  ip: string,
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  return checkRateLimit(db, ip, identifier, config)
}

// ─── Cleanup ──────────────────────────────────────────────

/**
 * Prune rate_limits rows older than the longest configured window.
 * Best-effort, runs asynchronously after each recordAttempt.
 */
async function cleanupOldRecords(db: D1Database, action: string): Promise<void> {
  // Keep at most 24 hours of data per action
  await db
    .prepare(
      "DELETE FROM rate_limits WHERE action = ? AND created_at < datetime('now', '-86400 seconds')",
    )
    .bind(action)
    .run()
}
