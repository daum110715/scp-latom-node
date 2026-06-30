/**
 * Core shell commands: help, clear, pwd, whoami, hostname, date, echo,
 * uname, history, env, export, exit.
 */

import { register, commands } from './types'

// ── help ──
register(
  'help',
  'Display available commands or help for a specific command',
  'help [command]',
  (ctx) => {
    if (ctx.args.length > 0) {
      const cmd = commands.get(ctx.args[0])
      if (!cmd) return [`help: no help found for '${ctx.args[0]}'`]
      return [`${ctx.args[0]} — ${cmd.description}`, `Usage: ${cmd.usage}`]
    }
    const lines = [
      '╔══════════════════════════════════════════════════════════╗',
      '║          SCP FOUNDATION TERMINAL — COMMANDS             ║',
      '╠══════════════════════════════════════════════════════════╣',
    ]
    const sorted = [...commands.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    for (const [name, cmd] of sorted) {
      lines.push(`║  ${name.padEnd(14)} ${cmd.description.slice(0, 40).padEnd(40)} ║`)
    }
    lines.push('╠══════════════════════════════════════════════════════════╣')
    lines.push('║  Type "help <command>" for detailed usage.              ║')
    lines.push('╚══════════════════════════════════════════════════════════╝')
    return lines
  },
)

// ── clear ──
register('clear', 'Clear the terminal screen', 'clear', (ctx) => {
  ctx.clear()
})

// ── pwd ──
register('pwd', 'Print the current working directory', 'pwd', (ctx) => {
  return [ctx.cwd]
})

// ── whoami ──
register('whoami', 'Display the current user', 'whoami', () => {
  return ['researcher']
})

// ── hostname ──
register('hostname', 'Display the system hostname', 'hostname', () => {
  return ['LATOM-7']
})

// ── date ──
register('date', 'Display the current date and time', 'date', () => {
  return [new Date().toString()]
})

// ── echo ──
register('echo', 'Display text to the terminal', 'echo [text...]', (ctx) => {
  if (ctx.args.length === 0 && ctx.stdin && ctx.stdin.length > 0) return ctx.stdin
  return [ctx.args.join(' ')]
})

// ── uname ──
register('uname', 'Print system information', 'uname [-a]', (ctx) => {
  if (ctx.args.includes('-a')) {
    return ['SCF-Linux LATOM-7 6.1.0-scf #1 SMP Foundation x86_64 GNU/Linux']
  }
  return ['SCF-Linux']
})

// ── history ──
register('history', 'Display command history', 'history', (ctx) => {
  if (ctx.history.length === 0) return ['(no history)']
  return ctx.history.map((cmd, i) => `  ${String(i + 1).padStart(4)}  ${cmd}`)
})

// ── env ──
register('env', 'Display environment variables', 'env', (ctx) => {
  return Object.entries(ctx.env).map(([k, v]) => `${k}=${v}`)
})

// ── export ──
register('export', 'Set an environment variable', 'export KEY=VALUE', (ctx) => {
  if (ctx.args.length === 0) {
    return Object.entries(ctx.env).map(([k, v]) => `declare -x ${k}="${v}"`)
  }
  const arg = ctx.args.join(' ')
  const eqIndex = arg.indexOf('=')
  if (eqIndex === -1) return [`export: invalid format. Usage: export KEY=VALUE`]
  const key = arg.slice(0, eqIndex)
  const value = arg.slice(eqIndex + 1)
  ctx.setenv(key, value)
})

// ── exit ──
register('exit', 'Exit the terminal (navigates to home)', 'exit', () => {
  return ['logout', 'Session terminated. Secure. Contain. Protect.']
})
