<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visible = ref(false)
let ticking = false

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      visible.value = window.scrollY > 300
      ticking = false
    })
    ticking = true
  }
}

function scrollToTop() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  // Check initial scroll position (e.g. after page refresh)
  visible.value = window.scrollY > 300
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-if="visible"
      class="back-to-top"
      :aria-label="t('backToTop')"
      :title="t('backToTop')"
      @click="scrollToTop"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  bottom: var(--space-2xl);
  right: var(--space-2xl);
  z-index: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: all var(--transition-fast);
}

.back-to-top:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--bg-surface));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.back-to-top:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Transition */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 768px) {
  .back-to-top {
    bottom: calc(var(--nav-height) + var(--space-lg));
    right: var(--space-lg);
    width: 38px;
    height: 38px;
  }
}
</style>
