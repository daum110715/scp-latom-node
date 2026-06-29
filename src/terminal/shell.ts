/**
 * Shell state manager for the SCP Foundation terminal.
 * Manages current directory, command history, environment variables,
 * prompt rendering, and input handling.
 *
 * Integrates with TerminalStorage for persistent state across sessions.
 */

import {
  createFilesystem,
  resolvePath,
  resolvePathString,
  createDir,
  createFile,
  removeNode,
  isProtectedPath,
  splitPath,
  type FSNode,
} from './filesystem'
import { executeCommand, getCompletions, getCommandNames } from './commands'
import type { TerminalStorage, PersistedState } from './storage'
import { createDebouncedSave, computeFSDelta, mergeFilesystemDelta } from './storage'

export interface ShellState {
  cwd: string
  history: string[]
  historyIndex: number
  env: Record<string, string>
  root: FSNode
  currentInput: string
}

export interface ShellOptions {
  onWrite: (text: string) => void
  onClear: () => void
  onPrompt: () => void
  storage?: TerminalStorage | null
}

const DEFAULT_ENV: Record<string, string> = {
  USER: 'researcher',
  HOME: '/home/researcher',
  HOSTNAME: 'LATOM-7',
  SHELL: '/bin/bash',
  TERM: 'xterm-256color',
  PATH: '/usr/local/bin:/usr/bin:/bin:/opt/scf/bin',
  LANG: 'en_US.UTF-8',
  PS1: '\\u@\\h:\\w\\$ ',
  EDITOR: 'vim',
}

export function createShell(options: ShellOptions) {
  const defaultRoot = createFilesystem()
  let root = defaultRoot
  let loadedFromStorage = false

  const state: ShellState = {
    cwd: '/home/researcher',
    history: [],
    historyIndex: -1,
    env: { ...DEFAULT_ENV },
    root,
    currentInput: '',
  }

  // ── Persistence ──

  const storage = options.storage ?? null

  function getStateForSave(): PersistedState {
    return {
      cwd: state.cwd,
      history: state.history,
      env: { ...state.env },
      filesystemDelta: computeFSDelta(state.root, defaultRoot),
    }
  }

  const debouncedSave = storage ? createDebouncedSave(storage, getStateForSave, 500) : null

  function triggerSave() {
    if (debouncedSave) debouncedSave()
  }

  /** Explicit save — awaits completion. Used before dispose. */
  async function save(): Promise<void> {
    if (!storage) return
    try {
      await storage.save(getStateForSave())
    } catch {
      // Swallow save errors — non-critical
    }
  }

  /** Load persisted state from storage. Called once on creation. */
  async function init(): Promise<void> {
    if (!storage) return
    try {
      const persisted = await storage.load()
      if (!persisted) return

      // Restore filesystem with user delta merged onto defaults
      if (persisted.filesystemDelta && Object.keys(persisted.filesystemDelta).length > 0) {
        root = mergeFilesystemDelta(defaultRoot, persisted.filesystemDelta)
        state.root = root
      }

      // Restore shell state
      if (persisted.cwd) {
        // Validate cwd still exists in the merged tree
        const node = resolvePath(state.root, '/', persisted.cwd)
        if (node && node.type === 'dir') {
          state.cwd = persisted.cwd
        }
      }

      if (Array.isArray(persisted.history)) {
        state.history = persisted.history.slice(-500) // Cap at 500 entries
      }

      if (persisted.env && typeof persisted.env === 'object') {
        state.env = { ...DEFAULT_ENV, ...persisted.env }
      }

      loadedFromStorage = true
    } catch {
      // Failed to load — start fresh
    }
  }

  // ── Filesystem Mutation Helpers ──

  /** Resolve a path and return the absolute path string and parent node. */
  function resolveForMutation(target: string): {
    absolutePath: string
    parentPath: string
    name: string
    parentNode: FSNode | null
  } {
    const absolutePath = resolvePathString(state.cwd, target)
    const { parent: parentPath, name } = splitPath(absolutePath)
    const parentNode = resolvePath(state.root, '/', parentPath)
    return { absolutePath, parentPath, name, parentNode }
  }

  function doMkdir(target: string): string | null {
    const { absolutePath, name, parentNode } = resolveForMutation(target)

    if (isProtectedPath(absolutePath)) {
      return `mkdir: cannot create directory '${name}': Permission denied (protected system path)`
    }
    if (!parentNode || parentNode.type !== 'dir') {
      return `mkdir: cannot create directory '${target}': No such file or directory`
    }
    if (parentNode.children?.has(name)) {
      return `mkdir: cannot create directory '${name}': File exists`
    }
    const created = createDir(parentNode, name)
    if (!created) {
      return `mkdir: cannot create directory '${name}': Operation failed`
    }
    return null
  }

  function doRm(target: string): string | null {
    const { absolutePath, name, parentNode } = resolveForMutation(target)

    if (isProtectedPath(absolutePath)) {
      return `rm: cannot remove '${name}': Permission denied (protected system path)`
    }
    if (!parentNode || parentNode.type !== 'dir') {
      return `rm: cannot remove '${target}': No such file or directory`
    }
    const node = parentNode.children?.get(name)
    if (!node) {
      return `rm: cannot remove '${target}': No such file or directory`
    }
    // Don't allow removing non-empty directories
    if (node.type === 'dir' && node.children && node.children.size > 0) {
      return `rm: cannot remove '${name}': Directory not empty`
    }
    removeNode(parentNode, name)
    return null
  }

  function doTouch(target: string): string | null {
    const { absolutePath, name, parentNode } = resolveForMutation(target)

    if (isProtectedPath(absolutePath)) {
      return `touch: cannot create '${name}': Permission denied (protected system path)`
    }
    if (!parentNode || parentNode.type !== 'dir') {
      return `touch: cannot create '${target}': No such file or directory`
    }
    // If file already exists, touch is a no-op (just like real touch)
    if (parentNode.children?.has(name)) {
      return null
    }
    const created = createFile(parentNode, name)
    if (!created) {
      return `touch: cannot create '${name}': Operation failed`
    }
    return null
  }

  function onFsMutate() {
    triggerSave()
  }

  // ── Prompt ──

  function getPrompt(): string {
    const dir = state.cwd === '/home/researcher' ? '~' : state.cwd.replace('/home/researcher', '~')
    return `\x1b[1;32mresearcher\x1b[0m@\x1b[1;34mLATOM-7\x1b[0m:\x1b[1;36m${dir}\x1b[0m$ `
  }

  function writePrompt() {
    options.onWrite(getPrompt())
  }

  function setcwd(path: string) {
    state.cwd = path
    triggerSave()
  }

  function setenv(key: string, value: string) {
    state.env[key] = value
    triggerSave()
  }

  function clear() {
    options.onClear()
  }

  function processInput(input: string) {
    const trimmed = input.trim()

    // Add to history (skip empty and duplicates)
    if (trimmed && state.history[state.history.length - 1] !== trimmed) {
      state.history.push(trimmed)
      triggerSave()
    }
    state.historyIndex = -1

    // Write the entered line (echo the input)
    options.onWrite(getPrompt() + input + '\r\n')

    // Handle exit specially
    if (trimmed === 'exit') {
      const output = executeCommand(trimmed, {
        cwd: state.cwd,
        root: state.root,
        history: state.history,
        env: state.env,
        setcwd,
        setenv,
        clear,
        mkdir: doMkdir,
        rm: doRm,
        touch: doTouch,
        onFsMutate,
      })
      if (output.length > 0) {
        options.onWrite(output.join('\r\n') + '\r\n')
      }
      return 'exit'
    }

    // Execute command
    const output = executeCommand(trimmed, {
      cwd: state.cwd,
      root: state.root,
      history: state.history,
      env: state.env,
      setcwd,
      setenv,
      clear,
      mkdir: doMkdir,
      rm: doRm,
      touch: doTouch,
      onFsMutate,
    })
    if (output.length > 0) {
      options.onWrite(output.join('\r\n') + '\r\n')
    }

    return null
  }

  function getHistoryPrev(): string | null {
    if (state.history.length === 0) return null
    if (state.historyIndex === -1) {
      state.historyIndex = state.history.length - 1
    } else if (state.historyIndex > 0) {
      state.historyIndex--
    }
    return state.history[state.historyIndex] ?? null
  }

  function getHistoryNext(): string | null {
    if (state.historyIndex === -1) return null
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++
      return state.history[state.historyIndex]
    }
    state.historyIndex = -1
    return ''
  }

  function getCompletionsFor(input: string): string[] {
    return getCompletions(input, state.cwd, state.root)
  }

  function getMotd(): string {
    const etcNode = state.root.children?.get('etc')
    const motdNode = etcNode?.children?.get('motd')
    return motdNode?.content || ''
  }

  return {
    state,
    getPrompt,
    writePrompt,
    processInput,
    getHistoryPrev,
    getHistoryNext,
    getCompletionsFor,
    getMotd,
    getCommandNames,
    save,
    /** Promise that resolves once initial storage load is complete. */
    ready: init(),
  }
}
