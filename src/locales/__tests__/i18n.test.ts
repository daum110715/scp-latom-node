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

  it('all entry IDs in en exist in zh', () => {
    const enEntryIds = Object.keys(en.entries).sort()
    const zhEntryIds = Object.keys(zh.entries).sort()
    expect(enEntryIds).toEqual(zhEntryIds)
  })

  it('all doc IDs in en exist in zh', () => {
    const enDocIds = Object.keys(en.docs).sort()
    const zhDocIds = Object.keys(zh.docs).sort()
    expect(enDocIds).toEqual(zhDocIds)
  })

  it('every entry has name, summary, containment, and description in both locales', () => {
    for (const id of Object.keys(en.entries)) {
      const enEntry = en.entries[id as keyof typeof en.entries]
      const zhEntry = zh.entries[id as keyof typeof zh.entries]
      expect(enEntry.name).toBeTruthy()
      expect(zhEntry.name).toBeTruthy()
      expect(enEntry.summary).toBeTruthy()
      expect(zhEntry.summary).toBeTruthy()
      expect(enEntry.containment).toBeTruthy()
      expect(zhEntry.containment).toBeTruthy()
      expect(enEntry.description).toBeTruthy()
      expect(zhEntry.description).toBeTruthy()
    }
  })

  it('every doc has title, summary, and content in both locales', () => {
    for (const id of Object.keys(en.docs)) {
      const enDoc = en.docs[id as keyof typeof en.docs]
      const zhDoc = zh.docs[id as keyof typeof zh.docs]
      expect(enDoc.title).toBeTruthy()
      expect(zhDoc.title).toBeTruthy()
      expect(enDoc.summary).toBeTruthy()
      expect(zhDoc.summary).toBeTruthy()
      expect(enDoc.content).toBeTruthy()
      expect(zhDoc.content).toBeTruthy()
    }
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
