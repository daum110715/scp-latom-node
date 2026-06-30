import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import {
  bootstrapTerminal,
  getDarkTheme,
  getLightTheme,
  type BootstrapResult,
} from '@/terminal/bootstrap'
import { createTerminalStorage, type TerminalStorage } from '@/terminal/storage'

export function useTerminal() {
  const { t } = useI18n()
  const { theme } = useTheme()
  const router = useRouter()

  const terminalContainer = ref<HTMLDivElement>()
  const visible = ref(false)
  const launched = ref(false)
  const terminalReady = ref(false)
  let result: BootstrapResult | null = null
  let storage: TerminalStorage | null = null

  async function initTerminal() {
    if (!terminalContainer.value) return

    if (!storage) {
      storage = await createTerminalStorage()
    }

    result = bootstrapTerminal(terminalContainer.value, theme.value, storage)

    // Wait for the container to be fully laid out (Teleport + fixed positioning
    // may need an extra frame), then fit and fade in.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      result.fitAddon.fit()
    } catch {
      // container may not be ready yet — ResizeObserver will retry
    }
    terminalReady.value = true
  }

  async function launch() {
    launched.value = true
    await nextTick()
    await initTerminal()
  }

  function exitTerminal() {
    if (result) {
      result.save().then(() => {
        result!.dispose()
        result = null
      })
    }
    launched.value = false
    terminalReady.value = false
  }

  onMounted(() => {
    requestAnimationFrame(() => {
      visible.value = true
    })
  })

  onBeforeUnmount(async () => {
    if (result) {
      await result.save()
      result.dispose()
      result = null
    }
  })

  watch(theme, () => {
    if (!result) return
    const newTheme = theme.value === 'dark' ? getDarkTheme() : getLightTheme()
    result.terminal.options.theme = newTheme
  })

  return {
    t,
    router,
    terminalContainer,
    visible,
    launched,
    terminalReady,
    launch,
    exitTerminal,
  }
}
