import { ref, watch, type Ref } from 'vue'
import { STORAGE_KEYS } from '@/constants'

const collapsed = ref(false)

// Initialize from localStorage
try {
  collapsed.value = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true'
} catch {
  // localStorage unavailable
}

watch(collapsed, (val) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(val))
  } catch {
    // localStorage unavailable
  }
})

export function useSidebar(): { collapsed: Ref<boolean>; toggle: () => void } {
  const toggle = () => {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
