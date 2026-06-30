/**
 * Filesystem mutation helpers for the virtual filesystem.
 */

import type { FSNode } from './types'

/**
 * System directories that cannot be modified by user commands.
 * These contain the default SCP-themed content and are read-only.
 */
const PROTECTED_PATHS = new Set(['/etc', '/scp', '/documents', '/opt', '/var', '/proc', '/mnt'])

/**
 * Check if a path is under a protected system directory.
 */
export function isProtectedPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : '/' + path
  for (const protectedPath of PROTECTED_PATHS) {
    if (normalized === protectedPath || normalized.startsWith(protectedPath + '/')) {
      return true
    }
  }
  return false
}

/**
 * Get the parent directory path and child name from a path.
 */
export function splitPath(path: string): { parent: string; name: string } {
  const normalized = path.endsWith('/') ? path.slice(0, -1) : path
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash <= 0) return { parent: '/', name: normalized.slice(1) }
  return { parent: normalized.slice(0, lastSlash), name: normalized.slice(lastSlash + 1) }
}

/**
 * Create a new directory inside a parent node.
 * Returns the new directory node, or null if it already exists.
 */
export function createDir(parent: FSNode, name: string): FSNode | null {
  if (parent.type !== 'dir' || !parent.children) return null
  if (parent.children.has(name)) return null
  const node: FSNode = { type: 'dir', name, children: new Map() }
  parent.children.set(name, node)
  return node
}

/**
 * Create a new file inside a parent node.
 * Returns the new file node, or null if it already exists.
 */
export function createFile(parent: FSNode, name: string, content = ''): FSNode | null {
  if (parent.type !== 'dir' || !parent.children) return null
  if (parent.children.has(name)) return null
  const node: FSNode = { type: 'file', name, content }
  parent.children.set(name, node)
  return node
}

/**
 * Remove a node from its parent directory.
 * Returns true if removed, false if not found.
 */
export function removeNode(parent: FSNode, name: string): boolean {
  if (parent.type !== 'dir' || !parent.children) return false
  return parent.children.delete(name)
}

/**
 * Write content to an existing file node.
 * Returns true if written, false if node is not a file.
 */
export function writeFile(node: FSNode, content: string): boolean {
  if (node.type !== 'file') return false
  node.content = content
  return true
}
