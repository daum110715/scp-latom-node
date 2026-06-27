<script setup lang="ts">
import MobileHeader from './MobileHeader.vue'
import MobileNav from './MobileNav.vue'
</script>

<template>
  <div class="mobile-layout">
    <MobileHeader />
    <main class="mobile-content">
      <slot />
    </main>
    <MobileNav />
  </div>
</template>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  min-height: 100dvh;
}

.mobile-content {
  padding-top: 52px;
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}
</style>
