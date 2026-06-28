<script setup lang="ts">
import { useDevice } from '@/composables/useDevice'
import { defineAsyncComponent, type Component } from 'vue'

const props = defineProps<{
  desktop: () => Promise<Component>
  mobile: () => Promise<Component>
}>()

const { isMobile } = useDevice()

const DesktopComponent = defineAsyncComponent(props.desktop)
const MobileComponent = defineAsyncComponent(props.mobile)
</script>

<template>
  <MobileComponent v-if="isMobile" />
  <DesktopComponent v-else />
</template>
