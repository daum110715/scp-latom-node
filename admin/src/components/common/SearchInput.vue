<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)
let debounce: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v
  },
)

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  localValue.value = val
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => emit('update:modelValue', val), 300)
}
</script>

<template>
  <div class="search-input-wrap">
    <svg
      class="search-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      :value="localValue"
      type="text"
      :placeholder="placeholder || 'Search...'"
      class="input search-input"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  position: relative;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  padding-left: 34px;
  min-width: 240px;
}
</style>
