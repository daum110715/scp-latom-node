import { Context, Next } from 'hono'
import { verifyToken } from '../utils/jwt'
import type { Env, JwtPayload } from '../types'

type AdminContext = Context<{ Bindings: Env; Variables: { user: JwtPayload } }>

/**
 * Admin-only middleware.
 * Verifies JWT and checks that the user has role === 'admin'.
 * Returns 401 for missing/invalid token, 403 for non-admin users.
 */
export async function adminMiddleware(c: AdminContext, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing or invalid authorization header' }, 401)
  }

  const token = header.slice(7)
  const payload = await verifyToken(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401)
  }

  c.set('user', payload)

  if (payload.role !== 'admin') {
    return c.json({ success: false, error: 'Admin access required' }, 403)
  }

  await next()
}
