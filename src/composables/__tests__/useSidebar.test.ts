import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useSidebar } from '../useSidebar'

describe('useSidebar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns collapsed ref and toggle function', () => {
    const { collapsed, toggle } = useSidebar()
    expect(typeof collapsed.value).toBe('boolean')
    expect(typeof toggle).toBe('function')
  })

  it('toggle flips collapsed state', () => {
    const { collapsed, toggle } = useSidebar()
    const initial = collapsed.value
    toggle()
    expect(collapsed.value).toBe(!initial)
    toggle()
    expect(collapsed.value).toBe(initial)
  })

  it('persists state to localStorage after toggle', async () => {
    const { collapsed, toggle } = useSidebar()
    const before = collapsed.value
    toggle()
    await nextTick()
    const stored = localStorage.getItem('scp-sidebar-collapsed')
    expect(stored).toBe(String(!before))
  })
})
