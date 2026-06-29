import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { entries } from '@/data/entries'
import { documents } from '@/data/documents'
import type { ObjectClass } from '@/types'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const isOpen = ref(false)
  const classFilter = ref<ObjectClass | null>(null)
  const locksScroll = ref(false)

  const filteredEntries = computed(() => {
    let result = entries
    if (classFilter.value) {
      result = result.filter((e) => e.objectClass === classFilter.value)
    }
    if (!query.value.trim()) return result
    const q = query.value.toLowerCase()
    return result.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q)),
    )
  })

  const filteredDocuments = computed(() => {
    if (!query.value.trim()) return documents
    const q = query.value.toLowerCase()
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.type.includes(q),
    )
  })

  const allResults = computed(() => ({
    entries: filteredEntries.value,
    documents: filteredDocuments.value,
  }))

  function open(options: { lockScroll?: boolean } = {}) {
    isOpen.value = true
    locksScroll.value = options.lockScroll === true
    if (locksScroll.value) {
      document.body.style.overflow = 'hidden'
    }
  }

  function close() {
    isOpen.value = false
    if (locksScroll.value) {
      document.body.style.overflow = ''
      locksScroll.value = false
    }
  }

  function toggle(options: { lockScroll?: boolean } = {}) {
    if (isOpen.value) {
      close()
    } else {
      open(options)
    }
  }

  function setClassFilter(cls: ObjectClass | null) {
    classFilter.value = cls
  }

  return {
    query,
    isOpen,
    classFilter,
    filteredEntries,
    filteredDocuments,
    allResults,
    open,
    close,
    toggle,
    setClassFilter,
  }
})
