import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Logger } from '../logger'

// Mock D1Database
function createMockDb() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  } as unknown as D1Database
}

describe('Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('log levels', () => {
    it('respects level filtering — debug messages are skipped at info level', () => {
      const logger = new Logger({ level: 'info' })
      logger.debug('should not appear')
      expect(console.log).not.toHaveBeenCalled()
    })

    it('logs info messages at info level', () => {
      const logger = new Logger({ level: 'info' })
      logger.info('test message')
      expect(console.log).toHaveBeenCalledOnce()
    })

    it('logs warn messages at info level', () => {
      const logger = new Logger({ level: 'info' })
      logger.warn('test warning')
      expect(console.warn).toHaveBeenCalledOnce()
    })

    it('logs error messages at any level', () => {
      const logger = new Logger({ level: 'error' })
      logger.error('test error')
      expect(console.error).toHaveBeenCalledOnce()
    })

    it('does not log info when level is warn', () => {
      const logger = new Logger({ level: 'warn' })
      logger.info('should not appear')
      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('structured output', () => {
    it('outputs valid JSON with required fields', () => {
      const logger = new Logger({ level: 'info' })
      logger.info('test message')

      const output = JSON.parse((console.log as any).mock.calls[0][0])
      expect(output).toMatchObject({
        level: 'info',
        message: 'test message',
        source: 'server',
      })
    })

    it('includes context when provided', () => {
      const logger = new Logger({ level: 'info' })
      logger.info('test', { key: 'value', count: 42 })

      const output = JSON.parse((console.log as any).mock.calls[0][0])
      expect(output.context).toEqual({ key: 'value', count: 42 })
    })

    it('serializes Error objects in context', () => {
      const logger = new Logger({ level: 'error' })
      const err = new Error('test error')
      logger.error('failed', { error: err })

      const output = JSON.parse((console.error as any).mock.calls[0][0])
      expect(output.context.error).toMatchObject({
        name: 'Error',
        message: 'test error',
      })
      expect(output.context.error.stack).toBeDefined()
    })

    it('omits context when empty', () => {
      const logger = new Logger({ level: 'info' })
      logger.info('no context', {})

      const output = JSON.parse((console.log as any).mock.calls[0][0])
      expect(output.context).toBeUndefined()
    })
  })

  describe('child loggers', () => {
    it('inherits parent level and source', () => {
      const logger = new Logger({ level: 'warn', source: 'server' })
      const child = logger.child({ request_id: 'req-123' })

      child.info('should not appear')
      expect(console.log).not.toHaveBeenCalled()

      child.warn('should appear')
      const output = JSON.parse((console.warn as any).mock.calls[0][0])
      expect(output.request_id).toBe('req-123')
    })

    it('merges child context with parent context', () => {
      const logger = new Logger({ level: 'info' })
      const child = logger.child({ request_id: 'req-1', category: 'auth' })

      child.info('test', { userId: 42 })

      const output = JSON.parse((console.log as any).mock.calls[0][0])
      expect(output.request_id).toBe('req-1')
      expect(output.category).toBe('auth')
      expect(output.context).toEqual({ userId: 42 })
    })

    it('supports nested child loggers', () => {
      const logger = new Logger({ level: 'info' })
      const child = logger.child({ request_id: 'req-1' })
      const grandchild = child.child({ user_id: 99, category: 'system' })

      grandchild.info('nested')

      const output = JSON.parse((console.log as any).mock.calls[0][0])
      expect(output.request_id).toBe('req-1')
      expect(output.user_id).toBe(99)
      expect(output.category).toBe('system')
    })
  })

  describe('D1 persistence', () => {
    it('persists warn logs to D1 when db is provided', async () => {
      const db = createMockDb()
      const logger = new Logger({ level: 'info', db })

      logger.warn('test warning', { key: 'val' })

      // Wait for the async fire-and-forget persist
      await new Promise((r) => setTimeout(r, 10))

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO system_logs'))
    })

    it('persists error logs to D1', async () => {
      const db = createMockDb()
      const logger = new Logger({ level: 'info', db })

      logger.error('test error')

      await new Promise((r) => setTimeout(r, 10))

      expect(db.prepare).toHaveBeenCalled()
    })

    it('does not persist debug or info logs to D1', async () => {
      const db = createMockDb()
      const logger = new Logger({ level: 'debug', db })

      logger.debug('debug msg')
      logger.info('info msg')

      await new Promise((r) => setTimeout(r, 10))

      expect(db.prepare).not.toHaveBeenCalled()
    })

    it('does not throw when D1 persistence fails', async () => {
      const db = {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockRejectedValue(new Error('D1 is down')),
      } as unknown as D1Database

      const logger = new Logger({ level: 'info', db })

      // Should not throw
      expect(() => logger.warn('test')).not.toThrow()
    })
  })

  describe('getLoggerFromContext', () => {
    it('returns the logger from context', async () => {
      const { getLoggerFromContext } = await import('../logger')
      const mockLogger = new Logger()
      const ctx = { get: (key: string) => (key === 'logger' ? mockLogger : undefined) }

      const result = getLoggerFromContext(ctx)
      expect(result).toBe(mockLogger)
    })

    it('returns a default logger when context has no logger', async () => {
      const { getLoggerFromContext } = await import('../logger')
      const ctx = { get: () => undefined }

      const result = getLoggerFromContext(ctx)
      expect(result).toBeInstanceOf(Logger)
    })
  })
})
