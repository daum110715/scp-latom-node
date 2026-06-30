/**
 * Shared types and the command registry for the SCP Foundation terminal.
 */

import type { FSNode } from '../filesystem'
import { resolvePath, resolvePathString } from '../filesystem'

/** Helper: resolve path with ~ expansion from env.HOME. */
export function rp(
  root: FSNode,
  cwd: string,
  target: string,
  env?: Record<string, string>,
): FSNode | null {
  return resolvePath(root, cwd, target, env?.HOME)
}

/** Helper: resolve path string with ~ expansion from env.HOME. */
export function rps(cwd: string, target: string, env?: Record<string, string>): string {
  return resolvePathString(cwd, target, env?.HOME)
}

export interface CommandContext {
  args: string[]
  cwd: string
  root: FSNode
  history: string[]
  env: Record<string, string>
  /** Lines from the previous command in a pipe chain. */
  stdin?: string[]
  setcwd: (path: string) => void
  setenv: (key: string, value: string) => void
  clear: () => void
  /** Create a directory. Returns error message or null on success. */
  mkdir: (path: string) => string | null
  /** Remove a file or directory. Returns error message or null on success. */
  rm: (path: string) => string | null
  /** Create a file. Returns error message or null on success. */
  touch: (path: string) => string | null
  /** Copy a file or directory. Returns error message or null on success. */
  copy: (src: string, dest: string) => string | null
  /** Move/rename a file or directory. Returns error message or null on success. */
  move: (src: string, dest: string) => string | null
  /** Remove a directory recursively. Returns error message or null on success. */
  rmrf: (path: string) => string | null
  /** Write content to a file (create or overwrite). Returns error message or null on success. */
  writeFile: (path: string, content: string) => string | null
  /** Append content to a file. Returns error message or null on success. */
  appendFile: (path: string, content: string) => string | null
  /** Signal that filesystem was mutated (triggers persistence). */
  onFsMutate: () => void
}

export type CommandHandler = (ctx: CommandContext) => string | string[] | void

export const commands = new Map<
  string,
  { handler: CommandHandler; description: string; usage: string }
>()

export function register(
  name: string,
  description: string,
  usage: string,
  handler: CommandHandler,
) {
  commands.set(name, { handler, description, usage })
}
