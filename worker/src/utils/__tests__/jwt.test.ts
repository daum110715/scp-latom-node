import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../jwt'

const SECRET = 'test-secret-key-at-least-32-chars-long'

describe('JWT utils', () => {
  const basePayload = {
    sub: 1,
    codename: 'agent_alpha',
    role: 'personnel',
    clearance: 1,
  }

  describe('signToken', () => {
    it('returns a JWT string with three dot-separated parts', async () => {
      const token = await signToken(basePayload, SECRET)
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('produces different tokens for different payloads', async () => {
      const token1 = await signToken({ ...basePayload, sub: 1 }, SECRET)
      const token2 = await signToken({ ...basePayload, sub: 2 }, SECRET)
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('returns the payload for a valid token', async () => {
      const token = await signToken(basePayload, SECRET)
      const payload = await verifyToken(token, SECRET)
      expect(payload).not.toBeNull()
      expect(payload!.sub).toBe(1)
      expect(payload!.codename).toBe('agent_alpha')
      expect(payload!.role).toBe('personnel')
      expect(payload!.clearance).toBe(1)
    })

    it('returns null for a token signed with a different secret', async () => {
      const token = await signToken(basePayload, SECRET)
      const payload = await verifyToken(token, 'different-secret-key-that-is-long')
      expect(payload).toBeNull()
    })

    it('returns null for a completely invalid token string', async () => {
      const payload = await verifyToken('not.a.valid.token.at.all', SECRET)
      expect(payload).toBeNull()
    })

    it('returns null for an empty string', async () => {
      const payload = await verifyToken('', SECRET)
      expect(payload).toBeNull()
    })

    it('returns null for a tampered token', async () => {
      const token = await signToken(basePayload, SECRET)
      // Tamper with the payload (middle segment)
      const parts = token.split('.')
      parts[1] = parts[1].replace('a', 'b').replace('b', 'a') // swap some chars
      const tampered = parts.join('.')
      const payload = await verifyToken(tampered, SECRET)
      expect(payload).toBeNull()
    })

    it('round-trips correctly: sign then verify preserves all fields', async () => {
      const fullPayload = {
        sub: 42,
        codename: 'test_agent_99',
        role: 'admin',
        clearance: 5,
      }
      const token = await signToken(fullPayload, SECRET)
      const verified = await verifyToken(token, SECRET)
      expect(verified).not.toBeNull()
      expect(verified!.sub).toBe(42)
      expect(verified!.codename).toBe('test_agent_99')
      expect(verified!.role).toBe('admin')
      expect(verified!.clearance).toBe(5)
    })
  })
})
