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
  writeFile,
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
  OLDPWD: '/home/researcher',
}

export function createShell(options: ShellOptions) {
  const defaultRoot = createFilesystem()
  let root = defaultRoot
  let loadedFromStorage = false

  let previousCwd = '/home/researcher'

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
    const homeDir = state.env.HOME
    const absolutePath = resolvePathString(state.cwd, target, homeDir)
    const { parent: parentPath, name } = splitPath(absolutePath)
    const parentNode = resolvePath(state.root, '/', parentPath, homeDir)
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

  function doCopy(src: string, dest: string): string | null {
    const srcPath = resolvePathString(state.cwd, src)
    const srcNode = resolvePath(state.root, '/', srcPath)
    if (!srcNode) return `cp: cannot stat '${src}': No such file or directory`

    const destPath = resolvePathString(state.cwd, dest)
    const destNode = resolvePath(state.root, '/', destPath)

    // If dest is an existing directory, copy into it
    if (destNode && destNode.type === 'dir') {
      const childName = srcNode.name
      if (destNode.children?.has(childName)) {
        return `cp: cannot copy '${src}': '${dest}/${childName}' already exists`
      }
      const cloned = deepClone(srcNode)
      destNode.children!.set(childName, cloned)
      return null
    }

    // Dest doesn't exist — create at parent
    const { parent: parentPath, name } = splitPath(destPath)
    const parentNode = resolvePath(state.root, '/', parentPath)
    if (!parentNode || parentNode.type !== 'dir') {
      return `cp: cannot create '${dest}': No such file or directory`
    }
    if (isProtectedPath(destPath)) {
      return `cp: cannot create '${name}': Permission denied (protected system path)`
    }
    const cloned = deepClone(srcNode)
    cloned.name = name
    parentNode.children!.set(name, cloned)
    return null
  }

  function doMove(src: string, dest: string): string | null {
    const srcPath = resolvePathString(state.cwd, src)
    const { parent: srcParentPath, name: srcName } = splitPath(srcPath)
    const srcParentNode = resolvePath(state.root, '/', srcParentPath)
    if (!srcParentNode || srcParentNode.type !== 'dir') {
      return `mv: cannot stat '${src}': No such file or directory`
    }
    const srcNode = srcParentNode.children?.get(srcName)
    if (!srcNode) return `mv: cannot stat '${src}': No such file or directory`

    if (isProtectedPath(srcPath)) {
      return `mv: cannot move '${src}': Permission denied (protected system path)`
    }

    const destPath = resolvePathString(state.cwd, dest)
    const destNode = resolvePath(state.root, '/', destPath)

    // If dest is an existing directory, move into it
    if (destNode && destNode.type === 'dir') {
      if (destNode.children?.has(srcName)) {
        return `mv: cannot move '${src}': '${dest}/${srcName}' already exists`
      }
      srcParentNode.children!.delete(srcName)
      destNode.children!.set(srcName, srcNode)
      return null
    }

    // Dest doesn't exist — rename/move to parent
    const { parent: destParentPath, name: destName } = splitPath(destPath)
    const destParentNode = resolvePath(state.root, '/', destParentPath)
    if (!destParentNode || destParentNode.type !== 'dir') {
      return `mv: cannot move to '${dest}': No such file or directory`
    }
    if (isProtectedPath(destPath)) {
      return `mv: cannot move to '${destName}': Permission denied (protected system path)`
    }
    srcParentNode.children!.delete(srcName)
    srcNode.name = destName
    destParentNode.children!.set(destName, srcNode)
    return null
  }

  function doRmrf(target: string): string | null {
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
    removeNode(parentNode, name)
    return null
  }

  function doWriteFile(target: string, content: string): string | null {
    const { absolutePath, name, parentNode } = resolveForMutation(target)

    if (isProtectedPath(absolutePath)) {
      return `write: cannot write '${name}': Permission denied (protected system path)`
    }

    // If file exists, overwrite it
    const existingNode = resolvePath(state.root, '/', absolutePath)
    if (existingNode && existingNode.type === 'file') {
      writeFile(existingNode, content)
      return null
    }

    // Create new file
    if (!parentNode || parentNode.type !== 'dir') {
      return `write: cannot create '${target}': No such file or directory`
    }
    const created = createFile(parentNode, name, content)
    if (!created) {
      return `write: cannot create '${name}': Operation failed`
    }
    return null
  }

  function doAppendFile(target: string, content: string): string | null {
    const absolutePath = resolvePathString(state.cwd, target)

    if (isProtectedPath(absolutePath)) {
      return `append: cannot write '${target}': Permission denied (protected system path)`
    }

    const node = resolvePath(state.root, '/', absolutePath)
    if (node && node.type === 'file') {
      writeFile(node, (node.content || '') + content)
      return null
    }

    // Create new file if it doesn't exist
    const { name, parentNode } = resolveForMutation(target)
    if (!parentNode || parentNode.type !== 'dir') {
      return `append: cannot create '${target}': No such file or directory`
    }
    const created = createFile(parentNode, name, content)
    if (!created) {
      return `append: cannot create '${name}': Operation failed`
    }
    return null
  }

  /** Deep clone an FSNode tree. */
  function deepClone(node: FSNode): FSNode {
    if (node.type === 'file') {
      return { type: 'file', name: node.name, content: node.content }
    }
    const children = new Map<string, FSNode>()
    if (node.children) {
      for (const [key, child] of node.children) {
        children.set(key, deepClone(child))
      }
    }
    return { type: 'dir', name: node.name, children }
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
    previousCwd = state.cwd
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

    // Move to next line (prompt+input already visible from onKey echo)
    options.onWrite('\r\n')

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
        copy: doCopy,
        move: doMove,
        rmrf: doRmrf,
        writeFile: doWriteFile,
        appendFile: doAppendFile,
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
      copy: doCopy,
      move: doMove,
      rmrf: doRmrf,
      writeFile: doWriteFile,
      appendFile: doAppendFile,
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
    return getCompletions(input, state.cwd, state.root, state.env.HOME)
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
