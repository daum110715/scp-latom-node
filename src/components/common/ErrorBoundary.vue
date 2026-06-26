<script setup lang="ts">
import { ref, onErrorCaptured, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ErrorCode } from '@/services/errors'

const props = withDefaults(defineProps<{
  fallbackCode?: ErrorCode
}>(), {
  fallbackCode: ErrorCode.RENDER_CRASH,
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const hasError = ref(false)
const errorCode = ref<ErrorCode>(props.fallbackCode)
const errorMessage = ref('')
const timestamp = ref('')

onErrorCaptured((err: Error) => {
  hasError.value = true
  errorCode.value = props.fallbackCode
  errorMessage.value = err.message || t(`errors.${props.fallbackCode}`)
  timestamp.value = new Date().toISOString()
  console.error('[ErrorBoundary]', err)
  // Prevent the error from propagating further
  return false
})

// Reset error state on route change
watch(() => route.fullPath, () => {
  if (hasError.value) {
    hasError.value = false
    errorMessage.value = ''
  }
})

function handleRetry() {
  hasError.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="glitch-container">
      <div class="error-code" :data-text="t(`errors.${errorCode}`).slice(0, 3)">⚠</div>
    </div>
    <div class="error-content">
      <div class="error-badge">
        <span class="pulse-dot"></span>
        {{ t('notFound.accessDenied') }}
      </div>
      <h1>{{ t(`errors.${errorCode}`) }}</h1>
      <p v-if="errorMessage" class="error-detail">{{ errorMessage }}</p>
      <div class="error-meta">
        <div class="meta-row">
          <span class="meta-label">{{ t('notFound.errorCode') }}</span>
          <span class="meta-value">{{ errorCode }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">{{ t('notFound.terminal') }}</span>
          <span class="meta-value">LATOM-7</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">{{ t('notFound.timestamp') }}</span>
          <span class="meta-value">{{ timestamp }}</span>
        </div>
      </div>
      <div class="error-actions">
        <button class="btn btn-primary" @click="handleRetry">
          {{ t('errors.retry') }}
        </button>
        <router-link to="/" class="btn btn-secondary">
          {{ t('notFound.returnBtn') }}
        </router-link>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
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
  font-size: clamp(4rem, 10vw, 6rem);
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

.error-detail {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  margin-bottom: var(--space-xl);
  word-break: break-word;
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

.error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
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
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  box-shadow: 0 4px 16px var(--color-primary-muted);
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
