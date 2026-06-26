<script setup lang="ts">
import { siteStats } from '@/data/entries'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const stats = [
  { labelKey: 'stats.totalEntries', value: siteStats.totalEntries, icon: '◈', color: 'var(--color-primary)' },
  { labelKey: 'stats.safe', value: siteStats.byClass.Safe, icon: '●', color: 'var(--class-safe)' },
  { labelKey: 'stats.euclid', value: siteStats.byClass.Euclid, icon: '●', color: 'var(--class-euclid)' },
  { labelKey: 'stats.keter', value: siteStats.byClass.Keter, icon: '●', color: 'var(--class-keter)' },
  { labelKey: 'stats.documents', value: siteStats.documents, icon: '◫', color: 'var(--color-accent)' },
  { labelKey: 'stats.personnel', value: siteStats.personnel.toLocaleString(), icon: '◎', color: 'var(--text-secondary)' },
]
</script>

<template>
  <section class="stats-grid">
    <div v-for="stat in stats" :key="stat.labelKey" class="stat-card">
      <div class="stat-icon" :style="{ color: stat.color }">{{ stat.icon }}</div>
      <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
      <div class="stat-label">{{ t(stat.labelKey) }}</div>
    </div>
  </section>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-md);
  margin: var(--space-xl) 0;
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
  transition: all var(--transition-normal);
}

.stat-card:hover {
  border-color: var(--border-default);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  font-size: var(--text-xl);
  margin-bottom: var(--space-xs);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}
</style>
