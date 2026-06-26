<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: '◈' },
  { path: '/catalog', labelKey: 'nav.catalog', icon: '☰' },
  { path: '/documents', labelKey: 'nav.documents', icon: '◫' },
  { path: '/about', labelKey: 'nav.about', icon: '◎' },
]
</script>

<template>
  <aside class="sidebar">
    <nav class="nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path)) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ t(item.labelKey) }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-divider"></div>
      <div class="sidebar-info">
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
          <span class="info-label">{{ t('sidebar.clearance') }}</span>
          <span class="info-value level-4">{{ t('sidebar.level4') }}</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- Mobile bottom nav -->
  <nav class="mobile-nav">
    <router-link
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="mobile-nav-item"
      :class="{ active: route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path)) }"
    >
      <span class="mobile-nav-icon">{{ item.icon }}</span>
      <span class="mobile-nav-label">{{ t(item.labelKey) }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.sidebar {
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
}

.nav {
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
}

.sidebar-footer {
  margin-top: auto;
  padding: 0 var(--space-md);
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
  width: 80px;
}

.info-value {
  color: var(--text-secondary);
}

.level-4 {
  color: var(--color-primary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

/* Mobile nav */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  z-index: var(--z-header);
  padding: 0 var(--space-sm);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: var(--text-xs);
  transition: color var(--transition-fast);
}

.mobile-nav-item.active {
  color: var(--color-primary);
}

.mobile-nav-icon {
  font-size: var(--text-lg);
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .mobile-nav {
    display: flex;
  }
}
</style>
