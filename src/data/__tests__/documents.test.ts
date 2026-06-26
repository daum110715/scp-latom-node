import { describe, it, expect } from 'vitest'
import { documents } from '../documents'

const VALID_TYPES = ['protocol', 'research', 'incident', 'directive']
const VALID_CLASSIFICATIONS = ['Unclassified', 'Restricted', 'Confidential', 'Secret', 'Top Secret']

describe('documents data', () => {
  it('exports an array', () => {
    expect(Array.isArray(documents)).toBe(true)
  })

  it('every document has all required fields', () => {
    for (const doc of documents) {
      expect(typeof doc.id).toBe('string')
      expect(doc.id.length).toBeGreaterThan(0)
      expect(typeof doc.title).toBe('string')
      expect(doc.title.length).toBeGreaterThan(0)
      expect(VALID_TYPES).toContain(doc.type)
      expect(typeof doc.summary).toBe('string')
      expect(doc.summary.length).toBeGreaterThan(0)
      expect(typeof doc.content).toBe('string')
      expect(doc.content.length).toBeGreaterThan(0)
      expect(typeof doc.date).toBe('string')
      expect(VALID_CLASSIFICATIONS).toContain(doc.classification)
    }
  })

  it('all document IDs are unique', () => {
    const ids = documents.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all document IDs start with doc- prefix', () => {
    for (const doc of documents) {
      expect(doc.id).toMatch(/^doc-/)
    }
  })

  it('covers at least one of each document type when populated', () => {
    if (documents.length === 0) return // skip when empty
    const types = new Set(documents.map((d) => d.type))
    expect(types.has('protocol')).toBe(true)
    expect(types.has('research')).toBe(true)
    expect(types.has('incident')).toBe(true)
    expect(types.has('directive')).toBe(true)
  })
})
