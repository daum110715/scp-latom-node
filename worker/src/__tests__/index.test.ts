import { describe, it, expect } from 'vitest'

// Test the isOriginAllowed logic extracted from index.ts
// We replicate the function here since it's not exported
function isOriginAllowed(origin: string, allowed: string): boolean {
  if (origin === allowed) return true
  if (allowed.includes('*')) {
    const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '[a-zA-Z0-9-]+')
    return new RegExp(`^${pattern}$`).test(origin)
  }
  return false
}

describe('isOriginAllowed', () => {
  it('matches exact origins', () => {
    expect(isOriginAllowed('https://scp.lat', 'https://scp.lat')).toBe(true)
    expect(isOriginAllowed('https://api.scp.lat', 'https://api.scp.lat')).toBe(true)
  })

  it('rejects non-matching exact origins', () => {
    expect(isOriginAllowed('https://evil.com', 'https://scp.lat')).toBe(false)
    expect(isOriginAllowed('http://scp.lat', 'https://scp.lat')).toBe(false)
  })

  it('matches wildcard subdomain patterns', () => {
    expect(isOriginAllowed('https://foo.scp.lat', 'https://*.scp.lat')).toBe(true)
    expect(isOriginAllowed('https://bar.scp.lat', 'https://*.scp.lat')).toBe(true)
    expect(isOriginAllowed('https://node-7.scp.lat', 'https://*.scp.lat')).toBe(true)
  })

  it('rejects non-matching wildcard subdomain patterns', () => {
    expect(isOriginAllowed('https://scp.lat', 'https://*.scp.lat')).toBe(false)
    expect(isOriginAllowed('https://evil.com', 'https://*.scp.lat')).toBe(false)
    expect(isOriginAllowed('https://foo.evil.scp.lat', 'https://*.scp.lat')).toBe(false)
  })

  it('handles wildcard patterns with multiple subdomains', () => {
    expect(isOriginAllowed('https://a.b.example.com', 'https://*.b.example.com')).toBe(true)
    expect(isOriginAllowed('https://a.c.example.com', 'https://*.b.example.com')).toBe(false)
  })

  it('rejects empty origin', () => {
    expect(isOriginAllowed('', 'https://scp.lat')).toBe(false)
  })

  it('rejects origin with different protocol', () => {
    expect(isOriginAllowed('http://foo.scp.lat', 'https://*.scp.lat')).toBe(false)
  })
})
