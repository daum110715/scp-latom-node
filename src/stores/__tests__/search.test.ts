import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSearchStore } from '../search'

describe('useSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Reset document.body.style.overflow
    document.body.style.overflow = ''
  })

  describe('initial state', () => {
    it('has empty query', () => {
      const store = useSearchStore()
      expect(store.query).toBe('')
    })

    it('is closed by default', () => {
      const store = useSearchStore()
      expect(store.isOpen).toBe(false)
    })

    it('has no class filter', () => {
      const store = useSearchStore()
      expect(store.classFilter).toBeNull()
    })
  })

  describe('filteredEntries', () => {
    it('returns all entries when query is empty', () => {
      const store = useSearchStore()
      expect(store.filteredEntries.length).toBeGreaterThan(0)
    })

    it('filters entries by name (case-insensitive)', () => {
      const store = useSearchStore()
      store.query = 'sculpture'
      expect(store.filteredEntries.length).toBe(1)
      expect(store.filteredEntries[0].id).toBe('scp-173')
    })

    it('filters entries by ID', () => {
      const store = useSearchStore()
      store.query = '682'
      expect(store.filteredEntries.length).toBe(1)
      expect(store.filteredEntries[0].id).toBe('scp-682')
    })

    it('filters entries by summary', () => {
      const store = useSearchStore()
      store.query = 'gelatinous'
      expect(store.filteredEntries.length).toBe(1)
      expect(store.filteredEntries[0].id).toBe('scp-999')
    })

    it('filters entries by tag', () => {
      const store = useSearchStore()
      store.query = 'reptile'
      expect(store.filteredEntries.length).toBe(1)
      expect(store.filteredEntries[0].id).toBe('scp-682')
    })

    it('is case-insensitive', () => {
      const store = useSearchStore()
      store.query = 'SCULPTURE'
      expect(store.filteredEntries.length).toBe(1)
      expect(store.filteredEntries[0].id).toBe('scp-173')
    })

    it('returns empty array for non-matching query', () => {
      const store = useSearchStore()
      store.query = 'xyznonexistent'
      expect(store.filteredEntries.length).toBe(0)
    })

    it('respects classFilter', () => {
      const store = useSearchStore()
      store.classFilter = 'Safe'
      const safeEntries = store.filteredEntries
      expect(safeEntries.length).toBeGreaterThan(0)
      for (const entry of safeEntries) {
        expect(entry.objectClass).toBe('Safe')
      }
    })

    it('combines classFilter and text query', () => {
      const store = useSearchStore()
      store.classFilter = 'Keter'
      store.query = 'reptile'
      expect(store.filteredEntries.length).toBe(1)
      expect(store.filteredEntries[0].objectClass).toBe('Keter')
    })
  })

  describe('filteredDocuments', () => {
    it('returns all documents when query is empty', () => {
      const store = useSearchStore()
      expect(store.filteredDocuments.length).toBeGreaterThan(0)
    })

    it('filters documents by title', () => {
      const store = useSearchStore()
      store.query = 'Orientation'
      expect(store.filteredDocuments.length).toBe(1)
      expect(store.filteredDocuments[0].id).toBe('doc-orientation')
    })

    it('filters documents by summary', () => {
      const store = useSearchStore()
      store.query = 'Mobile Task Force'
      expect(store.filteredDocuments.length).toBe(1)
      expect(store.filteredDocuments[0].id).toBe('doc-mtf')
    })

    it('filters documents by type', () => {
      const store = useSearchStore()
      store.query = 'incident'
      const incidentDocs = store.filteredDocuments
      expect(incidentDocs.length).toBeGreaterThan(0)
      for (const doc of incidentDocs) {
        expect(doc.type).toContain('incident')
      }
    })
  })

  describe('allResults', () => {
    it('combines filtered entries and documents', () => {
      const store = useSearchStore()
      const results = store.allResults
      expect(results.entries).toBeDefined()
      expect(results.documents).toBeDefined()
      expect(results.entries.length).toBeGreaterThan(0)
      expect(results.documents.length).toBeGreaterThan(0)
    })
  })

  describe('open/close/toggle', () => {
    it('open() sets isOpen to true and hides body overflow', () => {
      const store = useSearchStore()
      store.open()
      expect(store.isOpen).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('close() sets isOpen to false and restores body overflow', () => {
      const store = useSearchStore()
      store.open()
      store.close()
      expect(store.isOpen).toBe(false)
      expect(document.body.style.overflow).toBe('')
    })

    it('toggle() toggles between open and closed', () => {
      const store = useSearchStore()
      expect(store.isOpen).toBe(false)
      store.toggle()
      expect(store.isOpen).toBe(true)
      store.toggle()
      expect(store.isOpen).toBe(false)
    })
  })

  describe('setClassFilter', () => {
    it('sets the class filter', () => {
      const store = useSearchStore()
      store.setClassFilter('Keter')
      expect(store.classFilter).toBe('Keter')
    })

    it('clears the class filter with null', () => {
      const store = useSearchStore()
      store.setClassFilter('Keter')
      store.setClassFilter(null)
      expect(store.classFilter).toBeNull()
    })
  })
})
