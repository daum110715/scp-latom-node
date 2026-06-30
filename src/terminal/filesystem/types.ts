/**
 * Core types and constructors for the virtual filesystem.
 */

export interface FSNode {
  type: 'file' | 'dir'
  name: string
  content?: string
  children?: Map<string, FSNode>
}

export function file(name: string, content: string): FSNode {
  return { type: 'file', name, content }
}

export function dir(name: string, children: FSNode[] = []): FSNode {
  const map = new Map<string, FSNode>()
  for (const child of children) {
    map.set(child.name, child)
  }
  return { type: 'dir', name, children: map }
}
