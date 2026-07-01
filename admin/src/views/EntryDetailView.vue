<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useEntriesStore } from '@/stores/entries'
import { sanitizeHtml } from '@/utils/sanitize'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const { t } = useI18n()
const store = useEntriesStore()
const entryId = Number(route.params.id)
const editing = ref(false)
const editName = ref('')
const editClass = ref('')
const refetching = ref(false)

const sanitizedContent = computed(() =>
  store.currentEntry?.content ? sanitizeHtml(store.currentEntry.content) : '',
)

onMounted(() => store.fetchEntry(entryId))

function startEdit() {
  if (store.currentEntry) {
    editName.value = store.currentEntry.name
    editClass.value = store.currentEntry.object_class
    editing.value = true
  }
}

async function saveEdit() {
  await store.updateEntry(entryId, { name: editName.value, object_class: editClass.value })
  await store.fetchEntry(entryId)
  editing.value = false
}

async function refetchContent() {
  refetching.value = true
  await store.refetch(entryId)
  await store.fetchEntry(entryId)
  refetching.value = false
}

function formatDate(d: string | null | undefined) {
  return d ? new Date(d + 'Z').toLocaleString() : '—'
}
</script>

<template>
  <div class="entry-detail">
    <div class="page-header">
      <nav class="breadcrumb">
        <router-link to="/entries">{{ t('entryDetail.breadcrumbEntries') }}</router-link>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current"
          >SCP-{{
            store.currentEntry ? String(store.currentEntry.scp_number).padStart(3, '0') : '...'
          }}</span
        >
      </nav>
    </div>

    <div v-if="store.loading && !store.currentEntry" class="loading-state">
      <div class="skeleton" style="height: 300px" />
    </div>

    <template v-else-if="store.currentEntry">
      <div class="admin-card">
        <div class="entry-header">
          <div class="entry-title-row">
            <h3>SCP-{{ String(store.currentEntry.scp_number).padStart(3, '0') }}</h3>
            <StatusBadge
              :variant="store.currentEntry.object_class?.toLowerCase() || 'unknown'"
              :label="store.currentEntry.object_class"
            />
            <span class="lang-badge">{{ store.currentEntry.language.toUpperCase() }}</span>
          </div>

          <template v-if="editing">
            <div class="edit-form">
              <div class="form-group">
                <label class="form-label">{{ t('entryDetail.name') }}</label>
                <input v-model="editName" class="input" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t('entryDetail.objectClass') }}</label>
                <select v-model="editClass" class="select">
                  <option
                    v-for="cls in [
                      'Safe',
                      'Euclid',
                      'Keter',
                      'Thaumiel',
                      'Apollyon',
                      'Neutralized',
                      'Unknown',
                    ]"
                    :key="cls"
                    :value="cls"
                  >
                    {{ cls }}
                  </option>
                </select>
              </div>
              <div class="edit-actions">
                <button class="btn btn-primary btn-sm" @click="saveEdit">
                  {{ t('common.save') }}
                </button>
                <button class="btn btn-ghost btn-sm" @click="editing = false">
                  {{ t('common.cancel') }}
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <p class="entry-name">{{ store.currentEntry.name || t('entryDetail.noName') }}</p>
          </template>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ t('entryDetail.entryId') }}</span>
            <span class="detail-value">{{ store.currentEntry.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('entryDetail.series') }}</span>
            <span class="detail-value">{{ store.currentEntry.series }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('entryDetail.url') }}</span>
            <span class="detail-value"
              ><a :href="store.currentEntry.url" target="_blank" rel="noopener">{{
                store.currentEntry.url || t('common.none')
              }}</a></span
            >
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('entryDetail.contentFetched') }}</span>
            <span class="detail-value">{{
              formatDate(store.currentEntry.content_fetched_at)
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('entryDetail.created') }}</span>
            <span class="detail-value">{{ formatDate(store.currentEntry.created_at) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('entryDetail.updated') }}</span>
            <span class="detail-value">{{ formatDate(store.currentEntry.updated_at) }}</span>
          </div>
        </div>

        <div class="entry-actions">
          <button v-if="!editing" class="btn btn-ghost" @click="startEdit">
            {{ t('common.edit') }}
          </button>
          <button class="btn btn-ghost" :disabled="refetching" @click="refetchContent">
            {{ refetching ? t('entryDetail.refetching') : t('entryDetail.refetch') }}
          </button>
        </div>
      </div>

      <!-- Content Preview -->
      <div v-if="store.currentEntry.content" class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('entryDetail.contentPreview') }}</span>
          <span class="cell-mono"
            >{{ (store.currentEntry.content.length / 1024).toFixed(1) }} KB</span
          >
        </div>
        <div class="scp-content content-preview" v-html="sanitizedContent" />
      </div>

      <div v-else-if="store.currentEntry.content_error" class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('entryDetail.contentErrorTitle') }}</span>
        </div>
        <p style="color: var(--color-danger)">{{ store.currentEntry.content_error }}</p>
      </div>

      <div v-else class="admin-card">
        <div class="admin-card-header">
          <span class="admin-card-title">{{ t('entryDetail.contentTitle') }}</span>
        </div>
        <p style="color: var(--text-tertiary)">{{ t('entryDetail.noContent') }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.entry-detail {
  max-width: var(--max-content);
  margin: 0 auto;
}
.page-header {
  margin-bottom: var(--space-lg);
}

.entry-header {
  margin-bottom: var(--space-lg);
}

.entry-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.lang-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.entry-name {
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.edit-actions {
  display: flex;
  gap: var(--space-sm);
}

.entry-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
}

.content-preview {
  max-height: 600px;
  overflow-y: auto;
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
