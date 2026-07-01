<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDevice } from '@/composables/useDevice'
import Badge from '@/components/common/Badge.vue'
import { classVariant, typeIcon, renderMarkdown } from '@/composables/useDocuments'
import { sanitizeHtml } from '@/utils/sanitize'
import type { Document } from '@/types'

const props = defineProps<{
  doc: Document | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { isMobile } = useDevice()
const { t } = useI18n()

const sanitizedContent = computed(() =>
  props.doc ? sanitizeHtml(renderMarkdown(t(`docs.${props.doc.id}.content`))) : '',
)
</script>

<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'slide-up' : 'fade'">
      <div v-if="props.doc" class="doc-overlay" @click.self="isMobile ? undefined : emit('close')">
        <!-- Desktop: centered dialog -->
        <div v-if="!isMobile" class="doc-modal">
          <div class="doc-modal-header">
            <div class="doc-modal-meta">
              <Badge :variant="classVariant(props.doc.classification)">
                {{ t(`classification.${props.doc.classification}`) }}
              </Badge>
              <span class="doc-modal-type">
                <span class="type-icon">{{ typeIcon[props.doc.type] }}</span>
                {{ t(`documents.types.${props.doc.type}`) }}
              </span>
            </div>
            <button class="close-btn" @click="emit('close')">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <h2 class="doc-modal-title">{{ t(`docs.${props.doc.id}.title`) }}</h2>
          <!-- eslint-disable vue/no-v-html -->
          <div class="doc-modal-content" v-html="sanitizedContent"></div>
          <div class="doc-modal-footer">
            <div class="modal-footer-row">
              <span class="footer-label">{{ t('documents.meta.classification') }}</span>
              <span class="footer-value">{{
                t(`classification.${props.doc.classification}`)
              }}</span>
            </div>
            <div class="modal-footer-row">
              <span class="footer-label">{{ t('documents.meta.lastUpdated') }}</span>
              <span class="footer-value">{{ props.doc.date }}</span>
            </div>
            <div class="modal-footer-row">
              <span class="footer-label">{{ t('documents.meta.node') }}</span>
              <span class="footer-value">LATOM-7</span>
            </div>
          </div>
        </div>

        <!-- Mobile: full-screen sheet -->
        <template v-else>
          <div class="m-modal-header">
            <button class="m-close-btn" @click="emit('close')">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div class="m-modal-meta">
              <Badge :variant="classVariant(props.doc.classification)">
                {{ t(`classification.${props.doc.classification}`) }}
              </Badge>
              <span class="m-modal-type">
                <span class="type-icon">{{ typeIcon[props.doc.type] }}</span>
                {{ t(`documents.types.${props.doc.type}`) }}
              </span>
            </div>
          </div>
          <div class="m-modal-body">
            <h2 class="m-modal-title">{{ t(`docs.${props.doc.id}.title`) }}</h2>
            <!-- eslint-disable vue/no-v-html -->
            <div class="m-modal-content" v-html="sanitizedContent"></div>
            <div class="m-modal-footer">
              <div class="m-footer-row">
                <span class="m-footer-label">{{ t('documents.meta.classification') }}</span>
                <span class="m-footer-value">{{
                  t(`classification.${props.doc.classification}`)
                }}</span>
              </div>
              <div class="m-footer-row">
                <span class="m-footer-label">{{ t('documents.meta.lastUpdated') }}</span>
                <span class="m-footer-value">{{ props.doc.date }}</span>
              </div>
              <div class="m-footer-row">
                <span class="m-footer-label">{{ t('documents.meta.node') }}</span>
                <span class="m-footer-value">LATOM-7</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ═══ Overlay ═══ */
.doc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

/* ═══ Desktop Modal ═══ */
.doc-modal {
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow-y: auto;
  padding: var(--space-xl);
}

.doc-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.doc-modal-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.doc-modal-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.close-btn {
  color: var(--text-tertiary);
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.doc-modal-title {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-xl);
  line-height: var(--leading-tight);
}

.doc-modal-content {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.doc-modal-content :deep(h2) {
  font-size: var(--text-xl);
  margin: var(--space-xl) 0 var(--space-md);
  color: var(--text-primary);
}

.doc-modal-content :deep(h3) {
  font-size: var(--text-lg);
  margin: var(--space-lg) 0 var(--space-sm);
  color: var(--text-primary);
}

.doc-modal-content :deep(h4) {
  font-size: var(--text-base);
  margin: var(--space-md) 0 var(--space-sm);
  color: var(--text-primary);
}

.doc-modal-content :deep(p) {
  margin-bottom: var(--space-md);
}

.doc-modal-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: var(--space-md);
  margin: var(--space-md) 0;
  color: var(--text-tertiary);
  font-style: italic;
}

.doc-modal-content :deep(code) {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-primary);
}

.doc-modal-content :deep(li) {
  margin-left: var(--space-lg);
  margin-bottom: var(--space-xs);
}

.doc-modal-content :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.doc-modal-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-md) 0;
  font-size: var(--text-sm);
}

.doc-modal-content :deep(th),
.doc-modal-content :deep(td) {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-subtle);
  text-align: left;
}

.doc-modal-content :deep(th) {
  background: var(--bg-elevated);
  font-weight: 600;
  color: var(--text-primary);
}

.doc-modal-content :deep(td) {
  color: var(--text-secondary);
}

/* Desktop Modal Footer */
.doc-modal-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.modal-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.footer-label {
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

.footer-value {
  color: var(--text-secondary);
}

/* ═══ Mobile Full-Screen Modal ═══ */
.m-modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.m-close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
}

.m-close-btn:active {
  background: var(--bg-hover);
}

.m-modal-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.m-modal-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.m-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg) var(--space-md);
}

.m-modal-title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-xl);
  color: var(--text-primary);
}

.m-modal-content {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.m-modal-content :deep(h2) {
  font-size: var(--text-lg);
  margin: var(--space-xl) 0 var(--space-md);
  color: var(--text-primary);
}

.m-modal-content :deep(h3) {
  font-size: var(--text-base);
  margin: var(--space-lg) 0 var(--space-sm);
  color: var(--text-primary);
}

.m-modal-content :deep(h4) {
  font-size: var(--text-sm);
  margin: var(--space-md) 0 var(--space-sm);
  color: var(--text-primary);
}

.m-modal-content :deep(p) {
  margin-bottom: var(--space-md);
}

.m-modal-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: var(--space-md);
  margin: var(--space-md) 0;
  color: var(--text-tertiary);
  font-style: italic;
}

.m-modal-content :deep(code) {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-primary);
}

.m-modal-content :deep(li) {
  margin-left: var(--space-lg);
  margin-bottom: var(--space-xs);
}

.m-modal-content :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.m-modal-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-md) 0;
  font-size: var(--text-xs);
}

.m-modal-content :deep(th),
.m-modal-content :deep(td) {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--border-subtle);
  text-align: left;
}

.m-modal-content :deep(th) {
  background: var(--bg-elevated);
  font-weight: 600;
  color: var(--text-primary);
}

.m-modal-content :deep(td) {
  color: var(--text-secondary);
}

/* Mobile Modal Footer */
.m-modal-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.m-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
}

.m-footer-label {
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

.m-footer-value {
  color: var(--text-secondary);
}

/* ═══ Transitions ═══ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-leave-active {
  transition: transform 0.2s ease-in;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* ═══ Mobile Responsive ═══ */
@media (max-width: 768px) {
  .doc-overlay {
    background: var(--bg-primary);
    backdrop-filter: none;
    padding: 0;
    align-items: stretch;
    justify-content: flex-start;
    flex-direction: column;
  }
}
</style>
