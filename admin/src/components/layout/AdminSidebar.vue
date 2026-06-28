<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref } from 'vue'

const route = useRoute()
const collapsed = ref(false)

const navItems = [
  { path: '/', name: 'dashboard', label: 'Dashboard', icon: '◈' },
  { path: '/users', name: 'users', label: 'Users', icon: '◉' },
  { path: '/entries', name: 'entries', label: 'Content', icon: '☰' },
  { path: '/proposals', name: 'proposals', label: 'Proposals', icon: '◇' },
  { path: '/logs', name: 'logs', label: 'Logs', icon: '▣' },
  { path: '/settings', name: 'settings', label: 'Settings', icon: '⚙' },
]

function toggle() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <aside class="admin-sidebar" :class="{ collapsed }">
    <div class="sidebar-brand">
      <div class="brand-icon">◈</div>
      <div v-if="!collapsed" class="brand-text">
        <div class="brand-title">SCP FOUNDATION</div>
        <div class="brand-subtitle">ADMIN TERMINAL</div>
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
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-divider"></div>
      <div v-if="!collapsed" class="sidebar-info">
        <div class="info-row">
          <span class="info-label">NODE</span>
          <span class="info-value">ADMIN-01</span>
        </div>
        <div class="info-row">
          <span class="info-label">STATUS</span>
          <span class="status-dot"></span>
          <span class="info-value">ACTIVE</span>
        </div>
        <div class="info-row">
          <span class="info-label">ACCESS</span>
          <span class="info-value level-5">LEVEL 5</span>
        </div>
      </div>
    </div>

    <button class="collapse-btn" :title="collapsed ? 'Expand' : 'Collapse'" @click="toggle">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline :points="collapsed ? '6 3 11 8 6 13' : '10 3 5 8 10 13'" />
      </svg>
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
  font-size: var(--text-2xl);
  color: var(--color-primary);
  width: 32px;
  text-align: center;
  flex-shrink: 0;
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
  font-size: var(--text-lg);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
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
