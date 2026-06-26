<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const search = useSearchStore()
const router = useRouter()
const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

const results = computed(() => {
  const items: Array<{ type: string; id: string; title: string; subtitle: string; route: string }> = []
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

watch(() => search.isOpen, async (open) => {
  if (open) {
    selectedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && results.value[selectedIndex.value]) {
    navigate(results.value[selectedIndex.value].route)
  } else if (e.key === 'Escape') {
    search.close()
  }
}

function navigate(route: string) {
  router.push(route)
  search.close()
}

function globalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    search.toggle()
  }
}

onMounted(() => window.addEventListener('keydown', globalKeydown))
onUnmounted(() => window.removeEventListener('keydown', globalKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="search.isOpen" class="overlay" @click.self="search.close">
        <div class="modal" @keydown="handleKeydown">
          <div class="search-input-wrap">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref="inputRef"
              v-model="search.query"
              type="text"
              :placeholder="t('search.placeholder')"
              class="search-input"
              spellcheck="false"
              autocomplete="off"
            />
            <kbd class="esc-key">ESC</kbd>
          </div>

          <div class="results" v-if="results.length > 0">
            <div class="results-header">
              <span class="results-count">{{ t('search.results', { count: results.length }) }}</span>
            </div>
            <div class="results-list">
              <button
                v-for="(item, i) in results"
                :key="item.id"
                class="result-item"
                :class="{ selected: i === selectedIndex }"
                @click="navigate(item.route)"
                @mouseenter="selectedIndex = i"
              >
                <span class="result-type" :class="item.type">
                  {{ item.type === 'entry' ? t('search.scp') : t('search.doc') }}
                </span>
                <div class="result-text">
                  <span class="result-title">{{ item.title }}</span>
                  <span class="result-subtitle">{{ item.subtitle }}</span>
                </div>
                <svg class="result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          <div class="results empty" v-else-if="search.query">
            <div class="empty-state">
              <span class="empty-icon">∅</span>
              <span class="empty-text">{{ t('search.empty', { query: search.query }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}

.modal {
  width: 100%;
  max-width: 580px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-base);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.esc-key {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
}

.results {
  max-height: 360px;
  overflow-y: auto;
}

.results-header {
  padding: var(--space-sm) var(--space-lg);
}

.results-count {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.results-list {
  padding: 0 var(--space-sm) var(--space-sm);
}

.result-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  text-align: left;
  color: var(--text-secondary);
  transition: background var(--transition-fast);
}

.result-item.selected,
.result-item:hover {
  background: var(--bg-hover);
}

.result-type {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.result-type.entry {
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.result-type.document {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.result-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.result-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.result-subtitle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.result-arrow {
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.result-item.selected .result-arrow {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-2xl);
}

.empty-icon {
  font-size: var(--text-3xl);
  color: var(--text-tertiary);
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

@media (max-width: 640px) {
  .overlay {
    padding-top: 10vh;
  }

  .modal {
    max-width: calc(100vw - var(--space-lg) * 2);
  }

  .results {
    max-height: 50vh;
  }
}

@media (max-height: 500px) {
  .overlay {
    padding-top: var(--space-md);
  }

  .results {
    max-height: 40vh;
  }
}
</style>
