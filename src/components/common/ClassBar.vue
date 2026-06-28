<script setup lang="ts">
import type { ObjectClass } from '@/types'

defineProps<{
  objectClass: ObjectClass
  showLabel?: boolean
}>()

const classColors: Record<ObjectClass, string> = {
  Safe: 'var(--class-safe)',
  Euclid: 'var(--class-euclid)',
  Keter: 'var(--class-keter)',
  Thaumiel: 'var(--class-thaumiel)',
  Apollyon: 'var(--class-apollyon)',
  Neutralized: 'var(--class-neutralized)',
}
</script>

<template>
  <div class="class-bar" :title="objectClass">
    <div
      class="class-indicator"
      :style="{
        background: classColors[objectClass],
        boxShadow: `0 0 8px ${classColors[objectClass]}`,
      }"
    />
    <span v-if="showLabel" class="class-label">{{ objectClass }}</span>
  </div>
</template>

<style scoped>
.class-bar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.class-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  animation: indicator-pulse 3s ease-in-out infinite;
}

@keyframes indicator-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.class-bar:hover .class-indicator {
  transform: scale(1.4);
  animation: none;
}

.class-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.class-bar:hover .class-label {
  color: var(--text-primary);
}
</style>
