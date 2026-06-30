import { reactive, computed } from 'vue'

const STORAGE_KEY = 'scp-feature-flags'

interface FeatureFlags {
  terminal: boolean
}

function loadFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { terminal: !!parsed.terminal }
    }
  } catch {
    // ignore corrupt storage
  }
  return { terminal: false }
}

function saveFlags(flags: FeatureFlags) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

const flags = reactive<FeatureFlags>(loadFlags())

export function useFeatureFlags() {
  const terminalEnabled = computed(() => flags.terminal)

  function toggleTerminal() {
    flags.terminal = !flags.terminal
    saveFlags(flags)
  }

  return { flags, terminalEnabled, toggleTerminal }
}
