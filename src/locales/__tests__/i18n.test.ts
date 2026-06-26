import { describe, it, expect } from 'vitest'
import en from '../en'
import zh from '../zh'

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    keys.push(fullKey)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey))
    }
  }
  return keys
}

describe('locale parity', () => {
  it('en and zh have the same top-level keys', () => {
    const enKeys = Object.keys(en).sort()
    const zhKeys = Object.keys(zh).sort()
    expect(enKeys).toEqual(zhKeys)
  })

  it('en and zh have the same nested key structure', () => {
    const enKeys = getKeys(en).sort()
    const zhKeys = getKeys(zh).sort()
    expect(enKeys).toEqual(zhKeys)
  })

  it('zh translations are actually different from en (not just copies)', () => {
    // Spot-check a few key translations
    expect(zh.site.title).not.toBe(en.site.title)
    expect(zh.nav.home).not.toBe(en.nav.home)
    expect(zh.hero.titleLine).not.toBe(en.hero.titleLine)
    expect(zh.auth.loginTitle).not.toBe(en.auth.loginTitle)
  })

  it('classification levels match between locales', () => {
    const enClassKeys = Object.keys(en.classification).sort()
    const zhClassKeys = Object.keys(zh.classification).sort()
    expect(enClassKeys).toEqual(zhClassKeys)
  })
})
