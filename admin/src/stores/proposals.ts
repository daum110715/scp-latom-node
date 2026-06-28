import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchAdminProposals,
  fetchAdminProposal,
  updateProposalStatus,
  deleteAdminProposal,
  type AdminProposal,
} from '@/services/proposals'

export const useProposalsStore = defineStore('proposals', () => {
  const proposals = ref<AdminProposal[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref('')
  const statusFilter = ref('')
  const categoryFilter = ref('')
  const currentProposal = ref<AdminProposal | null>(null)

  async function fetchProposals() {
    loading.value = true
    error.value = ''
    const res = await fetchAdminProposals({
      page: page.value,
      limit: limit.value,
      status: statusFilter.value || undefined,
      category: categoryFilter.value || undefined,
    })
    loading.value = false
    if (res.ok) {
      proposals.value = res.data.proposals
      total.value = res.data.total
      totalPages.value = res.data.totalPages
    } else {
      error.value = res.error
    }
  }

  async function fetchProposal(id: number) {
    loading.value = true
    error.value = ''
    const res = await fetchAdminProposal(id)
    loading.value = false
    if (res.ok) {
      currentProposal.value = res.data.proposal
    } else {
      error.value = res.error
    }
  }

  async function changeStatus(id: number, status: string) {
    const res = await updateProposalStatus(id, status)
    if (res.ok) {
      await fetchProposals()
      if (currentProposal.value?.id === id) {
        await fetchProposal(id)
      }
    }
    return res
  }

  async function remove(id: number) {
    const res = await deleteAdminProposal(id)
    if (res.ok) await fetchProposals()
    return res
  }

  function setPage(p: number) {
    page.value = p
    fetchProposals()
  }

  function setStatusFilter(s: string) {
    statusFilter.value = s
    page.value = 1
    fetchProposals()
  }

  function setCategoryFilter(c: string) {
    categoryFilter.value = c
    page.value = 1
    fetchProposals()
  }

  return {
    proposals, total, page, limit, totalPages, loading, error,
    statusFilter, categoryFilter, currentProposal,
    fetchProposals, fetchProposal, changeStatus, remove,
    setPage, setStatusFilter, setCategoryFilter,
  }
})
