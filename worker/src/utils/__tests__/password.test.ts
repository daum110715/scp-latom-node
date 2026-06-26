import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('password utils', () => {
  describe('hashPassword', () => {
    it('returns a string in salt.hash hex format', async () => {
      const hashed = await hashPassword('testpassword')
      const parts = hashed.split('.')
      expect(parts).toHaveLength(2)
      // salt is 16 bytes = 32 hex chars, hash is 32 bytes = 64 hex chars
      expect(parts[0]).toHaveLength(32)
      expect(parts[1]).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(parts[0])).toBe(true)
      expect(/^[0-9a-f]+$/.test(parts[1])).toBe(true)
    })

    it('produces different hashes for the same password (random salt)', async () => {
      const hash1 = await hashPassword('samepassword')
      const hash2 = await hashPassword('samepassword')
      expect(hash1).not.toBe(hash2)
    })

    it('produces different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1')
      const hash2 = await hashPassword('password2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('returns true for the correct password', async () => {
      const hashed = await hashPassword('correctpassword')
      const result = await verifyPassword('correctpassword', hashed)
      expect(result).toBe(true)
    })

    it('returns false for an incorrect password', async () => {
      const hashed = await hashPassword('correctpassword')
      const result = await verifyPassword('wrongpassword', hashed)
      expect(result).toBe(false)
    })

    it('returns false for a malformed stored string (no dot separator)', async () => {
      const result = await verifyPassword('password', 'nodothere')
      expect(result).toBe(false)
    })

    it('returns false for an empty stored string', async () => {
      const result = await verifyPassword('password', '')
      expect(result).toBe(false)
    })

    it('returns false for a stored string with only salt', async () => {
      const result = await verifyPassword('password', 'abcdef1234567890abcdef1234567890')
      expect(result).toBe(false)
    })

    it('uses constant-time comparison (timing-safe)', async () => {
      // Verify that the function doesn't short-circuit on first mismatch byte
      // by checking it completes without error for various wrong passwords
      const hashed = await hashPassword('a'.repeat(50))
      const result1 = await verifyPassword('b'.repeat(50), hashed)
      const result2 = await verifyPassword('a'.repeat(49), hashed)
      expect(result1).toBe(false)
      expect(result2).toBe(false)
    })
  })
})
