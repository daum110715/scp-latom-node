/**
 * Command registry barrel — re-exports the public API.
 *
 * Import side-effect modules to register all commands, then re-export
 * the engine functions that consumers need.
 */

// Side-effect imports: each module calls register() for its commands.
import './core'
import './filesystem'
import './text-tools'
import './system'
import './scp-domain'

import { commands } from './types'

export type { CommandContext, CommandHandler } from './types'
export { commands }
export { executeCommand, getCompletions } from './engine'

/** Get all command names (for tab completion). */
export function getCommandNames(): string[] {
  return [...commands.keys()]
}
