import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  logger,
  setLogLevel,
  getLogLevel,
  clearLogBuffer,
  startLogFlusher,
  stopLogFlusher,
} from '../logger'

// Mock fetch for log transmission
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock window.location
vi.stubGlobal('window', {
  location: { pathname: '/admin/dashboard' },
  addEventListener: vi.fn(),
})

// Mock navigator.sendBeacon
vi.stubGlobal('navigator', {
  sendBeacon: vi.fn(),
})

describe('logger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })
    clearLogBuffer()
    stopLogFlusher()
    // Reset console spies
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    stopLogFlusher()
  })

  describe('log levels', () => {
    it('returns the current log level', () => {
      expect(getLogLevel()).toBeDefined()
    })

    it('sets and gets log level', () => {
      setLogLevel('error')
      expect(getLogLevel()).toBe('error')
    })
  })

  describe('logger methods', () => {
    it('has all log level methods', () => {
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('warn and error always log to console', () => {
      setLogLevel('error')

      logger.warn('test warning')
      expect(console.warn).toHaveBeenCalled()

      logger.error('test error')
      expect(console.error).toHaveBeenCalled()
    })

    it('debug does not log when level is higher', () => {
      setLogLevel('error')
      logger.debug('hidden message')
      expect(console.debug).not.toHaveBeenCalled()
    })
  })

  describe('flush', () => {
    it('sends buffered logs to server', async () => {
      setLogLevel('debug')
      logger.info('test message')

      await logger.flush()

      expect(mockFetch).toHaveBeenCalled()
      const [, options] = mockFetch.mock.calls[0]
      expect(options.method).toBe('POST')
      const body = JSON.parse(options.body)
      expect(body.logs).toHaveLength(1)
      expect(body.logs[0].message).toBe('test message')
    })

    it('does nothing when buffer is empty', async () => {
      await logger.flush()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('log flusher lifecycle', () => {
    it('starts and stops the flush timer', () => {
      startLogFlusher()
      // Should not throw when called twice
      startLogFlusher()
      stopLogFlusher()
      // Should not throw when called twice
      stopLogFlusher()
    })
  })

  describe('clearLogBuffer', () => {
    it('clears the buffer', async () => {
      setLogLevel('debug')
      logger.info('message 1')
      logger.info('message 2')

      clearLogBuffer()

      await logger.flush()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
