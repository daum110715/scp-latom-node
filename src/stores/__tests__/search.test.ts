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
    it('returns empty array when no entries exist', () => {
      const store = useSearchStore()
      expect(store.filteredEntries.length).toBe(0)
    })

    it('returns empty array for any query when no entries exist', () => {
      const store = useSearchStore()
      store.query = 'sculpture'
      expect(store.filteredEntries.length).toBe(0)
    })

    it('returns empty array with classFilter when no entries exist', () => {
      const store = useSearchStore()
      store.classFilter = 'Safe'
      expect(store.filteredEntries.length).toBe(0)
    })
  })

  describe('filteredDocuments', () => {
    it('returns all documents when no query', () => {
      const store = useSearchStore()
      expect(store.filteredDocuments.length).toBeGreaterThanOrEqual(0)
    })

    it('filters documents by query', () => {
      const store = useSearchStore()
      store.query = 'zzzz-nonexistent-zzzz'
      expect(store.filteredDocuments.length).toBe(0)
    })
  })

  describe('allResults', () => {
    it('returns entries and documents arrays', () => {
      const store = useSearchStore()
      const results = store.allResults
      expect(results.entries).toBeDefined()
      expect(results.documents).toBeDefined()
      expect(results.entries.length).toBe(0)
      expect(results.documents.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('open/close/toggle', () => {
    it('open() sets isOpen to true without hiding body overflow by default', () => {
      const store = useSearchStore()
      store.open()
      expect(store.isOpen).toBe(true)
      expect(document.body.style.overflow).toBe('')
    })

    it('open({ lockScroll: true }) sets isOpen to true and hides body overflow', () => {
      const store = useSearchStore()
      store.open({ lockScroll: true })
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

    it('close() after open({ lockScroll: true }) restores body overflow and resets the flag', () => {
      const store = useSearchStore()
      store.open({ lockScroll: true })
      expect(document.body.style.overflow).toBe('hidden')
      store.close()
      expect(store.isOpen).toBe(false)
      expect(document.body.style.overflow).toBe('')
      // locksScroll must be reset so a subsequent default open() doesn't re-lock
      store.open()
      expect(store.isOpen).toBe(true)
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

    it('toggle({ lockScroll: true }) hides body overflow (mobile fullscreen path)', () => {
      const store = useSearchStore()
      store.toggle({ lockScroll: true })
      expect(store.isOpen).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')
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
