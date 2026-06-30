<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ChevronLeft,
  ChevronRight,
  Diamond,
  FileText,
  Fingerprint,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const collapsed = ref(false)

const navItems = computed(() => [
  { path: '/', name: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  { path: '/users', name: 'users', label: t('nav.users'), icon: Users },
  { path: '/entries', name: 'entries', label: t('nav.entries'), icon: FileText },
  { path: '/proposals', name: 'proposals', label: t('nav.proposals'), icon: Diamond },
  { path: '/logs', name: 'logs', label: t('nav.logs'), icon: ScrollText },
  { path: '/settings', name: 'settings', label: t('nav.settings'), icon: Settings },
])

function toggle() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <aside class="admin-sidebar" :class="{ collapsed }">
    <div class="sidebar-brand">
      <div class="brand-icon"><Fingerprint :size="28" :stroke-width="1.75" /></div>
      <div v-if="!collapsed" class="brand-text">
        <div class="brand-title">{{ t('sidebar.brandTitle') }}</div>
        <div class="brand-subtitle">{{ t('sidebar.brandSubtitle') }}</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{
          active:
            route.name === item.name ||
            (item.name !== 'dashboard' && route.path.startsWith(item.path)),
        }"
        :title="collapsed ? item.label : undefined"
      >
        <span class="nav-icon"><component :is="item.icon" :size="18" /></span>
        <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-divider"></div>
      <div v-if="!collapsed" class="sidebar-info">
        <div class="info-row">
          <span class="info-label">{{ t('sidebar.node') }}</span>
          <span class="info-value">{{ t('sidebar.nodeValue') }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('sidebar.status') }}</span>
          <span class="status-dot"></span>
          <span class="info-value">{{ t('sidebar.active') }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('sidebar.access') }}</span>
          <span class="info-value level-5">{{ t('sidebar.level5') }}</span>
        </div>
      </div>
    </div>

    <button
      class="collapse-btn"
      :title="collapsed ? t('sidebar.expand') : t('sidebar.collapse')"
      @click="toggle"
    >
      <ChevronRight v-if="collapsed" :size="16" :stroke-width="1.5" />
      <ChevronLeft v-else :size="16" :stroke-width="1.5" />
    </button>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  position: fixed;
  top: var(--header-height);
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  z-index: var(--z-sidebar);
  padding: var(--space-md) 0;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width var(--transition-normal);
}

.admin-sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-lg);
}

.brand-icon {
  color: var(--color-primary);
  width: 32px;
  height: 32px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  overflow: hidden;
  white-space: nowrap;
}

.brand-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.1em;
}

.brand-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--space-sm);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-fast);
  position: relative;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
}

.nav-icon {
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  overflow: hidden;
  transition: opacity var(--transition-fast);
}

.sidebar-footer {
  margin-top: auto;
  padding: 0 var(--space-md);
  overflow: hidden;
  transition: opacity var(--transition-fast);
}

.collapsed .sidebar-footer {
  opacity: 0;
  pointer-events: none;
}

.sidebar-divider {
  height: 1px;
  background: var(--border-subtle);
  margin-bottom: var(--space-md);
}

.sidebar-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.info-label {
  color: var(--text-tertiary);
  width: 60px;
}

.info-value {
  color: var(--text-secondary);
}

.level-5 {
  color: var(--color-primary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.collapse-btn {
  position: absolute;
  bottom: var(--space-md);
  right: var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.collapse-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.collapsed .collapse-btn {
  right: 50%;
  transform: translateX(50%);
}
</style>
