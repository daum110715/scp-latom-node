/**
 * Core types and constructors for the virtual filesystem.
 * Uses a discriminated union so TypeScript narrows `children` to
 * `Map` (never undefined) when `type === 'dir'`.
 */

export interface FSFileNode {
  type: 'file'
  name: string
  content: string
}

export interface FSDirNode {
  type: 'dir'
  name: string
  children: Map<string, FSNode>
}

export type FSNode = FSFileNode | FSDirNode

export function isFile(node: FSNode): node is FSFileNode {
  return node.type === 'file'
}

export function isDir(node: FSNode): node is FSDirNode {
  return node.type === 'dir'
}

export function file(name: string, content: string): FSFileNode {
  return { type: 'file', name, content }
}

export function dir(name: string, children: FSNode[] = []): FSDirNode {
  const map = new Map<string, FSNode>()
  for (const child of children) {
    map.set(child.name, child)
  }
  return { type: 'dir', name, children: map }
}
