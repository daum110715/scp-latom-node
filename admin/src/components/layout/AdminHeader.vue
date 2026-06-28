<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { useRoute } from 'vue-router'

const auth = useAuthStore()
const { theme, toggle: toggleTheme } = useTheme()
const route = useRoute()

const breadcrumbs: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  'user-detail': 'User Detail',
  entries: 'Entries',
  'entry-detail': 'Entry Detail',
  proposals: 'Proposals',
  'proposal-detail': 'Proposal Detail',
  logs: 'Logs',
  settings: 'Settings',
}
</script>

<template>
  <header class="admin-header">
    <div class="header-left">
      <nav class="breadcrumb">
        <router-link to="/">Home</router-link>
        <span class="breadcrumb-sep" v-if="route.name !== 'dashboard'">/</span>
        <span class="breadcrumb-current" v-if="route.name !== 'dashboard'">
          {{ breadcrumbs[route.name as string] || '' }}
        </span>
      </nav>
    </div>
    <div class="header-right">
      <button class="btn btn-icon btn-ghost" @click="toggleTheme" :title="theme === 'dark' ? 'Switch to light' : 'Switch to dark'">
        <span v-if="theme === 'dark'">☀</span>
        <span v-else>☾</span>
      </button>
      <div class="header-user">
        <span class="user-codename">{{ auth.user?.codename }}</span>
        <span class="badge badge-admin">ADMIN</span>
      </div>
      <button class="btn btn-ghost btn-sm" @click="auth.logout()">Logout</button>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  z-index: var(--z-header);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header-user {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.user-codename {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
}
</style>
