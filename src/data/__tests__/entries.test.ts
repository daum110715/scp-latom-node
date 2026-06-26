import { describe, it, expect } from 'vitest'
import { entries, siteStats } from '../entries'
import type { ObjectClass } from '@/types'

const VALID_CLASSES: ObjectClass[] = ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon', 'Neutralized']

describe('entries data', () => {
  it('exports an array', () => {
    expect(Array.isArray(entries)).toBe(true)
  })

  it('every entry has all required fields', () => {
    for (const entry of entries) {
      expect(entry.id).toBeTruthy()
      expect(typeof entry.id).toBe('string')
      expect(typeof entry.number).toBe('number')
      expect(entry.number).toBeGreaterThan(0)
      expect(Number.isInteger(entry.number)).toBe(true)
      expect(typeof entry.name).toBe('string')
      expect(entry.name.length).toBeGreaterThan(0)
      expect(VALID_CLASSES).toContain(entry.objectClass)
      expect(typeof entry.summary).toBe('string')
      expect(entry.summary.length).toBeGreaterThan(0)
      expect(typeof entry.containment).toBe('string')
      expect(entry.containment.length).toBeGreaterThan(0)
      expect(typeof entry.description).toBe('string')
      expect(entry.description.length).toBeGreaterThan(0)
      expect(Array.isArray(entry.tags)).toBe(true)
      expect(entry.tags.length).toBeGreaterThan(0)
      expect(typeof entry.date).toBe('string')
      expect(typeof entry.author).toBe('string')
    }
  })

  it('all entry IDs are unique', () => {
    const ids = entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all entry numbers are unique', () => {
    const numbers = entries.map((e) => e.number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('entries with addenda have non-empty addenda arrays', () => {
    const withAddenda = entries.filter((e) => e.addenda)
    for (const entry of withAddenda) {
      expect(Array.isArray(entry.addenda)).toBe(true)
      expect(entry.addenda!.length).toBeGreaterThan(0)
    }
  })

  it('all tags are lowercase strings', () => {
    for (const entry of entries) {
      for (const tag of entry.tags) {
        expect(tag).toBe(tag.toLowerCase())
        expect(tag.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('siteStats', () => {
  it('totalEntries is zero when no entries exist', () => {
    expect(siteStats.totalEntries).toBe(0)
  })

  it('byClass counts match actual entry distribution', () => {
    const counts: Record<ObjectClass, number> = {
      Safe: 0,
      Euclid: 0,
      Keter: 0,
      Thaumiel: 0,
      Apollyon: 0,
      Neutralized: 0,
    }
    for (const entry of entries) {
      counts[entry.objectClass]++
    }
    expect(siteStats.byClass).toEqual(counts)
  })

  it('has zero documents and personnel counts when empty', () => {
    expect(siteStats.documents).toBe(0)
    expect(siteStats.personnel).toBe(0)
  })
})
