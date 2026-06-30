import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProposalsStore } from '@/stores/proposals'
import { useAuthStore } from '@/stores/auth'
import { CATEGORY_VARIANT, PROPOSAL_CATEGORIES } from '@/constants'

export { CATEGORY_VARIANT as categoryVariant, PROPOSAL_CATEGORIES as categories }

export function useProposals() {
  const { t } = useI18n()
  const router = useRouter()
  const store = useProposalsStore()
  const auth = useAuthStore()

  const showForm = ref(false)
  const formTitle = ref('')
  const formContent = ref('')
  const formCategory = ref('general')
  const voteMessage = ref('')

  function toggleForm() {
    showForm.value = !showForm.value
  }

  function viewDetail(id: number) {
    router.push(`/proposals/${id}`)
  }

  async function submitProposal() {
    const ok = await store.submitProposal({
      title: formTitle.value.trim(),
      content: formContent.value.trim(),
      category: formCategory.value,
    })
    if (ok) {
      showForm.value = false
      formTitle.value = ''
      formContent.value = ''
      formCategory.value = 'general'
    }
  }

  async function castVote(proposalId: number, vote: 'for' | 'against' | 'abstain') {
    const ok = await store.vote(proposalId, vote)
    if (ok) {
      voteMessage.value = t('proposals.vote.success')
      setTimeout(() => {
        voteMessage.value = ''
      }, 3000)
    }
  }

  onMounted(() => {
    store.loadProposals()
  })

  return {
    t,
    router,
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
  }
}
