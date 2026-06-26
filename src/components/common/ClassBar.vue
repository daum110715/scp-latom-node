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
      :style="{ background: classColors[objectClass], boxShadow: `0 0 8px ${classColors[objectClass]}` }"
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
}

.class-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
}
</style>
