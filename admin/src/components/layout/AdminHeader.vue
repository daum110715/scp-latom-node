<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const { theme, toggle: toggleTheme } = useTheme()
const { toggleLocale } = useLocale()
const { t } = useI18n()
const route = useRoute()

const breadcrumbKeys: Record<string, string> = {
  dashboard: 'nav.dashboard',
  users: 'nav.users',
  'user-detail': 'userDetail.breadcrumbUsers',
  entries: 'nav.entries',
  'entry-detail': 'entryDetail.breadcrumbEntries',
  proposals: 'nav.proposals',
  'proposal-detail': 'proposalDetail.breadcrumbProposals',
  logs: 'nav.logs',
  settings: 'nav.settings',
}
</script>

<template>
  <header class="admin-header">
    <div class="header-left">
      <nav class="breadcrumb">
        <router-link to="/">{{ t('header.home') }}</router-link>
        <span v-if="route.name !== 'dashboard'" class="breadcrumb-sep">/</span>
        <span v-if="route.name !== 'dashboard'" class="breadcrumb-current">
          {{ breadcrumbKeys[route.name as string] ? t(breadcrumbKeys[route.name as string]) : '' }}
        </span>
      </nav>
    </div>
    <div class="header-right">
      <button class="btn lang-btn" :title="t('header.langSwitch')" @click="toggleLocale">
        {{ t('header.langSwitch') }}
      </button>
      <button
        class="btn btn-icon btn-ghost"
        :title="theme === 'dark' ? t('header.lightMode') : t('header.darkMode')"
        @click="toggleTheme"
      >
        <span v-if="theme === 'dark'">☀</span>
        <span v-else>☾</span>
      </button>
      <div class="header-user">
        <span class="user-codename">{{ auth.user?.codename }}</span>
        <span class="badge badge-admin">{{ t('header.admin') }}</span>
      </div>
      <button class="btn btn-ghost btn-sm" @click="auth.logout()">{{ t('header.logout') }}</button>
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

.lang-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}

.lang-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
}

.user-codename {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
}
</style>
