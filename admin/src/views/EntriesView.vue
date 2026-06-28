<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEntriesStore } from '@/stores/entries'
import SearchInput from '@/components/common/SearchInput.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const store = useEntriesStore()
const deleteTarget = ref<number | null>(null)
const crawlLang = ref<string | null>(null)

onMounted(() => {
  store.fetchEntries()
  store.getCrawlStatus()
})

function onSearch(q: string) {
  store.setSearch(q)
}
function onLangFilter(e: Event) {
  store.setLanguageFilter((e.target as HTMLSelectElement).value)
}
function onClassFilter(e: Event) {
  store.setClassFilter((e.target as HTMLSelectElement).value)
}

async function confirmDelete() {
  if (deleteTarget.value !== null) {
    await store.removeEntry(deleteTarget.value)
    deleteTarget.value = null
  }
}

async function triggerCrawl(lang: string) {
  crawlLang.value = lang
  await store.crawl(lang)
  crawlLang.value = null
  store.getCrawlStatus()
}
</script>

<template>
  <div class="entries-view">
    <div class="page-header">
      <h2>Content Management</h2>
      <p class="page-desc">Manage SCP entries and trigger data crawls</p>
    </div>

    <!-- Crawl Controls -->
    <div class="admin-card crawl-card">
      <div class="admin-card-header">
        <span class="admin-card-title">Crawler Status</span>
      </div>
      <div class="crawl-controls">
        <button class="btn btn-primary" :disabled="!!crawlLang" @click="triggerCrawl('en')">
          {{ crawlLang === 'en' ? 'Crawling EN...' : 'Crawl EN' }}
        </button>
        <button class="btn btn-primary" :disabled="!!crawlLang" @click="triggerCrawl('cn')">
          {{ crawlLang === 'cn' ? 'Crawling CN...' : 'Crawl CN' }}
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <SearchInput
        :model-value="store.searchQuery"
        placeholder="Search by SCP number or name..."
        @update:model-value="onSearch"
      />
      <select class="select" @change="onLangFilter">
        <option value="">All Languages</option>
        <option value="en">EN</option>
        <option value="cn">CN</option>
      </select>
      <select class="select" @change="onClassFilter">
        <option value="">All Classes</option>
        <option value="Safe">Safe</option>
        <option value="Euclid">Euclid</option>
        <option value="Keter">Keter</option>
        <option value="Thaumiel">Thaumiel</option>
        <option value="Apollyon">Apollyon</option>
        <option value="Neutralized">Neutralized</option>
      </select>
      <span class="results-count">{{ store.total }} entries</span>
    </div>

    <div v-if="store.loading && !store.entries.length" class="loading-state">
      <div v-for="i in 10" :key="i" class="skeleton" style="height: 48px" />
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>SCP</th>
              <th>Lang</th>
              <th>Name</th>
              <th>Class</th>
              <th>Series</th>
              <th>Content</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in store.entries" :key="entry.id">
              <td class="cell-mono">SCP-{{ String(entry.scp_number).padStart(3, '0') }}</td>
              <td>{{ entry.language.toUpperCase() }}</td>
              <td>{{ entry.name || '—' }}</td>
              <td>
                <StatusBadge
                  :variant="entry.object_class?.toLowerCase() || 'unknown'"
                  :label="entry.object_class"
                />
              </td>
              <td class="cell-mono">{{ entry.series }}</td>
              <td>
                <StatusBadge
                  :variant="entry.has_content ? 'approved' : 'rejected'"
                  :label="entry.has_content ? 'Cached' : 'None'"
                />
              </td>
              <td>
                <div class="action-btns">
                  <router-link :to="`/entries/${entry.id}`" class="btn btn-ghost btn-sm"
                    >View</router-link
                  >
                  <button class="btn btn-danger btn-sm" @click="deleteTarget = entry.id">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination :page="store.page" :total-pages="store.totalPages" @page-change="store.setPage" />
    </template>

    <ConfirmModal
      v-if="deleteTarget !== null"
      title="Delete Entry"
      message="This will permanently delete this SCP entry from the database. This action cannot be undone."
      confirm-label="Delete Entry"
      :loading="store.loading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.entries-view {
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

.crawl-card {
  margin-bottom: var(--space-lg);
}

.crawl-controls {
  display: flex;
  gap: var(--space-sm);
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

.action-btns {
  display: flex;
  gap: var(--space-xs);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
