import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
  })

  async function loadTheme() {
    const mod = await import('../useTheme')
    return mod.useTheme()
  }

  it('defaults to dark theme', async () => {
    const { theme } = await loadTheme()
    expect(theme.value).toBe('dark')
  })

  it('toggle switches from dark to light', async () => {
    const { theme, toggle } = await loadTheme()
    theme.value = 'dark'
    toggle()
    expect(theme.value).toBe('light')
  })

  it('toggle switches from light to dark', async () => {
    const { theme, toggle } = await loadTheme()
    theme.value = 'light'
    toggle()
    expect(theme.value).toBe('dark')
  })

  it('set() sets a specific theme', async () => {
    const { theme, set } = await loadTheme()
    set('light')
    expect(theme.value).toBe('light')
    set('dark')
    expect(theme.value).toBe('dark')
  })

  it('applies data-theme attribute to document', async () => {
    const { set } = await loadTheme()
    set('light')
    await nextTick()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    set('dark')
    await nextTick()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('persists theme to localStorage', async () => {
    const { set } = await loadTheme()
    set('light')
    await nextTick()
    expect(localStorage.getItem('scp-theme')).toBe('light')
    set('dark')
    await nextTick()
    expect(localStorage.getItem('scp-theme')).toBe('dark')
  })
})
