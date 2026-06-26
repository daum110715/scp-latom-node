import { ref, watchEffect } from 'vue'

type Theme = 'dark' | 'light'

const theme = ref<Theme>((localStorage.getItem('scp-theme') as Theme) || 'dark')

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('scp-theme', t)
}

watchEffect(() => applyTheme(theme.value))

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function set(t: Theme) {
    theme.value = t
  }

  return { theme, toggle, set }
}
