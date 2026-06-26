<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="not-found">
    <div class="glitch-container">
      <div class="error-code" data-text="404">404</div>
    </div>
    <div class="error-content">
      <div class="error-badge">
        <span class="pulse-dot"></span>
        {{ t('notFound.accessDenied') }}
      </div>
      <h1>{{ t('notFound.title') }}</h1>
      <p>{{ t('notFound.description') }}</p>
      <div class="error-meta">
        <div class="meta-row">
          <span class="meta-label">{{ t('notFound.errorCode') }}</span>
          <span class="meta-value">{{ t('notFound.errValue') }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">{{ t('notFound.terminal') }}</span>
          <span class="meta-value">LATOM-7</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">{{ t('notFound.timestamp') }}</span>
          <span class="meta-value">{{ new Date().toISOString() }}</span>
        </div>
      </div>
      <router-link to="/" class="btn btn-primary">
        {{ t('notFound.returnBtn') }}
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: var(--space-xl);
}

.glitch-container {
  margin-bottom: var(--space-xl);
}

.error-code {
  font-size: clamp(5rem, 12vw, 8rem);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-danger);
  position: relative;
  line-height: 1;
  text-shadow: 0 0 20px var(--color-danger-muted);
  animation: glitch 3s infinite;
}

@keyframes glitch {
  0%, 90%, 100% { transform: none; opacity: 1; }
  91% { transform: skewX(2deg) translateX(2px); opacity: 0.8; }
  92% { transform: skewX(-2deg) translateX(-2px); opacity: 0.9; }
  93% { transform: none; opacity: 1; }
}

.error-content {
  max-width: 460px;
}

.error-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 14px;
  border-radius: var(--radius-full);
  background: var(--color-danger-muted);
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-danger);
  letter-spacing: 0.08em;
  margin-bottom: var(--space-lg);
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.error-content h1 {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-md);
}

.error-content p {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-xl);
}

.error-meta {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-xl);
  text-align: left;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.meta-label {
  color: var(--text-tertiary);
}

.meta-value {
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
  box-shadow: 0 4px 16px var(--color-primary-muted);
}
</style>
