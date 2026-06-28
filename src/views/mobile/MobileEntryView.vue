<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchEntryContent, type EntryContentResponse } from '@/services/crawler'
import { fetchEntryTags, TAG_CATEGORY_LABELS, type TagInfo } from '@/services/tags'
import { downloadEntry } from '@/services/download'
import { checkReports } from '@/services/reports'
import { useAuthStore } from '@/stores/auth'
import { useUserActivityStore } from '@/stores/userActivity'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import ReportDialog from '@/components/common/ReportDialog.vue'
import type { ObjectClass } from '@/types'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const activityStore = useUserActivityStore()

const bookmarked = ref(false)
const bookmarkLoading = ref(false)
const downloading = ref(false)
const reportOpen = ref(false)
const reportCount = ref(0)
const reportMax = ref(3)

const lang = computed(() => route.params.lang as 'en' | 'cn')
const scpNumber = computed(() => parseInt(route.params.scpNumber as string, 10))
const scpId = computed(() => `SCP-${String(scpNumber.value).padStart(3, '0')}`)

const loading = ref(true)
const error = ref('')
const data = ref<EntryContentResponse | null>(null)
const tags = ref<TagInfo[]>([])
const tagsLoading = ref(false)
let pollTimer: ReturnType<typeof setTimeout> | null = null

// Collapse all <details> elements in footer content after render
function collapseFooterDetails() {
  nextTick(() => {
    const body = document.querySelector('.m-entry-body')
    if (!body) return
    body.querySelectorAll('details').forEach((el) => {
      el.removeAttribute('open')
    })
  })
}

watch(
  () => data.value?.content,
  (content) => {
    if (content) collapseFooterDetails()
  },
)

async function loadContent() {
  loading.value = true
  error.value = ''

  const res = await fetchEntryContent(lang.value, scpNumber.value)

  if (!res.ok) {
    loading.value = false
    error.value = res.error
    return
  }

  data.value = res.data

  if (res.data.status === 'cached' || res.data.status === 'fetched') {
    loading.value = false
    recordVisit(res.data)
    loadTags()
    return
  }

  if (res.data.status === 'pending' || res.data.status === 'fetching') {
    pollTimer = setTimeout(() => {
      pollForContent()
    }, 2000)
    return
  }

  loading.value = false
  error.value = res.data.error || 'Failed to fetch entry content'
}

function recordVisit(entry: EntryContentResponse) {
  if (!auth.isAuthenticated) return
  activityStore.recordVisit({
    language: lang.value,
    scpNumber: scpNumber.value,
    name: entry.name,
    objectClass: entry.objectClass,
  })
}

async function loadTags() {
  tagsLoading.value = true
  const res = await fetchEntryTags(scpNumber.value, lang.value)
  if (res.ok) {
    tags.value = res.data.tags
  }
  tagsLoading.value = false
}

async function pollForContent() {
  const res = await fetchEntryContent(lang.value, scpNumber.value)

  if (!res.ok) {
    loading.value = false
    error.value = res.error
    return
  }

  data.value = res.data

  if (res.data.status === 'cached' || res.data.status === 'fetched') {
    loading.value = false
    recordVisit(res.data)
    loadTags()
    return
  }

  if (res.data.status === 'pending' || res.data.status === 'fetching') {
    pollTimer = setTimeout(() => {
      pollForContent()
    }, 2000)
    return
  }

  loading.value = false
  error.value = res.data.error || 'Failed to fetch entry content'
}

function retry() {
  data.value = null
  loadContent()
}

async function toggleBookmark() {
  if (!auth.isAuthenticated) return
  bookmarkLoading.value = true
  const result = await activityStore.toggleBookmark(lang.value, scpNumber.value)
  if (result) bookmarked.value = !bookmarked.value
  bookmarkLoading.value = false
}

function handleDownload() {
  if (!data.value || downloading.value) return
  downloading.value = true
  downloadEntry(scpNumber.value, lang.value, data.value)
  downloading.value = false
}

onMounted(() => {
  if (!scpNumber.value || isNaN(scpNumber.value)) {
    error.value = 'Invalid SCP number'
    loading.value = false
    return
  }
  loadContent()

  // Check bookmark status for authenticated users
  if (auth.isAuthenticated) {
    activityStore.checkBookmark(lang.value, scpNumber.value).then((result: boolean) => {
      bookmarked.value = result
    })
    checkReports(lang.value, scpNumber.value).then((res) => {
      if (res.ok) {
        reportCount.value = res.data.count
        reportMax.value = res.data.maxReports
      }
    })
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
})
</script>

<template>
  <div class="m-entry">
    <!-- Back -->
    <router-link to="/catalog" class="m-back">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ t('entry.back') }}
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="m-loading">
      <div class="m-skeleton m-skeleton-badge" />
      <div class="m-skeleton m-skeleton-title" />
      <div class="m-skeleton m-skeleton-sub" />
      <div
        v-for="i in 6"
        :key="i"
        class="m-skeleton m-skeleton-line"
        :style="{ width: `${50 + Math.random() * 50}%` }"
      />
      <p v-if="data?.status === 'pending' || data?.status === 'fetching'" class="m-loading-hint">
        Fetching from wiki…
      </p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="m-error">
      <span class="m-error-icon">⚠</span>
      <h2>{{ scpId }}</h2>
      <p>{{ error }}</p>
      <div class="m-error-actions">
        <button class="m-retry-btn" @click="retry">Retry</button>
        <a
          :href="`https://scp-wiki.wikidot.com/scp-${String(scpNumber).padStart(3, '0')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="m-wiki-link"
        >
          View on Wiki ↗
        </a>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="data">
      <div class="m-entry-header">
        <div class="m-entry-meta">
          <ClassBar
            v-if="data.objectClass"
            :object-class="data.objectClass as ObjectClass"
            :show-label="true"
          />
          <Badge v-if="data.objectClass" :variant="data.objectClass.toLowerCase() as any">
            {{ data.objectClass }}
          </Badge>
          <div class="m-entry-actions">
            <button
              class="m-download-btn"
              :disabled="downloading"
              :title="t('entry.download')"
              @click="handleDownload"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              v-if="auth.isAuthenticated"
              class="m-bookmark-btn"
              :class="{ active: bookmarked }"
              :disabled="bookmarkLoading"
              :title="bookmarked ? t('bookmarks.remove') : t('bookmarks.add')"
              @click="toggleBookmark"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                :fill="bookmarked ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            </button>
            <button
              v-if="auth.isAuthenticated"
              class="m-report-btn"
              :title="t('entry.report')"
              @click="reportOpen = true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>
        </div>
        <h1 class="m-entry-title">
          <span class="m-entry-id">{{ scpId }}</span>
          <span v-if="data.name" class="m-entry-name"> — {{ data.name }}</span>
        </h1>
        <div class="m-entry-info">
          <span>{{ lang === 'en' ? 'English' : '中文' }}</span>
          <a
            :href="`https://scp-wiki.wikidot.com/scp-${String(scpNumber).padStart(3, '0')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="m-wiki-link"
          >
            Wiki ↗
          </a>
        </div>
      </div>

      <!-- Tags -->
      <div v-if="tags.length > 0" class="m-entry-tags">
        <div
          v-for="category in Object.keys(TAG_CATEGORY_LABELS)"
          v-show="tags.some((t) => t.categoryId === category)"
          :key="category"
          class="m-tag-group"
        >
          <span class="m-tag-group-label" :style="{ color: TAG_CATEGORY_LABELS[category]?.color }">
            {{
              lang === 'cn' ? TAG_CATEGORY_LABELS[category]?.zh : TAG_CATEGORY_LABELS[category]?.en
            }}
          </span>
          <span
            v-for="tag in tags.filter((t) => t.categoryId === category)"
            :key="tag.id"
            class="m-tag-chip"
            :style="{
              borderColor: TAG_CATEGORY_LABELS[category]?.color,
              color: TAG_CATEGORY_LABELS[category]?.color,
            }"
          >
            {{ lang === 'cn' ? tag.nameZh : tag.name }}
          </span>
        </div>
      </div>
      <div v-else-if="tagsLoading" class="m-entry-tags m-entry-tags-loading">
        <span class="m-tag-skeleton" /><span class="m-tag-skeleton" /><span
          class="m-tag-skeleton"
        />
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="data.content" class="m-entry-body" v-html="data.content" />

      <ReportDialog
        :open="reportOpen"
        :scp-number="scpNumber"
        :language="lang"
        :scp-id="scpId"
        :existing-count="reportCount"
        :max-reports="reportMax"
        @close="reportOpen = false"
        @submitted="reportCount++"
      />
    </template>
  </div>
</template>

<style scoped>
.m-entry {
  padding: var(--space-md);
}

.m-back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: var(--space-lg);
  padding: var(--space-sm) 0;
}

/* ─── Header ─── */

.m-entry-header {
  margin-bottom: var(--space-lg);
}

.m-entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.m-entry-actions {
  display: flex;
  gap: var(--space-sm);
  margin-left: auto;
}

.m-download-btn,
.m-bookmark-btn,
.m-report-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.m-download-btn:hover,
.m-bookmark-btn:hover,
.m-bookmark-btn.active,
.m-report-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.m-download-btn:disabled,
.m-bookmark-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.m-entry-title {
  font-size: clamp(1.25rem, 5vw, 1.75rem);
  line-height: 1.2;
  margin-bottom: var(--space-md);
}

.m-entry-id {
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.m-entry-name {
  color: var(--text-primary);
}

.m-entry-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  align-items: center;
}

.m-wiki-link {
  color: var(--text-tertiary);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.m-wiki-link:hover {
  color: var(--color-accent);
}

/* ─── Tags ─── */

.m-entry-tags {
  margin-top: var(--space-md);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.m-tag-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.m-tag-group-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 4px;
}

.m-tag-chip {
  display: inline-block;
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid;
  border-radius: 9999px;
  background: transparent;
  font-family: var(--font-mono);
  line-height: 1.4;
  white-space: nowrap;
}

.m-entry-tags-loading {
  gap: var(--space-xs);
}

.m-tag-skeleton {
  display: inline-block;
  width: 50px;
  height: 18px;
  border-radius: 9999px;
  background: var(--bg-surface);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ─── Body ─── */

.m-entry-body {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
  overflow-x: hidden;
  overflow-wrap: break-word;
}

/* ─── Loading ─── */

.m-loading {
  padding: var(--space-lg) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.m-skeleton {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.m-skeleton-badge {
  width: 100px;
  height: 24px;
}

.m-skeleton-title {
  width: min(250px, 80%);
  height: 30px;
}

.m-skeleton-sub {
  width: min(150px, 50%);
  height: 18px;
  margin-bottom: var(--space-sm);
}

.m-skeleton-line {
  height: 14px;
}

.m-loading-hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-align: center;
  margin-top: var(--space-md);
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

/* ─── Error ─── */

.m-error {
  text-align: center;
  padding: var(--space-3xl) var(--space-lg);
}

.m-error-icon {
  font-size: 2.5rem;
  color: var(--color-danger);
  display: block;
  margin-bottom: var(--space-md);
}

.m-error h2 {
  margin-bottom: var(--space-sm);
}

.m-error p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-xl);
}

.m-error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  align-items: center;
}

.m-retry-btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: none;
  color: var(--text-inverse);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
}
</style>
