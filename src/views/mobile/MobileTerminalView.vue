<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { bootstrapTerminal, type BootstrapResult } from '@/terminal/bootstrap'
import { createTerminalStorage, type TerminalStorage } from '@/terminal/storage'

const { t } = useI18n()
const { theme } = useTheme()
const auth = useAuthStore()

const terminalContainer = ref<HTMLDivElement>()
const visible = ref(false)
const terminalReady = ref(false)
let result: BootstrapResult | null = null
let storage: TerminalStorage | null = null

const userName = computed(() => auth.user?.codename || 'researcher')

async function initTerminal() {
  if (!terminalContainer.value) return

  // Initialize storage once (survives theme toggles)
  if (!storage) {
    storage = await createTerminalStorage()
  }

  // Save state before disposing (theme toggle destroys the terminal)
  if (result) {
    await result.save()
    result.dispose()
    result = null
  }

  terminalReady.value = false
  result = bootstrapTerminal(terminalContainer.value, theme.value, storage)
  requestAnimationFrame(() => {
    terminalReady.value = true
  })
}

onMounted(async () => {
  await nextTick()
  await initTerminal()
  requestAnimationFrame(() => {
    visible.value = true
  })
})

onBeforeUnmount(async () => {
  if (result) {
    await result.save()
    result.dispose()
    result = null
  }
})

watch(theme, async () => {
  await nextTick()
  await initTerminal()
})
</script>

<template>
  <div class="m-terminal" :class="{ visible }">
    <!-- Header -->
    <header class="m-terminal-header">
      <div class="m-header-left">
        <span class="m-header-icon">⏣</span>
        <span class="m-header-title">{{ t('nav.terminal') }}</span>
      </div>
      <div class="m-header-right">
        <span class="m-status-dot"></span>
        <span class="m-status-text">{{ t('terminal.status') }}</span>
      </div>
    </header>

    <!-- Terminal wrapper -->
    <div class="m-terminal-wrapper" :class="{ ready: terminalReady }">
      <!-- Chrome -->
      <div class="m-chrome">
        <div class="m-chrome-left">
          <div class="m-chrome-dots">
            <span class="m-dot m-dot-close"></span>
            <span class="m-dot m-dot-minimize"></span>
            <span class="m-dot m-dot-maximize"></span>
          </div>
          <span class="m-chrome-title">{{ userName }}@LATOM-7</span>
        </div>
        <span class="m-chrome-badge">bash</span>
      </div>

      <!-- Terminal body -->
      <div class="m-terminal-body">
        <div ref="terminalContainer" class="m-terminal-container"></div>
        <div class="m-scanlines"></div>
      </div>

      <!-- Status bar -->
      <div class="m-statusbar">
        <span class="m-statusbar-item">
          <span class="m-statusbar-dot"></span>
          {{ t('terminal.statusConnected') }}
        </span>
        <span class="m-statusbar-item">UTF-8</span>
        <span class="m-statusbar-item">xterm</span>
      </div>
    </div>

    <!-- Footer hints -->
    <footer class="m-terminal-footer">
      <span class="m-hint">
        <span class="m-hint-key">help</span>
        {{ t('terminal.hintHelp') }}
      </span>
      <span class="m-hint-sep">·</span>
      <span class="m-hint">
        <span class="m-hint-key">Tab</span>
        {{ t('terminal.hintTab') }}
      </span>
    </footer>
  </div>
</template>

<style scoped>
.m-terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-md);
  position: relative;
  opacity: 0;
  transform: translateY(12px);
  transition: all 600ms var(--ease-out-expo);
}

.m-terminal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ═══ Header ═══ */
.m-terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  flex-shrink: 0;
  animation: fade-up 500ms var(--ease-out-expo) 100ms backwards;
}

.m-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.m-header-icon {
  font-size: var(--text-lg);
  color: var(--color-primary);
  filter: drop-shadow(0 0 6px var(--color-primary-muted));
}

.m-header-title {
  font-size: var(--text-base);
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.01em;
}

.m-header-right {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: var(--color-success-muted);
  border: 1px solid rgba(74, 222, 128, 0.12);
  border-radius: var(--radius-full);
}

.m-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
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

.m-status-text {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-success);
  font-weight: 600;
  letter-spacing: 0.04em;
}

/* ═══ Terminal Wrapper ═══ */
.m-terminal-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  box-shadow:
    var(--shadow-md),
    0 0 0 1px var(--border-subtle);
  min-height: 0;
  opacity: 0;
  transform: translateY(8px) scale(0.995);
  transition: all 500ms var(--ease-out-expo);
  transition-delay: 150ms;
}

.m-terminal-wrapper.ready {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ═══ Chrome ═══ */
.m-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 34px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.m-chrome-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.m-chrome-dots {
  display: flex;
  gap: 5px;
}

.m-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.m-dot-close {
  background: #ef4444;
}

.m-dot-minimize {
  background: #facc15;
}

.m-dot-maximize {
  background: #4ade80;
}

.m-chrome-title {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
}

.m-chrome-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-tertiary);
  padding: 1px 6px;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

/* ═══ Terminal Body ═══ */
.m-terminal-body {
  flex: 1;
  position: relative;
  min-height: 0;
  background: var(--bg-primary);
}

.m-terminal-container {
  position: absolute;
  inset: 0;
  padding: 2px;
}

.m-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.025) 2px,
    rgba(0, 0, 0, 0.025) 4px
  );
  z-index: 1;
  opacity: 0.3;
}

[data-theme='light'] .m-scanlines {
  opacity: 0.1;
}

.m-terminal-container :deep(.xterm) {
  height: 100%;
  padding: 2px 0;
}

.m-terminal-container :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.m-terminal-container :deep(.xterm-cursor-layer) {
  z-index: 2;
}

/* ═══ Status Bar ═══ */
.m-statusbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: 0 12px;
  height: 24px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.m-statusbar-item {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
  letter-spacing: 0.02em;
}

.m-statusbar-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 3px var(--color-success);
}

/* ═══ Footer ═══ */
.m-terminal-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0 0;
  flex-shrink: 0;
  animation: fade-up 500ms var(--ease-out-expo) 400ms backwards;
}

.m-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
}

.m-hint-key {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
  padding: 0px 5px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  line-height: 1.5;
}

.m-hint-sep {
  color: var(--border-default);
  font-size: 10px;
}
</style>
