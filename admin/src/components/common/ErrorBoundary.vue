<script setup lang="ts">
import { ref, onErrorCaptured, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ErrorCode } from '@/services/errors'
import { logger } from '@/services/logger'

const props = withDefaults(
  defineProps<{
    fallbackCode?: ErrorCode
  }>(),
  {
    fallbackCode: ErrorCode.SERVER_ERROR,
  },
)

const route = useRoute()

const hasError = ref(false)
const errorCode = ref<ErrorCode>(props.fallbackCode)
const errorMessage = ref('')
const timestamp = ref('')

onErrorCaptured((err: Error) => {
  hasError.value = true
  errorCode.value = props.fallbackCode
  errorMessage.value = err.message || 'A rendering error has occurred.'
  timestamp.value = new Date().toISOString()
  logger.error('Component error caught by ErrorBoundary', {
    error: err.message,
    stack: err.stack,
  })
  return false
})

watch(
  () => route.fullPath,
  () => {
    if (hasError.value) {
      hasError.value = false
      errorMessage.value = ''
    }
  },
)

function handleRetry() {
  hasError.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-icon">⚠</div>
    <h1 class="error-title">System Malfunction</h1>
    <p class="error-detail">{{ errorMessage }}</p>
    <div class="error-meta">
      <div class="meta-row">
        <span class="meta-label">Error Code</span>
        <span class="meta-value">{{ errorCode }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Timestamp</span>
        <span class="meta-value">{{ timestamp }}</span>
      </div>
    </div>
    <div class="error-actions">
      <button class="btn btn-primary" @click="handleRetry">Retry</button>
      <router-link to="/" class="btn btn-ghost">Return to Dashboard</router-link>
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

.error-icon {
  font-size: 4rem;
  color: var(--color-danger);
  margin-bottom: var(--space-lg);
}

.error-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.error-detail {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  margin-bottom: var(--space-xl);
  max-width: 460px;
  word-break: break-word;
}

.error-meta {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-xl);
  text-align: left;
  min-width: 280px;
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
</style>
