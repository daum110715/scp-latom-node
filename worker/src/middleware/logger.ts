import { Context, Next } from 'hono'
import { Logger } from '../utils/logger'
import type { Env } from '../types'

type LoggerContext = Context<{ Bindings: Env; Variables: { logger: Logger } }>

/**
 * Generate a request ID. Uses cf-ray if available, otherwise generates a UUID.
 */
function getRequestId(c: LoggerContext): string {
  return c.req.header('cf-ray') ?? crypto.randomUUID()
}

/**
 * Hono middleware that logs every request/response and attaches a
 * request-scoped Logger to the context as `c.get('logger')`.
 *
 * Logs at `info` level for all requests. 4xx/5xx responses are also
 * persisted to D1 via the logger's warn/error persistence.
 */
export function requestLogger(env: Env): (c: LoggerContext, next: Next) => Promise<void> {
  const baseLogger = new Logger({
    level: (env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ?? 'info',
    db: env.DB,
  })

  return async (c: LoggerContext, next: Next) => {
    const requestId = getRequestId(c)
    const method = c.req.method
    const path = c.req.path
    const userAgent = c.req.header('user-agent') ?? undefined
    const ip =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      undefined

    // Create request-scoped logger and attach to context
    const reqLogger = baseLogger.child({
      request_id: requestId,
      category: 'request',
      path,
      user_agent: userAgent,
      ip,
    })

    c.set('logger', reqLogger)

    const start = Date.now()

    // Log request start
    reqLogger.info(`${method} ${path}`)

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    // Log response
    if (status >= 500) {
      reqLogger.error(`${method} ${path} → ${status} (${duration}ms)`, { status, duration })
    } else if (status >= 400) {
      reqLogger.warn(`${method} ${path} → ${status} (${duration}ms)`, { status, duration })
    } else {
      reqLogger.info(`${method} ${path} → ${status} (${duration}ms)`, { status, duration })
    }

    // Set request ID header for client correlation
    c.res.headers.set('X-Request-Id', requestId)
  }
}
