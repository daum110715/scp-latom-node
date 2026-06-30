<script setup lang="ts">
import { useActivity } from '@/composables/useActivity'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import type { ObjectClass } from '@/types'

const {
  t,
  activity,
  showClearConfirm,
  setLanguage,
  formatTime,
  handleClear,
  handleDeleteHistory,
  handleRemoveBookmark,
} = useActivity()
</script>

<template>
  <div class="activity">
    <div class="page-header">
      <h1>{{ t('activity.title') }}</h1>
    </div>

    <!-- Tab Bar -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activity.activeTab === 'bookmarks' }"
        @click="activity.setTab('bookmarks')"
      >
        ★ {{ t('activity.bookmarksTab') }}
      </button>
      <button
        class="tab"
        :class="{ active: activity.activeTab === 'history' }"
        @click="activity.setTab('history')"
      >
        ◷ {{ t('activity.historyTab') }}
      </button>
    </div>

    <!-- ═══ Bookmarks Tab ═══ -->
    <template v-if="activity.activeTab === 'bookmarks'">
      <!-- Loading -->
      <div v-if="activity.bookmarkLoading && activity.bookmarks.length === 0" class="loading-state">
        <div v-for="i in 6" :key="i" class="skeleton" />
      </div>

      <!-- Error -->
      <div
        v-else-if="activity.bookmarkError && activity.bookmarks.length === 0"
        class="error-state"
      >
        <span class="error-icon">⚠</span>
        <p>{{ activity.bookmarkError }}</p>
        <button class="retry-btn" @click="activity.loadBookmarks()">
          {{ t('activity.retry') }}
        </button>
      </div>

      <!-- Empty -->
      <div
        v-else-if="activity.bookmarks.length === 0 && !activity.bookmarkLoading"
        class="empty-state"
      >
        <span class="empty-icon">★</span>
        <p>{{ t('bookmarks.empty') }}</p>
        <p class="empty-hint">{{ t('bookmarks.emptyHint') }}</p>
      </div>

      <!-- Bookmark List -->
      <div v-else class="entry-list">
        <div
          v-for="entry in activity.bookmarks"
          :key="`${entry.language}:${entry.scpNumber}`"
          class="entry-row"
        >
          <router-link :to="`/entry/${entry.language}/${entry.scpNumber}`" class="entry-link">
            <div class="entry-left">
              <div class="entry-id-wrap">
                <ClassBar :object-class="(entry.objectClass || 'Safe') as ObjectClass" />
                <span class="entry-id">SCP-{{ String(entry.scpNumber).padStart(3, '0') }}</span>
                <span class="entry-lang">{{ entry.language.toUpperCase() }}</span>
              </div>
              <h3 class="entry-name">{{ entry.name || `SCP-${entry.scpNumber}` }}</h3>
              <p class="entry-meta">
                <Badge v-if="entry.objectClass" :variant="entry.objectClass.toLowerCase() as any">
                  {{ entry.objectClass }}
                </Badge>
                <span class="entry-time">{{ formatTime(entry.createdAt) }}</span>
              </p>
            </div>
          </router-link>
          <button
            class="delete-btn"
            :title="t('bookmarks.remove')"
            @click="handleRemoveBookmark(entry.language, entry.scpNumber)"
          >
            ✕
          </button>
        </div>
      </div>
    </template>

    <!-- ═══ History Tab ═══ -->
    <template v-if="activity.activeTab === 'history'">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="lang-filters">
          <button
            class="lang-btn"
            :class="{ active: activity.langFilter === null }"
            @click="setLanguage(null)"
          >
            {{ t('history.all') }}
          </button>
          <button
            class="lang-btn"
            :class="{ active: activity.langFilter === 'en' }"
            @click="setLanguage('en')"
          >
            EN
          </button>
          <button
            class="lang-btn"
            :class="{ active: activity.langFilter === 'cn' }"
            @click="setLanguage('cn')"
          >
            CN
          </button>
        </div>
        <div class="toolbar-right">
          <span class="results-count">{{
            t('history.entries', { count: activity.historyTotal })
          }}</span>
          <button
            v-if="activity.hasHistoryEntries"
            class="clear-btn"
            @click="showClearConfirm = true"
          >
            {{ t('history.clearAll') }}
          </button>
        </div>
      </div>

      <!-- Clear Confirmation -->
      <div v-if="showClearConfirm" class="confirm-bar">
        <span>{{ t('history.confirmClear') }}</span>
        <button class="confirm-yes" @click="handleClear">{{ t('history.yes') }}</button>
        <button class="confirm-no" @click="showClearConfirm = false">{{ t('history.no') }}</button>
      </div>

      <!-- Loading -->
      <div v-if="activity.historyLoading && !activity.hasHistoryEntries" class="loading-state">
        <div v-for="i in 8" :key="i" class="skeleton" />
      </div>

      <!-- Error -->
      <div v-else-if="activity.historyError && !activity.hasHistoryEntries" class="error-state">
        <span class="error-icon">⚠</span>
        <p>{{ activity.historyError }}</p>
        <button class="retry-btn" @click="activity.fetchHistoryList()">
          {{ t('activity.retry') }}
        </button>
      </div>

      <!-- Empty -->
      <div v-else-if="!activity.hasHistoryEntries && !activity.historyLoading" class="empty-state">
        <span class="empty-icon">◷</span>
        <p>{{ t('history.empty') }}</p>
      </div>

      <!-- History List -->
      <template v-else>
        <div class="entry-list">
          <div v-for="entry in activity.historyEntries" :key="entry.id" class="entry-row">
            <router-link :to="`/entry/${entry.language}/${entry.scp_number}`" class="entry-link">
              <div class="entry-left">
                <div class="entry-id-wrap">
                  <ClassBar :object-class="entry.object_class as ObjectClass" />
                  <span class="entry-id">SCP-{{ String(entry.scp_number).padStart(3, '0') }}</span>
                  <span class="entry-lang">{{ entry.language.toUpperCase() }}</span>
                </div>
                <h3 class="entry-name">{{ entry.name || `SCP-${entry.scp_number}` }}</h3>
                <p class="entry-meta">
                  <Badge :variant="entry.object_class.toLowerCase() as any">
                    {{ entry.object_class }}
                  </Badge>
                  <span class="entry-time"
                    >{{ t('history.visited') }} {{ formatTime(entry.visited_at) }}</span
                  >
                </p>
              </div>
            </router-link>
            <button
              class="delete-btn"
              :title="t('history.delete')"
              @click="handleDeleteHistory(entry.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="activity.historyTotalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="activity.historyPage <= 1"
            @click="activity.setHistoryPage(activity.historyPage - 1)"
          >
            ← Prev
          </button>
          <span class="page-info"
            >Page {{ activity.historyPage }} of {{ activity.historyTotalPages }}</span
          >
          <button
            class="page-btn"
            :disabled="activity.historyPage >= activity.historyTotalPages"
            @click="activity.setHistoryPage(activity.historyPage + 1)"
          >
            Next →
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* ═══ Desktop (default) ═══ */
.activity {
  max-width: var(--max-content);
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-lg);
}

.page-header h1 {
  margin-bottom: var(--space-sm);
}

/* Tabs */
.tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0;
}

.tab {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  bottom: -1px;
}

.tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab.active {
  color: var(--color-primary);
  background: var(--bg-surface);
  border-color: var(--border-subtle);
  border-bottom: 1px solid var(--bg-surface);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.lang-filters {
  display: flex;
  gap: var(--space-xs);
}

.lang-btn {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lang-btn:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.lang-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.results-count {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.clear-btn {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--color-danger);
  color: white;
}

/* Confirm Bar */
.confirm-bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  background: var(--color-danger-muted, rgba(220, 38, 38, 0.1));
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.confirm-yes {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-danger);
  border: none;
  color: white;
  font-size: var(--text-sm);
  cursor: pointer;
}

.confirm-no {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
}

/* Entry List (shared by both tabs) */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.entry-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  transition: all var(--transition-normal);
}

.entry-row:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 16px var(--color-primary-muted);
}

.entry-link {
  flex: 1;
  min-width: 0;
  padding: var(--space-lg);
  text-decoration: none;
  display: block;
}

.entry-left {
  min-width: 0;
}

.entry-id-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.entry-id {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.entry-lang {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
}

.entry-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.entry-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.delete-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-right: var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: var(--color-danger);
  color: white;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-xl);
  padding: var(--space-lg) 0;
}

.page-btn {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* States */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.skeleton {
  height: 80px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.error-state {
  text-align: center;
  padding: var(--space-3xl);
}

.error-icon {
  font-size: 3rem;
  color: var(--color-danger);
  display: block;
  margin-bottom: var(--space-md);
}

.retry-btn {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  background: var(--color-danger);
  border: none;
  color: white;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: var(--space-3xl);
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: var(--space-md);
}

.empty-hint {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
}

/* ═══ Mobile (≤768px) ═══ */
@media (max-width: 768px) {
  .activity {
    max-width: none;
    margin: 0;
    padding: var(--space-md);
  }

  .page-header {
    margin-bottom: var(--space-md);
  }

  .page-header h1 {
    font-size: var(--text-xl);
    margin-bottom: 0;
  }

  /* Tabs */
  .tabs {
    margin-bottom: var(--space-md);
  }

  .tab {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    text-align: center;
  }

  .tab:hover {
    background: transparent;
    color: var(--text-secondary);
  }

  /* Toolbar */
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: var(--space-md);
  }

  .lang-filters {
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-bottom: var(--space-xs);
  }

  .lang-filters::-webkit-scrollbar {
    display: none;
  }

  .lang-btn {
    flex: 0 0 auto;
    padding: 6px 14px;
    font-size: var(--text-xs);
    font-weight: 500;
    white-space: nowrap;
  }

  .lang-btn:hover {
    border-color: var(--border-subtle);
    color: var(--text-secondary);
  }

  .toolbar-right {
    justify-content: space-between;
    margin-top: var(--space-sm);
  }

  .results-count {
    font-size: var(--text-xs);
  }

  .clear-btn {
    padding: 6px 12px;
    font-size: var(--text-xs);
  }

  .clear-btn:hover {
    background: transparent;
    color: var(--color-danger);
  }

  /* Confirm Bar */
  .confirm-bar {
    flex-wrap: wrap;
    margin-bottom: var(--space-md);
  }

  .confirm-bar span {
    flex: 1 0 100%;
    margin-bottom: var(--space-sm);
  }

  .confirm-yes,
  .confirm-no {
    padding: 6px 14px;
  }

  /* Entry List */
  .entry-row:hover {
    border-color: var(--border-subtle);
    box-shadow: none;
  }

  .entry-link {
    padding: var(--space-lg);
  }

  .entry-name {
    font-size: var(--text-base);
  }

  /* Delete button: active instead of hover on touch */
  .delete-btn {
    width: 36px;
    height: 36px;
  }

  .delete-btn:hover {
    background: transparent;
    color: var(--text-tertiary);
  }

  .delete-btn:active {
    background: var(--color-danger);
    color: white;
  }

  /* Pagination */
  .pagination {
    gap: var(--space-md);
    margin-top: var(--space-lg);
    padding: var(--space-md) 0;
  }

  .page-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--border-subtle);
    color: var(--text-secondary);
  }

  /* States */
  .error-state {
    padding: var(--space-3xl) var(--space-lg);
  }

  .error-icon {
    font-size: 2.5rem;
  }

  .empty-state {
    padding: var(--space-3xl) var(--space-lg);
  }

  .empty-icon {
    font-size: 2.5rem;
  }

  .empty-state p {
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }

  .empty-hint {
    margin-top: 0;
  }
}
</style>
