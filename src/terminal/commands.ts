/**
 * Command registry for the SCP Foundation terminal.
 * Each command receives the shell context and returns output lines.
 */

import type { FSNode } from './filesystem'
import { resolvePath, resolvePathString } from './filesystem'

export interface CommandContext {
  args: string[]
  cwd: string
  root: FSNode
  history: string[]
  env: Record<string, string>
  setcwd: (path: string) => void
  setenv: (key: string, value: string) => void
  clear: () => void
  /** Create a directory. Returns error message or null on success. */
  mkdir: (path: string) => string | null
  /** Remove a file or directory. Returns error message or null on success. */
  rm: (path: string) => string | null
  /** Create a file. Returns error message or null on success. */
  touch: (path: string) => string | null
  /** Signal that filesystem was mutated (triggers persistence). */
  onFsMutate: () => void
}

export type CommandHandler = (ctx: CommandContext) => string | string[] | void

const commands = new Map<string, { handler: CommandHandler; description: string; usage: string }>()

function register(name: string, description: string, usage: string, handler: CommandHandler) {
  commands.set(name, { handler, description, usage })
}

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
  return [ctx.args.join(' ')]
})

// ── uname ──
register('uname', 'Print system information', 'uname [-a]', (ctx) => {
  if (ctx.args.includes('-a')) {
    return ['SCF-Linux LATOM-7 6.1.0-scf #1 SMP Foundation x86_64 GNU/Linux']
  }
  return ['SCF-Linux']
})

// ── ls ──
register('ls', 'List directory contents', 'ls [path]', (ctx) => {
  const target = ctx.args[0] || '.'
  const node = resolvePath(ctx.root, ctx.cwd, target)
  if (!node) return [`ls: cannot access '${target}': No such file or directory`]
  if (node.type === 'file') return [node.name]
  if (!node.children || node.children.size === 0) return ['(empty)']
  const entries = [...node.children.values()].map((child) => {
    const suffix = child.type === 'dir' ? '/' : ''
    return child.name + suffix
  })
  return [entries.join('  ')]
})

// ── cd ──
register('cd', 'Change the current directory', 'cd <path>', (ctx) => {
  if (ctx.args.length === 0) {
    ctx.setcwd('/home/researcher')
    return
  }
  const target = ctx.args[0]
  const node = resolvePath(ctx.root, ctx.cwd, target)
  if (!node) return [`cd: ${target}: No such file or directory`]
  if (node.type !== 'dir') return [`cd: ${target}: Not a directory`]
  ctx.setcwd(resolvePathString(ctx.cwd, target))
})

// ── cat ──
register('cat', 'Display file contents', 'cat <file>', (ctx) => {
  if (ctx.args.length === 0) return ['cat: missing operand']
  const target = ctx.args[0]
  const node = resolvePath(ctx.root, ctx.cwd, target)
  if (!node) return [`cat: ${target}: No such file or directory`]
  if (node.type === 'dir') return [`cat: ${target}: Is a directory`]
  return (node.content || '').split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[i] !== '')
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

// ── neofetch ──
register('neofetch', 'Display SCP-themed system information', 'neofetch', (ctx) => {
  const uptime = Math.floor(performance.now() / 1000)
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  return [
    '',
    '    ██████████          researcher@LATOM-7',
    '  ██          ██        ─────────────────────',
    '██    ◈◈◈◈    ██        OS: SCF-Linux x86_64',
    '██    ◈◈◈◈    ██        Host: Latom Node v7.2.1',
    '  ██          ██        Kernel: 6.1.0-scf',
    '    ██████████          Uptime: ' + hours + 'h ' + minutes + 'm',
    '  ██  ██████  ██        Shell: scf-bash 5.2.15',
    '  ██  ██████  ██        Terminal: SCP-Terminal',
    '    ██      ██          CPU: Foundation Neural Core',
    '      ██████            Memory: 128 MB / 512 MB',
    '        ██              Disk: 47 GB / 200 GB',
    '                          ',
    '    Secure. Contain. Protect.',
    '',
  ]
})

// ── matrix ──
register('matrix', 'Display a matrix rain animation (Easter egg)', 'matrix', () => {
  const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789ABCDEFZ'
  const lines: string[] = ['', '  █ THE MATRIX HAS YOU █', '']
  for (let i = 0; i < 12; i++) {
    let line = '  '
    for (let j = 0; j < 60; j++) {
      line += chars[Math.floor(Math.random() * chars.length)]
    }
    lines.push(line)
  }
  lines.push('', '  Wake up, Researcher...', '')
  return lines
})

// ── scp ──
register('scp', 'Look up an SCP entry by number', 'scp <number>', (ctx) => {
  if (ctx.args.length === 0) return ['Usage: scp <number>', 'Example: scp 173']
  const num = ctx.args[0].replace(/^0+/, '') || '0'
  const padded = num.padStart(3, '0')
  const filePath = `/scp/scp-${padded}.txt`
  const node = resolvePath(ctx.root, '/', filePath)
  if (!node || !node.content) {
    return [
      `SCP-${padded}: FILE NOT FOUND`,
      '',
      'This entry may be classified above your clearance level,',
      'or the requested SCP does not exist in the database.',
      '',
      `Try: cat /scp/scp-${padded}.txt`,
    ]
  }
  return node.content.split('\n')
})

// ── about ──
register('about', 'Display information about the SCP Foundation', 'about', () => {
  return [
    '╔══════════════════════════════════════════════════════════╗',
    '║              THE SCP FOUNDATION                         ║',
    '╠══════════════════════════════════════════════════════════╣',
    '║                                                          ║',
    '║  The SCP Foundation is a clandestine organization        ║',
    '║  operating beyond the jurisdiction of any national       ║',
    '║  government. Its mission: to secure, contain, and        ║',
    '║  protect anomalous objects, entities, and phenomena      ║',
    '║  that threaten global security.                          ║',
    '║                                                          ║',
    '║  Motto: Secure. Contain. Protect.                        ║',
    '║                                                          ║',
    '║  This terminal provides access to the Latom Node         ║',
    '║  documentation and archival system. All activities        ║',
    '║  are monitored and logged for security purposes.         ║',
    '║                                                          ║',
    '╚══════════════════════════════════════════════════════════╝',
  ]
})

// ── tree ──
register('tree', 'Display directory tree structure', 'tree [path]', (ctx) => {
  const target = ctx.args[0] || '.'
  const node = resolvePath(ctx.root, ctx.cwd, target)
  if (!node) return [`tree: '${target}': No such file or directory`]
  if (node.type !== 'dir') return [node.name]

  const lines: string[] = []
  const dirName = target === '.' ? ctx.cwd : target
  lines.push(dirName)

  function walk(n: FSNode, prefix: string) {
    if (!n.children) return
    const entries = [...n.children.values()]
    entries.forEach((child, i) => {
      const isLast = i === entries.length - 1
      const connector = isLast ? '└── ' : '├── '
      const suffix = child.type === 'dir' ? '/' : ''
      lines.push(prefix + connector + child.name + suffix)
      if (child.type === 'dir') {
        walk(child, prefix + (isLast ? '    ' : '│   '))
      }
    })
  }

  walk(node, '')
  return lines
})

// ── grep (simplified) ──
register('grep', 'Search for a pattern in a file', 'grep <pattern> <file>', (ctx) => {
  if (ctx.args.length < 2) return ['Usage: grep <pattern> <file>']
  const pattern = ctx.args[0]
  const target = ctx.args[1]
  const node = resolvePath(ctx.root, ctx.cwd, target)
  if (!node) return [`grep: ${target}: No such file or directory`]
  if (node.type === 'dir') return [`grep: ${target}: Is a directory`]
  const content = node.content || ''
  const matches = content
    .split('\n')
    .filter((line) => line.toLowerCase().includes(pattern.toLowerCase()))
  if (matches.length === 0) return [`(no matches for '${pattern}')`]
  return matches.map((line) =>
    line.replace(new RegExp(`(${pattern})`, 'gi'), `\x1b[1;31m$1\x1b[0m`),
  )
})

// ── wc ──
register('wc', 'Count lines, words, and characters in a file', 'wc <file>', (ctx) => {
  if (ctx.args.length === 0) return ['wc: missing operand']
  const target = ctx.args[0]
  const node = resolvePath(ctx.root, ctx.cwd, target)
  if (!node) return [`wc: ${target}: No such file or directory`]
  if (node.type === 'dir') return [`wc: ${target}: Is a directory`]
  const content = node.content || ''
  const lines = content.split('\n').length
  const words = content.split(/\s+/).filter(Boolean).length
  const chars = content.length
  return [`  ${lines}  ${words}  ${chars} ${target}`]
})

// ── head ──
register('head', 'Display the first lines of a file', 'head [-n N] <file>', (ctx) => {
  let count = 10
  let fileArg = ctx.args[0]
  if (ctx.args[0] === '-n' && ctx.args.length >= 3) {
    count = parseInt(ctx.args[1], 10) || 10
    fileArg = ctx.args[2]
  }
  if (!fileArg) return ['head: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`head: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`head: ${fileArg}: Is a directory`]
  const lines = (node.content || '').split('\n')
  return lines.slice(0, count)
})

// ── tail ──
register('tail', 'Display the last lines of a file', 'tail [-n N] <file>', (ctx) => {
  let count = 10
  let fileArg = ctx.args[0]
  if (ctx.args[0] === '-n' && ctx.args.length >= 3) {
    count = parseInt(ctx.args[1], 10) || 10
    fileArg = ctx.args[2]
  }
  if (!fileArg) return ['tail: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`tail: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`tail: ${fileArg}: Is a directory`]
  const lines = (node.content || '').split('\n')
  return lines.slice(-count)
})

// ── mkdir ──
register('mkdir', 'Create a new directory', 'mkdir <name>', (ctx) => {
  if (ctx.args.length === 0) return ['mkdir: missing operand']
  const target = ctx.args[0]
  const error = ctx.mkdir(target)
  if (error) return [error]
  ctx.onFsMutate()
  return []
})

// ── rm ──
register('rm', 'Remove a file or empty directory', 'rm <file>', (ctx) => {
  if (ctx.args.length === 0) return ['rm: missing operand']
  const target = ctx.args[0]
  const error = ctx.rm(target)
  if (error) return [error]
  ctx.onFsMutate()
  return []
})

// ── touch ──
register('touch', 'Create an empty file', 'touch <file>', (ctx) => {
  if (ctx.args.length === 0) return ['touch: missing operand']
  const target = ctx.args[0]
  const error = ctx.touch(target)
  if (error) return [error]
  ctx.onFsMutate()
  return []
})

// ── uptime ──
register('uptime', 'Display system uptime', 'uptime', () => {
  const uptime = Math.floor(performance.now() / 1000)
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const now = new Date().toLocaleTimeString('en-US', { hour12: false })
  return [
    ` ${now} up ${days} days, ${hours}:${String(minutes).padStart(2, '0')}, 1 user, load average: 0.42, 0.31, 0.28`,
  ]
})

// ── id ──
register('id', 'Display user and group information', 'id [user]', (ctx) => {
  const user = ctx.args[0] || 'researcher'
  const users: Record<string, string> = {
    root: 'uid=0(root) gid=0(root) groups=0(root)',
    researcher:
      'uid=1000(researcher) gid=1000(researcher) groups=1000(researcher),27(sudo),100(staff)',
    agent: 'uid=1001(agent) gid=1001(agent) groups=1001(agent),100(staff)',
  }
  return [users[user] || `id: '${user}': no such user`]
})

// ── groups ──
register('groups', 'Display group membership', 'groups [user]', (ctx) => {
  const user = ctx.args[0] || 'researcher'
  const groups: Record<string, string> = {
    root: 'root',
    researcher: 'researcher sudo staff',
    agent: 'agent staff',
  }
  return [groups[user] || `groups: '${user}': no such user`]
})

// ── tty ──
register('tty', 'Print terminal name', 'tty', () => {
  return ['/dev/pts/0']
})

// ── true ──
register('true', 'Return success (exit code 0)', 'true', () => {
  return []
})

// ── false ──
register('false', 'Return failure (exit code 1)', 'false', () => {
  return []
})

// ── who ──
register('who', 'Show logged-in users', 'who', () => {
  return [
    'researcher pts/0        2024-03-15 14:30 (10.0.4.22)',
    'agent      pts/1        2024-03-15 09:30 (10.0.4.55)',
  ]
})

// ── last ──
register('last', 'Show last login entries', 'last', (ctx) => {
  const node = resolvePath(ctx.root, '/', '/var/log/lastlog')
  if (!node || !node.content) return ['(no login records)']
  return node.content.split('\n').filter(Boolean)
})

// ── ps ──
register('ps', 'Show running processes (simulated)', 'ps', () => {
  return [
    '  PID TTY          TIME CMD',
    '    1 ?        00:00:03 scf-init',
    '   42 ?        00:00:12 containment-daemon',
    '   99 ?        00:00:05 surveillance-agent',
    '  256 pts/0    00:00:00 bash',
    '  512 pts/0    00:00:00 ps',
  ]
})

// ── free ──
register('free', 'Display memory usage', 'free [-h]', (ctx) => {
  const human = ctx.args.includes('-h')
  if (human) {
    return [
      '              total        used        free      shared  buff/cache   available',
      'Mem:          512Mi       128Mi       384Mi        16Mi        64Mi       390Mi',
      'Swap:         256Mi         0Mi       256Mi',
    ]
  }
  return [
    '              total        used        free      shared  buff/cache   available',
    'Mem:         524288      131072      393216       16384       65536      409600',
    'Swap:        262144           0      262144',
  ]
})

// ── df ──
register('df', 'Display filesystem disk usage', 'df [-h]', (ctx) => {
  const human = ctx.args.includes('-h')
  if (human) {
    return [
      'Filesystem      Size  Used Avail Use% Mounted on',
      '/dev/sda1       200G   47G  153G  24% /',
      'tmpfs           256M   16M  240M   7% /dev/shm',
      '/dev/sdb1       500G  128G  372G  26% /mnt/archive',
    ]
  }
  return [
    'Filesystem     1K-blocks      Used Available Use% Mounted on',
    '/dev/sda1      209715200  49283072 160432128  24% /',
    'tmpfs            262144     16384    245760   7% /dev/shm',
    '/dev/sdb1      524288000 134217728 390070272  26% /mnt/archive',
  ]
})

// ── du ──
register('du', 'Display directory disk usage', 'du [-h] [path]', (ctx) => {
  const human = ctx.args.includes('-h')
  const path = ctx.args.find((a) => !a.startsWith('-')) || '.'
  const node = resolvePath(ctx.root, ctx.cwd, path)
  if (!node) return [`du: cannot access '${path}': No such file or directory`]
  if (node.type === 'file') {
    const size = (node.content || '').length
    return [human ? `${(size / 1024).toFixed(1)}K\t${path}` : `${Math.ceil(size / 1024)}\t${path}`]
  }
  function calcSize(n: FSNode): number {
    if (n.type === 'file') return (n.content || '').length
    let total = 0
    if (n.children) for (const child of n.children.values()) total += calcSize(child)
    return total
  }
  const size = calcSize(node)
  const display = human ? `${(size / 1024).toFixed(1)}K` : `${Math.ceil(size / 1024)}`
  return [`${display}\t${path}`]
})

// ── stat ──
register('stat', 'Display file status', 'stat <file>', (ctx) => {
  if (ctx.args.length === 0) return ['stat: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, ctx.args[0])
  if (!node) return [`stat: cannot stat '${ctx.args[0]}': No such file or directory`]
  const size = node.type === 'file' ? (node.content || '').length : 4096
  const type = node.type === 'dir' ? 'directory' : 'regular file'
  return [
    `  File: ${ctx.args[0]}`,
    `  Size: ${size}\t\tType: ${type}`,
    `Access: (0644/-rw-r--r--)  Uid: ( 1000/researcher)  Gid: ( 1000/researcher)`,
    `Modify: 2024-03-15 12:00:00.000000000 +0000`,
    `Change: 2024-03-15 12:00:00.000000000 +0000`,
  ]
})

// ── file ──
register('file', 'Determine file type', 'file <path>', (ctx) => {
  if (ctx.args.length === 0) return ['file: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, ctx.args[0])
  if (!node) return [`file: cannot open '${ctx.args[0]}' (No such file or directory)`]
  if (node.type === 'dir') return [`${ctx.args[0]}: directory`]
  const ext = node.name.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    txt: 'ASCII text',
    md: 'UTF-8 Unicode text, with very long lines',
    log: 'ASCII text',
    sh: 'Bourne-Again shell script, ASCII text executable',
    json: 'JSON data',
    xml: 'XML 1.0 document, ASCII text',
  }
  // Files without extension are treated as ASCII text
  const hasExt = node.name.includes('.')
  const fileType = hasExt ? types[ext || ''] || 'data' : 'ASCII text'
  return [`${ctx.args[0]}: ${fileType}`]
})

// ── which ──
register('which', 'Show command location', 'which <command>', (ctx) => {
  if (ctx.args.length === 0) return ['which: missing operand']
  const cmd = ctx.args[0]
  const builtins = [
    'help',
    'clear',
    'pwd',
    'whoami',
    'hostname',
    'date',
    'echo',
    'uname',
    'ls',
    'cd',
    'cat',
    'history',
    'env',
    'export',
    'neofetch',
    'matrix',
    'scp',
    'about',
    'tree',
    'grep',
    'wc',
    'head',
    'tail',
    'mkdir',
    'rm',
    'touch',
    'exit',
    'find',
    'sort',
    'uniq',
    'diff',
    'rev',
    'nl',
    'tr',
    'cut',
    'fmt',
    'seq',
    'yes',
    'tee',
    'strings',
    'fold',
    'uptime',
    'id',
    'groups',
    'tty',
    'true',
    'false',
    'who',
    'last',
    'ps',
    'free',
    'df',
    'du',
    'stat',
    'file',
    'which',
    'type',
    'man',
    'alias',
    'unalias',
    'classify',
    'clearance',
    'incident',
    'protocol',
    'status',
    'audit',
    'alert',
    'staff',
  ]
  if (builtins.includes(cmd)) return [`${cmd}: shell built-in command`]
  return [`${cmd} not found`]
})

// ── type ──
register('type', 'Describe command type', 'type <command>', (ctx) => {
  if (ctx.args.length === 0) return ['type: missing operand']
  const cmd = ctx.args[0]
  const builtins = [
    'help',
    'clear',
    'pwd',
    'whoami',
    'hostname',
    'date',
    'echo',
    'uname',
    'ls',
    'cd',
    'cat',
    'history',
    'env',
    'export',
    'neofetch',
    'matrix',
    'scp',
    'about',
    'tree',
    'grep',
    'wc',
    'head',
    'tail',
    'mkdir',
    'rm',
    'touch',
    'exit',
    'find',
    'sort',
    'uniq',
    'diff',
    'rev',
    'nl',
    'tr',
    'cut',
    'fmt',
    'seq',
    'yes',
    'tee',
    'strings',
    'fold',
    'uptime',
    'id',
    'groups',
    'tty',
    'true',
    'false',
    'who',
    'last',
    'ps',
    'free',
    'df',
    'du',
    'stat',
    'file',
    'which',
    'type',
    'man',
    'alias',
    'unalias',
    'classify',
    'clearance',
    'incident',
    'protocol',
    'status',
    'audit',
    'alert',
    'staff',
  ]
  if (builtins.includes(cmd)) return [`${cmd} is a shell builtin`]
  return [`-bash: type: ${cmd}: not found`]
})

// ── man ──
register('man', 'Display manual page (alias for help)', 'man <command>', (ctx) => {
  if (ctx.args.length === 0) return ['What manual page do you want?', 'Usage: man <command>']
  const cmd = commands.get(ctx.args[0])
  if (!cmd) return [`No manual entry for ${ctx.args[0]}`]
  return [
    `${ctx.args[0].toUpperCase()}(1)                    SCP Foundation                    ${ctx.args[0].toUpperCase()}(1)`,
    '',
    `NAME`,
    `       ${ctx.args[0]} - ${cmd.description}`,
    '',
    `SYNOPSIS`,
    `       ${cmd.usage}`,
    '',
    `DESCRIPTION`,
    `       ${cmd.description}`,
    `       Type "help ${ctx.args[0]}" for more information.`,
    '',
    `AUTHOR`,
    `       SCP Foundation, Latom Node Documentation System`,
  ]
})

// ── alias ──
register('alias', 'Show or set command aliases', 'alias [name=value]', (ctx) => {
  const aliases: Record<string, string> = {
    ll: 'ls -la',
    cls: 'clear',
    containment: 'cat /documents/protocol-omega.txt',
  }
  if (ctx.args.length === 0) {
    return Object.entries(aliases).map(([k, v]) => `alias ${k}='${v}'`)
  }
  return ['alias: setting aliases is not supported in this shell']
})

// ── unalias ──
register('unalias', 'Remove an alias (simulated)', 'unalias <name>', (ctx) => {
  if (ctx.args.length === 0) return ['unalias: missing operand']
  return [`unalias: ${ctx.args[0]}: not found`]
})

// ── classify ──
register('classify', 'Show classification level of current path', 'classify [path]', (ctx) => {
  const target = ctx.args[0] || ctx.cwd
  const classifications: Record<string, string> = {
    '/': 'LEVEL 1 — UNCLASSIFIED',
    '/etc': 'LEVEL 2 — INTERNAL',
    '/scp': 'LEVEL 3 — CONFIDENTIAL',
    '/documents': 'LEVEL 4 — RESTRICTED',
    '/documents/protocol-omega.txt': 'LEVEL 5 — TOP SECRET',
    '/logs': 'LEVEL 3 — CONFIDENTIAL',
    '/home': 'LEVEL 2 — INTERNAL',
    '/home/researcher': 'LEVEL 2 — INTERNAL',
    '/home/agent': 'LEVEL 3 — CONFIDENTIAL',
    '/proc': 'LEVEL 2 — INTERNAL',
    '/opt': 'LEVEL 2 — INTERNAL',
    '/var': 'LEVEL 2 — INTERNAL',
    '/tmp': 'LEVEL 1 — UNCLASSIFIED',
    '/mnt': 'LEVEL 4 — RESTRICTED',
    '/mnt/archive': 'LEVEL 4 — RESTRICTED',
  }
  // Check exact match first
  if (classifications[target])
    return [`Classification: ${classifications[target]}`, `Path: ${target}`]
  // Check parent directories
  const parts = target.split('/').filter(Boolean)
  for (let i = parts.length; i > 0; i--) {
    const path = '/' + parts.slice(0, i).join('/')
    if (classifications[path])
      return [`Classification: ${classifications[path]}`, `Path: ${target}`]
  }
  // SCP files default to Level 3
  if (target.startsWith('/scp/'))
    return ['Classification: LEVEL 3 — CONFIDENTIAL', `Path: ${target}`]
  return ['Classification: LEVEL 1 — UNCLASSIFIED', `Path: ${target}`]
})

// ── clearance ──
register('clearance', 'Display user clearance level', 'clearance [user]', (ctx) => {
  const user = ctx.args[0] || 'researcher'
  const clearances: Record<string, { level: number; description: string }> = {
    root: { level: 5, description: 'OMEGA — Full system access' },
    researcher: { level: 4, description: 'DELTA — Research & documentation access' },
    agent: { level: 3, description: 'GAMMA — Field operations access' },
  }
  const clearance = clearances[user]
  if (!clearance) return [`clearance: '${user}': unknown user`]
  return [
    `User: ${user}`,
    `Clearance Level: ${clearance.level} — ${clearance.description}`,
    '',
    'Access Matrix:',
    '  Level 1: Unclassified (general information)',
    '  Level 2: Internal (facility operations)',
    '  Level 3: Confidential (SCP documentation)',
    '  Level 4: Restricted (protocols & directives)',
    '  Level 5: Top Secret (site director only)',
  ]
})

// ── incident ──
register('incident', 'Look up incident reports', 'incident [id]', (ctx) => {
  if (ctx.args.length === 0) {
    return [
      '╔══════════════════════════════════════════════════════════╗',
      '║                INCIDENT REPORT INDEX                    ║',
      '╠══════════════════════════════════════════════════════════╣',
      '║  IR-2024-0312-LATOM  Minor containment breach, Wing C  ║',
      '║  IR-2023-1105-LATOM  SCP-173 relocation incident       ║',
      '║  IR-2023-0822-LATOM  Unauthorized access attempt       ║',
      '╠══════════════════════════════════════════════════════════╣',
      '║  Usage: incident <id>  — View specific report          ║',
      '╚══════════════════════════════════════════════════════════╝',
    ]
  }
  const id = ctx.args[0].toUpperCase()
  if (id.includes('2024-0312')) {
    const node = resolvePath(ctx.root, '/', '/documents/incident-report-2024-03.txt')
    if (node?.content) return node.content.split('\n')
  }
  return [`incident: report '${ctx.args[0]}' not found or access denied`]
})

// ── protocol ──
register('protocol', 'Look up Foundation protocols', 'protocol [name]', (ctx) => {
  if (ctx.args.length === 0) {
    return [
      '╔══════════════════════════════════════════════════════════╗',
      '║              FOUNDATION PROTOCOLS                       ║',
      '╠══════════════════════════════════════════════════════════╣',
      '║  OMEGA-7    Containment Breach Response                 ║',
      '║  GAMMA-5    Media Cover Stories ("Need to Know")        ║',
      '║  ALPHA-1    Personnel Evacuation                        ║',
      '║  DELTA-9    Anomalous Event Reporting                   ║',
      '║  ZETA-12    Amnestic Distribution                       ║',
      '╠══════════════════════════════════════════════════════════╣',
      '║  Usage: protocol <name>  — View protocol details       ║',
      '╚══════════════════════════════════════════════════════════╝',
    ]
  }
  const name = ctx.args[0].toUpperCase()
  if (name.includes('OMEGA')) {
    const node = resolvePath(ctx.root, '/', '/documents/protocol-omega.txt')
    if (node?.content) return node.content.split('\n')
  }
  return [
    `Protocol ${name}: DETAILS CLASSIFIED`,
    '',
    'This protocol requires Level 4+ clearance for access.',
    'Contact your site director for authorization.',
  ]
})

// ── status ──
register('status', 'Display system and containment status', 'status', () => {
  return [
    '╔══════════════════════════════════════════════════════════╗',
    '║              LATOM-7 SYSTEM STATUS                      ║',
    '╠══════════════════════════════════════════════════════════╣',
    '║  Node Status:        ONLINE                             ║',
    '║  Security Level:     LEVEL 4                            ║',
    '║  Containment Status: ALL SCPs ACCOUNTED FOR             ║',
    '║  Active Alerts:      0                                  ║',
    '║  Personnel On-Site:  47                                 ║',
    '║  MTF Assigned:       Sigma-7 ("Samsara")                ║',
    '║  Last Integrity:     PASSED (2024-03-15 00:02:34)       ║',
    '║  Uptime:             847d 14h 22m                       ║',
    '╚══════════════════════════════════════════════════════════╝',
  ]
})

// ── audit ──
register('audit', 'Display audit log', 'audit', (ctx) => {
  const node = resolvePath(ctx.root, '/', '/logs/access.log')
  if (!node?.content) return ['(no audit records)']
  const lines = node.content.split('\n').filter(Boolean)
  return [
    '╔══════════════════════════════════════════════════════════╗',
    '║                    AUDIT LOG                            ║',
    '╠══════════════════════════════════════════════════════════╣',
    ...lines.slice(0, 10).map((l) => `║  ${l.slice(0, 54).padEnd(54)} ║`),
    '╠══════════════════════════════════════════════════════════╣',
    `║  Total entries: ${lines.length}                                  ║`,
    '╚══════════════════════════════════════════════════════════╝',
  ]
})

// ── alert ──
register('alert', 'Display active alerts', 'alert', () => {
  return [
    '╔══════════════════════════════════════════════════════════╗',
    '║                   ACTIVE ALERTS                         ║',
    '╠══════════════════════════════════════════════════════════╣',
    '║                                                          ║',
    '║  ■  0 CRITICAL alerts                                    ║',
    '║  ■  0 WARNING alerts                                     ║',
    '║  ■  0 INFO alerts                                        ║',
    '║                                                          ║',
    '║  All systems nominal. No active containment breaches.    ║',
    '║                                                          ║',
    '╚══════════════════════════════════════════════════════════╝',
  ]
})

// ── staff ──
register('staff', 'Look up staff directory', 'staff [name]', (ctx) => {
  if (ctx.args.length === 0) {
    return [
      '╔══════════════════════════════════════════════════════════╗',
      '║                 STAFF DIRECTORY                         ║',
      '╠══════════════════════════════════════════════════════════╣',
      '║  Dr. Researcher      Level 4  Research Lead             ║',
      '║  Agent ████████      Level 3  Field Operative           ║',
      '║  Dr. ████████        Level 4  Containment Specialist    ║',
      '║  O5-████████         Level 5  Site Director             ║',
      '╠══════════════════════════════════════════════════════════╣',
      '║  Usage: staff <name>  — View staff profile              ║',
      '╚══════════════════════════════════════════════════════════╝',
    ]
  }
  const name = ctx.args[0].toLowerCase()
  if (name.includes('researcher')) {
    return [
      '╔══════════════════════════════════════════════════════════╗',
      '║  Name: Dr. Researcher                                  ║',
      '║  Role: Research Lead                                   ║',
      '║  Clearance: Level 4 (DELTA)                            ║',
      '║  Site: LATOM-7                                         ║',
      '║  Status: ACTIVE                                        ║',
      '║  Assigned SCPs: 173, 049, 087, 096                     ║',
      '╚══════════════════════════════════════════════════════════╝',
    ]
  }
  if (name.includes('agent')) {
    return [
      '╔══════════════════════════════════════════════════════════╗',
      '║  Name: Agent ████████ (Callsign: ECHO-7)               ║',
      '║  Role: Field Operative                                 ║',
      '║  Clearance: Level 3 (GAMMA)                            ║',
      '║  Site: LATOM-7                                         ║',
      '║  Status: ACTIVE                                        ║',
      '║  Assignment: External Security                         ║',
      '╚══════════════════════════════════════════════════════════╝',
    ]
  }
  return [`staff: '${ctx.args[0]}': staff member not found or access denied`]
})

// ── find ──
register('find', 'Find files by name pattern', 'find [path] -name <pattern>', (ctx) => {
  let searchPath = '.'
  let pattern = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-name' && i + 1 < ctx.args.length) {
      pattern = ctx.args[i + 1]
      i++
    } else if (!ctx.args[i].startsWith('-')) {
      searchPath = ctx.args[i]
    }
  }
  if (!pattern) return ['find: missing -name pattern']
  const node = resolvePath(ctx.root, ctx.cwd, searchPath)
  if (!node) return [`find: '${searchPath}': No such file or directory`]
  if (node.type !== 'dir') return [searchPath]
  const results: string[] = []
  const globRegex = new RegExp(
    '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
  )
  function walk(n: FSNode, path: string) {
    if (!n.children) return
    for (const [name, child] of n.children) {
      const childPath = path === '/' ? `/${name}` : `${path}/${name}`
      if (globRegex.test(name)) results.push(childPath)
      if (child.type === 'dir') walk(child, childPath)
    }
  }
  walk(node, searchPath === '.' ? '' : searchPath)
  return results.length > 0 ? results : ['(no matches)']
})

// ── sort ──
register('sort', 'Sort lines of a file', 'sort [-r] <file>', (ctx) => {
  let reverse = false
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-r') reverse = true
    else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  if (!fileArg) return ['sort: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`sort: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`sort: ${fileArg}: Is a directory`]
  const lines = (node.content || '').split('\n')
  const sorted = [...lines].sort((a, b) => a.localeCompare(b))
  if (reverse) sorted.reverse()
  return sorted
})

// ── uniq ──
register('uniq', 'Filter duplicate lines', 'uniq [-c] <file>', (ctx) => {
  let countMode = false
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-c') countMode = true
    else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  if (!fileArg) return ['uniq: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`uniq: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`uniq: ${fileArg}: Is a directory`]
  const lines = (node.content || '').split('\n')
  const result: string[] = []
  let prev = ''
  let count = 0
  for (const line of lines) {
    if (line === prev) {
      count++
    } else {
      if (prev !== '' || result.length === 0) {
        result.push(countMode ? `  ${String(count).padStart(4)}  ${prev}` : prev)
      }
      prev = line
      count = 1
    }
  }
  if (prev !== '') result.push(countMode ? `  ${String(count).padStart(4)}  ${prev}` : prev)
  return result
})

// ── diff ──
register('diff', 'Compare two files', 'diff <file1> <file2>', (ctx) => {
  if (ctx.args.length < 2) return ['diff: missing operand']
  const node1 = resolvePath(ctx.root, ctx.cwd, ctx.args[0])
  if (!node1) return [`diff: ${ctx.args[0]}: No such file or directory`]
  if (node1.type === 'dir') return [`diff: ${ctx.args[0]}: Is a directory`]
  const node2 = resolvePath(ctx.root, ctx.cwd, ctx.args[1])
  if (!node2) return [`diff: ${ctx.args[1]}: No such file or directory`]
  if (node2.type === 'dir') return [`diff: ${ctx.args[1]}: Is a directory`]
  const lines1 = (node1.content || '').split('\n')
  const lines2 = (node2.content || '').split('\n')
  const result: string[] = []
  const maxLen = Math.max(lines1.length, lines2.length)
  for (let i = 0; i < maxLen; i++) {
    const a = lines1[i] ?? ''
    const b = lines2[i] ?? ''
    if (a !== b) {
      result.push(`${i + 1}c${i + 1}`)
      result.push(`< ${a}`)
      result.push('---')
      result.push(`> ${b}`)
    }
  }
  return result.length > 0 ? result : ['(files are identical)']
})

// ── rev ──
register('rev', 'Reverse lines of a file', 'rev <file>', (ctx) => {
  if (ctx.args.length === 0) return ['rev: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, ctx.args[0])
  if (!node) return [`rev: ${ctx.args[0]}: No such file or directory`]
  if (node.type === 'dir') return [`rev: ${ctx.args[0]}: Is a directory`]
  return (node.content || '').split('\n').map((line) => line.split('').reverse().join(''))
})

// ── nl (number lines) ──
register('nl', 'Number lines of a file', 'nl <file>', (ctx) => {
  if (ctx.args.length === 0) return ['nl: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, ctx.args[0])
  if (!node) return [`nl: ${ctx.args[0]}: No such file or directory`]
  if (node.type === 'dir') return [`nl: ${ctx.args[0]}: Is a directory`]
  return (node.content || '')
    .split('\n')
    .map((line, i) => `  ${String(i + 1).padStart(4)}  ${line}`)
})

// ── tr ──
register(
  'tr',
  'Translate or squeeze characters',
  'tr <from> <to> < <file> (inline: tr <from> <to> <text>)',
  (ctx) => {
    if (ctx.args.length < 2) return ['Usage: tr <from> <to>']
    const from = ctx.args[0]
    const to = ctx.args[1]
    const text = ctx.args.slice(2).join(' ')
    if (!text) return ['tr: missing input text (pipe not supported in this shell)']
    let result = ''
    for (const ch of text) {
      const idx = from.indexOf(ch)
      result += idx >= 0 ? (to[idx] ?? '') : ch
    }
    return [result]
  },
)

// ── cut ──
register('cut', 'Extract fields from lines', 'cut -d <delim> -f <field> <file>', (ctx) => {
  let delim = '\t'
  let field = 1
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-d' && i + 1 < ctx.args.length) {
      delim = ctx.args[i + 1]
      i++
    } else if (ctx.args[i] === '-f' && i + 1 < ctx.args.length) {
      field = parseInt(ctx.args[i + 1], 10) || 1
      i++
    } else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  if (!fileArg) return ['cut: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`cut: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`cut: ${fileArg}: Is a directory`]
  return (node.content || '').split('\n').map((line) => {
    const fields = line.split(delim)
    return fields[field - 1] ?? ''
  })
})

// ── fmt ──
register('fmt', 'Format text to specified width', 'fmt [-w WIDTH] <file>', (ctx) => {
  let width = 75
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-w' && i + 1 < ctx.args.length) {
      width = parseInt(ctx.args[i + 1], 10) || 75
      i++
    } else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  if (!fileArg) return ['fmt: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`fmt: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`fmt: ${fileArg}: Is a directory`]
  const content = node.content || ''
  const paragraphs = content.split(/\n\n+/)
  const result: string[] = []
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const word of words) {
      if (line.length + word.length + 1 > width && line.length > 0) {
        result.push(line)
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    if (line) result.push(line)
    result.push('')
  }
  return result
})

// ── seq ──
register(
  'seq',
  'Generate a sequence of numbers',
  'seq <last> | <first> <last> | <first> <step> <last>',
  (ctx) => {
    if (ctx.args.length === 0) return ['seq: missing operand']
    let start = 1,
      step = 1,
      end: number
    if (ctx.args.length === 1) {
      end = parseInt(ctx.args[0], 10)
      if (isNaN(end)) return ['seq: invalid number']
    } else if (ctx.args.length === 2) {
      start = parseInt(ctx.args[0], 10)
      end = parseInt(ctx.args[1], 10)
      if (isNaN(start) || isNaN(end)) return ['seq: invalid number']
    } else {
      start = parseInt(ctx.args[0], 10)
      step = parseInt(ctx.args[1], 10)
      end = parseInt(ctx.args[2], 10)
      if (isNaN(start) || isNaN(step) || isNaN(end)) return ['seq: invalid number']
    }
    if (step === 0) return ['seq: step must not be zero']
    const result: string[] = []
    if (step > 0) {
      for (let i = start; i <= end; i += step) result.push(String(i))
    } else {
      for (let i = start; i >= end; i += step) result.push(String(i))
    }
    return result
  },
)

// ── yes ──
register('yes', 'Repeatedly output a string (limited)', 'yes [text]', (ctx) => {
  const text = ctx.args.length > 0 ? ctx.args.join(' ') : 'y'
  return Array(20).fill(text)
})

// ── tee ──
register('tee', 'Display input (simulated, no pipe support)', 'tee <text>', (ctx) => {
  if (ctx.args.length === 0) return ['tee: missing operand']
  return [ctx.args.join(' ')]
})

// ── strings ──
register('strings', 'Print printable strings from a file', 'strings <file>', (ctx) => {
  if (ctx.args.length === 0) return ['strings: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, ctx.args[0])
  if (!node) return [`strings: ${ctx.args[0]}: No such file or directory`]
  if (node.type === 'dir') return [`strings: ${ctx.args[0]}: Is a directory`]
  const content = node.content || ''
  const strings = content.match(/[\x20-\x7E]{4,}/g)
  return strings || ['(no printable strings found)']
})

// ── fold ──
register('fold', 'Wrap lines to specified width', 'fold [-w WIDTH] <file>', (ctx) => {
  let width = 80
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-w' && i + 1 < ctx.args.length) {
      width = parseInt(ctx.args[i + 1], 10) || 80
      i++
    } else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  if (!fileArg) return ['fold: missing operand']
  const node = resolvePath(ctx.root, ctx.cwd, fileArg)
  if (!node) return [`fold: ${fileArg}: No such file or directory`]
  if (node.type === 'dir') return [`fold: ${fileArg}: Is a directory`]
  const result: string[] = []
  for (const line of (node.content || '').split('\n')) {
    if (line.length <= width) {
      result.push(line)
    } else {
      for (let i = 0; i < line.length; i += width) {
        result.push(line.slice(i, i + width))
      }
    }
  }
  return result
})

// ── exit ──
register('exit', 'Exit the terminal (navigates to home)', 'exit', () => {
  return ['logout', 'Session terminated. Secure. Contain. Protect.']
})

/**
 * Get all command names (for tab completion).
 */
export function getCommandNames(): string[] {
  return [...commands.keys()]
}

/**
 * Execute a command string and return output lines.
 */
export function executeCommand(input: string, ctx: Omit<CommandContext, 'args'>): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  // Parse input into command and args (handle quoted strings)
  const parts = parseInput(trimmed)
  if (parts.length === 0) return []

  const cmdName = parts[0]
  const args = parts.slice(1)

  const cmd = commands.get(cmdName)
  if (!cmd) {
    return [`scf-bash: ${cmdName}: command not found`]
  }

  try {
    const result = cmd.handler({ ...ctx, args })
    if (Array.isArray(result)) return result
    if (typeof result === 'string') return [result]
    return []
  } catch (e) {
    return [`${cmdName}: internal error: ${e instanceof Error ? e.message : 'unknown'}`]
  }
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
export function getCompletions(input: string, cwd: string, root: FSNode): string[] {
  const trimmed = input.trimStart()
  const parts = trimmed.split(/\s+/)

  // If only typing the command name, complete commands
  if (parts.length <= 1) {
    const partial = parts[0] || ''
    return getCommandNames().filter((c) => c.startsWith(partial))
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

  const dirNode = resolvePath(root, cwd, dirPath)
  if (!dirNode || dirNode.type !== 'dir' || !dirNode.children) return []

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
