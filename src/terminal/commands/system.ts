/**
 * System info and monitoring commands: neofetch, uptime, id, groups, tty,
 * true, false, who, last, ps, free, df, du, stat, file, which, type,
 * man, alias, unalias.
 */

import type { FSNode } from '../filesystem'
import { register, rp, commands } from './types'

// ── neofetch ──
register('neofetch', 'Display SCP-themed system information', 'neofetch', () => {
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
  const node = rp(ctx.root, '/', '/var/log/lastlog', ctx.env)
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
  const node = rp(ctx.root, ctx.cwd, path, ctx.env)
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
  const node = rp(ctx.root, ctx.cwd, ctx.args[0], ctx.env)
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
  const node = rp(ctx.root, ctx.cwd, ctx.args[0], ctx.env)
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
  if (commands.has(cmd)) return [`${cmd}: shell built-in command`]
  return [`${cmd} not found`]
})

// ── type ──
register('type', 'Describe command type', 'type <command>', (ctx) => {
  if (ctx.args.length === 0) return ['type: missing operand']
  const cmd = ctx.args[0]
  if (commands.has(cmd)) return [`${cmd} is a shell builtin`]
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
