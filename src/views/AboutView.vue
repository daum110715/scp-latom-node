<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const classKeys = ['safe', 'euclid', 'keter', 'thaumiel', 'apollyon', 'neutralized'] as const
const classColors: Record<string, string> = {
  safe: 'var(--class-safe)',
  euclid: 'var(--class-euclid)',
  keter: 'var(--class-keter)',
  thaumiel: 'var(--class-thaumiel)',
  apollyon: 'var(--text-primary)',
  neutralized: 'var(--class-neutralized)',
}
</script>

<template>
  <div class="about">
    <div class="page-header">
      <h1>{{ t('about.title') }}</h1>
      <p class="page-desc">{{ t('about.description') }}</p>
    </div>

    <div class="about-content">
      <section class="section">
        <div class="section-icon">◈</div>
        <div class="section-body">
          <h2>{{ t('about.foundation.title') }}</h2>
          <p>{{ t('about.foundation.p1') }}</p>
          <p>{{ t('about.foundation.p2') }}</p>
        </div>
      </section>

      <section class="section">
        <div class="section-icon">◫</div>
        <div class="section-body">
          <h2>{{ t('about.latomNode.title') }}</h2>
          <p>{{ t('about.latomNode.p1') }}</p>
          <p>{{ t('about.latomNode.p2') }}</p>
        </div>
      </section>

      <section class="section">
        <div class="section-icon">◎</div>
        <div class="section-body">
          <h2>{{ t('about.classification.title') }}</h2>
          <div class="class-grid">
            <div v-for="cls in classKeys" :key="cls" class="class-card" :class="cls">
              <h3 :style="{ color: classColors[cls] }">{{ t(`about.classification.${cls}.name`) }}</h3>
              <p>{{ t(`about.classification.${cls}.desc`) }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-icon">▣</div>
        <div class="section-body">
          <h2>{{ t('about.system.title') }}</h2>
          <div class="sys-info">
            <div class="sys-row">
              <span class="sys-label">{{ t('about.system.terminal') }}</span>
              <span class="sys-value">LATOM-7</span>
            </div>
            <div class="sys-row">
              <span class="sys-label">{{ t('about.system.version') }}</span>
              <span class="sys-value">7.2.1</span>
            </div>
            <div class="sys-row">
              <span class="sys-label">{{ t('about.system.clearance') }}</span>
              <span class="sys-value accent">{{ t('sidebar.level4') }}</span>
            </div>
            <div class="sys-row">
              <span class="sys-label">{{ t('about.system.status') }}</span>
              <span class="sys-value success">{{ t('about.system.operational') }}</span>
            </div>
            <div class="sys-row">
              <span class="sys-label">{{ t('about.system.lastSync') }}</span>
              <span class="sys-value">{{ new Date().toISOString().split('T')[0] }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.about {
  max-width: var(--max-content);
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-2xl);
}

.page-header h1 {
  margin-bottom: var(--space-sm);
}

.page-desc {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.section {
  display: flex;
  gap: var(--space-lg);
}

.section-icon {
  font-size: var(--text-2xl);
  color: var(--color-primary);
  flex-shrink: 0;
  margin-top: 4px;
}

.section-body {
  flex: 1;
}

.section-body h2 {
  font-size: var(--text-xl);
  margin-bottom: var(--space-md);
}

.section-body p {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-md);
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.class-card {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.class-card h3 {
  font-size: var(--text-base);
  margin-bottom: var(--space-xs);
}

.class-card p {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: 0;
}

.sys-info {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.sys-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.sys-row:not(:last-child) {
  border-bottom: 1px solid var(--border-subtle);
}

.sys-label {
  color: var(--text-tertiary);
}

.sys-value {
  color: var(--text-secondary);
}

.sys-value.accent {
  color: var(--color-primary);
}

.sys-value.success {
  color: var(--color-success);
}

@media (max-width: 640px) {
  .section {
    flex-direction: column;
    gap: var(--space-sm);
  }

  .sys-row {
    flex-direction: column;
    gap: 2px;
    padding: var(--space-xs) var(--space-md);
  }
}
</style>
