import { useI18n } from 'vue-i18n'

export function useNotFound() {
  const { t } = useI18n()
  return { t }
}
