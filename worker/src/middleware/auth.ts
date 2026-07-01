import { Context, Next } from 'hono'
import { verifyToken } from '../utils/jwt'
import type { Env, JwtPayload } from '../types'

type AuthContext = Context<{ Bindings: Env; Variables: { user: JwtPayload } }>

const AUTH_COOKIE = 'scp_auth_token'

/**
 * Extract JWT from the httpOnly cookie, falling back to the Authorization
 * header for backward compatibility (e.g. server-to-server calls).
 */
function extractToken(c: AuthContext): string | undefined {
  // 1. Try cookie (primary — set by the browser on login)
  const cookie = c.req.header('Cookie')
  if (cookie) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]+)`))
    if (match?.[1]) return match[1]
  }
  // 2. Fall back to Authorization header (for non-browser clients)
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return undefined
}

export async function authMiddleware(c: AuthContext, next: Next): Promise<Response | void> {
  const token = extractToken(c)
  if (!token) {
    return c.json({ success: false, error: 'Authentication required' }, 401)
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401)
  }

  c.set('user', payload)
  await next()
}
