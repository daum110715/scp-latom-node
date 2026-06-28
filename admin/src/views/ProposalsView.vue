<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProposalsStore } from '@/stores/proposals'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const store = useProposalsStore()
const deleteTarget = ref<number | null>(null)

onMounted(() => store.fetchProposals())

function onStatusFilter(e: Event) {
  store.setStatusFilter((e.target as HTMLSelectElement).value)
}

function onCategoryFilter(e: Event) {
  store.setCategoryFilter((e.target as HTMLSelectElement).value)
}

async function confirmDelete() {
  if (deleteTarget.value !== null) {
    await store.remove(deleteTarget.value)
    deleteTarget.value = null
  }
}

function formatDate(d: string) {
  return new Date(d + 'Z').toLocaleDateString()
}
</script>

<template>
  <div class="proposals-view">
    <div class="page-header">
      <h2>Proposal Moderation</h2>
      <p class="page-desc">Review, approve, or reject user proposals</p>
    </div>

    <div class="filter-bar">
      <select class="select" @change="onStatusFilter">
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
      <select class="select" @change="onCategoryFilter">
        <option value="">All Categories</option>
        <option value="protocol">Protocol</option>
        <option value="research">Research</option>
        <option value="containment">Containment</option>
        <option value="general">General</option>
      </select>
      <span class="results-count">{{ store.total }} proposals</span>
    </div>

    <div v-if="store.loading && !store.proposals.length" class="loading-state">
      <div class="skeleton" v-for="i in 10" :key="i" style="height: 48px" />
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Author</th>
              <th>Votes</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in store.proposals" :key="p.id">
              <td class="cell-mono">{{ p.id }}</td>
              <td>
                <router-link :to="`/proposals/${p.id}`" class="proposal-link">{{ p.title }}</router-link>
              </td>
              <td><StatusBadge :variant="p.category" :label="p.category" /></td>
              <td><StatusBadge :variant="p.status" :label="p.status" /></td>
              <td>{{ p.authorCodename }}</td>
              <td class="cell-mono">
                <span class="vote-count for">+{{ p.votesFor }}</span>
                <span class="vote-count against">-{{ p.votesAgainst }}</span>
                <span class="vote-count abstain">~{{ p.votesAbstain }}</span>
              </td>
              <td class="cell-mono">{{ formatDate(p.createdAt) }}</td>
              <td>
                <div class="action-btns">
                  <router-link :to="`/proposals/${p.id}`" class="btn btn-ghost btn-sm">View</router-link>
                  <button v-if="p.status === 'open'" class="btn btn-success btn-sm" @click="store.changeStatus(p.id, 'approved')">Approve</button>
                  <button v-if="p.status === 'open'" class="btn btn-danger btn-sm" @click="store.changeStatus(p.id, 'rejected')">Reject</button>
                  <button v-if="p.status !== 'open'" class="btn btn-ghost btn-sm" @click="store.changeStatus(p.id, 'open')">Reopen</button>
                  <button class="btn btn-danger btn-sm" @click="deleteTarget = p.id">Delete</button>
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
      title="Delete Proposal"
      message="This will permanently delete the proposal and all its votes. This action cannot be undone."
      confirm-label="Delete Proposal"
      :loading="store.loading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.proposals-view { max-width: var(--max-content); margin: 0 auto; }
.page-header { margin-bottom: var(--space-xl); }
.page-header h2 { margin-bottom: var(--space-xs); }
.page-desc { color: var(--text-tertiary); font-size: var(--text-sm); }

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

.proposal-link {
  color: var(--color-accent);
  font-weight: 500;
}

.proposal-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

.vote-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  margin-right: var(--space-xs);
}

.vote-count.for { color: var(--color-success); }
.vote-count.against { color: var(--color-danger); }
.vote-count.abstain { color: var(--text-tertiary); }

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
