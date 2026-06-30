import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

export function useLogin() {
  const { t } = useI18n()
  const router = useRouter()
  const auth = useAuthStore()

  const codename = ref('')
  const password = ref('')

  async function handleSubmit() {
    const ok = await auth.login(codename.value, password.value)
    if (ok) router.push('/')
  }

  return { t, auth, codename, password, handleSubmit }
}

const CODENAME_RE = /^[a-zA-Z0-9_]{3,32}$/

export function useRegister() {
  const { t } = useI18n()
  const router = useRouter()
  const auth = useAuthStore()

  const codename = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const localError = ref('')

  async function handleSubmit() {
    localError.value = ''

    if (!CODENAME_RE.test(codename.value)) {
      localError.value = t('auth.errors.codenameFormat')
      return
    }
    if (password.value.length < 8) {
      localError.value = t('auth.errors.passwordLength')
      return
    }
    if (password.value !== confirmPassword.value) {
      localError.value = t('auth.errors.passwordMismatch')
      return
    }

    const ok = await auth.register(codename.value, password.value)
    if (ok) router.push('/')
  }

  return { t, auth, codename, password, confirmPassword, localError, handleSubmit }
}
