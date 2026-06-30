<script setup lang="ts">
import { useTerminal } from '@/composables/useTerminal'

const { t, router, terminalContainer, visible, launched, terminalReady, launch, exitTerminal } =
  useTerminal()
</script>

<template>
  <!-- Confirmation Gate -->
  <div v-if="!launched" class="terminal-page" :class="{ visible }">
    <div class="confirm-card">
      <div class="confirm-icon">⏣</div>
      <h2 class="confirm-title">{{ t('terminal.confirmTitle') }}</h2>
      <p class="confirm-desc">{{ t('terminal.confirmDesc') }}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="router.push('/')">
          {{ t('terminal.confirmBack') }}
        </button>
        <button class="btn btn-primary" @click="launch">
          <span class="btn-dot"></span>
          {{ t('terminal.confirmLaunch') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Full-Screen Terminal -->
  <Teleport to="body">
    <div v-if="launched" class="terminal-fullscreen" :class="{ ready: terminalReady }">
      <div ref="terminalContainer" class="terminal-container-fs"></div>
      <button class="exit-btn" :title="t('terminal.exitTerminal')" @click="exitTerminal">✕</button>
    </div>
  </Teleport>
</template>

<style scoped>
/* ═══ Confirmation Gate ═══ */
.terminal-page {
  height: calc(100vh - var(--header-height) - var(--space-2xl) * 2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  opacity: 0;
  transform: translateY(16px);
  transition: all 800ms var(--ease-out-expo);
}

.terminal-page.visible {
  opacity: 1;
  transform: translateY(0);
}

.confirm-card {
  max-width: 440px;
  width: 100%;
  text-align: center;
  padding: var(--space-2xl) var(--space-xl);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-lg);
  animation: fade-up 600ms var(--ease-out-expo) 200ms backwards;
}

.confirm-icon {
  font-size: 48px;
  color: var(--color-primary);
  filter: drop-shadow(0 0 12px var(--color-primary-muted));
  margin-bottom: var(--space-lg);
}

.confirm-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.confirm-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-xl);
}

.confirm-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.btn {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: 0.02em;
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--color-primary-muted);
}

.btn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ═══ Full-Screen Terminal ═══ */
/*  The wrapper itself is always opaque so xterm can measure the container
    correctly.  The fade-in is applied to the xterm element inside it.      */
.terminal-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0c0c14;
}

[data-theme='light'] .terminal-fullscreen {
  background: #f6f6fc;
}

.terminal-container-fs {
  position: absolute;
  inset: 0;
  padding: 4px 8px;
  opacity: 0;
  transition: opacity 400ms ease;
}

.terminal-fullscreen.ready .terminal-container-fs {
  opacity: 1;
}

.terminal-container-fs :deep(.xterm) {
  height: 100%;
  padding: 4px 0;
}

.terminal-container-fs :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.terminal-container-fs :deep(.xterm-screen) {
  height: 100%;
}

.terminal-container-fs :deep(.xterm-cursor-layer) {
  z-index: 2;
}

.exit-btn {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 10000;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6b6b82;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
}

.terminal-fullscreen:hover .exit-btn {
  opacity: 1;
}

.exit-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.2);
}

[data-theme='light'] .exit-btn {
  color: #7a7a92;
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .exit-btn:hover {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.15);
}

/* ═══ Mobile Responsive ═══ */
@media (max-width: 768px) {
  .terminal-page {
    height: calc(100dvh - 52px - 56px - var(--space-lg) * 2);
    padding: var(--space-md);
    transform: translateY(12px);
    transition-duration: 600ms;
  }

  .confirm-card {
    max-width: 360px;
    padding: var(--space-xl) var(--space-lg);
  }

  .confirm-icon {
    font-size: 40px;
    margin-bottom: var(--space-md);
  }

  .confirm-title {
    font-size: var(--text-lg);
    margin-bottom: var(--space-xs);
  }

  .confirm-desc {
    margin-bottom: var(--space-lg);
  }

  .confirm-actions {
    gap: var(--space-sm);
  }

  .btn {
    padding: 10px 20px;
  }

  .btn-primary {
    gap: 6px;
  }

  .btn-primary:hover {
    transform: none;
    box-shadow: none;
  }

  .terminal-container-fs {
    padding: 2px 4px;
  }

  .terminal-container-fs :deep(.xterm) {
    padding: 2px 0;
  }

  .exit-btn {
    top: 8px;
    right: 10px;
    width: 36px;
    height: 36px;
    font-size: 16px;
    opacity: 1;
  }

  .terminal-fullscreen:hover .exit-btn {
    opacity: 1;
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
