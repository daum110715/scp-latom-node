import { ref, computed, onMounted } from 'vue'
import { documents } from '@/data/documents'
import { useI18n } from 'vue-i18n'
import {
  CLASS_LEVEL,
  CLASS_COLOR_MAP,
  TYPE_ICON,
  DOCUMENT_TYPES,
  classVariant,
  renderMarkdown,
} from '@/constants'
import type { Document } from '@/types'

export {
  CLASS_LEVEL as classLevel,
  CLASS_COLOR_MAP as classColor,
  TYPE_ICON as typeIcon,
  DOCUMENT_TYPES as types,
  classVariant,
  renderMarkdown,
}

export function useDocuments() {
  const { t } = useI18n()
  const visible = ref(false)
  const activeDoc = ref<Document | null>(null)
  const typeFilter = ref<string | null>(null)
  const sortBy = ref<'date' | 'classification' | 'type'>('date')

  onMounted(() => {
    requestAnimationFrame(() => {
      visible.value = true
    })
  })

  const filtered = computed(() => {
    let list = documents
    if (typeFilter.value) {
      list = list.filter((d) => d.type === typeFilter.value)
    }
    return [...list].sort((a, b) => {
      if (sortBy.value === 'date') return b.date.localeCompare(a.date)
      if (sortBy.value === 'classification')
        return (CLASS_LEVEL[b.classification] || 0) - (CLASS_LEVEL[a.classification] || 0)
      return a.type.localeCompare(b.type)
    })
  })

  function openDoc(doc: Document) {
    activeDoc.value = doc
  }

  function closeDoc() {
    activeDoc.value = null
  }

  return {
    t,
    visible,
    activeDoc,
    typeFilter,
    sortBy,
    filtered,
    openDoc,
    closeDoc,
    documents,
  }
}
