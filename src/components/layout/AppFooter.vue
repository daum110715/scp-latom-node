<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-left">
        <span class="footer-brand">{{ t('footer.brand') }}</span>
        <span class="footer-divider">|</span>
        <span class="footer-node">{{ t('footer.system') }}</span>
      </div>
      <div class="footer-right">
        <span class="footer-copy">{{ t('site.tagline') }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--space-3xl);
  padding: var(--space-lg) 0;
  border-top: 1px solid var(--border-subtle);
}

.footer-content {
  max-width: var(--max-content);
  margin: 0 auto;
  padding: 0 var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
}

.footer-brand {
  color: var(--text-secondary);
  font-weight: 600;
}

.footer-divider {
  color: var(--border-default);
}

.footer-node {
  color: var(--text-tertiary);
}

.footer-right {
  font-size: var(--text-sm);
}

.footer-copy {
  color: var(--text-tertiary);
  font-style: italic;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
