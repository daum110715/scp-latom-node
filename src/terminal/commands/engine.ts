/**
 * Command execution engine: executeCommand, splitPipes, parseInput, getCompletions.
 */

import type { FSNode } from '../filesystem'
import { resolvePath } from '../filesystem'
import type { CommandContext } from './types'
import { commands } from './types'

/**
 * Execute a command string and return output lines.
 * Supports pipe chains (cmd1 | cmd2 | cmd3).
 */
export function executeCommand(input: string, ctx: Omit<CommandContext, 'args'>): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  // Split on pipes (respecting quoted strings)
  const segments = splitPipes(trimmed)
  if (segments.length === 0) return []

  let pipeStdin: string[] | undefined

  for (const segment of segments) {
    const parts = parseInput(segment.trim())
    if (parts.length === 0) continue

    const cmdName = parts[0]
    const args = parts.slice(1)

    const cmd = commands.get(cmdName)
    if (!cmd) {
      return [`scf-bash: ${cmdName}: command not found`]
    }

    try {
      const result = cmd.handler({ ...ctx, args, stdin: pipeStdin })
      const lines = Array.isArray(result) ? result : typeof result === 'string' ? [result] : []
      pipeStdin = lines
    } catch (e) {
      return [`${cmdName}: internal error: ${e instanceof Error ? e.message : 'unknown'}`]
    }
  }

  return pipeStdin ?? []
}

/**
 * Split a command string on unquoted pipe characters.
 */
function splitPipes(input: string): string[] {
  const segments: string[] = []
  let current = ''
  let inQuote: string | null = null

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
        current += ch
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
      current += ch
    } else if (ch === '|') {
      segments.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) segments.push(current)

  return segments
}

/**
 * Parse input string, respecting quoted strings.
 */
function parseInput(input: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuote: string | null = null

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === ' ') {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts
}

/**
 * Get tab-completion candidates for a partial input.
 */
export function getCompletions(
  input: string,
  cwd: string,
  root: FSNode,
  homeDir?: string,
): string[] {
  const trimmed = input.trimStart()
  const parts = trimmed.split(/\s+/)

  // If only typing the command name, complete commands
  if (parts.length <= 1) {
    const partial = parts[0] || ''
    return [...commands.keys()].filter((c) => c.startsWith(partial))
  }

  // Otherwise, complete file/directory paths
  const partial = parts[parts.length - 1]
  const lastSlash = partial.lastIndexOf('/')
  let dirPath: string
  let prefix: string

  if (lastSlash >= 0) {
    dirPath = partial.slice(0, lastSlash) || '/'
    prefix = partial.slice(lastSlash + 1)
  } else {
    dirPath = '.'
    prefix = partial
  }

  const dirNode = resolvePath(root, cwd, dirPath, homeDir)
  if (!dirNode || dirNode.type !== 'dir') return []

  const candidates: string[] = []
  for (const [name, child] of dirNode.children) {
    if (name.startsWith(prefix)) {
      const suffix = child.type === 'dir' ? '/' : ''
      if (lastSlash >= 0) {
        candidates.push(dirPath === '/' ? `/${name}${suffix}` : `${dirPath}/${name}${suffix}`)
      } else {
        candidates.push(`${name}${suffix}`)
      }
    }
  }

  return candidates
}
