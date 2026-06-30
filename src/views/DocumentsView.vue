<script setup lang="ts">
import { useDocuments } from '@/composables/useDocuments'
import { classColor, typeIcon, types, classVariant } from '@/composables/useDocuments'
import { useDevice } from '@/composables/useDevice'
import Badge from '@/components/common/Badge.vue'
import DocumentModal from '@/components/documents/DocumentModal.vue'

const { isMobile } = useDevice()
const { t, visible, activeDoc, typeFilter, sortBy, filtered, openDoc, closeDoc, documents } =
  useDocuments()
</script>

<template>
  <div class="documents" :class="{ visible }">
    <!-- Ambient orbs -->
    <div class="orb orb-primary"></div>
    <div v-if="!isMobile" class="orb orb-accent"></div>

    <!-- Hero Header -->
    <header class="docs-hero">
      <div v-if="!isMobile" class="grid-bg"></div>
      <div class="hero-content">
        <span class="hero-badge">{{ t('documents.hero.badge', { count: documents.length }) }}</span>
        <h1 class="hero-title">
          <span class="title-main">{{ t('documents.title') }}</span>
        </h1>
        <p class="hero-desc">{{ t('documents.description') }}</p>
      </div>
    </header>

    <!-- Filter & Sort Bar (desktop) -->
    <div v-if="!isMobile" class="controls-bar fade-up-1">
      <div class="filter-group">
        <button class="filter-btn" :class="{ active: !typeFilter }" @click="typeFilter = null">
          {{ t('documents.all') }}
        </button>
        <button
          v-for="typ in types"
          :key="typ"
          class="filter-btn"
          :class="{ active: typeFilter === typ }"
          @click="typeFilter = typ"
        >
          <span class="filter-icon">{{ typeIcon[typ] }}</span>
          {{ t(`documents.types.${typ}`) }}
        </button>
      </div>
      <div class="sort-group">
        <span class="sort-label">{{ t('documents.sortBy') }}</span>
        <button
          v-for="s in ['date', 'classification', 'type'] as const"
          :key="s"
          class="sort-btn"
          :class="{ active: sortBy === s }"
          @click="sortBy = s"
        >
          {{ t(`documents.sort.${s}`) }}
        </button>
      </div>
    </div>

    <!-- Filter Pills (mobile) -->
    <div v-else class="filter-scroll fade-up-1">
      <div class="filter-pills">
        <button class="pill" :class="{ active: !typeFilter }" @click="typeFilter = null">
          {{ t('documents.all') }}
        </button>
        <button
          v-for="typ in types"
          :key="typ"
          class="pill"
          :class="{ active: typeFilter === typ }"
          @click="typeFilter = typ"
        >
          <span class="pill-icon">{{ typeIcon[typ] }}</span>
          {{ t(`documents.types.${typ}`) }}
        </button>
      </div>
    </div>

    <!-- Document Count -->
    <div class="doc-count fade-up-1">
      {{ t('documents.count', { count: filtered.length }) }}
    </div>

    <!-- Document Grid / List -->
    <div class="doc-grid">
      <div
        v-for="(doc, i) in filtered"
        :key="doc.id"
        class="doc-card"
        :class="`fade-up-${Math.min(i + 2, 8)}`"
        :style="{ '--card-color': classColor[doc.classification] }"
        @click="openDoc(doc)"
      >
        <div class="doc-card-accent"></div>
        <div class="doc-header">
          <div class="doc-badges">
            <Badge :variant="classVariant(doc.classification)">{{
              t(`classification.${doc.classification}`)
            }}</Badge>
            <span class="doc-type-badge">
              <span class="type-icon">{{ typeIcon[doc.type] }}</span>
              {{ t(`documents.types.${doc.type}`) }}
            </span>
          </div>
        </div>
        <h3 class="doc-title">{{ t(`docs.${doc.id}.title`) }}</h3>
        <p class="doc-summary">{{ t(`docs.${doc.id}.summary`) }}</p>
        <div class="doc-footer">
          <span class="doc-date">{{ doc.date }}</span>
          <span class="doc-read">{{ t('documents.read') }}</span>
        </div>
      </div>
    </div>

    <!-- Document Modal -->
    <DocumentModal :doc="activeDoc" @close="closeDoc" />

    <!-- Footer -->
    <footer class="docs-footer fade-up-8">
      <p>{{ t('documents.footer.disclaimer') }}</p>
    </footer>
  </div>
</template>

<style scoped>
.documents {
  max-width: var(--max-content);
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(16px);
  transition: all 800ms var(--ease-out-expo);
}

.documents.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ═══ Ambient Orbs ═══ */
.orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 1.5s ease;
}

.documents.visible .orb {
  opacity: 0.1;
}

.orb-primary {
  width: 450px;
  height: 450px;
  background: var(--color-primary);
  top: 5%;
  right: -15%;
  animation: orb-float 20s ease-in-out infinite;
}

.orb-accent {
  width: 350px;
  height: 350px;
  background: var(--color-accent);
  bottom: 25%;
  left: -10%;
  animation: orb-float 25s ease-in-out infinite reverse;
}

@keyframes orb-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(25px, -35px) scale(1.04);
  }
  66% {
    transform: translate(-15px, 20px) scale(0.96);
  }
}

/* ═══ Hero ═══ */
.docs-hero {
  position: relative;
  padding: var(--space-3xl) 0 var(--space-2xl);
  margin-bottom: var(--space-xl);
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.3;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 70%);
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  letter-spacing: 0.08em;
  margin-bottom: var(--space-lg);
  animation: fade-up 600ms var(--ease-out-expo) 100ms backwards;
}

.hero-title {
  margin-bottom: var(--space-md);
  animation: fade-up 600ms var(--ease-out-expo) 200ms backwards;
}

.title-main {
  background: linear-gradient(
    135deg,
    var(--text-primary) 0%,
    var(--color-primary) 50%,
    var(--color-accent) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  max-width: 600px;
  line-height: var(--leading-relaxed);
  animation: fade-up 600ms var(--ease-out-expo) 350ms backwards;
}

/* ═══ Animations ═══ */
.fade-up-1 {
  animation: fade-up 600ms var(--ease-out-expo) 300ms backwards;
}
.fade-up-2 {
  animation: fade-up 600ms var(--ease-out-expo) 400ms backwards;
}
.fade-up-3 {
  animation: fade-up 600ms var(--ease-out-expo) 500ms backwards;
}
.fade-up-4 {
  animation: fade-up 600ms var(--ease-out-expo) 600ms backwards;
}
.fade-up-5 {
  animation: fade-up 600ms var(--ease-out-expo) 700ms backwards;
}
.fade-up-6 {
  animation: fade-up 600ms var(--ease-out-expo) 800ms backwards;
}
.fade-up-7 {
  animation: fade-up 600ms var(--ease-out-expo) 900ms backwards;
}
.fade-up-8 {
  animation: fade-up 600ms var(--ease-out-expo) 1000ms backwards;
}

/* ═══ Controls ═══ */
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-inverse);
}

.filter-icon {
  font-size: var(--text-xs);
}

.sort-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sort-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

.sort-btn {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.sort-btn:hover {
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.sort-btn.active {
  background: var(--bg-elevated);
  border-color: var(--border-default);
  color: var(--text-primary);
}

/* ═══ Mobile Filter Scroll ═══ */
.filter-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: var(--space-sm);
  position: relative;
  z-index: 1;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-pills {
  display: flex;
  gap: var(--space-sm);
}

.pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 500;
  white-space: nowrap;
}

.pill.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-inverse);
}

.pill-icon {
  font-size: 10px;
}

/* ═══ Doc Count ═══ */
.doc-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  margin-bottom: var(--space-lg);
}

/* ═══ Document Grid ═══ */
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
  position: relative;
  z-index: 1;
}

.doc-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  cursor: pointer;
  transition: all 400ms var(--ease-out-expo);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.doc-card-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--card-color);
  opacity: 0.6;
  transition: opacity 400ms var(--ease-out-expo);
}

.doc-card:hover {
  border-color: var(--card-color);
  transform: translateY(-4px);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 0 1px color-mix(in srgb, var(--card-color) 20%, transparent);
}

.doc-card:hover .doc-card-accent {
  opacity: 1;
}

.doc-header {
  margin-bottom: var(--space-sm);
}

.doc-badges {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.doc-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-icon {
  font-size: 10px;
}

.doc-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
  line-height: var(--leading-tight);
}

.doc-summary {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.doc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-subtle);
}

.doc-date {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.doc-read {
  font-size: var(--text-sm);
  color: var(--color-accent);
  font-weight: 500;
  transition: color var(--transition-fast);
}

.doc-card:hover .doc-read {
  color: var(--color-accent-hover);
}

/* ═══ Footer ═══ */
.docs-footer {
  padding: var(--space-xl) 0;
  border-top: 1px solid var(--border-subtle);
  margin-top: var(--space-2xl);
  position: relative;
  z-index: 1;
}

.docs-footer p {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .documents {
    padding: var(--space-md);
    max-width: none;
    margin: 0;
    transform: translateY(12px);
    transition: all 600ms var(--ease-out-expo);
  }

  .orb-primary {
    width: 300px;
    height: 300px;
    right: -20%;
    filter: blur(80px);
    animation: orb-float 22s ease-in-out infinite;
  }

  .documents.visible .orb {
    opacity: 0.07;
  }

  .docs-hero {
    padding: var(--space-lg) 0 var(--space-xl);
    margin-bottom: var(--space-md);
  }

  .hero-badge {
    padding: var(--space-xs) var(--space-sm);
    font-size: 10px;
    gap: 0;
    margin-bottom: var(--space-md);
    animation: fade-up 500ms var(--ease-out-expo) 100ms backwards;
  }

  .hero-title {
    margin-bottom: var(--space-sm);
    animation: fade-up 500ms var(--ease-out-expo) 200ms backwards;
  }

  .hero-desc {
    font-size: var(--text-sm);
    max-width: none;
    animation: fade-up 500ms var(--ease-out-expo) 300ms backwards;
  }

  .fade-up-1 {
    animation: fade-up 500ms var(--ease-out-expo) 200ms backwards;
  }
  .fade-up-2 {
    animation: fade-up 500ms var(--ease-out-expo) 300ms backwards;
  }
  .fade-up-3 {
    animation: fade-up 500ms var(--ease-out-expo) 400ms backwards;
  }
  .fade-up-4 {
    animation: fade-up 500ms var(--ease-out-expo) 500ms backwards;
  }
  .fade-up-5 {
    animation: fade-up 500ms var(--ease-out-expo) 600ms backwards;
  }
  .fade-up-6 {
    animation: fade-up 500ms var(--ease-out-expo) 600ms backwards;
  }
  .fade-up-7 {
    animation: fade-up 500ms var(--ease-out-expo) 700ms backwards;
  }
  .fade-up-8 {
    animation: fade-up 500ms var(--ease-out-expo) 800ms backwards;
  }

  .doc-count {
    font-size: 10px;
    margin-bottom: var(--space-md);
  }

  .doc-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }

  .doc-card {
    padding: var(--space-lg);
    cursor: default;
    transition: none;
  }

  .doc-card:hover {
    transform: none;
    box-shadow: none;
  }

  .doc-card:active {
    border-color: var(--card-color);
  }

  .doc-title {
    font-size: var(--text-base);
    margin-bottom: var(--space-xs);
  }

  .doc-summary {
    -webkit-line-clamp: 2;
    margin-bottom: var(--space-md);
  }

  .doc-footer {
    margin-top: 0;
    padding-top: var(--space-sm);
  }

  .docs-footer {
    padding: var(--space-xl) 0 var(--space-md);
    margin-top: var(--space-lg);
  }

  .docs-footer p {
    font-size: 10px;
    max-width: none;
  }
}
</style>
