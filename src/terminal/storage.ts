/**
 * Persistent storage for the SCP Foundation terminal.
 * Uses OPFS (Origin Private File System) as the primary backend,
 * with IndexedDB as a fallback for browsers that don't support OPFS.
 *
 * Persists shell state (cwd, history, env) and user filesystem modifications
 * as a delta overlay on the default SCP-themed tree.
 */

import type { FSNode } from './filesystem'

// ── Types ──

export interface PersistedState {
  cwd: string
  history: string[]
  env: Record<string, string>
  filesystemDelta: SerializedFSDelta
}

export interface SerializedFSDelta {
  [name: string]: {
    type: 'file' | 'dir'
    content?: string
    children?: SerializedFSDelta
    deleted?: boolean
  }
}

export interface TerminalStorage {
  load(): Promise<PersistedState | null>
  save(state: PersistedState): Promise<void>
  clear(): Promise<void>
}

const DB_NAME = 'SCP-Terminal'
const DB_VERSION = 1
const STORE_NAME = 'state'
const OPFS_DIR = 'terminal'
const STORAGE_VERSION = 1

// ── Filesystem Serialization ──

/**
 * Serialize an FSNode tree to a plain JSON-compatible structure.
 * Converts Map children to objects.
 */
export function serializeFSNode(node: FSNode): SerializedFSDelta[string] {
  if (node.type === 'file') {
    return { type: 'file', content: node.content ?? '' }
  }
  const children: SerializedFSDelta = {}
  for (const [name, child] of node.children) {
    children[name] = serializeFSNode(child)
  }
  return { type: 'dir', children }
}

/**
 * Deserialize a plain object back into an FSNode tree.
 * Reconstructs Map children from objects.
 */
export function deserializeFSNode(name: string, data: SerializedFSDelta[string]): FSNode {
  if (data.type === 'file') {
    return { type: 'file', name, content: data.content ?? '' }
  }
  const map = new Map<string, FSNode>()
  if (data.children) {
    for (const [childName, childData] of Object.entries(data.children)) {
      map.set(childName, deserializeFSNode(childName, childData))
    }
  }
  return { type: 'dir', name, children: map }
}

/**
 * Compute the delta between the current filesystem and the default tree.
 * Only includes user-added, user-modified, or user-deleted nodes.
 */
export function computeFSDelta(currentRoot: FSNode, defaultRoot: FSNode): SerializedFSDelta {
  const delta: SerializedFSDelta = {}

  if (currentRoot.type !== 'dir' || defaultRoot.type !== 'dir') return delta

  // Find user-added or modified nodes
  for (const [name, currentNode] of currentRoot.children) {
    const defaultNode = defaultRoot.children.get(name)

    if (!defaultNode) {
      // User-added node — serialize entirely
      delta[name] = serializeFSNode(currentNode)
    } else if (currentNode.type === 'file' && defaultNode.type === 'file') {
      // Check if file content was modified
      if (currentNode.content !== defaultNode.content) {
        delta[name] = { type: 'file', content: currentNode.content ?? '' }
      }
    } else if (currentNode.type === 'dir' && defaultNode.type === 'dir') {
      // Recurse into directories
      const childDelta = computeFSDelta(currentNode, defaultNode)
      if (Object.keys(childDelta).length > 0) {
        delta[name] = { type: 'dir', children: childDelta }
      }
    }
    // Type mismatch (file↔dir) — treat as modification
    else if (currentNode.type !== defaultNode.type) {
      delta[name] = serializeFSNode(currentNode)
    }
  }

  // Find user-deleted nodes (in default but not in current)
  for (const [name] of defaultRoot.children) {
    if (!currentRoot.children.has(name)) {
      delta[name] = { type: 'dir', deleted: true }
    }
  }

  return delta
}

/**
 * Merge a serialized delta onto a default FSNode tree.
 * Returns a new tree with user modifications applied.
 */
export function mergeFilesystemDelta(defaultRoot: FSNode, delta: SerializedFSDelta): FSNode {
  // Deep-clone the default tree via serialization roundtrip
  const cloned = cloneFSNode(defaultRoot)

  if (cloned.type !== 'dir') return cloned

  for (const [name, deltaEntry] of Object.entries(delta)) {
    if (deltaEntry.deleted) {
      cloned.children.delete(name)
    } else if (deltaEntry.type === 'file') {
      cloned.children.set(name, { type: 'file', name, content: deltaEntry.content ?? '' })
    } else if (deltaEntry.type === 'dir') {
      const existing = cloned.children.get(name)
      if (existing && existing.type === 'dir' && deltaEntry.children) {
        // Recursively merge into existing directory
        const merged = mergeFilesystemDelta(existing, deltaEntry.children)
        cloned.children.set(name, merged)
      } else {
        // New directory
        cloned.children.set(name, deserializeFSNode(name, deltaEntry))
      }
    }
  }

  return cloned
}

/**
 * Deep-clone an FSNode tree.
 */
function cloneFSNode(node: FSNode): FSNode {
  if (node.type === 'file') {
    return { type: 'file', name: node.name, content: node.content }
  }
  const map = new Map<string, FSNode>()
  for (const [name, child] of node.children) {
    map.set(name, cloneFSNode(child))
  }
  return { type: 'dir', name: node.name, children: map }
}

// ── OPFS Backend ──

async function createOPFSStorage(): Promise<TerminalStorage | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const dirHandle = await root.getDirectoryHandle(OPFS_DIR, { create: true })

    return {
      async load() {
        try {
          const fileHandle = await dirHandle.getFileHandle('shell-state.json')
          const file = await fileHandle.getFile()
          const text = await file.text()
          return JSON.parse(text) as PersistedState
        } catch {
          // File doesn't exist yet or is corrupted — start fresh
          return null
        }
      },

      async save(state) {
        const fileHandle = await dirHandle.getFileHandle('shell-state.json', { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(JSON.stringify({ ...state, version: STORAGE_VERSION }))
        await writable.close()
      },

      async clear() {
        try {
          await dirHandle.removeEntry('shell-state.json')
        } catch {
          // File may not exist
        }
      },
    }
  } catch {
    return null
  }
}

// ── IndexedDB Backend ──

function createIndexedDBStorage(): Promise<TerminalStorage> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const db = request.result

      function getTransaction(key: string): Promise<PersistedState | null> {
        return new Promise((res, rej) => {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const store = tx.objectStore(STORE_NAME)
          const req = store.get(key)
          req.onsuccess = () => res(req.result ?? null)
          req.onerror = () => rej(req.error)
        })
      }

      function putTransaction(key: string, value: PersistedState): Promise<void> {
        return new Promise((res, rej) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const req = store.put(value, key)
          req.onsuccess = () => res()
          req.onerror = () => rej(req.error)
        })
      }

      function deleteTransaction(key: string): Promise<void> {
        return new Promise((res, rej) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const req = store.delete(key)
          req.onsuccess = () => res()
          req.onerror = () => rej(req.error)
        })
      }

      resolve({
        async load() {
          return getTransaction('shell-state')
        },
        async save(state) {
          await putTransaction('shell-state', { ...state })
        },
        async clear() {
          await deleteTransaction('shell-state')
        },
      })
    }
  })
}

// ── Debounce Helper ──

function debounce<T extends (...args: unknown[]) => Promise<void>>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args).catch((e) => {
        console.warn('[storage] Debounced save failed:', e instanceof Error ? e.message : e)
      })
      timer = null
    }, ms)
  }
}

// ── Factory ──

let cachedStorage: TerminalStorage | null = null
let detectionDone = false

/**
 * Create a terminal storage instance.
 * Detects OPFS availability once and caches the result.
 * Returns null if no storage backend is available (e.g., in tests without mocks).
 */
export async function createTerminalStorage(): Promise<TerminalStorage | null> {
  if (detectionDone) return cachedStorage
  detectionDone = true

  // Try OPFS first
  const opfs = await createOPFSStorage()
  if (opfs) {
    cachedStorage = opfs
    return cachedStorage
  }

  // Fall back to IndexedDB
  try {
    cachedStorage = await createIndexedDBStorage()
    return cachedStorage
  } catch {
    // No storage available
    cachedStorage = null
    return null
  }
}

/**
 * Create a debounced save function wrapping storage.save().
 */
export function createDebouncedSave(
  storage: TerminalStorage,
  getState: () => PersistedState,
  ms = 500,
): () => void {
  return debounce(async () => {
    await storage.save(getState())
  }, ms)
}

/**
 * Reset the cached storage (for testing).
 */
export function resetStorageCache(): void {
  cachedStorage = null
  detectionDone = false
}
