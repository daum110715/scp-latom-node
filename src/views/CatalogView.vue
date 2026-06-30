<script setup lang="ts">
import { useCatalog } from '@/composables/useCatalog'
import ProtocolPanel from '@/components/catalog/ProtocolPanel.vue'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import type { ObjectClass } from '@/types'

const { t, crawler, protocol, searchQuery, activeClass, objectClasses, toggleClass, setLanguage } =
  useCatalog()
</script>

<template>
  <div class="catalog">
    <div class="page-header">
      <h1>{{ t('catalog.title') }}</h1>
      <p class="page-desc">{{ t('catalog.description') }}</p>
    </div>

    <!-- Language Selector -->
    <div class="lang-bar">
      <button
        class="lang-btn"
        :class="{ active: crawler.language === 'en' }"
        @click="setLanguage('en')"
      >
        EN — SCP Wiki
      </button>
      <button
        class="lang-btn"
        :class="{ active: crawler.language === 'cn' }"
        @click="setLanguage('cn')"
      >
        CN — SCP基金会
      </button>
      <div class="crawl-info">
        <span v-if="crawler.state" class="crawl-status" :class="crawler.state.status">
          {{
            crawler.state.status === 'crawling'
              ? '⟳ Syncing…'
              : crawler.state.status === 'error'
                ? '✗ Sync error'
                : ''
          }}
        </span>
      </div>
    </div>

    <!-- Protocol Mode Panel -->
    <ProtocolPanel />

    <!-- Loading State -->
    <div v-if="crawler.loading && !crawler.hasData" class="loading-state">
      <div
        v-for="i in 10"
        :key="i"
        class="skeleton shimmer"
        :style="{ animationDelay: `${i * 100}ms` }"
      />
    </div>

    <!-- Error State -->
    <div v-else-if="crawler.error && !crawler.hasData" class="error-state">
      <span class="error-icon">⚠</span>
      <p>{{ crawler.error }}</p>
      <button class="retry-btn" @click="crawler.fetchEntries()">Retry</button>
    </div>

    <!-- No Data State -->
    <div v-else-if="!crawler.hasData && !crawler.loading" class="empty-state">
      <span class="empty-icon">∅</span>
      <p>No data available yet.</p>
      <p class="empty-hint">The index is being prepared. Please check back later.</p>
    </div>

    <!-- Data Loaded -->
    <template v-else>
      <!-- Auto-Operation Mode: Recommended Entries -->
      <template v-if="protocol.mode.value === 'auto'">
        <div class="results-info">
          <span class="results-count">
            {{ t('catalog.protocol.recommended') }}
          </span>
          <span class="auto-lang-indicator">
            {{ protocol.crawlerLang.value === 'en' ? 'EN — SCP Wiki' : 'CN — SCP基金会' }}
          </span>
        </div>

        <!-- Loading Recommendations -->
        <div
          v-if="
            protocol.loadingRecommendations.value && protocol.recommendedEntries.value.length === 0
          "
          class="loading-state"
        >
          <div
            v-for="i in 6"
            :key="i"
            class="skeleton shimmer"
            :style="{ animationDelay: `${i * 100}ms` }"
          />
        </div>

        <!-- Transition overlay -->
        <div v-else-if="protocol.transitioning.value" class="transition-overlay">
          <div class="transition-scanner" />
        </div>

        <!-- Recommended Entries Grid -->
        <div v-else :key="protocol.cardEntranceKey.value" class="entries-grid stagger-children">
          <router-link
            v-for="(entry, idx) in protocol.recommendedEntries.value"
            :key="entry.scpNumber"
            :to="'/entry/' + protocol.crawlerLang.value + '/' + entry.scpNumber"
            class="entry-card"
            :class="entry.objectClass.toLowerCase()"
            :style="{ animationDelay: `${idx * 80}ms` }"
          >
            <!-- Class-colored accent bar -->
            <div class="card-accent" />

            <div class="entry-card-header">
              <div class="entry-id-wrap">
                <ClassBar :object-class="entry.objectClass as ObjectClass" />
                <span class="entry-id">SCP-{{ String(entry.scpNumber).padStart(3, '0') }}</span>
              </div>
              <Badge :variant="entry.objectClass.toLowerCase() as any">
                {{ entry.objectClass }}
              </Badge>
            </div>
            <h3 class="entry-name">{{ entry.name || `SCP-${entry.scpNumber}` }}</h3>
            <div class="entry-card-footer">
              <span class="entry-series">Series {{ entry.series }}</span>
              <svg
                class="entry-arrow"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </router-link>
        </div>

        <!-- Entries count -->
        <div v-if="protocol.recommendedEntries.value.length > 0" class="entries-loaded-info">
          {{
            t('catalog.protocol.entriesLoaded', { count: protocol.recommendedEntries.value.length })
          }}
        </div>
      </template>

      <!-- Manual-Operation Mode: Normal Catalog -->
      <template v-else>
        <div class="filters">
          <div class="search-wrap">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('catalog.searchPlaceholder')"
              class="filter-input"
            />
          </div>
          <div class="class-filters">
            <button
              v-for="cls in objectClasses"
              :key="cls"
              class="class-filter-btn"
              :class="{ active: activeClass === cls }"
              @click="toggleClass(cls)"
            >
              <ClassBar :object-class="cls" :show-label="true" />
            </button>
          </div>
        </div>

        <div class="results-info">
          <span class="results-count">
            {{ t('catalog.entriesFound', { count: crawler.total }) }}
          </span>
          <span v-if="crawler.lastCrawlTime" class="last-crawl">
            Updated: {{ crawler.lastCrawlTime.toLocaleString() }}
          </span>
        </div>

        <div class="entries-list stagger-children">
          <router-link
            v-for="entry in crawler.entries"
            :key="entry.scpNumber"
            :to="'/entry/' + crawler.language + '/' + entry.scpNumber"
            class="entry-row"
          >
            <div class="entry-left">
              <div class="entry-id-wrap">
                <ClassBar :object-class="entry.objectClass as ObjectClass" />
                <span class="entry-id">SCP-{{ String(entry.scpNumber).padStart(3, '0') }}</span>
              </div>
              <h3 class="entry-name">{{ entry.name || `SCP-${entry.scpNumber}` }}</h3>
              <p class="entry-class">{{ entry.objectClass }}</p>
            </div>
            <div class="entry-right">
              <Badge :variant="entry.objectClass.toLowerCase() as any">
                {{ entry.objectClass }}
              </Badge>
            </div>
          </router-link>
        </div>

        <!-- Pagination -->
        <div v-if="crawler.totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="crawler.page <= 1"
            @click="crawler.setPage(crawler.page - 1)"
          >
            ← Prev
          </button>
          <span class="page-info"> Page {{ crawler.page }} of {{ crawler.totalPages }} </span>
          <button
            class="page-btn"
            :disabled="crawler.page >= crawler.totalPages"
            @click="crawler.setPage(crawler.page + 1)"
          >
            Next →
          </button>
        </div>

        <div v-if="crawler.entries.length === 0 && !crawler.loading" class="empty-state">
          <span class="empty-icon">∅</span>
          <p>{{ t('catalog.empty') }}</p>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.catalog {
  max-width: var(--max-content);
  margin: 0 auto;
}

/* ═══ Entries Grid (Auto Mode) ═══ */
.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

.entry-card {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  padding-top: calc(var(--space-lg) + 2px);
  text-decoration: none;
  transition: all 400ms var(--ease-out-expo);
  overflow: hidden;
  animation: card-entrance 500ms var(--ease-out-expo) backwards;
}

@keyframes card-entrance {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Class-colored accent bar */
.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-primary);
  transition: height 300ms var(--ease-out-expo);
}

.entry-card.safe .card-accent {
  background: var(--class-safe);
}
.entry-card.euclid .card-accent {
  background: var(--class-euclid);
}
.entry-card.keter .card-accent {
  background: var(--class-keter);
}
.entry-card.thaumiel .card-accent {
  background: var(--class-thaumiel);
}
.entry-card.apollyon .card-accent {
  background: var(--class-neutralized);
}
.entry-card.neutralized .card-accent {
  background: var(--class-neutralized);
}

.entry-card:hover {
  border-color: var(--border-default);
  box-shadow:
    var(--shadow-md),
    0 0 0 1px var(--color-primary-muted);
  transform: translateY(-4px);
}

.entry-card:hover .card-accent {
  height: 4px;
}

.entry-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.entry-card .entry-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
  transition: color var(--transition-fast);
  line-height: var(--leading-tight);
}

.entry-card:hover .entry-name {
  color: var(--color-primary);
}

.entry-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-subtle);
}

.entry-series {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.entry-arrow {
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.entry-card:hover .entry-arrow {
  color: var(--color-primary);
  transform: translateX(3px);
}

.entries-loaded-info {
  text-align: center;
  margin-top: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

/* Transition overlay */
.transition-overlay {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.transition-scanner {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--bg-surface), transparent);
  animation: scan-fade 300ms ease-out;
}

@keyframes scan-fade {
  from {
    opacity: 0.8;
  }
  to {
    opacity: 0;
  }
}

.auto-lang-indicator {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.page-header {
  margin-bottom: var(--space-xl);
  animation: fade-up 600ms var(--ease-out-expo) backwards;
}

.page-header h1 {
  margin-bottom: var(--space-sm);
}

.page-desc {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

/* ═══ Language Bar ═══ */
.lang-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  animation: fade-up 600ms var(--ease-out-expo) 100ms backwards;
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
  transform: translateY(-1px);
}

.lang-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
  color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-primary-muted);
}

.crawl-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.crawl-status {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.crawl-status.crawling {
  color: var(--color-accent);
}

.crawl-status.error {
  color: var(--color-danger);
}

/* ═══ Filters ═══ */
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  animation: fade-up 600ms var(--ease-out-expo) 200ms backwards;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.search-wrap:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
}

.filter-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.filter-input::placeholder {
  color: var(--text-tertiary);
}

.class-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.class-filter-btn {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: all var(--transition-fast);
}

.class-filter-btn:hover {
  border-color: var(--border-default);
  transform: translateY(-1px);
}

.class-filter-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
  box-shadow: 0 0 12px var(--color-primary-muted);
}

/* ═══ Results Info ═══ */
.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.results-count {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.last-crawl {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* ═══ Entries List (Manual Mode) ═══ */
.entries-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.entry-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all 400ms var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.entry-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: var(--color-primary);
  transition: width 300ms var(--ease-out-expo);
}

.entry-row:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px var(--color-primary-muted);
  transform: translateX(4px);
}

.entry-row:hover::before {
  width: 3px;
}

.entry-left {
  flex: 1;
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

.entry-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
  transition: color var(--transition-fast);
}

.entry-row:hover .entry-name {
  color: var(--color-primary);
}

.entry-class {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.entry-right {
  flex-shrink: 0;
  padding-top: 4px;
}

/* ═══ Pagination ═══ */
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
  transform: translateY(-1px);
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

/* ═══ States ═══ */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.skeleton {
  height: 80px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
}

.shimmer {
  background: linear-gradient(
    90deg,
    var(--bg-surface) 25%,
    var(--bg-elevated) 50%,
    var(--bg-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.error-state {
  text-align: center;
  padding: var(--space-3xl);
  animation: fade-up 600ms var(--ease-out-expo) backwards;
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
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: color-mix(in srgb, var(--color-danger) 90%, white);
  transform: translateY(-1px);
}

.empty-state {
  text-align: center;
  padding: var(--space-3xl);
  animation: fade-up 600ms var(--ease-out-expo) backwards;
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

@media (max-width: 640px) {
  .entry-row {
    flex-direction: column;
    padding: var(--space-md);
  }

  .entry-right {
    padding-top: var(--space-sm);
  }

  .lang-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .crawl-info {
    margin-left: 0;
    justify-content: flex-start;
  }

  .entries-grid {
    grid-template-columns: 1fr;
  }
}
</style>
