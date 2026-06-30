<script setup lang="ts">
import { useDevice } from '@/composables/useDevice'
import Badge from '@/components/common/Badge.vue'
import ClassBar from '@/components/common/ClassBar.vue'
import type { ObjectClass } from '@/types'

const props = defineProps<{
  scpId: string
  scpNumber: number
  lang: 'en' | 'cn'
  objectClass?: string
  name?: string
  fetchedAt?: string
  bookmarked: boolean
  bookmarkLoading: boolean
  downloading: boolean
  isAuthenticated: boolean
}>()

const emit = defineEmits<{
  download: []
  toggleBookmark: []
  report: []
}>()

const { isMobile } = useDevice()
</script>

<template>
  <div class="entry-header">
    <div class="entry-meta">
      <ClassBar
        v-if="props.objectClass"
        :object-class="props.objectClass as ObjectClass"
        :show-label="true"
      />
      <Badge v-if="props.objectClass" :variant="props.objectClass.toLowerCase() as any">
        {{ props.objectClass }}
      </Badge>
      <div class="entry-actions">
        <button
          class="download-btn"
          :disabled="props.downloading"
          title="Download"
          @click="emit('download')"
        >
          <svg
            width="18"
            height="18"
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
          v-if="props.isAuthenticated"
          class="bookmark-btn"
          :class="{ active: props.bookmarked }"
          :disabled="props.bookmarkLoading"
          :title="props.bookmarked ? 'Remove bookmark' : 'Add bookmark'"
          @click="emit('toggleBookmark')"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            :fill="props.bookmarked ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </button>
        <button
          v-if="props.isAuthenticated"
          class="report-btn"
          title="Report"
          @click="emit('report')"
        >
          <svg
            width="18"
            height="18"
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
    <h1 class="entry-title">
      <span class="entry-id">{{ props.scpId }}</span>
      <span v-if="props.name" class="entry-name">— {{ props.name }}</span>
    </h1>
    <div class="entry-info">
      <span class="info-item">
        <span class="info-label">Language</span>
        {{ props.lang === 'en' ? 'English' : '中文' }}
      </span>
      <span v-if="props.fetchedAt && !isMobile" class="info-item">
        <span class="info-label">Cached</span>
        {{ new Date(props.fetchedAt).toLocaleDateString() }}
      </span>
      <a
        :href="`https://scp-wiki.wikidot.com/scp-${String(props.scpNumber).padStart(3, '0')}`"
        target="_blank"
        rel="noopener noreferrer"
        class="wiki-link"
      >
        {{ isMobile ? 'Wiki' : 'View on Wiki' }} ↗
      </a>
    </div>
  </div>
</template>

<style scoped>
.entry-header {
  margin-bottom: var(--space-lg);
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.entry-actions {
  display: flex;
  gap: var(--space-sm);
  margin-left: auto;
}

.download-btn,
.bookmark-btn,
.report-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.download-btn:hover,
.bookmark-btn:hover,
.report-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.bookmark-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.download-btn:disabled,
.bookmark-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.entry-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  line-height: 1.2;
  margin-bottom: var(--space-md);
}

.entry-id {
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.entry-name {
  color: var(--text-primary);
}

.entry-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  align-items: center;
}

.info-label {
  color: var(--text-tertiary);
  font-weight: 500;
  margin-right: var(--space-xs);
}

.wiki-link {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-decoration: none;
  font-family: var(--font-mono);
  transition: color var(--transition-fast);
}

.wiki-link:hover {
  color: var(--color-accent);
}

@media (max-width: 768px) {
  .entry-meta {
    flex-wrap: wrap;
  }

  .download-btn,
  .bookmark-btn,
  .report-btn {
    width: 32px;
    height: 32px;
  }

  .download-btn svg,
  .bookmark-btn svg,
  .report-btn svg {
    width: 16px;
    height: 16px;
  }

  .download-btn:hover,
  .bookmark-btn:hover,
  .bookmark-btn.active,
  .report-btn:hover {
    background: transparent;
  }

  .entry-title {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  .entry-info {
    gap: var(--space-sm);
    font-size: var(--text-xs);
  }
}
</style>
