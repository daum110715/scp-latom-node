<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visible = ref(false)
onMounted(() => {
  requestAnimationFrame(() => (visible.value = true))
})
</script>

<template>
  <section class="hero" :class="{ visible }">
    <div class="hero-bg">
      <div class="grid-pattern"></div>
    </div>
    <div class="hero-content">
      <div class="hero-badge">
        <span class="pulse-dot"></span>
        <span>{{ t('hero.badge') }}</span>
      </div>
      <h1 class="hero-title">
        <span class="title-line">{{ t('hero.titleLine') }}</span>
        <span class="title-accent">{{ t('hero.titleAccent') }}</span>
      </h1>
      <p class="hero-description">{{ t('hero.description') }}</p>
      <div class="hero-actions">
        <router-link to="/catalog" class="btn btn-primary">
          <span>{{ t('hero.browseCatalog') }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </router-link>
        <router-link to="/about" class="btn btn-ghost">{{ t('hero.learnMore') }}</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding: var(--pad-page) 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(16px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero.visible {
  opacity: 1;
  transform: translateY(0);
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.grid-pattern {
  position: absolute;
  inset: -20%;
  background-image:
    linear-gradient(var(--border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.3;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
  letter-spacing: 0.04em;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px var(--color-success); }
  50% { opacity: 0.6; box-shadow: 0 0 8px var(--color-success); }
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: var(--space-lg);
}

.title-line {
  display: block;
  color: var(--text-primary);
}

.title-accent {
  display: block;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  max-width: 560px;
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
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

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}

.btn-ghost:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.75rem;
  }

  .hero-description {
    font-size: var(--text-base);
  }
}
</style>
