<script setup lang="ts">
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const auth = useAuthStore()
const route = useRoute()

const showShell = computed(() => auth.isAuthenticated && auth.isAdmin && route.name !== 'login' && route.name !== 'unauthorized')
</script>

<template>
  <template v-if="showShell">
    <AdminHeader />
    <AdminSidebar />
    <main class="admin-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>
  </template>
  <template v-else>
    <RouterView />
  </template>
</template>

<style>
@import './styles/base.css';
@import './styles/admin.css';
</style>
