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
  <div class="m-entry" v-if="entry">
    <!-- Back -->
    <router-link to="/catalog" class="m-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ t('entry.back') }}
    </router-link>

    <!-- Header -->
    <div class="m-entry-header">
      <div class="m-entry-meta">
        <ClassBar :object-class="entry.objectClass" :show-label="true" />
        <Badge :variant="entry.objectClass.toLowerCase() as any">{{ t(`classes.${entry.objectClass}`) }}</Badge>
      </div>
      <h1 class="m-entry-title">
        <span class="m-entry-id">SCP-{{ String(entry.number).padStart(3, '0') }}</span>
        <span class="m-entry-name"> — {{ t(`entries.${entry.id}.name`) }}</span>
      </h1>
      <div class="m-entry-info">
        <span>{{ t('entry.author') }} {{ entry.author }}</span>
        <span>{{ t('entry.date') }} {{ entry.date }}</span>
      </div>
    </div>

    <!-- Tags -->
    <div class="m-tags-scroll">
      <div class="m-tags">
        <span v-for="tag in entry.tags" :key="tag" class="m-tag">{{ tag }}</span>
      </div>
    </div>

    <!-- Body -->
    <div class="m-entry-body">
      <section class="m-section">
        <h2 class="m-section-title">
          <span class="m-section-icon">◈</span>
          {{ t('entry.objectClass') }}
        </h2>
        <div class="m-class-display">
          <Badge :variant="entry.objectClass.toLowerCase() as any" class="m-class-badge">
            {{ t(`classes.${entry.objectClass}`) }}
          </Badge>
        </div>
      </section>

      <section class="m-section">
        <h2 class="m-section-title">
          <span class="m-section-icon">◫</span>
          {{ t('entry.containment') }}
        </h2>
        <div class="m-section-content">
          <p>{{ t(`entries.${entry.id}.containment`) }}</p>
        </div>
      </section>

      <section class="m-section">
        <h2 class="m-section-title">
          <span class="m-section-icon">◎</span>
          {{ t('entry.description') }}
        </h2>
        <div class="m-section-content">
          <p>{{ t(`entries.${entry.id}.description`) }}</p>
        </div>
      </section>

      <section v-if="entry.addenda?.length" class="m-section">
        <h2 class="m-section-title">
          <span class="m-section-icon">▣</span>
          {{ t('entry.addenda') }}
        </h2>
        <div class="m-addenda">
          <div v-for="(_, i) in entry.addenda" :key="i" class="m-addendum">
            <p>{{ t(`entries.${entry.id}.addenda[${i}]`) }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-else class="m-not-found">
    <h2>{{ t('entry.notFound') }}</h2>
    <p>{{ t('entry.notFoundDesc') }}</p>
    <router-link to="/catalog" class="m-back-btn">{{ t('entry.returnToCatalog') }}</router-link>
  </div>
</template>

<style scoped>
.m-entry {
  padding: var(--space-md);
}

.m-back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: var(--space-lg);
  padding: var(--space-sm) 0;
}

.m-entry-header {
  margin-bottom: var(--space-lg);
}

.m-entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.m-entry-title {
  font-size: clamp(1.25rem, 5vw, 1.75rem);
  line-height: 1.2;
  margin-bottom: var(--space-md);
}

.m-entry-id {
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.m-entry-name {
  color: var(--text-primary);
}

.m-entry-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.m-tags-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: var(--space-xl);
}

.m-tags-scroll::-webkit-scrollbar {
  display: none;
}

.m-tags {
  display: flex;
  gap: var(--space-sm);
}

.m-tag {
  flex: 0 0 auto;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  color: var(--text-tertiary);
  border: 1px solid var(--border-subtle);
}

.m-entry-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.m-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-subtle);
}

.m-section-icon {
  color: var(--color-primary);
  font-size: var(--text-sm);
}

.m-section-content {
  padding-left: var(--space-md);
  border-left: 2px solid var(--border-subtle);
}

.m-section-content p {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.m-class-display {
  padding: var(--space-sm) 0;
}

.m-class-badge {
  font-size: var(--text-sm) !important;
  padding: 4px 16px !important;
}

.m-addenda {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.m-addendum {
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.m-addendum p {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.m-not-found {
  text-align: center;
  padding: var(--space-3xl) var(--space-lg);
}

.m-not-found h2 {
  margin-bottom: var(--space-sm);
}

.m-not-found p {
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
  font-size: var(--text-sm);
}

.m-back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 12px 24px;
  background: var(--color-primary);
  color: var(--text-inverse);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
}
</style>
