import { Context, Next } from 'hono'
import { verifyToken } from '../utils/jwt'
import type { Env, JwtPayload } from '../types'

type AuthContext = Context<{ Bindings: Env; Variables: { user: JwtPayload } }>

export async function authMiddleware(c: AuthContext, next: Next) {
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
  await next()
}
