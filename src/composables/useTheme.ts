import { ref, watchEffect, type Ref } from 'vue'
import { STORAGE_KEYS } from '@/constants'

type Theme = 'dark' | 'light'

const VALID_THEMES: readonly Theme[] = ['dark', 'light']

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME)
  return VALID_THEMES.includes(stored as Theme) ? (stored as Theme) : 'dark'
}

const theme = ref<Theme>(readTheme())

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem(STORAGE_KEYS.THEME, t)
}

watchEffect(() => applyTheme(theme.value))

export function useTheme(): { theme: Ref<Theme>; toggle: () => void; set: (t: Theme) => void } {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function set(t: Theme) {
    theme.value = t
  }

  return { theme, toggle, set }
}
