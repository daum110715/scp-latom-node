/**
 * Path resolution for the virtual filesystem.
 */

import type { FSNode } from './types'

/**
 * Resolve a path relative to the current working directory.
 * Returns the FSNode at the resolved path, or null if not found.
 * Supports ~ expansion when homeDir is provided.
 */
export function resolvePath(
  root: FSNode,
  cwd: string,
  target: string,
  homeDir?: string,
): FSNode | null {
  // Expand ~ to home directory
  let expanded = target
  if (homeDir && target.startsWith('~')) {
    expanded = target === '~' ? homeDir : homeDir + target.slice(1)
  }

  // Determine starting point
  let pathParts: string[]
  if (expanded.startsWith('/')) {
    pathParts = expanded.split('/').filter(Boolean)
  } else {
    pathParts = [...cwd.split('/').filter(Boolean), ...expanded.split('/').filter(Boolean)]
  }

  // Resolve . and ..
  const resolved: string[] = []
  for (const part of pathParts) {
    if (part === '.') continue
    if (part === '..') {
      resolved.pop()
      continue
    }
    resolved.push(part)
  }

  // Walk the tree
  let current = root
  for (const part of resolved) {
    if (current.type !== 'dir' || !current.children) return null
    const child = current.children.get(part)
    if (!child) return null
    current = child
  }

  return current
}

/**
 * Get the absolute path string from a resolved node traversal.
 * Supports ~ expansion when homeDir is provided.
 */
export function resolvePathString(cwd: string, target: string, homeDir?: string): string {
  // Expand ~ to home directory
  let expanded = target
  if (homeDir && target.startsWith('~')) {
    expanded = target === '~' ? homeDir : homeDir + target.slice(1)
  }

  if (expanded.startsWith('/')) {
    const parts = expanded.split('/').filter(Boolean)
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '.') continue
      else if (part === '..') resolved.pop()
      else resolved.push(part)
    }
    return '/' + resolved.join('/')
  }

  const parts = [...cwd.split('/').filter(Boolean), ...expanded.split('/').filter(Boolean)]
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    else if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return '/' + resolved.join('/')
}
