<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'
import { useSearchStore } from '@/stores/search'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, SearchX, ChevronRight, Sun, Moon } from 'lucide-vue-next'

const { theme, toggle: toggleTheme } = useTheme()
const { toggleLocale } = useLocale()
const { t } = useI18n()
const search = useSearchStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const breadcrumbs = computed(() => {
  const key = route.meta.titleKey as string
  return key ? t(key) : t('nav.home')
})

// ─── Inline-expanding search (replaces the old full-screen search modal) ───
const searchWrapRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const shortcutEscMeasureRef = ref<HTMLElement | null>(null)
const shortcutCompactMeasureRef = ref<HTMLElement | null>(null)
const selectedIndex = ref(0)
const showSearchDropdown = ref(false)
const isSearchExpanding = ref(false)
const isSearchClosing = ref(false)
const useCompactSearchLabel = ref(false)
const SEARCH_ROUND_DURATION = 70
const SEARCH_EXPAND_DURATION = 220
const SEARCH_CLOSE_DURATION = 320
const SHORTCUT_KEY_CHROME = {
  esc: 18,
  compact: 16,
}
let searchCloseTimer: ReturnType<typeof window.setTimeout> | undefined
let searchLabelTimer: ReturnType<typeof window.setTimeout> | undefined
let searchExpandTimer: ReturnType<typeof window.setTimeout> | undefined
const shortcutEscWidth = ref<number | null>(null)
const shortcutCompactWidth = ref<number | null>(null)

const shortcutKeyStyle = computed(() =>
  (useCompactSearchLabel.value ? shortcutCompactWidth.value : shortcutEscWidth.value)
    ? {
        width: `${useCompactSearchLabel.value ? shortcutCompactWidth.value : shortcutEscWidth.value}px`,
      }
    : undefined,
)

function updateShortcutKeyWidth() {
  nextTick(() => {
    if (shortcutEscMeasureRef.value) {
      shortcutEscWidth.value =
        Math.ceil(shortcutEscMeasureRef.value.getBoundingClientRect().width) +
        SHORTCUT_KEY_CHROME.esc
    }
    if (shortcutCompactMeasureRef.value) {
      shortcutCompactWidth.value =
        Math.ceil(shortcutCompactMeasureRef.value.getBoundingClientRect().width) +
        SHORTCUT_KEY_CHROME.compact
    }
  })
}

const searchResults = computed(() => {
  const items: Array<{ type: string; id: string; title: string; subtitle: string; route: string }> =
    []
  for (const e of search.filteredEntries) {
    items.push({
      type: 'entry',
      id: e.id,
      title: `SCP-${String(e.number).padStart(3, '0')}`,
      subtitle: t(`entries.${e.id}.name`),
      route: `/entry/${e.id}`,
    })
  }
  for (const d of search.filteredDocuments) {
    items.push({
      type: 'document',
      id: d.id,
      title: t(`docs.${d.id}.title`),
      subtitle: t(`documents.types.${d.type}`),
      route: `/documents`,
    })
  }
  return items
})

function expandSearch() {
  if (searchCloseTimer) {
    window.clearTimeout(searchCloseTimer)
    searchCloseTimer = undefined
  }
  if (searchLabelTimer) {
    window.clearTimeout(searchLabelTimer)
    searchLabelTimer = undefined
  }
  if (searchExpandTimer) {
    window.clearTimeout(searchExpandTimer)
    searchExpandTimer = undefined
  }
  isSearchExpanding.value = true
  isSearchClosing.value = false
  useCompactSearchLabel.value = true
  search.open()
  selectedIndex.value = 0
  showSearchDropdown.value = false
  searchLabelTimer = window.setTimeout(() => {
    useCompactSearchLabel.value = false
    searchLabelTimer = undefined
  }, SEARCH_ROUND_DURATION)
  searchExpandTimer = window.setTimeout(() => {
    isSearchExpanding.value = false
    showSearchDropdown.value = true
    searchExpandTimer = undefined
  }, SEARCH_EXPAND_DURATION)
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function collapseSearch() {
  if (!search.isOpen || isSearchClosing.value) return

  showSearchDropdown.value = false
  isSearchExpanding.value = false
  if (searchExpandTimer) {
    window.clearTimeout(searchExpandTimer)
    searchExpandTimer = undefined
  }
  isSearchClosing.value = true
  useCompactSearchLabel.value = false
  searchLabelTimer = window.setTimeout(() => {
    useCompactSearchLabel.value = true
    searchLabelTimer = undefined
  }, SEARCH_ROUND_DURATION)
  searchCloseTimer = window.setTimeout(() => {
    search.close()
    isSearchExpanding.value = false
    isSearchClosing.value = false
    useCompactSearchLabel.value = false
    searchCloseTimer = undefined
  }, SEARCH_CLOSE_DURATION)
}

function navigate(targetRoute: string) {
  router.push(targetRoute)
  collapseSearch()
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && searchResults.value[selectedIndex.value]) {
    navigate(searchResults.value[selectedIndex.value].route)
  } else if (e.key === 'Escape') {
    collapseSearch()
  }
}

function onClickOutside(e: MouseEvent) {
  if (search.isOpen && searchWrapRef.value && !searchWrapRef.value.contains(e.target as Node)) {
    collapseSearch()
  }
}

function globalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (search.isOpen) {
      collapseSearch()
    } else {
      expandSearch()
    }
  }
}

onMounted(() => {
  updateShortcutKeyWidth()
  window.addEventListener('keydown', globalKeydown)
  window.addEventListener('mousedown', onClickOutside)
})

onUnmounted(() => {
  if (searchCloseTimer) {
    window.clearTimeout(searchCloseTimer)
  }
  if (searchLabelTimer) {
    window.clearTimeout(searchLabelTimer)
  }
  if (searchExpandTimer) {
    window.clearTimeout(searchExpandTimer)
  }
  window.removeEventListener('keydown', globalKeydown)
  window.removeEventListener('mousedown', onClickOutside)
})

watch(useCompactSearchLabel, updateShortcutKeyWidth)
</script>

<template>
  <header
    class="header"
    :class="{
      'search-expanded': search.isOpen && !isSearchClosing,
      'search-closing': isSearchClosing,
    }"
  >
    <div class="header-left">
      <router-link to="/" class="logo-link">
        <div class="logo-icon">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2" />
            <circle cx="16" cy="16" r="4" fill="currentColor" />
            <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" stroke-width="2" />
            <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" stroke-width="2" />
            <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" stroke-width="2" />
            <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" stroke-width="2" />
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-title">{{ t('hero.titleLine') }}</span>
          <span class="logo-subtitle">{{ t('hero.titleAccent') }}</span>
        </div>
      </router-link>
    </div>

    <div class="header-center">
      <span class="breadcrumb">{{ breadcrumbs }}</span>
    </div>

    <div class="header-right">
      <!-- 右侧按钮组 - 固定在最右边 -->
      <div class="right-buttons">
        <button class="lang-btn" :title="t('header.langSwitch')" @click="toggleLocale">
          <span class="lang-label">{{ t('header.langSwitch') }}</span>
        </button>

        <button
          class="icon-btn"
          :title="theme === 'dark' ? t('header.lightMode') : t('header.darkMode')"
          @click="toggleTheme"
        >
          <Transition name="fade" mode="out-in">
            <Sun v-if="theme === 'dark'" key="sun" :size="18" />
            <Moon v-else key="moon" :size="18" />
          </Transition>
        </button>

        <!-- Auth: logged in -->
        <router-link
          v-if="auth.isAuthenticated"
          to="/profile"
          class="user-btn"
          :title="t('auth.profile')"
        >
          <div class="user-avatar">{{ auth.user?.codename?.charAt(0).toUpperCase() }}</div>
          <span class="user-codename">{{ auth.user?.codename }}</span>
        </router-link>

        <!-- Auth: logged out -->
        <router-link v-else to="/login" class="login-btn">
          {{ t('auth.loginBtn') }}
        </router-link>
      </div>

      <!-- 搜索区域 - 在按钮组左侧，向左展开（右边缘固定） -->
      <div
        ref="searchWrapRef"
        class="search-container"
        :class="{
          expanded: search.isOpen && !isSearchClosing,
          expanding: isSearchExpanding,
          closing: isSearchClosing,
          'dropdown-open': search.isOpen && !isSearchClosing && showSearchDropdown,
        }"
      >
        <span ref="shortcutEscMeasureRef" class="shortcut-measure">ESC</span>
        <span ref="shortcutCompactMeasureRef" class="shortcut-measure">Ctrl+K</span>

        <button
          v-if="!search.isOpen && !isSearchClosing"
          class="search-btn"
          :title="t('header.searchTitle')"
          @click="expandSearch"
        >
          <span class="search-icon-slot">
            <Search :size="18" />
          </span>
          <span class="search-label">{{ t('header.searchPlaceholder') }}</span>
          <kbd class="shortcut-key">Ctrl+K</kbd>
        </button>

        <div
          v-else
          class="search-input-wrap"
          :class="{ closing: isSearchClosing }"
          @keydown="handleSearchKeydown"
        >
          <span class="search-icon-slot">
            <Search class="search-icon" :size="18" />
          </span>
          <input
            ref="searchInputRef"
            v-model="search.query"
            type="text"
            :placeholder="
              useCompactSearchLabel ? t('header.searchPlaceholder') : t('search.placeholder')
            "
            class="search-input"
            spellcheck="false"
            autocomplete="off"
          />
          <kbd
            class="esc-key"
            :class="{ compact: useCompactSearchLabel }"
            :style="shortcutKeyStyle"
          >
            <Transition name="shortcut" mode="out-in">
              <span :key="useCompactSearchLabel ? 'shortcut' : 'esc'" class="shortcut-value">
                {{ useCompactSearchLabel ? 'Ctrl+K' : 'ESC' }}
              </span>
            </Transition>
          </kbd>
        </div>

        <Transition name="dropdown">
          <div
            v-if="search.isOpen && !isSearchClosing && showSearchDropdown"
            class="search-dropdown"
          >
            <div v-if="searchResults.length > 0" class="results">
              <div class="results-header">
                <span class="results-count">{{
                  t('search.results', { count: searchResults.length })
                }}</span>
              </div>
              <div class="results-list">
                <button
                  v-for="(item, i) in searchResults"
                  :key="item.id"
                  class="result-item"
                  :class="{ selected: i === selectedIndex }"
                  @click="navigate(item.route)"
                  @mouseenter="selectedIndex = i"
                >
                  <span class="result-type" :class="item.type">
                    {{ item.type === 'entry' ? t('search.scp') : t('search.doc') }}
                  </span>
                  <div class="result-text">
                    <span class="result-title">{{ item.title }}</span>
                    <span class="result-subtitle">{{ item.subtitle }}</span>
                  </div>
                  <ChevronRight class="result-arrow" :size="16" />
                </button>
              </div>
            </div>

            <div v-else-if="search.query" class="results empty">
              <div class="empty-state">
                <SearchX class="empty-icon" :size="36" />
                <span class="empty-text">{{ t('search.empty', { query: search.query }) }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  z-index: var(--z-header);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  background: var(--glass-bg);
  animation: header-in 600ms var(--ease-out-expo) backwards;
}

@keyframes header-in {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
}

.header-left {
  flex: none;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.logo-link:hover {
  color: var(--text-primary);
}

.logo-link:hover .logo-icon {
  transform: rotate(90deg);
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: var(--color-primary);
  transition: transform 500ms var(--ease-out-back);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.logo-title {
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-primary);
}

.logo-subtitle {
  font-size: var(--text-xs);
  color: var(--color-primary);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.header-center {
  flex: 1;
  min-width: 0;
  text-align: center;
  transition: transform 220ms var(--ease-out-expo);
}

.header.search-closing .header-center {
  transition-delay: 70ms;
}

.header.search-expanded .header-center {
  transform: translateX(calc((min(420px, 50vw) - 150px) / 6));
}

.breadcrumb {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-weight: 500;
  transition: color var(--transition-fast);
}

.header-right {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
}

/* 右侧按钮组 - 固定在最右边 */
.right-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

/* 搜索容器 - 在按钮组左侧，向左展开（右边缘对齐按钮组左边缘） */
.search-container {
  --search-radius: 10px;
  --search-key-radius: 6px;
  --search-key-inset: 4px;
  --search-key-height: 28px;
  --search-content-height: 28px;
  position: relative;
  display: flex;
  justify-content: flex-end;
  width: 42px;
  flex-shrink: 0;
  max-width: min(420px, 50vw);
  transition: width 220ms var(--ease-out-expo);
}

.search-container.expanded {
  width: min(420px, 50vw);
}

.search-container.closing {
  transition-delay: 70ms;
}

.search-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  width: 100%;
  padding: 0 var(--search-key-inset);
  border-radius: var(--search-radius);
  background: var(--bg-elevated);
  border: 1px solid var(--color-primary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.search-btn:hover {
  border-color: var(--color-primary);
  color: var(--text-primary);
  background: var(--bg-hover);
}

.search-icon-slot {
  width: var(--search-content-height);
  height: var(--search-content-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-icon-slot svg {
  color: var(--color-primary);
  flex-shrink: 0;
  display: block;
}

.search-label {
  display: none;
  min-width: 0;
  color: var(--text-tertiary);
  line-height: var(--search-content-height);
}

.search-btn:hover .search-label {
  color: var(--text-primary);
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--search-key-height);
  line-height: 1;
  padding-inline: 7px;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .search-container {
    width: 150px;
  }

  .search-label {
    display: inline-flex;
    align-items: center;
    flex: 1;
    justify-content: flex-start;
    height: var(--search-content-height);
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: var(--search-content-height);
    white-space: nowrap;
  }
}

kbd {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  box-sizing: border-box;
  height: var(--search-key-height);
  padding: 2px 6px;
  border-radius: var(--search-key-radius);
  background: var(--color-primary-muted);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  display: none;
  overflow: hidden;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
}

kbd span {
  display: inline-block;
}

@media (min-width: 640px) {
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

.search-input-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 36px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 var(--search-key-inset);
  border-radius: var(--search-radius) var(--search-radius) 0 0;
  background: var(--bg-elevated);
  border: 1px solid var(--color-primary);
  transition: border-radius 120ms var(--ease-out-expo);
  transform-origin: right center;
}

.search-container:not(.expanded) .search-input-wrap,
.search-container.expanding .search-input-wrap {
  border-radius: var(--search-radius);
}

.search-container.dropdown-open .search-input-wrap {
  border-bottom-color: transparent;
}

.search-input-wrap .search-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  padding-right: 70px;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-sm);
  line-height: var(--search-content-height);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.esc-key {
  position: absolute;
  top: 50%;
  right: var(--search-key-inset);
  transform: translateY(-50%);
  flex-shrink: 0;
  display: inline-grid;
  grid-template-areas: 'shortcut';
  align-items: center;
  justify-content: center;
  transition:
    width 180ms var(--ease-out-expo),
    padding 180ms var(--ease-out-expo);
}

.esc-key.compact {
  padding-inline: 7px;
}

.esc-key:not(.compact) {
  padding-inline: 8px;
}

.shortcut-measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.shortcut-value {
  grid-area: shortcut;
  white-space: nowrap;
}

.shortcut-enter-active,
.shortcut-leave-active {
  transition:
    opacity 120ms var(--ease-out-expo),
    transform 160ms var(--ease-out-expo);
}

.shortcut-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.92);
}

.shortcut-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.92);
}

.search-dropdown {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  max-height: calc(60vh + 36px);
  padding-top: 35px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--color-primary);
  border-radius: var(--search-radius);
  z-index: 1;
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transform-origin: top center;
  scrollbar-width: none;
}

.search-dropdown::-webkit-scrollbar {
  display: none;
}

.dropdown-enter-active {
  overflow: hidden;
  transition:
    max-height 180ms var(--ease-out-expo),
    opacity 150ms var(--ease-out-expo),
    transform 180ms var(--ease-out-expo);
}

.dropdown-leave-active {
  overflow: hidden;
  transition:
    max-height 120ms var(--ease-out-expo),
    opacity 100ms var(--ease-out-expo),
    transform 120ms var(--ease-out-expo);
}

.dropdown-enter-from,
.dropdown-leave-to {
  max-height: 36px;
  opacity: 0;
  transform: scaleY(0.12);
}

.results-header {
  padding: var(--space-md) var(--space-md) var(--space-sm);
}

.results-count {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.results-list {
  padding: 0 var(--space-sm) var(--space-sm);
}

.result-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 10px var(--space-sm);
  border-radius: var(--radius-md);
  text-align: left;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.result-item.selected,
.result-item:hover {
  background: var(--bg-hover);
}

.result-type {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.result-type.entry {
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.result-type.document {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.result-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.result-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.result-subtitle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-arrow {
  color: var(--color-primary);
  opacity: 0;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.result-item.selected .result-arrow {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl);
}

.empty-icon {
  color: var(--text-tertiary);
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  text-align: center;
}

.lang-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
  transition: all var(--transition-fast);
}

.lang-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
  transform: translateY(-1px);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  overflow: hidden;
}

.icon-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  transform: scale(1.05);
}

/* Auth buttons */
.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--text-inverse);
  font-size: var(--text-xs);
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-fast);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.login-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transform: translateX(-100%);
  transition: transform 500ms ease;
}

.login-btn:hover {
  background: var(--color-primary-hover);
  color: var(--text-inverse);
  box-shadow: 0 4px 16px var(--color-primary-muted);
  transform: translateY(-1px);
}

.login-btn:hover::before {
  transform: translateX(100%);
}

.user-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  height: 36px;
  padding: 0 10px 0 4px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  text-decoration: none;
  transition: all var(--transition-fast);
  max-width: 160px;
}

.user-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
  transform: translateY(-1px);
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-primary-muted);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 700;
  font-family: var(--font-mono);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.user-btn:hover .user-avatar {
  background: var(--color-primary);
  color: var(--text-inverse);
}

.user-codename {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .user-codename {
    display: none;
  }
  .user-btn {
    padding: 4px;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0 var(--space-md);
  }

  .header-center {
    display: none;
  }
}
</style>
