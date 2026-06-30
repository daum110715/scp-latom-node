import { computed } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useI18n } from 'vue-i18n'

export interface SearchResultItem {
  type: string
  id: string
  title: string
  subtitle: string
  route: string
}

/**
 * Maps the search store's filtered entries + documents into a flat list of
 * navigable result items (entries first, then documents). Shared by the
 * inline header search (InlineSearch.vue) and the mobile full-screen search
 * (MobileSearchModal.vue) so both render identical result sets.
 */
export function useSearchResults() {
  const search = useSearchStore()
  const { t } = useI18n()

  const searchResults = computed<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = []
    for (const e of search.filteredEntries) {
      items.push({
        type: 'entry',
        id: e.id,
        title: `SCP-${String(e.number).padStart(3, '0')}`,
        subtitle: t(`entries.${e.id}.name`),
        route: `/entry/${e.id}`,
      })
    }
    for (const d of search.filteredDocuments) {
      items.push({
        type: 'document',
        id: d.id,
        title: t(`docs.${d.id}.title`),
        subtitle: t(`documents.types.${d.type}`),
        route: `/documents`,
      })
    }
    return items
  })

  return { searchResults }
}
