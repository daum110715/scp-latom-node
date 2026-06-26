<script setup lang="ts">
import { ref, computed } from 'vue'
import { entries } from '@/data/entries'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import { useI18n } from 'vue-i18n'
import type { ObjectClass } from '@/types'

const { t } = useI18n()
const searchQuery = ref('')
const activeClass = ref<ObjectClass | null>(null)

const objectClasses: ObjectClass[] = ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon', 'Neutralized']

const filtered = computed(() => {
  let result = entries
  if (activeClass.value) {
    result = result.filter((e) => e.objectClass === activeClass.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        t(`entries.${e.id}.name`).toLowerCase().includes(q) ||
        t(`entries.${e.id}.summary`).toLowerCase().includes(q)
    )
  }
  return result
})

function toggleClass(cls: ObjectClass) {
  activeClass.value = activeClass.value === cls ? null : cls
}
</script>

<template>
  <div class="catalog">
    <div class="page-header">
      <h1>{{ t('catalog.title') }}</h1>
      <p class="page-desc">{{ t('catalog.description') }}</p>
    </div>

    <div class="filters">
      <div class="search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="searchQuery" type="text" :placeholder="t('catalog.searchPlaceholder')" class="filter-input" />
      </div>
      <div class="class-filters">
        <button
          v-for="cls in objectClasses"
          :key="cls"
          class="class-filter-btn"
          :class="{ active: activeClass === cls }"
          @click="toggleClass(cls)"
        >
          <ClassBar :object-class="cls" :show-label="true" />
        </button>
      </div>
    </div>

    <div class="results-info">
      <span class="results-count">{{ t('catalog.entriesFound', { count: filtered.length }) }}</span>
    </div>

    <div class="entries-list">
      <router-link
        v-for="entry in filtered"
        :key="entry.id"
        :to="`/entry/${entry.id}`"
        class="entry-row"
      >
        <div class="entry-left">
          <div class="entry-id-wrap">
            <ClassBar :object-class="entry.objectClass" />
            <span class="entry-id">SCP-{{ String(entry.number).padStart(3, '0') }}</span>
          </div>
          <h3 class="entry-name">{{ t(`entries.${entry.id}.name`) }}</h3>
          <p class="entry-summary">{{ t(`entries.${entry.id}.summary`) }}</p>
        </div>
        <div class="entry-right">
          <Badge :variant="entry.objectClass.toLowerCase() as any">{{ t(`classes.${entry.objectClass}`) }}</Badge>
        </div>
      </router-link>
    </div>

    <div v-if="filtered.length === 0" class="empty-state">
      <span class="empty-icon">∅</span>
      <p>{{ t('catalog.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.catalog {
  max-width: var(--max-content);
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-xl);
}

.page-header h1 {
  margin-bottom: var(--space-sm);
}

.page-desc {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
}

.search-wrap:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
}

.filter-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.filter-input::placeholder {
  color: var(--text-tertiary);
}

.class-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.class-filter-btn {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: all var(--transition-fast);
}

.class-filter-btn:hover {
  border-color: var(--border-default);
}

.class-filter-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
}

.results-info {
  margin-bottom: var(--space-md);
}

.results-count {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.entry-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-normal);
}

.entry-row:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 16px var(--color-primary-muted);
}

.entry-left {
  flex: 1;
  min-width: 0;
}

.entry-id-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.entry-id {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.entry-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.entry-summary {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-right {
  flex-shrink: 0;
  padding-top: 4px;
}

.empty-state {
  text-align: center;
  padding: var(--space-3xl);
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: var(--space-md);
}

@media (max-width: 640px) {
  .entry-row {
    flex-direction: column;
    padding: var(--space-md);
  }

  .entry-right {
    padding-top: var(--space-sm);
  }
}
</style>
