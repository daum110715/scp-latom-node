<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLogsStore } from '@/stores/logs'
import SearchInput from '@/components/common/SearchInput.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const store = useLogsStore()
const { t } = useI18n()
const showCleanup = ref(false)
const cleanupDays = ref(30)
const expandedLog = ref<number | null>(null)

onMounted(() => {
  store.fetchLogs()
  store.fetchStats()
})

function onSearch(q: string) {
  store.setSearch(q)
}
function onLevelFilter(e: Event) {
  store.setLevelFilter((e.target as HTMLSelectElement).value)
}
function onSourceFilter(e: Event) {
  store.setSourceFilter((e.target as HTMLSelectElement).value)
}

async function confirmCleanup() {
  await store.cleanup(cleanupDays.value)
  showCleanup.value = false
  store.fetchLogs()
  store.fetchStats()
}

function toggleExpand(id: number) {
  expandedLog.value = expandedLog.value === id ? null : id
}

function formatTime(d: string) {
  return new Date(d + 'Z').toLocaleString()
}

function truncate(s: string, len = 100) {
  return s.length > len ? s.slice(0, len) + '…' : s
}

function parseContext(ctx: string | null): Record<string, unknown> | null {
  if (!ctx) return null
  try {
    return JSON.parse(ctx)
  } catch {
    return null
  }
}
</script>

<template>
  <div class="logs-view">
    <div class="page-header">
      <h2>{{ t('logs.title') }}</h2>
      <p class="page-desc">{{ t('logs.desc') }}</p>
    </div>

    <!-- Log Stats -->
    <div v-if="store.stats" class="stats-grid">
      <div class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('logs.total24h') }}</span>
        </div>
        <div class="admin-card-value">{{ store.stats.errorRate?.total || 0 }}</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('logs.errors24h') }}</span>
        </div>
        <div class="admin-card-value" style="color: var(--color-danger)">
          {{ store.stats.errorRate?.errors || 0 }}
        </div>
      </div>
      <div class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('logs.errorRate') }}</span>
        </div>
        <div class="admin-card-value">{{ (store.stats.errorRate?.rate || 0).toFixed(1) }}%</div>
      </div>
    </div>

    <div class="filter-bar">
      <SearchInput
        :model-value="store.searchQuery"
        :placeholder="t('logs.searchPlaceholder')"
        @update:model-value="onSearch"
      />
      <select class="select" @change="onLevelFilter">
        <option value="">{{ t('logs.allLevels') }}</option>
        <option value="error">Error</option>
        <option value="warn">Warn</option>
        <option value="info">Info</option>
        <option value="debug">Debug</option>
      </select>
      <select class="select" @change="onSourceFilter">
        <option value="">{{ t('logs.allSources') }}</option>
        <option value="server">Server</option>
        <option value="client">Client</option>
      </select>
      <button class="btn btn-ghost" @click="showCleanup = true">{{ t('logs.cleanup') }}</button>
      <span class="results-count">{{ t('logs.resultsCount', { n: store.total }) }}</span>
    </div>

    <div v-if="store.loading && !store.logs.length" class="loading-state">
      <div v-for="i in 15" :key="i" class="skeleton" style="height: 40px" />
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('logs.colTime') }}</th>
              <th>{{ t('logs.colLevel') }}</th>
              <th>{{ t('logs.colSource') }}</th>
              <th>{{ t('logs.colCategory') }}</th>
              <th>{{ t('logs.colMessage') }}</th>
              <th>{{ t('logs.colUser') }}</th>
              <th>{{ t('logs.colPath') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in store.logs" :key="log.id">
              <tr class="log-row" @click="toggleExpand(log.id)">
                <td class="cell-mono">{{ formatTime(log.timestamp) }}</td>
                <td><StatusBadge :variant="log.level" :label="log.level" /></td>
                <td><StatusBadge :variant="log.source" :label="log.source" /></td>
                <td class="cell-mono">{{ log.category || t('common.none') }}</td>
                <td class="cell-truncate">{{ truncate(log.message) }}</td>
                <td class="cell-mono">{{ log.user_id || t('common.none') }}</td>
                <td class="cell-mono">{{ log.path || t('common.none') }}</td>
              </tr>
              <tr v-if="expandedLog === log.id" class="log-detail-row">
                <td colspan="7">
                  <div class="log-detail">
                    <div class="log-detail-field">
                      <span class="detail-label">{{ t('logs.fullMessage') }}</span>
                      <pre class="log-message">{{ log.message }}</pre>
                    </div>
                    <div v-if="log.request_id" class="log-detail-field">
                      <span class="detail-label">{{ t('logs.requestId') }}</span>
                      <span class="detail-value cell-mono">{{ log.request_id }}</span>
                    </div>
                    <div v-if="log.user_agent" class="log-detail-field">
                      <span class="detail-label">{{ t('logs.userAgent') }}</span>
                      <span class="detail-value cell-mono" style="font-size: var(--text-xs)">{{
                        log.user_agent
                      }}</span>
                    </div>
                    <div v-if="log.ip" class="log-detail-field">
                      <span class="detail-label">{{ t('logs.ip') }}</span>
                      <span class="detail-value cell-mono">{{ log.ip }}</span>
                    </div>
                    <div v-if="log.context" class="log-detail-field">
                      <span class="detail-label">{{ t('logs.context') }}</span>
                      <pre class="log-context">{{
                        JSON.stringify(parseContext(log.context), null, 2)
                      }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <Pagination :page="store.page" :total-pages="store.totalPages" @page-change="store.setPage" />
    </template>

    <ConfirmModal
      v-if="showCleanup"
      :title="t('logs.cleanupTitle')"
      :message="t('logs.cleanupMessage', { days: cleanupDays })"
      :confirm-label="t('logs.cleanupConfirm')"
      :loading="store.loading"
      @confirm="confirmCleanup"
      @cancel="showCleanup = false"
    />
  </div>
</template>

<style scoped>
.logs-view {
  max-width: var(--max-content);
  margin: 0 auto;
}
.page-header {
  margin-bottom: var(--space-xl);
}
.page-header h2 {
  margin-bottom: var(--space-xs);
}
.page-desc {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.results-count {
  margin-left: auto;
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.log-row {
  cursor: pointer;
}

.log-detail-row td {
  background: var(--bg-secondary);
  padding: var(--space-md);
}

.log-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.log-detail-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.log-message,
.log-context {
  background: var(--bg-elevated);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
