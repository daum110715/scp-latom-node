import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  logger,
  setLogLevel,
  getLogLevel,
  clearLogBuffer,
  startLogFlusher,
  stopLogFlusher,
} from '../logger'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock sendBeacon
const mockSendBeacon = vi.fn()
vi.stubGlobal('navigator', { sendBeacon: mockSendBeacon })

describe('client logger', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSendBeacon.mockReset()
    vi.restoreAllMocks()
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    clearLogBuffer()
    stopLogFlusher()
    localStorage.clear()
  })

  afterEach(() => {
    stopLogFlusher()
  })

  describe('log levels', () => {
    it('defaults to debug level in development', () => {
      // In test environment, import.meta.env.DEV is true
      expect(getLogLevel()).toBe('debug')
    })

    it('respects level filtering', () => {
      setLogLevel('error')
      logger.debug('should not appear')
      logger.info('should not appear')
      logger.warn('should not appear')
      logger.error('should appear')

      expect(console.debug).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledOnce()

      setLogLevel('debug') // reset
    })

    it('allows changing log level at runtime', () => {
      setLogLevel('warn')
      expect(getLogLevel()).toBe('warn')
      setLogLevel('debug')
      expect(getLogLevel()).toBe('debug')
    })
  })

  describe('console output', () => {
    it('outputs debug messages to console.debug', () => {
      logger.debug('test debug')
      expect(console.debug).toHaveBeenCalledOnce()
      expect((console.debug as any).mock.calls[0][0]).toContain('test debug')
    })

    it('outputs warn messages to console.warn', () => {
      logger.warn('test warning')
      expect(console.warn).toHaveBeenCalledOnce()
    })

    it('outputs error messages to console.error', () => {
      logger.error('test error')
      expect(console.error).toHaveBeenCalledOnce()
    })

    it('includes context in console output', () => {
      logger.warn('with context', { key: 'val' })
      expect((console.warn as any).mock.calls[0][1]).toEqual({ key: 'val' })
    })
  })

  describe('buffering', () => {
    it('buffers warn and error messages for server transmission', () => {
      logger.warn('buffered warning')
      logger.error('buffered error')
      logger.debug('not buffered')

      // Buffer has entries but hasn't flushed yet
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does not buffer debug/info messages when level is warn', async () => {
      setLogLevel('warn')
      logger.debug('debug')
      logger.info('info')

      // Trigger a manual flush
      await logger.flush()

      // fetch should not have been called since buffer is empty
      expect(mockFetch).not.toHaveBeenCalled()

      setLogLevel('debug') // reset
    })
  })

  describe('flush', () => {
    it('sends buffered logs via POST to /api/logs', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      logger.warn('test warning')
      logger.error('test error')
      await logger.flush()

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/logs')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      expect(body.logs).toHaveLength(2)
      expect(body.logs[0].level).toBe('warn')
      expect(body.logs[0].message).toBe('test warning')
      expect(body.logs[0].timestamp).toBeDefined()
      expect(body.logs[0].path).toBeDefined()
      expect(body.logs[1].level).toBe('error')
    })

    it('includes auth token in flush request', async () => {
      localStorage.setItem('scp-auth-token', 'test-token')
      mockFetch.mockResolvedValueOnce({ ok: true })

      logger.warn('auth test')
      await logger.flush()

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer test-token')
    })

    it('clears buffer after flush', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      logger.warn('test')
      await logger.flush()
      mockFetch.mockReset()

      await logger.flush()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does not throw when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      logger.warn('test')
      await expect(logger.flush()).resolves.not.toThrow()
    })

    it('truncates long context strings', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      logger.warn('test', { longStr: 'x'.repeat(600) })
      await logger.flush()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.logs[0].context.longStr.length).toBeLessThan(600)
      expect(body.logs[0].context.longStr).toContain('…')
    })

    it('serializes Error objects in context', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      logger.error('test', { error: new Error('boom') })
      await logger.flush()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.logs[0].context.error).toMatchObject({
        name: 'Error',
        message: 'boom',
      })
    })
  })

  describe('flusher lifecycle', () => {
    it('starts and stops the periodic flusher', () => {
      vi.useFakeTimers()

      startLogFlusher()
      mockFetch.mockResolvedValue({ ok: true })

      logger.warn('test')

      // Advance past the 30s interval
      vi.advanceTimersByTime(31_000)
      expect(mockFetch).toHaveBeenCalled()

      stopLogFlusher()
      mockFetch.mockReset()

      vi.advanceTimersByTime(31_000)
      expect(mockFetch).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })
})
