<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLogsStore } from '@/stores/logs'
import SearchInput from '@/components/common/SearchInput.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const store = useLogsStore()
const showCleanup = ref(false)
const cleanupDays = ref(30)
const expandedLog = ref<number | null>(null)

onMounted(() => {
  store.fetchLogs()
  store.fetchStats()
})

function onSearch(q: string) { store.setSearch(q) }
function onLevelFilter(e: Event) { store.setLevelFilter((e.target as HTMLSelectElement).value) }
function onSourceFilter(e: Event) { store.setSourceFilter((e.target as HTMLSelectElement).value) }

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
  try { return JSON.parse(ctx) } catch { return null }
}
</script>

<template>
  <div class="logs-view">
    <div class="page-header">
      <h2>System Logs</h2>
      <p class="page-desc">Browse and filter application logs</p>
    </div>

    <!-- Log Stats -->
    <div class="stats-grid" v-if="store.stats">
      <div class="admin-card">
        <div class="admin-card-header"><span class="admin-card-title">Total (24h)</span></div>
        <div class="admin-card-value">{{ store.stats.errorRate?.total || 0 }}</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-header"><span class="admin-card-title">Errors (24h)</span></div>
        <div class="admin-card-value" style="color: var(--color-danger)">{{ store.stats.errorRate?.errors || 0 }}</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-header"><span class="admin-card-title">Error Rate</span></div>
        <div class="admin-card-value">{{ (store.stats.errorRate?.rate || 0).toFixed(1) }}%</div>
      </div>
    </div>

    <div class="filter-bar">
      <SearchInput :model-value="store.searchQuery" @update:model-value="onSearch" placeholder="Search messages..." />
      <select class="select" @change="onLevelFilter">
        <option value="">All Levels</option>
        <option value="error">Error</option>
        <option value="warn">Warn</option>
        <option value="info">Info</option>
        <option value="debug">Debug</option>
      </select>
      <select class="select" @change="onSourceFilter">
        <option value="">All Sources</option>
        <option value="server">Server</option>
        <option value="client">Client</option>
      </select>
      <button class="btn btn-ghost" @click="showCleanup = true">Cleanup Old Logs</button>
      <span class="results-count">{{ store.total }} entries</span>
    </div>

    <div v-if="store.loading && !store.logs.length" class="loading-state">
      <div class="skeleton" v-for="i in 15" :key="i" style="height: 40px" />
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Source</th>
              <th>Category</th>
              <th>Message</th>
              <th>User</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in store.logs" :key="log.id">
              <tr @click="toggleExpand(log.id)" class="log-row">
                <td class="cell-mono">{{ formatTime(log.timestamp) }}</td>
                <td><StatusBadge :variant="log.level" :label="log.level" /></td>
                <td><StatusBadge :variant="log.source" :label="log.source" /></td>
                <td class="cell-mono">{{ log.category || '—' }}</td>
                <td class="cell-truncate">{{ truncate(log.message) }}</td>
                <td class="cell-mono">{{ log.user_id || '—' }}</td>
                <td class="cell-mono">{{ log.path || '—' }}</td>
              </tr>
              <tr v-if="expandedLog === log.id" class="log-detail-row">
                <td colspan="7">
                  <div class="log-detail">
                    <div class="log-detail-field">
                      <span class="detail-label">Full Message</span>
                      <pre class="log-message">{{ log.message }}</pre>
                    </div>
                    <div class="log-detail-field" v-if="log.request_id">
                      <span class="detail-label">Request ID</span>
                      <span class="detail-value cell-mono">{{ log.request_id }}</span>
                    </div>
                    <div class="log-detail-field" v-if="log.user_agent">
                      <span class="detail-label">User Agent</span>
                      <span class="detail-value cell-mono" style="font-size: var(--text-xs)">{{ log.user_agent }}</span>
                    </div>
                    <div class="log-detail-field" v-if="log.ip">
                      <span class="detail-label">IP</span>
                      <span class="detail-value cell-mono">{{ log.ip }}</span>
                    </div>
                    <div class="log-detail-field" v-if="log.context">
                      <span class="detail-label">Context</span>
                      <pre class="log-context">{{ JSON.stringify(parseContext(log.context), null, 2) }}</pre>
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
      title="Cleanup Old Logs"
      :message="`Delete all log entries older than ${cleanupDays} days? This action cannot be undone.`"
      confirm-label="Delete Old Logs"
      :loading="store.loading"
      @confirm="confirmCleanup"
      @cancel="showCleanup = false"
    />
  </div>
</template>

<style scoped>
.logs-view { max-width: var(--max-content); margin: 0 auto; }
.page-header { margin-bottom: var(--space-xl); }
.page-header h2 { margin-bottom: var(--space-xs); }
.page-desc { color: var(--text-tertiary); font-size: var(--text-sm); }

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

.log-message, .log-context {
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
