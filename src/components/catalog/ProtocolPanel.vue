<script setup lang="ts">
import { useCatalog, INTERVAL_OPTIONS } from '@/composables/useCatalog'

const { t, protocol, protocolVisible, ringRadius, ringCircumference, ringOffset, switchProtocol } =
  useCatalog()
</script>

<template>
  <div class="protocol-panel" :class="{ visible: protocolVisible }">
    <!-- Scanner line effect -->
    <div
      class="scanner-line"
      :class="{ active: protocol.mode.value === 'auto' && !protocol.isPaused.value }"
    />

    <!-- Panel header -->
    <div class="protocol-top">
      <div class="protocol-title-row">
        <span class="protocol-icon-wrap">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <span class="protocol-label">{{ t('catalog.protocol.title') }}</span>
        <span class="protocol-divider" />
        <span
          class="protocol-status"
          :class="
            protocol.mode.value === 'auto'
              ? protocol.isPaused.value
                ? 'paused'
                : 'active'
              : 'idle'
          "
        >
          <span class="status-dot" />
          {{
            protocol.mode.value === 'auto'
              ? protocol.isPaused.value
                ? t('catalog.protocol.scannerPaused')
                : t('catalog.protocol.scannerActive')
              : 'STANDBY'
          }}
        </span>
      </div>

      <!-- Segmented toggle -->
      <div class="protocol-segment">
        <div class="segment-track">
          <div class="segment-indicator" :class="{ right: protocol.mode.value === 'manual' }" />
          <button
            class="segment-option"
            :class="{ active: protocol.mode.value === 'auto' }"
            @click="switchProtocol('auto')"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
              <polyline points="21 3 21 12 12 12" />
            </svg>
            {{ t('catalog.protocol.auto') }}
          </button>
          <button
            class="segment-option"
            :class="{ active: protocol.mode.value === 'manual' }"
            @click="switchProtocol('manual')"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              />
            </svg>
            {{ t('catalog.protocol.manual') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Description -->
    <p class="protocol-desc">
      {{
        protocol.mode.value === 'auto'
          ? t('catalog.protocol.autoDesc')
          : t('catalog.protocol.manualDesc')
      }}
    </p>

    <!-- Auto-Operation Controls -->
    <Transition name="slide">
      <div v-if="protocol.mode.value === 'auto'" class="auto-controls">
        <!-- Countdown ring + timer -->
        <div class="auto-timer-group">
          <div class="countdown-ring-wrap">
            <svg class="countdown-ring" :width="48" :height="48" viewBox="0 0 48 48">
              <circle
                class="ring-bg"
                cx="24"
                cy="24"
                :r="ringRadius"
                fill="none"
                stroke-width="3"
              />
              <circle
                class="ring-progress"
                :class="{ paused: protocol.isPaused.value }"
                cx="24"
                cy="24"
                :r="ringRadius"
                fill="none"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringOffset"
                transform="rotate(-90 24 24)"
              />
            </svg>
            <span class="countdown-number" :class="{ paused: protocol.isPaused.value }">
              {{ protocol.countdown.value }}
            </span>
          </div>
          <div class="timer-meta">
            <span class="timer-label">{{ t('catalog.protocol.timerLabel') }}</span>
            <span class="timer-status" :class="protocol.isPaused.value ? 'paused' : 'running'">
              {{
                protocol.isPaused.value
                  ? t('catalog.protocol.autoPaused')
                  : t('catalog.protocol.autoActive')
              }}
            </span>
          </div>
        </div>

        <!-- Interval selector -->
        <div class="interval-selector">
          <span class="interval-label">{{ t('catalog.protocol.intervalLabel') }}</span>
          <div class="interval-options">
            <button
              v-for="opt in INTERVAL_OPTIONS"
              :key="opt"
              class="interval-btn"
              :class="{ active: protocol.interval.value === opt }"
              @click="protocol.setIntervalOption(opt)"
            >
              {{ opt }}{{ t('catalog.protocol.intervalUnit') }}
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="auto-actions">
          <button class="action-btn pause-btn" @click="protocol.togglePause()">
            <svg
              v-if="!protocol.isPaused.value"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            {{
              protocol.isPaused.value ? t('catalog.protocol.resume') : t('catalog.protocol.pause')
            }}
          </button>
          <button
            class="action-btn shuffle-btn"
            :disabled="protocol.transitioning.value"
            @click="protocol.shuffle()"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              :class="{ spinning: protocol.transitioning.value }"
            >
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            {{ t('catalog.protocol.shuffle') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ═══ Protocol Panel ═══ */
.protocol-panel {
  position: relative;
  margin-bottom: var(--space-lg);
  padding: var(--space-lg);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px);
  transition: all 600ms var(--ease-out-expo);
}

.protocol-panel.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Scanner line */
.scanner-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0;
  pointer-events: none;
}

.scanner-line.active {
  opacity: 1;
  animation: scanner-sweep 3s ease-in-out infinite;
}

@keyframes scanner-sweep {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

/* Panel top row */
.protocol-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.protocol-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.protocol-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-muted);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.protocol-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.protocol-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
}

.protocol-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.protocol-status.active {
  color: var(--color-success);
}

.protocol-status.paused {
  color: var(--color-accent);
}

.protocol-status.idle {
  color: var(--text-tertiary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.protocol-status.active .status-dot {
  animation: status-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 6px currentColor;
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* Segmented toggle */
.protocol-segment {
  flex-shrink: 0;
}

.segment-track {
  position: relative;
  display: flex;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 3px;
  gap: 2px;
}

.segment-indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 4px);
  height: calc(100% - 6px);
  background: var(--color-primary-muted);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-radius: var(--radius-full);
  transition: all 300ms var(--ease-out-expo);
  pointer-events: none;
}

.segment-indicator.right {
  transform: translateX(calc(100% + 2px));
}

.segment-option {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: color var(--transition-fast);
  white-space: nowrap;
}

.segment-option:hover {
  color: var(--text-secondary);
}

.segment-option.active {
  color: var(--color-primary);
}

.segment-option svg {
  flex-shrink: 0;
}

/* Description */
.protocol-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  margin-bottom: 0;
}

/* ═══ Auto-Operation Controls ═══ */
.auto-controls {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-subtle);
}

/* Slide transition for auto controls */
.slide-enter-active {
  transition: all 400ms var(--ease-out-expo);
}

.slide-leave-active {
  transition: all 200ms ease-in;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}

.slide-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
}

.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}

/* Timer group */
.auto-timer-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.countdown-ring-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-ring {
  position: absolute;
  inset: 0;
}

.ring-bg {
  stroke: var(--border-subtle);
}

.ring-progress {
  stroke: var(--color-primary);
  transition: stroke-dashoffset 1s linear;
  filter: drop-shadow(0 0 4px var(--color-primary-muted));
}

.ring-progress.paused {
  stroke: var(--text-tertiary);
  filter: none;
}

.countdown-number {
  position: relative;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.countdown-number.paused {
  color: var(--text-tertiary);
}

.timer-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timer-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.timer-status {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.timer-status.running {
  color: var(--color-success);
}

.timer-status.paused {
  color: var(--color-accent);
}

/* Interval selector */
.interval-selector {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.interval-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.interval-options {
  display: flex;
  gap: 2px;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.interval-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.interval-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}

.interval-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-muted);
}

/* Action buttons */
.auto-actions {
  display: flex;
  gap: var(--space-sm);
  margin-left: auto;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.action-btn:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.pause-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.shuffle-btn {
  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  color: var(--color-primary);
}

.shuffle-btn:hover {
  background: var(--color-primary-muted);
  border-color: var(--color-primary);
}

.shuffle-btn svg.spinning {
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .protocol-top {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .auto-controls {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-md);
  }

  .auto-actions {
    margin-left: 0;
  }
}
</style>
