<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'safe' | 'euclid' | 'keter' | 'thaumiel' | 'apollyon' | 'neutralized' | 'info' | 'danger'
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
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.6;
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

.euclid {
  background: color-mix(in srgb, var(--class-euclid) 15%, transparent);
  color: var(--class-euclid);
  border: 1px solid color-mix(in srgb, var(--class-euclid) 25%, transparent);
}

.keter {
  background: color-mix(in srgb, var(--class-keter) 15%, transparent);
  color: var(--class-keter);
  border: 1px solid color-mix(in srgb, var(--class-keter) 25%, transparent);
}

.thaumiel {
  background: color-mix(in srgb, var(--class-thaumiel) 15%, transparent);
  color: var(--class-thaumiel);
  border: 1px solid color-mix(in srgb, var(--class-thaumiel) 25%, transparent);
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

.danger {
  background: var(--color-danger-muted);
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
}
</style>
