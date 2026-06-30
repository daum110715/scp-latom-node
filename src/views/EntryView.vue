<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useEntry } from '@/composables/useEntry'
import { TAG_CATEGORY_LABELS } from '@/services/tags'
import EntryHeader from '@/components/entry/EntryHeader.vue'
import ReportDialog from '@/components/common/ReportDialog.vue'

const {
  t,
  auth,
  scpId,
  scpNumber,
  lang,
  loading,
  error,
  data,
  tags,
  tagsLoading,
  bookmarked,
  bookmarkLoading,
  downloading,
  reportOpen,
  reportCount,
  reportMax,
  collapseFooterDetails,
  retry,
  toggleBookmark,
  handleDownload,
  init,
} = useEntry()

const BODY_SELECTOR = '.entry-body'

// Collapse details when content loads
watch(
  () => data.value?.content,
  (content) => {
    if (content) collapseFooterDetails(BODY_SELECTOR)
  },
)

onMounted(() => {
  init(BODY_SELECTOR)
})
</script>

<template>
  <div class="entry-view">
    <!-- Back Link -->
    <router-link to="/catalog" class="back-link">
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

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-header">
        <div class="skeleton skeleton-badge" />
        <div class="skeleton skeleton-title" />
        <div class="skeleton skeleton-subtitle" />
      </div>
      <div class="skeleton-body">
        <div
          v-for="i in 8"
          :key="i"
          class="skeleton skeleton-line"
          :style="{ width: `${60 + Math.random() * 40}%` }"
        />
      </div>
      <p v-if="data?.status === 'pending' || data?.status === 'fetching'" class="loading-hint">
        Fetching content from the SCP wiki…
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠</span>
      <h2>{{ scpId }}</h2>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <button class="retry-btn" @click="retry(BODY_SELECTOR)">Retry</button>
        <a
          v-if="data?.status !== 'error'"
          :href="`https://scp-wiki.wikidot.com/scp-${String(scpNumber).padStart(3, '0')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="external-link"
        >
          View on Wiki ↗
        </a>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="data">
      <EntryHeader
        :scp-id="scpId"
        :scp-number="scpNumber"
        :lang="lang"
        :object-class="data.objectClass"
        :name="data.name"
        :fetched-at="data.fetchedAt"
        :bookmarked="bookmarked"
        :bookmark-loading="bookmarkLoading"
        :downloading="downloading"
        :is-authenticated="auth.isAuthenticated"
        @download="handleDownload"
        @toggle-bookmark="toggleBookmark"
        @report="reportOpen = true"
      />

      <!-- Tags -->
      <div v-if="tags.length > 0" class="entry-tags">
        <div
          v-for="category in Object.keys(TAG_CATEGORY_LABELS)"
          v-show="tags.some((t) => t.categoryId === category)"
          :key="category"
          class="tag-group"
        >
          <span class="tag-group-label" :style="{ color: TAG_CATEGORY_LABELS[category]?.color }">
            {{
              lang === 'cn' ? TAG_CATEGORY_LABELS[category]?.zh : TAG_CATEGORY_LABELS[category]?.en
            }}
          </span>
          <span
            v-for="tag in tags.filter((t) => t.categoryId === category)"
            :key="tag.id"
            class="tag-chip"
            :style="{
              borderColor: TAG_CATEGORY_LABELS[category]?.color,
              color: TAG_CATEGORY_LABELS[category]?.color,
            }"
          >
            {{ lang === 'cn' ? tag.nameZh : tag.name }}
          </span>
        </div>
      </div>
      <div v-else-if="tagsLoading" class="entry-tags entry-tags-loading">
        <span class="tag-skeleton" /><span class="tag-skeleton" /><span class="tag-skeleton" />
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="data.content" class="entry-body" v-html="data.content" />

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
.entry-view {
  max-width: var(--max-content);
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: var(--space-xl);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-accent);
}

/* ─── Tags ─── */

.entry-tags {
  margin-top: var(--space-lg);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.tag-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.tag-group-label {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: var(--space-xs);
}

.tag-chip {
  display: inline-block;
  font-size: var(--text-xs);
  padding: 2px 8px;
  border: 1px solid;
  border-radius: var(--radius-full, 9999px);
  background: transparent;
  font-family: var(--font-mono);
  line-height: 1.4;
  white-space: nowrap;
}

.entry-tags-loading {
  gap: var(--space-xs);
}

.tag-skeleton {
  display: inline-block;
  width: 60px;
  height: 20px;
  border-radius: var(--radius-full, 9999px);
  background: var(--bg-surface);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ─── Body ─── */

.entry-body {
  margin-top: var(--space-xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--border-subtle);
}

/* ─── Loading ─── */

.loading-state {
  padding: var(--space-xl) 0;
}

.skeleton-header {
  margin-bottom: var(--space-xl);
}

.skeleton {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-badge {
  width: 120px;
  height: 28px;
  margin-bottom: var(--space-md);
}

.skeleton-title {
  width: 300px;
  height: 36px;
  margin-bottom: var(--space-sm);
}

.skeleton-subtitle {
  width: 200px;
  height: 20px;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.skeleton-line {
  height: 16px;
}

.loading-hint {
  margin-top: var(--space-lg);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-align: center;
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

.error-state {
  text-align: center;
  padding: var(--space-3xl) 0;
}

.error-icon {
  font-size: 3rem;
  color: var(--color-danger);
  display: block;
  margin-bottom: var(--space-md);
}

.error-state h2 {
  margin-bottom: var(--space-sm);
}

.error-message {
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
}

.error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  align-items: center;
}

.retry-btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: none;
  color: var(--text-inverse);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-primary-hover);
}

.external-link {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.external-link:hover {
  color: var(--color-accent);
}

/* ─── Mobile ─── */

@media (max-width: 768px) {
  .entry-view {
    max-width: none;
    margin: 0;
    padding: var(--space-md);
  }

  .back-link {
    margin-bottom: var(--space-lg);
    padding: var(--space-sm) 0;
  }

  .entry-tags {
    margin-top: var(--space-md);
    gap: var(--space-sm);
  }

  .tag-group {
    gap: 4px;
  }

  .tag-group-label {
    font-size: 10px;
    margin-right: 4px;
  }

  .tag-chip {
    font-size: 10px;
    padding: 2px 6px;
  }

  .tag-skeleton {
    width: 50px;
    height: 18px;
  }

  .entry-body {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    overflow-x: hidden;
    overflow-wrap: break-word;
  }

  .loading-state {
    padding: var(--space-lg) 0;
  }

  .skeleton-header {
    margin-bottom: var(--space-lg);
  }

  .skeleton-badge {
    width: 100px;
    height: 24px;
  }

  .skeleton-title {
    width: min(250px, 80%);
    height: 30px;
  }

  .skeleton-subtitle {
    width: min(150px, 50%);
    height: 18px;
  }

  .skeleton-line {
    height: 14px;
  }

  .loading-hint {
    font-size: var(--text-xs);
    margin-top: var(--space-md);
  }

  .error-state {
    padding: var(--space-3xl) var(--space-lg);
  }

  .error-icon {
    font-size: 2.5rem;
  }

  .error-message {
    font-size: var(--text-sm);
  }

  .error-actions {
    flex-direction: column;
  }
}
</style>
