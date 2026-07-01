import { useI18n, type Composer } from 'vue-i18n'

export function useNotFound(): { t: Composer['t'] } {
  const { t } = useI18n()
  return { t }
}
