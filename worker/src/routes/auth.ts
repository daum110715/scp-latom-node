import { Hono } from 'hono'
import { hashPassword, verifyPassword } from '../utils/password'
import { signToken } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { getLoggerFromContext } from '../utils/logger'
import {
  extractIp,
  checkRateLimit,
  checkAccountLockout,
  recordAttempt,
  getProgressiveDelay,
  sleep,
} from '../utils/rate-limit'
import type { Env, User, UserPublic, RateLimitConfig, DelayThreshold } from '../types'

const auth = new Hono<{ Bindings: Env }>()

// ─── Validation ───────────────────────────────────────────

const CODENAME_RE = /^[a-zA-Z0-9_]{3,32}$/
const MIN_PWD_LEN = 8
const MAX_PWD_LEN = 128

function validateCodename(codename: string): string | null {
  if (!codename || !CODENAME_RE.test(codename)) {
    return 'Codename must be 3-32 characters, alphanumeric or underscore only'
  }
  return null
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PWD_LEN || password.length > MAX_PWD_LEN) {
    return `Password must be ${MIN_PWD_LEN}-${MAX_PWD_LEN} characters`
  }
  return null
}

function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    codename: user.codename,
    role: user.role,
    clearance: user.clearance,
    created_at: user.created_at,
  }
}

// ─── Rate Limit Configs ───────────────────────────────────

/** IP-based rate limit for registration attempts */
const REGISTER_IP_LIMIT: RateLimitConfig = {
  windowSec: 3600, // 1 hour
  max: 10, // 10 attempts per hour per IP
  action: 'register',
}

/** IP-based rate limit for login attempts */
const LOGIN_IP_LIMIT: RateLimitConfig = {
  windowSec: 900, // 15 minutes
  max: 20, // 20 attempts per 15 min per IP
  action: 'login',
}

/** Account-level lockout for failed login attempts per codename+IP */
const LOGIN_ACCOUNT_LOCKOUT: RateLimitConfig = {
  windowSec: 900, // 15 minutes
  max: 5, // 5 failed attempts per codename per 15 min
  action: 'login_fail',
}

/** IP-based rate limit for profile password change attempts */
const PROFILE_IP_LIMIT: RateLimitConfig = {
  windowSec: 900, // 15 minutes
  max: 10, // 10 attempts per 15 min per IP
  action: 'password_change',
}

/** Account-level lockout for failed password change attempts per user+IP */
const PROFILE_ACCOUNT_LOCKOUT: RateLimitConfig = {
  windowSec: 900, // 15 minutes
  max: 5, // 5 failed attempts per user per 15 min
  action: 'password_change_fail',
}

/** Progressive delay thresholds for login */
const LOGIN_DELAY_THRESHOLDS: DelayThreshold[] = [
  { afterAttempts: 3, delaySec: 2 },
  { afterAttempts: 5, delaySec: 5 },
  { afterAttempts: 8, delaySec: 10 },
  { afterAttempts: 12, delaySec: 30 },
]

/** Progressive delay thresholds for registration */
const REGISTER_DELAY_THRESHOLDS: DelayThreshold[] = [
  { afterAttempts: 3, delaySec: 3 },
  { afterAttempts: 5, delaySec: 10 },
  { afterAttempts: 8, delaySec: 30 },
]

/** Progressive delay thresholds for profile password change */
const PROFILE_DELAY_THRESHOLDS: DelayThreshold[] = [
  { afterAttempts: 3, delaySec: 2 },
  { afterAttempts: 5, delaySec: 5 },
  { afterAttempts: 8, delaySec: 10 },
]

// ─── POST /api/auth/register ──────────────────────────────

auth.post('/register', rateLimit(REGISTER_IP_LIMIT), async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'auth' })
  const ip = extractIp(c.req.raw.headers)
  const body = await c.req.json<{ codename?: string; password?: string }>()
  const codename = body.codename?.trim()
  const password = body.password ?? ''

  // ── Input validation ──
  const codenameErr = validateCodename(codename ?? '')
  if (codenameErr) {
    await recordAttempt(c.env.DB, ip, null, 'register_fail')
    return c.json({ success: false, error: codenameErr }, 400)
  }

  const pwdErr = validatePassword(password)
  if (pwdErr) {
    await recordAttempt(c.env.DB, ip, null, 'register_fail')
    return c.json({ success: false, error: pwdErr }, 400)
  }

  // ── Progressive delay (based on IP failure count) ──
  const ipFails = await checkRateLimit(c.env.DB, ip, null, {
    ...REGISTER_IP_LIMIT,
    action: 'register_fail',
  })
  const delay = getProgressiveDelay(ipFails.total, REGISTER_DELAY_THRESHOLDS)
  if (delay > 0) {
    logger.warn('Registration progressive delay applied', { ip, delay, failures: ipFails.total })
    await sleep(delay * 1000)
  }

  // ── Check if codename exists ──
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE codename = ?')
    .bind(codename)
    .first()
  if (existing) {
    await recordAttempt(c.env.DB, ip, codename ?? null, 'register_fail')
    logger.warn('Registration failed: codename already taken', { codename, ip })
    return c.json({ success: false, error: 'Codename already taken' }, 409)
  }

  // ── Create user ──
  const hashed = await hashPassword(password)
  const result = await c.env.DB.prepare(
    'INSERT INTO users (codename, password) VALUES (?, ?) RETURNING *',
  )
    .bind(codename, hashed)
    .first<User>()

  if (!result) {
    logger.error('Registration failed: DB insert returned no result', { codename })
    return c.json({ success: false, error: 'Registration failed' }, 500)
  }

  const token = await signToken(
    { sub: result.id, codename: result.codename, role: result.role, clearance: result.clearance },
    c.env.JWT_SECRET,
  )

  logger.info('User registered', { userId: result.id, codename: result.codename, ip })
  return c.json({ success: true, user: toPublic(result), token }, 201)
})

// ─── POST /api/auth/login ─────────────────────────────────

auth.post('/login', rateLimit(LOGIN_IP_LIMIT), async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'auth' })
  const ip = extractIp(c.req.raw.headers)
  const body = await c.req.json<{ codename?: string; password?: string }>()
  const codename = body.codename?.trim()
  const password = body.password ?? ''

  if (!codename || !password) {
    return c.json({ success: false, error: 'Codename and password are required' }, 400)
  }

  // ── Account lockout check (per codename+IP) ──
  const lockout = await checkAccountLockout(c.env.DB, ip, codename, LOGIN_ACCOUNT_LOCKOUT)
  if (!lockout.allowed) {
    logger.warn('Login blocked: account locked out', {
      codename,
      ip,
      retryAfter: lockout.retryAfter,
    })
    return c.json(
      {
        success: false,
        error: `Too many failed login attempts for this account. Please try again in ${lockout.retryAfter} seconds.`,
        retryAfter: lockout.retryAfter,
      },
      429,
    )
  }

  // ── Progressive delay (based on codename+IP failure count) ──
  const delay = getProgressiveDelay(lockout.total, LOGIN_DELAY_THRESHOLDS)
  if (delay > 0) {
    logger.warn('Login progressive delay applied', { codename, ip, delay, failures: lockout.total })
    await sleep(delay * 1000)
  }

  // ── Look up user ──
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE codename = ?')
    .bind(codename)
    .first<User>()

  if (!user) {
    await recordAttempt(c.env.DB, ip, codename, 'login_fail')
    logger.warn('Login failed: user not found', { codename, ip })
    return c.json({ success: false, error: 'Invalid codename or password' }, 401)
  }

  // ── Verify password ──
  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    await recordAttempt(c.env.DB, ip, codename, 'login_fail')
    logger.warn('Login failed: invalid password', { codename, userId: user.id, ip })
    return c.json({ success: false, error: 'Invalid codename or password' }, 401)
  }

  // ── Success ──
  const token = await signToken(
    { sub: user.id, codename: user.codename, role: user.role, clearance: user.clearance },
    c.env.JWT_SECRET,
  )

  logger.info('User logged in', { userId: user.id, codename: user.codename, ip })
  return c.json({ success: true, user: toPublic(user), token })
})

// ─── GET /api/auth/me ─────────────────────────────────────

auth.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user')
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<User>()

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404)
  }

  return c.json({ success: true, user: toPublic(user) })
})

// ─── PUT /api/auth/profile ────────────────────────────────

auth.put('/profile', authMiddleware, rateLimit(PROFILE_IP_LIMIT), async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'auth' })
  const ip = extractIp(c.req.raw.headers)
  const payload = c.get('user')
  const body = await c.req.json<{ codename?: string; password?: string; newPassword?: string }>()

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<User>()

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404)
  }

  // ── Password change: rate-limited ──
  if (body.newPassword) {
    if (!body.password) {
      return c.json({ success: false, error: 'Current password is required to set a new one' }, 400)
    }

    // Account lockout check (per user+IP)
    const lockout = await checkAccountLockout(
      c.env.DB,
      ip,
      String(user.id),
      PROFILE_ACCOUNT_LOCKOUT,
    )
    if (!lockout.allowed) {
      logger.warn('Password change blocked: account locked out', {
        userId: user.id,
        ip,
        retryAfter: lockout.retryAfter,
      })
      return c.json(
        {
          success: false,
          error: `Too many failed password attempts. Please try again in ${lockout.retryAfter} seconds.`,
          retryAfter: lockout.retryAfter,
        },
        429,
      )
    }

    // Progressive delay
    const delay = getProgressiveDelay(lockout.total, PROFILE_DELAY_THRESHOLDS)
    if (delay > 0) {
      logger.warn('Password change progressive delay applied', {
        userId: user.id,
        ip,
        delay,
        failures: lockout.total,
      })
      await sleep(delay * 1000)
    }

    // Verify current password
    const valid = await verifyPassword(body.password, user.password)
    if (!valid) {
      await recordAttempt(c.env.DB, ip, String(user.id), 'password_change_fail')
      logger.warn('Profile update failed: incorrect current password', { userId: user.id, ip })
      return c.json({ success: false, error: 'Current password is incorrect' }, 401)
    }

    const pwdErr = validatePassword(body.newPassword)
    if (pwdErr) return c.json({ success: false, error: pwdErr }, 400)
  }

  // ── Codename change: check uniqueness ──
  if (body.codename && body.codename !== user.codename) {
    const codenameErr = validateCodename(body.codename)
    if (codenameErr) return c.json({ success: false, error: codenameErr }, 400)
    const taken = await c.env.DB.prepare('SELECT id FROM users WHERE codename = ? AND id != ?')
      .bind(body.codename, user.id)
      .first()
    if (taken) {
      return c.json({ success: false, error: 'Codename already taken' }, 409)
    }
  }

  // ── Apply update ──
  const newCodename = body.codename ?? user.codename
  const newHashedPwd = body.newPassword ? await hashPassword(body.newPassword) : user.password

  const updated = await c.env.DB.prepare(
    "UPDATE users SET codename = ?, password = ?, updated_at = datetime('now') WHERE id = ? RETURNING *",
  )
    .bind(newCodename, newHashedPwd, user.id)
    .first<User>()

  if (!updated) {
    logger.error('Profile update failed: DB update returned no result', { userId: user.id })
    return c.json({ success: false, error: 'Update failed' }, 500)
  }

  logger.info('Profile updated', { userId: updated.id, codename: updated.codename, ip })
  return c.json({ success: true, user: toPublic(updated) })
})

export default auth
