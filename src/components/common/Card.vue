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
  transition: all var(--transition-normal);
}

.hoverable {
  cursor: pointer;
  position: relative;
}

.hoverable:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.hoverable:hover::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-muted), transparent);
  pointer-events: none;
}
</style>
