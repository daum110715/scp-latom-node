<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="not-found">
    <div class="glitch-container">
      <div class="error-code" data-text="404">404</div>
      <div class="scanline"></div>
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
  animation: fade-up 600ms var(--ease-out-expo) backwards;
}

.glitch-container {
  margin-bottom: var(--space-xl);
  position: relative;
}

.error-code {
  font-size: clamp(5rem, 12vw, 8rem);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-danger);
  position: relative;
  line-height: 1;
  text-shadow: 0 0 20px var(--color-danger-muted);
  animation: glitch 4s infinite;
}

.error-code::before,
.error-code::after {
  content: '404';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.error-code::before {
  color: var(--color-accent);
  animation: glitch-1 3s infinite;
  clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
}

.error-code::after {
  color: var(--color-primary);
  animation: glitch-2 3s infinite;
  clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
}

@keyframes glitch {
  0%,
  85%,
  100% {
    transform: none;
    opacity: 1;
  }
  86% {
    transform: skewX(4deg) translateX(3px);
    opacity: 0.85;
  }
  87% {
    transform: skewX(-3deg) translateX(-2px);
    opacity: 0.9;
  }
  88% {
    transform: skewX(2deg) translateX(1px);
    opacity: 0.95;
  }
  89% {
    transform: none;
    opacity: 1;
  }
}

@keyframes glitch-1 {
  0%,
  85%,
  100% {
    transform: translate(0);
  }
  86% {
    transform: translate(-4px, -2px);
  }
  87% {
    transform: translate(3px, 1px);
  }
  88% {
    transform: translate(-1px, -1px);
  }
  89% {
    transform: translate(0);
  }
}

@keyframes glitch-2 {
  0%,
  85%,
  100% {
    transform: translate(0);
  }
  86% {
    transform: translate(3px, 2px);
  }
  87% {
    transform: translate(-2px, -1px);
  }
  88% {
    transform: translate(1px, 1px);
  }
  89% {
    transform: translate(0);
  }
}

.scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  animation: scanline-move 8s linear infinite;
  opacity: 0.3;
}

@keyframes scanline-move {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}

.error-content {
  max-width: 460px;
  animation: fade-up 600ms var(--ease-out-expo) 200ms backwards;
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
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 4px var(--color-danger);
  }
  50% {
    opacity: 0.4;
    box-shadow: 0 0 8px var(--color-danger);
  }
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
  transition: all 400ms var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transform: translateX(-100%);
  transition: transform 600ms ease;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  color: var(--text-inverse);
  box-shadow: 0 6px 24px var(--color-primary-muted);
  transform: translateY(-2px);
}

.btn-primary:hover::before {
  transform: translateX(100%);
}
</style>
