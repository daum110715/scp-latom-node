import type { D1Database } from '@cloudflare/workers-types'

// ─── Types ────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogCategory = 'request' | 'auth' | 'crawler' | 'system' | 'client'

export interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  request_id?: string
  user_id?: number
  source: 'server' | 'client'
  category?: LogCategory
  path?: string
  user_agent?: string
  ip?: string
}

export interface LoggerOptions {
  level?: LogLevel
  source?: 'server' | 'client'
  db?: D1Database
}

interface ChildContext {
  request_id?: string
  user_id?: number
  category?: LogCategory
  path?: string
  user_agent?: string
  ip?: string
}

// ─── Constants ────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const DEFAULT_LEVEL: LogLevel = 'info'

// ─── Logger ───────────────────────────────────────────────

export class Logger {
  private level: LogLevel
  private source: 'server' | 'client'
  private db?: D1Database
  private parent?: Logger
  private childCtx: ChildContext

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? DEFAULT_LEVEL
    this.source = options.source ?? 'server'
    this.db = options.db
    this.childCtx = {}
  }

  /**
   * Create a child logger with additional context (request ID, user, etc.).
   * Child loggers inherit the parent's level and DB reference.
   */
  child(context: ChildContext): Logger {
    const child = new Logger({
      level: this.level,
      source: this.source,
      db: this.db,
    })
    child.parent = this
    child.childCtx = { ...this.childCtx, ...context }
    return child
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }

  // ─── Private ──────────────────────────────────────────

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level]
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      source: this.source,
      ...this.childCtx,
    }

    if (context && Object.keys(context).length > 0) {
      // Serialize Error objects to plain objects
      entry.context = serializeContext(context)
    }

    // Always output to console (structured JSON for Workers log drain)
    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    consoleFn(JSON.stringify(entry))

    // Persist warn/error to D1 if available (fire-and-forget)
    if (this.db && (level === 'warn' || level === 'error')) {
      this.persistToDb(entry).catch(() => {
        // Silently ignore DB write failures — we don't want logging to cause errors
      })
    }
  }

  private async persistToDb(entry: LogEntry): Promise<void> {
    if (!this.db) return

    try {
      await this.db.prepare(
        `INSERT INTO system_logs (level, message, context, request_id, user_id, source, category, path, user_agent, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        entry.level,
        entry.message,
        entry.context ? JSON.stringify(entry.context) : null,
        entry.request_id ?? null,
        entry.user_id ?? null,
        entry.source,
        entry.category ?? null,
        entry.path ?? null,
        entry.user_agent ?? null,
        entry.ip ?? null,
      ).run()
    } catch {
      // Swallow — logging must never throw
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────

/**
 * Serialize context values so Error objects become readable strings.
 */
function serializeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (value instanceof Error) {
      result[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
    } else if (typeof value === 'object' && value !== null) {
      // Keep plain objects and arrays as-is (they'll JSON.stringify fine)
      result[key] = value
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Create a logger from a Hono context variable (for use in route handlers).
 */
export function getLoggerFromContext(c: { get: (key: string) => unknown }): Logger {
  return (c.get('logger') as Logger) ?? new Logger()
}
