<script setup lang="ts">
import { useProposals, categoryVariant, categories } from '@/composables/useProposals'
import { useDevice } from '@/composables/useDevice'
import Badge from '@/components/common/Badge.vue'

const {
  t,
  store,
  auth,
  showForm,
  formTitle,
  formContent,
  formCategory,
  voteMessage,
  toggleForm,
  viewDetail,
  submitProposal,
  castVote,
} = useProposals()

const { isMobile } = useDevice()
</script>

<template>
  <div class="proposals-view">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('proposals.title') }}</h1>
        <p class="page-desc">{{ t('proposals.description') }}</p>
      </div>
      <button class="submit-btn" @click="toggleForm">
        {{ showForm ? t('auth.cancel') : t('proposals.submit') }}
      </button>
    </div>

    <!-- Create Form -->
    <div v-if="showForm" class="create-form">
      <p class="form-desc">{{ t('proposals.submitDesc') }}</p>

      <div class="form-group">
        <label class="form-label">{{ t('proposals.titleLabel') }}</label>
        <input
          v-model="formTitle"
          class="form-input"
          :placeholder="t('proposals.titlePlaceholder')"
          maxlength="200"
        />
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('proposals.categoryLabel') }}</label>
        <select v-model="formCategory" class="form-select">
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ t(`proposals.categories.${cat}`) }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('proposals.contentLabel') }}</label>
        <p class="template-hint">{{ t('proposals.templateTitle') }}</p>
        <textarea
          v-model="formContent"
          class="form-textarea"
          :placeholder="t('proposals.contentPlaceholder')"
          rows="12"
          maxlength="10000"
        />
      </div>

      <p class="daily-info">
        {{ t('proposals.dailyLimit', { max: store.dailyLimit, used: store.dailyUsed }) }}
      </p>

      <p v-if="store.dailyUsed >= store.dailyLimit" class="form-error">
        {{ t('proposals.dailyLimitReached', { max: store.dailyLimit }) }}
      </p>

      <div class="form-actions">
        <button
          class="submit-btn"
          :disabled="
            store.creating ||
            store.dailyUsed >= store.dailyLimit ||
            formTitle.trim().length < 5 ||
            formContent.trim().length < 20
          "
          @click="submitProposal"
        >
          {{ store.creating ? '...' : t('proposals.submit') }}
        </button>
        <button class="cancel-btn" @click="showForm = false">{{ t('auth.cancel') }}</button>
      </div>

      <p v-if="store.error" class="form-error">{{ store.error }}</p>
    </div>

    <!-- Vote message -->
    <p v-if="voteMessage" class="vote-message">{{ voteMessage }}</p>

    <!-- Loading -->
    <div v-if="store.loading && !store.proposals.length" class="loading-state">
      <div v-for="i in 4" :key="i" class="skeleton skeleton-card" />
    </div>

    <!-- Error -->
    <div v-else-if="store.error && !store.proposals.length" class="error-state">
      <span class="error-icon">⚠</span>
      <p>{{ store.error }}</p>
      <button class="retry-btn" @click="store.loadProposals()">{{ t('errors.retry') }}</button>
    </div>

    <!-- Empty -->
    <div v-else-if="!store.proposals.length && !store.loading" class="empty-state">
      <span class="empty-icon">◇</span>
      <p>{{ t('proposals.empty') }}</p>
    </div>

    <!-- Proposal List -->
    <div v-else class="proposal-list">
      <div v-for="p in store.proposals" :key="p.id" class="proposal-card">
        <div class="proposal-header">
          <div class="proposal-meta">
            <Badge :variant="(categoryVariant[p.category] as any) || 'safe'">
              {{ t(`proposals.categories.${p.category}`) || p.category }}
            </Badge>
            <span class="proposal-status" :class="p.status">{{
              t(`proposals.status.${p.status}`)
            }}</span>
          </div>
          <span class="proposal-date">{{ new Date(p.createdAt).toLocaleDateString() }}</span>
        </div>

        <h3 class="proposal-title">{{ p.title }}</h3>
        <p class="proposal-author">{{ t('proposals.by', { author: p.authorCodename }) }}</p>

        <div class="proposal-content-preview">
          {{ p.content.slice(0, 200) }}{{ p.content.length > 200 ? '...' : '' }}
        </div>

        <button class="view-btn" @click="viewDetail(p.id)">{{ t('proposals.view') }}</button>

        <div class="proposal-footer">
          <div class="vote-counts">
            <span class="vote-count for">▲ {{ p.votesFor }}</span>
            <span class="vote-count against">▼ {{ p.votesAgainst }}</span>
            <span class="vote-count abstain">— {{ p.votesAbstain }}</span>
          </div>

          <div v-if="p.userVote" class="user-voted">
            {{ t('proposals.vote.alreadyVoted') }}
          </div>

          <div v-else-if="auth.isAuthenticated && p.status === 'open'" class="vote-actions">
            <template v-if="!isMobile">
              <button
                class="vote-btn for"
                :title="t('proposals.vote.for')"
                @click="castVote(p.id, 'for')"
              >
                ▲ {{ t('proposals.vote.for') }}
              </button>
              <button
                class="vote-btn against"
                :title="t('proposals.vote.against')"
                @click="castVote(p.id, 'against')"
              >
                ▼ {{ t('proposals.vote.against') }}
              </button>
              <button
                class="vote-btn abstain"
                :title="t('proposals.vote.abstain')"
                @click="castVote(p.id, 'abstain')"
              >
                — {{ t('proposals.vote.abstain') }}
              </button>
            </template>
            <template v-else>
              <button
                class="vote-btn-icon for"
                :title="t('proposals.vote.for')"
                @click="castVote(p.id, 'for')"
              >
                ▲
              </button>
              <button
                class="vote-btn-icon against"
                :title="t('proposals.vote.against')"
                @click="castVote(p.id, 'against')"
              >
                ▼
              </button>
              <button
                class="vote-btn-icon abstain"
                :title="t('proposals.vote.abstain')"
                @click="castVote(p.id, 'abstain')"
              >
                —
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proposals-view {
  max-width: var(--max-content);
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
  gap: var(--space-md);
}

.page-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  margin-bottom: var(--space-xs);
}

.page-desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.submit-btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: none;
  color: var(--text-inverse);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  transition: background var(--transition-fast);
}

.submit-btn:hover {
  background: var(--color-primary-hover);
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── Create Form ─── */

.create-form {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  margin-bottom: var(--space-xl);
}

.form-desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-lg);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.template-hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
  font-family: var(--font-mono);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
  resize: vertical;
}

.form-select {
  cursor: pointer;
}

.daily-info {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-bottom: var(--space-md);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
}

.cancel-btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.cancel-btn:hover {
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.form-error {
  margin-top: var(--space-md);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

/* ─── Vote Message ─── */

.vote-message {
  background: var(--color-success-bg, var(--bg-surface));
  border: 1px solid var(--color-success, var(--border-subtle));
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-lg);
  font-size: var(--text-sm);
  color: var(--color-success, var(--text-secondary));
}

/* ─── Proposal Cards ─── */

.proposal-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.proposal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  transition: border-color var(--transition-fast);
}

.proposal-card:hover {
  border-color: var(--text-tertiary);
}

.proposal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.proposal-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.proposal-status {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.proposal-status.open {
  color: var(--color-accent);
}
.proposal-status.approved {
  color: var(--color-success);
}
.proposal-status.rejected {
  color: var(--color-danger);
}

.proposal-date {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.proposal-title {
  font-size: var(--text-lg);
  margin-bottom: var(--space-xs);
}

.proposal-author {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-bottom: var(--space-md);
}

.proposal-content-preview {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-sm);
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.view-btn {
  display: inline-block;
  padding: var(--space-xs) var(--space-md);
  margin-bottom: var(--space-md);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.proposal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-subtle);
}

.vote-counts {
  display: flex;
  gap: var(--space-md);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.vote-count.for {
  color: var(--color-success);
}
.vote-count.against {
  color: var(--color-danger);
}
.vote-count.abstain {
  color: var(--text-tertiary);
}

.user-voted {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.vote-actions {
  display: flex;
  gap: var(--space-xs);
}

.vote-btn {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: transparent;
  cursor: pointer;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  transition: all var(--transition-fast);
}

.vote-btn.for {
  color: var(--color-success);
}
.vote-btn.for:hover {
  background: var(--color-success);
  color: var(--text-inverse);
  border-color: var(--color-success);
}
.vote-btn.against {
  color: var(--color-danger);
}
.vote-btn.against:hover {
  background: var(--color-danger);
  color: var(--text-inverse);
  border-color: var(--color-danger);
}
.vote-btn.abstain {
  color: var(--text-tertiary);
}
.vote-btn.abstain:hover {
  background: var(--text-tertiary);
  color: var(--text-inverse);
  border-color: var(--text-tertiary);
}

.vote-btn-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: transparent;
  cursor: pointer;
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.vote-btn-icon.for {
  color: var(--color-success);
}
.vote-btn-icon.for:hover {
  background: var(--color-success);
  color: var(--text-inverse);
  border-color: var(--color-success);
}
.vote-btn-icon.against {
  color: var(--color-danger);
}
.vote-btn-icon.against:hover {
  background: var(--color-danger);
  color: var(--text-inverse);
  border-color: var(--color-danger);
}
.vote-btn-icon.abstain {
  color: var(--text-tertiary);
}
.vote-btn-icon.abstain:hover {
  background: var(--text-tertiary);
  color: var(--text-inverse);
  border-color: var(--text-tertiary);
}

/* ─── States ─── */

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.skeleton {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-card {
  height: 160px;
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

.error-state,
.empty-state {
  text-align: center;
  padding: var(--space-3xl) 0;
}

.error-icon,
.empty-icon {
  font-size: 3rem;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: var(--space-md);
}

.error-icon {
  color: var(--color-danger);
}

.retry-btn {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: none;
  color: var(--text-inverse);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
}

/* ─── Mobile (max-width: 768px) ─── */

@media (max-width: 768px) {
  .proposals-view {
    max-width: none;
    margin: 0;
    padding: var(--space-md);
  }

  .page-header {
    flex-direction: column;
    margin-bottom: var(--space-lg);
  }

  .page-title {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  .page-desc {
    font-size: var(--text-xs);
    margin-bottom: var(--space-md);
  }

  .page-header > .submit-btn {
    width: 100%;
  }

  .create-form {
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .form-desc {
    font-size: var(--text-xs);
  }

  .form-group {
    margin-bottom: var(--space-md);
  }

  .form-label {
    font-size: var(--text-xs);
  }

  .form-input,
  .form-select,
  .form-textarea {
    padding: var(--space-sm);
  }

  .form-textarea {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions > .submit-btn {
    width: 100%;
  }

  .cancel-btn {
    width: 100%;
    text-align: center;
  }

  .form-error {
    font-size: var(--text-xs);
  }

  .vote-message {
    text-align: center;
    font-size: var(--text-xs);
    padding: var(--space-sm);
  }

  .skeleton-card {
    height: 140px;
  }

  .error-state,
  .empty-state {
    padding: var(--space-3xl) var(--space-lg);
  }

  .error-icon,
  .empty-icon {
    font-size: 2.5rem;
  }

  .proposal-card {
    padding: var(--space-md);
  }

  .proposal-card:hover {
    border-color: var(--border-subtle);
  }

  .proposal-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .proposal-date {
    margin-top: var(--space-xs);
  }

  .proposal-title {
    font-size: var(--text-base);
  }

  .proposal-content-preview {
    font-size: var(--text-xs);
  }

  .view-btn {
    padding: var(--space-xs) var(--space-sm);
  }

  .proposal-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
    padding-top: var(--space-sm);
  }

  .vote-counts {
    font-size: var(--text-xs);
    gap: var(--space-sm);
  }

  .vote-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
