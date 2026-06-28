<script setup lang="ts">
defineProps<{
  variant: string
  label?: string
}>()
</script>

<template>
  <span class="badge" :class="`badge-${variant}`">
    <slot>{{ label || variant }}</slot>
  </span>
</template>
