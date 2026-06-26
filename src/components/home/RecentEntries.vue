<script setup lang="ts">
import { entries } from '@/data/entries'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const recent = entries.slice(0, 4)
</script>

<template>
  <section class="recent">
    <div class="section-header">
      <h2 class="section-title">{{ t('recent.title') }}</h2>
      <router-link to="/catalog" class="section-link">
        {{ t('recent.viewAll') }}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </router-link>
    </div>

    <div class="entries-grid">
      <router-link
        v-for="entry in recent"
        :key="entry.id"
        :to="`/entry/${entry.id}`"
        class="entry-card"
      >
        <div class="entry-header">
          <span class="entry-id">SCP-{{ String(entry.number).padStart(3, '0') }}</span>
          <ClassBar :object-class="entry.objectClass" />
        </div>
        <h3 class="entry-name">{{ t(`entries.${entry.id}.name`) }}</h3>
        <p class="entry-summary">{{ t(`entries.${entry.id}.summary`) }}</p>
        <div class="entry-footer">
          <Badge :variant="entry.objectClass.toLowerCase() as any">{{ t(`classes.${entry.objectClass}`) }}</Badge>
          <span class="entry-date">{{ entry.date }}</span>
        </div>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.recent {
  margin-top: var(--space-2xl);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: var(--text-xl);
  font-weight: 600;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}

.section-link:hover {
  color: var(--color-accent-hover);
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

.entry-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-decoration: none;
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
}

.entry-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px var(--color-primary-muted);
  transform: translateY(-2px);
}

.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
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
  margin-bottom: var(--space-sm);
}

.entry-summary {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-subtle);
}

.entry-date {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}
</style>
