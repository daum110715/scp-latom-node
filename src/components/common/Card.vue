<script setup lang="ts">
defineProps<{
  hoverable?: boolean
}>()
</script>

<template>
  <div class="card" :class="{ hoverable }">
    <slot />
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all 400ms var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--color-primary-muted), transparent 40%);
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.hoverable {
  cursor: pointer;
}

.hoverable:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-md), 0 0 0 1px var(--color-primary-muted);
  transform: translateY(-4px);
}

.hoverable:hover::before {
  opacity: 1;
}

.hoverable::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-muted), transparent 60%);
  opacity: 0;
  transition: opacity 400ms var(--ease-out-expo);
  pointer-events: none;
}

.hoverable:hover::after {
  opacity: 1;
}
</style>
