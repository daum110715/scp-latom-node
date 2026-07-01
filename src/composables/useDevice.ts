import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useDevice(): {
  width: Ref<number>
  device: ComputedRef<DeviceType>
  isMobile: ComputedRef<boolean>
  isTablet: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isMobileOrTablet: ComputedRef<boolean>
} {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      width.value = window.innerWidth
    }, 100)
  }

  onMounted(() => {
    width.value = window.innerWidth
    window.addEventListener('resize', onResize, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    if (resizeTimer) clearTimeout(resizeTimer)
  })

  const device = computed<DeviceType>(() => {
    if (width.value <= MOBILE_BREAKPOINT) return 'mobile'
    if (width.value <= TABLET_BREAKPOINT) return 'tablet'
    return 'desktop'
  })

  const isMobile = computed(() => device.value === 'mobile')
  const isTablet = computed(() => device.value === 'tablet')
  const isDesktop = computed(() => device.value === 'desktop')
  const isMobileOrTablet = computed(() => device.value !== 'desktop')

  return { width, device, isMobile, isTablet, isDesktop, isMobileOrTablet }
}
