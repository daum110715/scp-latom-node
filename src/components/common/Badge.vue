<script setup lang="ts">
defineProps<{
  variant?:
    | 'default'
    | 'safe'
    | 'euclid'
    | 'keter'
    | 'thaumiel'
    | 'apollyon'
    | 'neutralized'
    | 'info'
    | 'danger'
}>()
</script>

<template>
  <span class="badge" :class="variant || 'default'">
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.6;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.badge::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 600ms ease;
}

.badge:hover::before {
  transform: translateX(100%);
}

.default {
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.safe {
  background: color-mix(in srgb, var(--class-safe) 15%, transparent);
  color: var(--class-safe);
  border: 1px solid color-mix(in srgb, var(--class-safe) 25%, transparent);
}

.safe:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--class-safe) 30%, transparent);
}

.euclid {
  background: color-mix(in srgb, var(--class-euclid) 15%, transparent);
  color: var(--class-euclid);
  border: 1px solid color-mix(in srgb, var(--class-euclid) 25%, transparent);
}

.euclid:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--class-euclid) 30%, transparent);
}

.keter {
  background: color-mix(in srgb, var(--class-keter) 15%, transparent);
  color: var(--class-keter);
  border: 1px solid color-mix(in srgb, var(--class-keter) 25%, transparent);
}

.keter:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--class-keter) 30%, transparent);
}

.thaumiel {
  background: color-mix(in srgb, var(--class-thaumiel) 15%, transparent);
  color: var(--class-thaumiel);
  border: 1px solid color-mix(in srgb, var(--class-thaumiel) 25%, transparent);
}

.thaumiel:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--class-thaumiel) 30%, transparent);
}

.apollyon {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.neutralized {
  background: color-mix(in srgb, var(--class-neutralized) 15%, transparent);
  color: var(--class-neutralized);
  border: 1px solid color-mix(in srgb, var(--class-neutralized) 25%, transparent);
}

.info {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.info:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 30%, transparent);
}

.danger {
  background: var(--color-danger-muted);
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
}

.danger:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-danger) 30%, transparent);
}
</style>
