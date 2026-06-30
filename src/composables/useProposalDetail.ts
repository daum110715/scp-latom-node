import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProposalsStore } from '@/stores/proposals'
import { useAuthStore } from '@/stores/auth'
import { CATEGORY_VARIANT } from '@/constants'

export { CATEGORY_VARIANT as categoryVariant }

export function useProposalDetail() {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const store = useProposalsStore()
  const auth = useAuthStore()

  const proposalId = computed(() => parseInt(route.params.id as string, 10))
  const proposal = computed(() => store.currentProposal)

  function goBack() {
    router.push('/proposals')
  }

  async function castVote(vote: 'for' | 'against' | 'abstain') {
    await store.vote(proposalId.value, vote)
  }

  onMounted(() => {
    store.loadProposal(proposalId.value)
  })

  return {
    t,
    store,
    auth,
    proposalId,
    proposal,
    goBack,
    castVote,
  }
}
