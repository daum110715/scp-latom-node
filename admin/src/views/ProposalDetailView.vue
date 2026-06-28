<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProposalsStore } from '@/stores/proposals'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const route = useRoute()
const store = useProposalsStore()
const proposalId = Number(route.params.id)
const showDelete = ref(false)

onMounted(() => store.fetchProposal(proposalId))

async function setStatus(status: string) {
  await store.changeStatus(proposalId, status)
}

async function confirmDelete() {
  await store.remove(proposalId)
  showDelete.value = false
  window.history.back()
}

function formatDate(d: string) {
  return new Date(d + 'Z').toLocaleString()
}
</script>

<template>
  <div class="proposal-detail">
    <div class="page-header">
      <nav class="breadcrumb">
        <router-link to="/proposals">Proposals</router-link>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">#{{ proposalId }}</span>
      </nav>
    </div>

    <div v-if="store.loading && !store.currentProposal" class="loading-state">
      <div class="skeleton" style="height: 300px" />
    </div>

    <template v-else-if="store.currentProposal">
      <div class="admin-card">
        <div class="proposal-header">
          <div class="proposal-title-row">
            <h3>{{ store.currentProposal.title }}</h3>
            <StatusBadge
              :variant="store.currentProposal.status"
              :label="store.currentProposal.status"
            />
          </div>
          <div class="proposal-meta">
            <span
              >By <strong>{{ store.currentProposal.authorCodename }}</strong></span
            >
            <span>•</span>
            <span>{{ store.currentProposal.category }}</span>
            <span>•</span>
            <span>Created {{ formatDate(store.currentProposal.createdAt) }}</span>
          </div>
        </div>

        <div class="proposal-content">
          {{ store.currentProposal.content }}
        </div>

        <!-- Vote Summary -->
        <div class="vote-summary">
          <div class="vote-item for">
            <span class="vote-label">For</span>
            <span class="vote-value">{{ store.currentProposal.votesFor }}</span>
          </div>
          <div class="vote-item against">
            <span class="vote-label">Against</span>
            <span class="vote-value">{{ store.currentProposal.votesAgainst }}</span>
          </div>
          <div class="vote-item abstain">
            <span class="vote-label">Abstain</span>
            <span class="vote-value">{{ store.currentProposal.votesAbstain }}</span>
          </div>
        </div>

        <!-- Voter List -->
        <div v-if="store.currentProposal.voters?.length" class="voter-list">
          <h4>Voters</h4>
          <div class="voters">
            <div v-for="v in store.currentProposal.voters" :key="v.codename" class="voter-item">
              <span class="voter-name">{{ v.codename }}</span>
              <StatusBadge
                :variant="
                  v.vote === 'for' ? 'approved' : v.vote === 'against' ? 'rejected' : 'open'
                "
                :label="v.vote"
              />
              <span class="voter-date">{{ formatDate(v.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="proposal-actions">
          <button
            v-if="store.currentProposal.status !== 'approved'"
            class="btn btn-success"
            @click="setStatus('approved')"
          >
            Approve
          </button>
          <button
            v-if="store.currentProposal.status !== 'rejected'"
            class="btn btn-danger"
            @click="setStatus('rejected')"
          >
            Reject
          </button>
          <button
            v-if="store.currentProposal.status !== 'open'"
            class="btn btn-ghost"
            @click="setStatus('open')"
          >
            Reopen
          </button>
          <button class="btn btn-danger" @click="showDelete = true">Delete Proposal</button>
        </div>
      </div>
    </template>

    <ConfirmModal
      v-if="showDelete"
      title="Delete Proposal"
      message="This will permanently delete this proposal and all its votes. This action cannot be undone."
      confirm-label="Delete"
      :loading="store.loading"
      @confirm="confirmDelete"
      @cancel="showDelete = false"
    />
  </div>
</template>

<style scoped>
.proposal-detail {
  max-width: var(--max-content);
  margin: 0 auto;
}
.page-header {
  margin-bottom: var(--space-lg);
}

.proposal-header {
  margin-bottom: var(--space-lg);
}

.proposal-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.proposal-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.proposal-content {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  white-space: pre-wrap;
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.vote-summary {
  display: flex;
  gap: var(--space-lg);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.vote-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.vote-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.vote-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
}

.vote-item.for .vote-value {
  color: var(--color-success);
}
.vote-item.against .vote-value {
  color: var(--color-danger);
}
.vote-item.abstain .vote-value {
  color: var(--text-tertiary);
}

.voter-list {
  margin-bottom: var(--space-lg);
}
.voter-list h4 {
  margin-bottom: var(--space-md);
}

.voters {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.voter-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
}

.voter-name {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  min-width: 120px;
}

.voter-date {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.proposal-actions {
  display: flex;
  gap: var(--space-sm);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
