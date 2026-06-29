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
  // Small delay for the boot animation
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
  <div class="terminal-page" :class="{ visible }">
    <!-- Ambient orbs -->
    <div class="orb orb-primary"></div>
    <div class="orb orb-accent"></div>

    <!-- Hero Header -->
    <header class="terminal-hero">
      <div class="hero-content">
        <span class="hero-badge">
          <span class="badge-dot"></span>
          {{ t('terminal.heroBadge') }}
        </span>
        <h1 class="hero-title">
          <span class="title-icon">⏣</span>
          <span class="title-text">{{ t('nav.terminal') }}</span>
        </h1>
        <p class="hero-desc">{{ t('terminal.heroDesc') }}</p>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-label">{{ t('terminal.statNode') }}</span>
          <span class="stat-value">LATOM-7</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">{{ t('terminal.statUser') }}</span>
          <span class="stat-value">{{ userName }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">{{ t('terminal.statStatus') }}</span>
          <span class="stat-value stat-online">
            <span class="online-dot"></span>
            {{ t('terminal.status') }}
          </span>
        </div>
      </div>
    </header>

    <!-- Terminal Container -->
    <div class="terminal-wrapper" :class="{ ready: terminalReady }">
      <!-- Chrome bar -->
      <div class="terminal-chrome">
        <div class="chrome-left">
          <div class="chrome-dots">
            <span class="dot dot-close"></span>
            <span class="dot dot-minimize"></span>
            <span class="dot dot-maximize"></span>
          </div>
          <span class="chrome-title">
            <span class="chrome-icon">▸</span>
            {{ userName }}@LATOM-7 — bash
          </span>
        </div>
        <div class="chrome-right">
          <span class="chrome-badge">bash</span>
          <span class="chrome-badge">{{ t('terminal.chromeSecure') }}</span>
        </div>
      </div>

      <!-- Terminal body -->
      <div class="terminal-body">
        <div ref="terminalContainer" class="terminal-container"></div>
        <!-- Scanline overlay -->
        <div class="scanlines"></div>
      </div>

      <!-- Status bar -->
      <div class="terminal-statusbar">
        <div class="statusbar-left">
          <span class="statusbar-item">
            <span class="statusbar-dot online"></span>
            {{ t('terminal.statusConnected') }}
          </span>
          <span class="statusbar-sep">│</span>
          <span class="statusbar-item">UTF-8</span>
          <span class="statusbar-sep">│</span>
          <span class="statusbar-item">xterm-256color</span>
        </div>
        <div class="statusbar-right">
          <span class="statusbar-item">{{ t('terminal.statusSecure') }}</span>
          <span class="statusbar-sep">│</span>
          <span class="statusbar-item">LATOM-7</span>
        </div>
      </div>
    </div>

    <!-- Footer hints -->
    <footer class="terminal-footer">
      <div class="hint-group">
        <span class="hint-key">help</span>
        <span class="hint-desc">{{ t('terminal.hintHelp') }}</span>
      </div>
      <div class="hint-sep">·</div>
      <div class="hint-group">
        <span class="hint-keys">
          <span class="hint-key">↑</span><span class="hint-key">↓</span>
        </span>
        <span class="hint-desc">{{ t('terminal.hintHistory') }}</span>
      </div>
      <div class="hint-sep">·</div>
      <div class="hint-group">
        <span class="hint-key">Tab</span>
        <span class="hint-desc">{{ t('terminal.hintTab') }}</span>
      </div>
      <div class="hint-sep">·</div>
      <div class="hint-group">
        <span class="hint-keys">
          <span class="hint-key">Ctrl</span><span class="hint-key">L</span>
        </span>
        <span class="hint-desc">{{ t('terminal.hintClear') }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.terminal-page {
  /* 100vh minus header (60px) minus .main top+bottom padding (48px×2) */
  height: calc(100vh - var(--header-height) - var(--space-2xl) * 2);
  display: flex;
  flex-direction: column;
  padding: var(--space-lg);
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(16px);
  transition: all 800ms var(--ease-out-expo);
}

.terminal-page.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ═══ Ambient Orbs ═══ */
.orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 1.5s ease;
}

.terminal-page.visible .orb {
  opacity: 0.08;
}

.orb-primary {
  width: 500px;
  height: 500px;
  background: var(--color-primary);
  top: 5%;
  right: -10%;
  animation: orb-float 20s ease-in-out infinite;
}

.orb-accent {
  width: 400px;
  height: 400px;
  background: var(--color-accent);
  bottom: 10%;
  left: -8%;
  animation: orb-float 25s ease-in-out infinite reverse;
}

@keyframes orb-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -40px) scale(1.05);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}

/* ═══ Hero Header ═══ */
.terminal-hero {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  gap: var(--space-lg);
  flex-shrink: 0;
}

.hero-content {
  min-width: 0;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-success);
  background: var(--color-success-muted);
  border: 1px solid rgba(74, 222, 128, 0.15);
  border-radius: var(--radius-full);
  letter-spacing: 0.04em;
  margin-bottom: var(--space-md);
  animation: fade-up 600ms var(--ease-out-expo) 100ms backwards;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 6px var(--color-success);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 12px var(--color-success);
  }
}

.hero-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: 6px;
  animation: fade-up 600ms var(--ease-out-expo) 200ms backwards;
}

.title-icon {
  font-size: var(--text-2xl);
  color: var(--color-primary);
  filter: drop-shadow(0 0 8px var(--color-primary-muted));
}

.title-text {
  background: linear-gradient(
    135deg,
    var(--text-primary) 0%,
    var(--color-primary) 60%,
    var(--color-accent) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  max-width: 420px;
  animation: fade-up 600ms var(--ease-out-expo) 300ms backwards;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  flex-shrink: 0;
  animation: fade-up 600ms var(--ease-out-expo) 400ms backwards;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.stat-online {
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: 6px;
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: var(--border-subtle);
}

/* ═══ Terminal Wrapper ═══ */
.terminal-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  box-shadow:
    var(--shadow-lg),
    0 0 0 1px var(--border-subtle),
    0 0 60px -20px rgba(201, 164, 74, 0.08);
  min-height: 0;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(12px) scale(0.995);
  transition: all 600ms var(--ease-out-expo);
  transition-delay: 200ms;
}

.terminal-wrapper.ready {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ═══ Chrome Bar ═══ */
.terminal-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-md);
  height: 40px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.chrome-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.chrome-dots {
  display: flex;
  gap: 7px;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  transition: all var(--transition-fast);
  position: relative;
}

.dot::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: inherit;
  filter: brightness(1.2);
}

.dot-close {
  background: #ef4444;
}

.dot-minimize {
  background: #facc15;
}

.dot-maximize {
  background: #4ade80;
}

.chrome-dots:hover .dot {
  filter: brightness(1.15);
  transform: scale(1.05);
}

.chrome-title {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chrome-icon {
  color: var(--color-primary);
  font-size: 10px;
}

.chrome-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chrome-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

/* ═══ Terminal Body ═══ */
.terminal-body {
  flex: 1;
  position: relative;
  min-height: 0;
  background: var(--bg-primary);
}

.terminal-container {
  position: absolute;
  inset: 0;
  padding: var(--space-sm) var(--space-xs);
}

/* Scanline overlay */
.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  z-index: 1;
  opacity: 0.4;
}

[data-theme='light'] .scanlines {
  opacity: 0.15;
}

/* xterm.js overrides */
.terminal-container :deep(.xterm) {
  height: 100%;
  padding: 4px 0;
}

.terminal-container :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.terminal-container :deep(.xterm-screen) {
  height: 100%;
}

.terminal-container :deep(.xterm-cursor-layer) {
  z-index: 2;
}

/* ═══ Status Bar ═══ */
.terminal-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-md);
  height: 28px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.statusbar-item {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 5px;
  letter-spacing: 0.02em;
}

.statusbar-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.statusbar-dot.online {
  background: var(--color-success);
  box-shadow: 0 0 4px var(--color-success);
}

.statusbar-sep {
  color: var(--border-subtle);
  font-size: 10px;
  user-select: none;
}

/* ═══ Footer Hints ═══ */
.terminal-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md) 0 0;
  flex-shrink: 0;
  animation: fade-up 600ms var(--ease-out-expo) 600ms backwards;
}

.hint-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.hint-keys {
  display: flex;
  gap: 3px;
}

.hint-key {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  padding: 1px 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  line-height: 1.4;
}

.hint-desc {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}

.hint-sep {
  color: var(--border-default);
  font-size: 12px;
  user-select: none;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .terminal-page {
    padding: var(--space-md);
  }

  .terminal-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }

  .hero-stats {
    width: 100%;
    justify-content: center;
  }

  .hero-desc {
    max-width: 100%;
  }

  .terminal-footer {
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .hint-sep {
    display: none;
  }

  .orb {
    display: none;
  }
}
</style>
