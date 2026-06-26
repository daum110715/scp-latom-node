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
  <div class="m-catalog">
    <!-- Sticky Search -->
    <div class="m-search-bar">
      <div class="m-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="searchQuery" type="text" :placeholder="t('catalog.searchPlaceholder')" class="m-search-input" />
      </div>
    </div>

    <!-- Class Filter Pills -->
    <div class="m-filter-scroll">
      <div class="m-filter-pills">
        <button
          v-for="cls in objectClasses"
          :key="cls"
          class="m-pill"
          :class="{ active: activeClass === cls }"
          @click="toggleClass(cls)"
        >
          {{ t(`classes.${cls}`) }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <div class="m-results-info">
      <span>{{ t('catalog.entriesFound', { count: filtered.length }) }}</span>
    </div>

    <div class="m-entry-list">
      <router-link
        v-for="entry in filtered"
        :key="entry.id"
        :to="`/entry/${entry.id}`"
        class="m-entry-card"
      >
        <div class="m-entry-top">
          <div class="m-entry-id-wrap">
            <ClassBar :object-class="entry.objectClass" />
            <span class="m-entry-id">SCP-{{ String(entry.number).padStart(3, '0') }}</span>
          </div>
          <Badge :variant="entry.objectClass.toLowerCase() as any">{{ t(`classes.${entry.objectClass}`) }}</Badge>
        </div>
        <h3 class="m-entry-name">{{ t(`entries.${entry.id}.name`) }}</h3>
        <p class="m-entry-summary">{{ t(`entries.${entry.id}.summary`) }}</p>
      </router-link>
    </div>

    <div v-if="filtered.length === 0" class="m-empty">
      <span class="m-empty-icon">∅</span>
      <p>{{ t('catalog.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.m-catalog {
  padding: var(--space-md);
}

.m-search-bar {
  position: sticky;
  top: 52px;
  z-index: 10;
  background: var(--bg-primary);
  padding-bottom: var(--space-sm);
}

.m-search-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
}

.m-search-wrap:focus-within {
  border-color: var(--color-primary);
}

.m-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-sm);
  height: 40px;
}

.m-search-input::placeholder {
  color: var(--text-tertiary);
}

.m-filter-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin-bottom: var(--space-md);
}

.m-filter-scroll::-webkit-scrollbar {
  display: none;
}

.m-filter-pills {
  display: flex;
  gap: var(--space-sm);
  padding-bottom: var(--space-xs);
}

.m-pill {
  flex: 0 0 auto;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 500;
  white-space: nowrap;
}

.m-pill.active {
  background: var(--color-primary-muted);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.m-results-info {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-bottom: var(--space-sm);
}

.m-entry-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.m-entry-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-decoration: none;
  display: flex;
  flex-direction: column;
}

.m-entry-card:active {
  border-color: var(--color-primary);
}

.m-entry-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.m-entry-id-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.m-entry-id {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.m-entry-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.m-entry-summary {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.m-empty {
  text-align: center;
  padding: var(--space-3xl) var(--space-lg);
}

.m-empty-icon {
  font-size: 2.5rem;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: var(--space-md);
}

.m-empty p {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
</style>
