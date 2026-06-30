import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'
import { CLASS_COLORS, CLASS_GLOW, CLASS_KEYS } from '@/constants'

export { CLASS_COLORS as classColors, CLASS_GLOW as classGlow, CLASS_KEYS as classKeys }

export function useAbout() {
  const { t } = useI18n()
  const visible = ref(false)

  onMounted(() => {
    requestAnimationFrame(() => {
      visible.value = true
    })
  })

  return { t, visible }
}
