<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchAdminSettings, type AdminSettings } from '@/services/settings'
import { fetchCorsOrigins, addCorsOrigin, removeCorsOrigin, type CorsOrigin } from '@/services/cors'

const { t } = useI18n()
const settings = ref<AdminSettings | null>(null)
const loading = ref(false)
const error = ref('')

const corsStatic = ref<string[]>([])
const corsDynamic = ref<CorsOrigin[]>([])
const newOrigin = ref('')
const corsBusy = ref(false)
const corsError = ref('')

async function loadCors() {
  const res = await fetchCorsOrigins()
  if (res.ok) {
    corsStatic.value = res.data.static
    corsDynamic.value = res.data.dynamic
  }
}

async function submitAddOrigin() {
  const origin = newOrigin.value.trim()
  if (!origin) return
  corsBusy.value = true
  corsError.value = ''
  const res = await addCorsOrigin(origin)
  corsBusy.value = false
  if (res.ok) {
    newOrigin.value = ''
    await loadCors()
  } else {
    corsError.value = res.error
  }
}

async function removeOrigin(id: number) {
  corsBusy.value = true
  corsError.value = ''
  const res = await removeCorsOrigin(id)
  corsBusy.value = false
  if (res.ok) {
    await loadCors()
  } else {
    corsError.value = res.error
  }
}

onMounted(async () => {
  loading.value = true
  const res = await fetchAdminSettings()
  loading.value = false
  if (res.ok) {
    settings.value = res.data.settings
  } else {
    error.value = res.error
  }
  loadCors()
})
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <h2>{{ t('settings.title') }}</h2>
      <p class="page-desc">{{ t('settings.desc') }}</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" style="height: 300px" />
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠</span>
      <p>{{ error }}</p>
    </div>

    <template v-else-if="settings">
      <!-- Totals -->
      <div class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('settings.databaseTotals') }}</span>
        </div>
        <div class="detail-grid">
          <div v-for="(count, table) in settings.database.tables" :key="table" class="detail-item">
            <span class="detail-label">{{ table }}</span>
            <span class="detail-value cell-mono">{{ (count as number).toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <!-- CORS -->
      <div class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('settings.allowedOrigins') }}</span>
        </div>

        <div class="cors-list">
          <code v-for="origin in corsStatic" :key="origin" class="cors-item">{{ origin }}</code>
        </div>

        <div v-if="corsDynamic.length" class="cors-list">
          <div v-for="o in corsDynamic" :key="o.id" class="cors-item cors-item-dynamic">
            <code>{{ o.origin }}</code>
            <button
              class="cors-remove"
              :disabled="corsBusy"
              @click="removeOrigin(o.id)"
            >
              ×
            </button>
          </div>
        </div>

        <form class="cors-add-form" @submit.prevent="submitAddOrigin">
          <input
            v-model="newOrigin"
            class="input"
          />
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            :disabled="corsBusy || !newOrigin.trim()"
          >
          </button>
        </form>
        <p v-if="corsError" class="cors-error">{{ corsError }}</p>
      </div>

      <!-- Crawl States -->
      <div v-if="settings.crawlStates?.length" class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('settings.crawlStates') }}</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('settings.colLanguage') }}</th>
                <th>{{ t('settings.colStatus') }}</th>
                <th>{{ t('settings.colTotalEntries') }}</th>
                <th>{{ t('settings.colLastCrawl') }}</th>
                <th>{{ t('settings.colError') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cs in settings.crawlStates" :key="cs.language">
                <td>{{ cs.language?.toUpperCase() }}</td>
                <td>
                  <StatusBadge
                    :variant="
                      cs.status === 'idle'
                        ? 'approved'
                        : cs.status === 'error'
                          ? 'rejected'
                          : 'open'
                    "
                    :label="cs.status"
                  />
                </td>
                <td class="cell-mono">{{ cs.total_entries?.toLocaleString() }}</td>
                <td class="cell-mono">
                  {{
                    cs.last_crawl
                      ? new Date(cs.last_crawl * 1000).toLocaleString()
                      : t('common.none')
                  }}
                </td>
                <td style="color: var(--color-danger)">{{ cs.error || t('common.none') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- System Info -->
      <div class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('settings.systemInfo') }}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ t('settings.logLevel') }}</span>
            <span class="detail-value">{{ settings.logLevel }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('settings.apiVersion') }}</span>
            <span class="detail-value cell-mono">v1</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.settings-view {
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

.admin-card {
  margin-bottom: var(--space-md);
}

.cors-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.cors-item {
  font-size: var(--text-sm);
}

.cors-group-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: var(--space-md) 0 var(--space-xs);
}

.cors-group-label:first-of-type {
  margin-top: 0;
}

.cors-item-dynamic {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
}

.cors-remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  cursor: pointer;
}

.cors-remove:hover {
  background: var(--color-danger-muted);
  color: var(--color-danger);
}

.cors-empty {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.cors-add-form {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.cors-add-form .input {
  flex: 1;
}

.cors-error {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--color-danger);
}

.table-wrap {
  overflow-x: auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
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
</style>
