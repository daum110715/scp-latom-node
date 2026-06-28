<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal-content">
        <div class="modal-title">{{ title }}</div>
        <div class="modal-body">{{ message }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="emit('cancel')">Cancel</button>
          <button
            class="btn"
            :class="`btn-${confirmVariant || 'danger'}`"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ loading ? 'Processing...' : (confirmLabel || 'Confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
