<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { entries } from '@/data/entries'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const entry = computed(() => entries.find((e) => e.id === route.params.id))
</script>

<template>
  <div class="entry-view" v-if="entry">
    <router-link to="/catalog" class="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ t('entry.back') }}
    </router-link>

    <div class="entry-header">
      <div class="entry-meta">
        <ClassBar :object-class="entry.objectClass" :show-label="true" />
        <Badge :variant="entry.objectClass.toLowerCase() as any">{{ t(`classes.${entry.objectClass}`) }}</Badge>
      </div>
      <h1 class="entry-title">
        <span class="entry-id">SCP-{{ String(entry.number).padStart(3, '0') }}</span>
        <span class="entry-name">— {{ t(`entries.${entry.id}.name`) }}</span>
      </h1>
      <div class="entry-info">
        <span class="info-item">
          <span class="info-label">{{ t('entry.author') }}</span>
          {{ entry.author }}
        </span>
        <span class="info-item">
          <span class="info-label">{{ t('entry.date') }}</span>
          {{ entry.date }}
        </span>
      </div>
    </div>

    <div class="entry-tags">
      <span v-for="tag in entry.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <div class="entry-body">
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon">◈</span>
          {{ t('entry.objectClass') }}
        </h2>
        <div class="object-class-display">
          <Badge :variant="entry.objectClass.toLowerCase() as any" class="class-badge-lg">
            {{ t(`classes.${entry.objectClass}`) }}
          </Badge>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">
          <span class="section-icon">◫</span>
          {{ t('entry.containment') }}
        </h2>
        <div class="section-content">
          <p>{{ t(`entries.${entry.id}.containment`) }}</p>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">
          <span class="section-icon">◎</span>
          {{ t('entry.description') }}
        </h2>
        <div class="section-content">
          <p>{{ t(`entries.${entry.id}.description`) }}</p>
        </div>
      </section>

      <section v-if="entry.addenda?.length" class="section">
        <h2 class="section-title">
          <span class="section-icon">▣</span>
          {{ t('entry.addenda') }}
        </h2>
        <div class="addenda-list">
          <div v-for="(_, i) in entry.addenda" :key="i" class="addendum">
            <p>{{ t(`entries.${entry.id}.addenda[${i}]`) }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-else class="not-found">
    <h1>{{ t('entry.notFound') }}</h1>
    <p>{{ t('entry.notFoundDesc') }}</p>
    <router-link to="/catalog" class="btn btn-primary">{{ t('entry.returnToCatalog') }}</router-link>
  </div>
</template>

<style scoped>
.entry-view {
  max-width: var(--max-content);
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: var(--space-xl);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-accent);
}

.entry-header {
  margin-bottom: var(--space-lg);
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.entry-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  line-height: 1.2;
  margin-bottom: var(--space-md);
}

.entry-id {
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.entry-name {
  color: var(--text-primary);
}

.entry-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

@media (max-width: 480px) {
  .entry-info {
    gap: var(--space-sm);
    font-size: var(--text-xs);
  }

  .section-content {
    padding-left: var(--space-md);
  }
}

.info-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-2xl);
}

.tag {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  color: var(--text-tertiary);
  border: 1px solid var(--border-subtle);
}

.entry-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-subtle);
}

.section-icon {
  color: var(--color-primary);
  font-size: var(--text-base);
}

.section-content {
  padding-left: var(--space-lg);
  border-left: 2px solid var(--border-subtle);
}

.section-content p {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.object-class-display {
  padding: var(--space-md) 0;
}

.class-badge-lg {
  font-size: var(--text-sm) !important;
  padding: 4px 16px !important;
}

.addenda-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.addendum {
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.addendum p {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.not-found {
  text-align: center;
  padding: var(--space-3xl) 0;
}

.not-found h1 {
  margin-bottom: var(--space-sm);
}

.not-found p {
  margin-bottom: var(--space-xl);
  color: var(--text-secondary);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 22px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  color: var(--text-inverse);
}
</style>
