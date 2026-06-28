<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon?: string
  trend?: string
  trendUp?: boolean
}>()
</script>

<template>
  <div class="admin-card stats-card">
    <div class="admin-card-header">
      <span class="admin-card-title">{{ label }}</span>
      <span v-if="icon" class="stats-icon">{{ icon }}</span>
    </div>
    <div class="admin-card-value">{{ value }}</div>
    <div v-if="trend" class="stats-trend" :class="{ up: trendUp, down: !trendUp }">
      {{ trend }}
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  position: relative;
  overflow: hidden;
}

.stats-icon {
  font-size: var(--text-xl);
  opacity: 0.3;
}

.stats-trend {
  margin-top: var(--space-xs);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.stats-trend.up {
  color: var(--color-success);
}

.stats-trend.down {
  color: var(--color-danger);
}
</style>
