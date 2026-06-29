/**
 * xterm.js bootstrap for the SCP Foundation terminal.
 * Initializes the terminal instance, loads addons, and wires keyboard input to the shell.
 */

import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { createShell } from './shell'
import type { TerminalStorage } from './storage'

export interface TerminalTheme {
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  selectionForeground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

export function getDarkTheme(): TerminalTheme {
  return {
    background: '#0c0c14',
    foreground: '#d4d4e0',
    cursor: '#c9a44a',
    cursorAccent: '#0c0c14',
    selectionBackground: '#c9a44a28',
    selectionForeground: '#e8e8ec',
    black: '#0c0c14',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#fbbf24',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#d4d4e0',
    brightBlack: '#6b6b82',
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fde68a',
    brightBlue: '#93bbfd',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#f0f0f8',
  }
}

export function getLightTheme(): TerminalTheme {
  return {
    background: '#f6f6fc',
    foreground: '#2a2a3e',
    cursor: '#a8842a',
    cursorAccent: '#f6f6fc',
    selectionBackground: '#a8842a1a',
    selectionForeground: '#1a1a2e',
    black: '#1a1a2e',
    red: '#dc2626',
    green: '#16a34a',
    yellow: '#ca8a04',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0891b2',
    white: '#f6f6fc',
    brightBlack: '#7a7a92',
    brightRed: '#ef4444',
    brightGreen: '#22c55e',
    brightYellow: '#eab308',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#06b6d4',
    brightWhite: '#ffffff',
  }
}

export interface BootstrapResult {
  terminal: Terminal
  fitAddon: FitAddon
  dispose: () => void
  save: () => Promise<void>
}

export function bootstrapTerminal(
  container: HTMLElement,
  theme: 'dark' | 'light',
  storage?: TerminalStorage | null,
): BootstrapResult {
  const terminalTheme = theme === 'dark' ? getDarkTheme() : getLightTheme()

  const terminal = new Terminal({
    theme: terminalTheme,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    fontSize: 13,
    fontWeight: '400',
    fontWeightBold: '500',
    lineHeight: 1.5,
    letterSpacing: 0.3,
    cursorBlink: true,
    cursorStyle: 'block',
    cursorWidth: 1,
    scrollback: 5000,
    allowTransparency: true,
    convertEol: true,
    disableStdin: false,
    smoothScrollDuration: 120,
    drawBoldTextInBrightColors: true,
    minimumContrastRatio: 4.5,
  })

  const fitAddon = new FitAddon()
  const webLinksAddon = new WebLinksAddon()

  terminal.loadAddon(fitAddon)
  terminal.loadAddon(webLinksAddon)

  // Try WebGL renderer, fall back to canvas
  let webglAddon: WebglAddon | null = null
  try {
    webglAddon = new WebglAddon()
    terminal.loadAddon(webglAddon)
  } catch {
    // WebGL not available, canvas renderer is the fallback
  }

  terminal.open(container)
  fitAddon.fit()

  // Shell setup
  let currentInput = ''

  const shell = createShell({
    onWrite: (text: string) => {
      terminal.write(text)
    },
    onClear: () => {
      terminal.clear()
    },
    onPrompt: () => {
      shell.writePrompt()
      currentInput = ''
    },
    storage: storage ?? undefined,
  })

  // Wait for storage load, then display MOTD and prompt
  shell.ready.then(() => {
    const motd = shell.getMotd()
    if (motd) {
      terminal.write(motd)
    }
    shell.writePrompt()
  })

  // Keyboard input handler
  terminal.onKey(({ key, domEvent }) => {
    const ev = domEvent
    const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey

    // Ctrl+C — cancel current input
    if (ev.ctrlKey && ev.key === 'c') {
      terminal.write('^C\r\n')
      shell.writePrompt()
      currentInput = ''
      return
    }

    // Ctrl+L — clear screen
    if (ev.ctrlKey && ev.key === 'l') {
      terminal.clear()
      shell.writePrompt()
      terminal.write(currentInput)
      return
    }

    // Ctrl+A — move to beginning of line
    if (ev.ctrlKey && ev.key === 'a') {
      terminal.write('\x1b[' + currentInput.length + 'D')
      return
    }

    // Ctrl+E — move to end of line
    if (ev.ctrlKey && ev.key === 'e') {
      terminal.write('\x1b[' + currentInput.length + 'C')
      return
    }

    // Ctrl+U — clear line before cursor
    if (ev.ctrlKey && ev.key === 'u') {
      terminal.write('\r\x1b[K')
      shell.writePrompt()
      currentInput = ''
      return
    }

    // Ctrl+W — delete word before cursor
    if (ev.ctrlKey && ev.key === 'w') {
      const trimmed = currentInput.trimEnd()
      const lastSpace = trimmed.lastIndexOf(' ')
      const newInput = lastSpace >= 0 ? trimmed.slice(0, lastSpace + 1) : ''
      const charsToRemove = currentInput.length - newInput.length
      currentInput = newInput
      terminal.write(
        '\b'.repeat(charsToRemove) + ' '.repeat(charsToRemove) + '\b'.repeat(charsToRemove),
      )
      return
    }

    // Enter — process command
    if (ev.key === 'Enter') {
      const result = shell.processInput(currentInput)
      currentInput = ''
      if (result === 'exit') {
        terminal.write('\r\n\x1b[90m[Process completed]\x1b[0m\r\n')
        terminal.options.disableStdin = true
        return
      }
      shell.writePrompt()
      return
    }

    // Backspace
    if (ev.key === 'Backspace') {
      if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1)
        terminal.write('\b \b')
      }
      return
    }

    // Tab — completion
    if (ev.key === 'Tab') {
      ev.preventDefault()
      const completions = shell.getCompletionsFor(currentInput)
      if (completions.length === 0) return

      if (completions.length === 1) {
        const parts = currentInput.trimStart().split(/\s+/)
        const isFirstWord = parts.length <= 1
        const completed = completions[0]

        if (isFirstWord) {
          terminal.write('\r\x1b[K')
          shell.writePrompt()
          currentInput = completed + ' '
          terminal.write(currentInput)
        } else {
          const lastSpace = currentInput.lastIndexOf(' ')
          const prefix = currentInput.slice(0, lastSpace + 1)
          currentInput = prefix + completed
          terminal.write('\r\x1b[K')
          shell.writePrompt()
          terminal.write(currentInput)
        }
      } else {
        terminal.write('\r\n\x1b[90m' + completions.join('  ') + '\x1b[0m\r\n')
        shell.writePrompt()
        terminal.write(currentInput)
      }
      return
    }

    // Up arrow — history previous
    if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      const prev = shell.getHistoryPrev()
      if (prev !== null) {
        terminal.write('\r\x1b[K')
        shell.writePrompt()
        currentInput = prev
        terminal.write(currentInput)
      }
      return
    }

    // Down arrow — history next
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      const next = shell.getHistoryNext()
      if (next !== null) {
        terminal.write('\r\x1b[K')
        shell.writePrompt()
        currentInput = next
        terminal.write(currentInput)
      }
      return
    }

    // Left/Right arrows — let xterm handle cursor movement naturally
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      return
    }

    // Regular printable character
    if (printable && key.length === 1) {
      currentInput += key
      terminal.write(key)
    }
  })

  // Resize handler
  const handleResize = () => {
    try {
      fitAddon.fit()
    } catch {
      // Ignore resize errors during cleanup
    }
  }
  window.addEventListener('resize', handleResize)

  // Save state explicitly (used before dispose on theme toggle)
  const save = async () => {
    await shell.save()
  }

  // Cleanup
  const dispose = () => {
    window.removeEventListener('resize', handleResize)
    try {
      webglAddon?.dispose()
    } catch {
      // WebGL dispose may fail
    }
    terminal.dispose()
  }

  return { terminal, fitAddon, dispose, save }
}
