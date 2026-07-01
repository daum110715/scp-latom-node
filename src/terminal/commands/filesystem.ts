/**
 * Filesystem commands: ls, cd, cat, tree, head, tail, mkdir, rm, touch,
 * cp, mv, write, append, grep, find.
 */

import type { FSNode, FSDirNode } from '../filesystem'
import { isDir } from '../filesystem'
import { register, rp, rps } from './types'

// ── ls ──
register('ls', 'List directory contents', 'ls [-la] [path]', (ctx) => {
  let flags = ''
  let target = '.'
  for (const arg of ctx.args) {
    if (arg.startsWith('-') && arg.length > 1) {
      flags += arg.slice(1)
    } else {
      target = arg
    }
  }
  const showAll = flags.includes('a')
  const longFormat = flags.includes('l')
  const node = rp(ctx.root, ctx.cwd, target, ctx.env)
  if (!node) return [`ls: cannot access '${target}': No such file or directory`]
  if (node.type === 'file') {
    if (longFormat) {
      const size = (node.content || '').length
      return [`-rw-r--r--  1 researcher  researcher  ${String(size).padStart(6)}  ${node.name}`]
    }
    return [node.name]
  }
  if (!node.children || node.children.size === 0) return showAll ? ['.', '..'] : ['(empty)']
  let entries = [...node.children.values()]
  if (!showAll) {
    entries = entries.filter((child) => !child.name.startsWith('.'))
  }
  if (entries.length === 0 && !showAll) return ['(empty)']
  if (longFormat) {
    const lines: string[] = []
    if (showAll) {
      lines.push('drwxr-xr-x  2 researcher  researcher  4096  .')
      lines.push('drwxr-xr-x  2 researcher  researcher  4096  ..')
    }
    for (const child of entries) {
      if (child.type === 'dir') {
        lines.push(`drwxr-xr-x  2 researcher  researcher  4096  ${child.name}/`)
      } else {
        const size = (child.content || '').length
        lines.push(
          `-rw-r--r--  1 researcher  researcher  ${String(size).padStart(6)}  ${child.name}`,
        )
      }
    }
    return lines
  }
  const names = entries.map((child) => {
    const suffix = child.type === 'dir' ? '/' : ''
    return child.name + suffix
  })
  if (showAll) names.unshift('.', '..')
  return [names.join('  ')]
})

// ── cd ──
register('cd', 'Change the current directory', 'cd [path|-]', (ctx) => {
  const homeDir = ctx.env.HOME || '/home/researcher'
  if (ctx.args.length === 0) {
    ctx.setcwd(homeDir)
    return
  }
  const target = ctx.args[0]
  // cd - returns to previous directory
  if (target === '-') {
    const prev = ctx.env.OLDPWD || homeDir
    const node = rp(ctx.root, '/', prev, ctx.env)
    if (!node || node.type !== 'dir') return [`cd: ${prev}: No such file or directory`]
    ctx.setcwd(prev)
    return [prev]
  }
  const node = rp(ctx.root, ctx.cwd, target, ctx.env)
  if (!node) return [`cd: ${target}: No such file or directory`]
  if (node.type !== 'dir') return [`cd: ${target}: Not a directory`]
  const newPath = rps(ctx.cwd, target, ctx.env)
  // Save OLDPWD before changing
  ctx.setenv('OLDPWD', ctx.cwd)
  ctx.setcwd(newPath)
})

// ── cat ──
register('cat', 'Display file contents', 'cat [file...]', (ctx) => {
  // With stdin (piped input) and no file args, echo stdin
  if (ctx.args.length === 0) {
    if (ctx.stdin && ctx.stdin.length > 0) return ctx.stdin
    return ['cat: missing operand']
  }
  const lines: string[] = []
  for (const arg of ctx.args) {
    const node = rp(ctx.root, ctx.cwd, arg, ctx.env)
    if (!node) return [`cat: ${arg}: No such file or directory`]
    if (node.type === 'dir') return [`cat: ${arg}: Is a directory`]
    lines.push(...(node.content || '').split('\n'))
  }
  // Remove trailing empty line if last file had a trailing newline
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
})

// ── tree ──
register('tree', 'Display directory tree structure', 'tree [path]', (ctx) => {
  const target = ctx.args[0] || '.'
  const node = rp(ctx.root, ctx.cwd, target, ctx.env)
  if (!node) return [`tree: '${target}': No such file or directory`]
  if (node.type !== 'dir') return [node.name]

  const lines: string[] = []
  const dirName = target === '.' ? ctx.cwd : target
  lines.push(dirName)

  function walk(n: FSDirNode, prefix: string) {
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

  if (isDir(node)) walk(node, '')
  return lines
})

// ── grep (simplified) ──
register('grep', 'Search for a pattern in a file', 'grep <pattern> [file]', (ctx) => {
  if (ctx.args.length < 1) return ['Usage: grep <pattern> [file]']
  const pattern = ctx.args[0]
  let lines: string[]
  if (ctx.args.length >= 2) {
    const target = ctx.args[1]
    const node = rp(ctx.root, ctx.cwd, target, ctx.env)
    if (!node) return [`grep: ${target}: No such file or directory`]
    if (node.type === 'dir') return [`grep: ${target}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['Usage: grep <pattern> [file]']
  }
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = lines.filter((line) => line.toLowerCase().includes(pattern.toLowerCase()))
  if (matches.length === 0) return [`(no matches for '${pattern}')`]
  return matches.map((line) =>
    line.replace(new RegExp(`(${escaped})`, 'gi'), `\x1b[1;31m$1\x1b[0m`),
  )
})

// ── head ──
register('head', 'Display the first lines of a file', 'head [-n N] [file]', (ctx) => {
  let count = 10
  let fileArg: string | undefined
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-n' && i + 1 < ctx.args.length) {
      count = parseInt(ctx.args[i + 1], 10) || 10
      i++
    } else if (!ctx.args[i].startsWith('-')) {
      fileArg = ctx.args[i]
    }
  }
  let lines: string[]
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`head: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`head: ${fileArg}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['head: missing operand']
  }
  return lines.slice(0, count)
})

// ── tail ──
register('tail', 'Display the last lines of a file', 'tail [-n N] [file]', (ctx) => {
  let count = 10
  let fileArg: string | undefined
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-n' && i + 1 < ctx.args.length) {
      count = parseInt(ctx.args[i + 1], 10) || 10
      i++
    } else if (!ctx.args[i].startsWith('-')) {
      fileArg = ctx.args[i]
    }
  }
  let lines: string[]
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`tail: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`tail: ${fileArg}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['tail: missing operand']
  }
  return lines.slice(-count)
})

// ── mkdir ──
register('mkdir', 'Create a new directory', 'mkdir [-p] <name>', (ctx) => {
  let parents = false
  const targets: string[] = []
  for (const arg of ctx.args) {
    if (arg === '-p') parents = true
    else targets.push(arg)
  }
  if (targets.length === 0) return ['mkdir: missing operand']
  const errors: string[] = []
  for (const target of targets) {
    if (parents) {
      // Create each path component
      const parts = target.split('/').filter(Boolean)
      let current = target.startsWith('/') ? '' : '.'
      for (const part of parts) {
        current = current ? `${current}/${part}` : part
        const error = ctx.mkdir(current)
        // Ignore "File exists" for -p
        if (error && !error.includes('File exists')) {
          errors.push(error)
          break
        }
      }
    } else {
      const error = ctx.mkdir(target)
      if (error) errors.push(error)
    }
  }
  if (errors.length > 0) return errors
  ctx.onFsMutate()
  return []
})

// ── rm ──
register('rm', 'Remove a file or directory', 'rm [-rf] <file>', (ctx) => {
  let recursive = false
  const targets: string[] = []
  for (const arg of ctx.args) {
    if (arg.startsWith('-')) {
      if (arg.includes('r')) recursive = true
      // -f is silently accepted (force, no error on missing)
    } else {
      targets.push(arg)
    }
  }
  if (targets.length === 0) return ['rm: missing operand']
  const errors: string[] = []
  for (const target of targets) {
    const error = recursive ? ctx.rmrf(target) : ctx.rm(target)
    if (error) errors.push(error)
  }
  if (errors.length > 0) return errors
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

// ── cp ──
register('cp', 'Copy a file or directory', 'cp <source> <dest>', (ctx) => {
  if (ctx.args.length < 2) return ['cp: missing operand', 'Usage: cp <source> <dest>']
  const error = ctx.copy(ctx.args[0], ctx.args[1])
  if (error) return [error]
  ctx.onFsMutate()
  return []
})

// ── mv ──
register('mv', 'Move or rename a file or directory', 'mv <source> <dest>', (ctx) => {
  if (ctx.args.length < 2) return ['mv: missing operand', 'Usage: mv <source> <dest>']
  const error = ctx.move(ctx.args[0], ctx.args[1])
  if (error) return [error]
  ctx.onFsMutate()
  return []
})

// ── write ──
register(
  'write',
  'Write content to a file (create or overwrite)',
  'write <file> <content>',
  (ctx) => {
    if (ctx.args.length < 1) return ['write: missing operand', 'Usage: write <file> <content>']
    const file = ctx.args[0]
    let content: string
    if (ctx.args.length > 1) {
      content = ctx.args.slice(1).join(' ')
    } else if (ctx.stdin && ctx.stdin.length > 0) {
      content = ctx.stdin.join('\n')
    } else {
      return ['write: missing content']
    }
    const error = ctx.writeFile(file, content + '\n')
    if (error) return [error]
    ctx.onFsMutate()
    return []
  },
)

// ── append ──
register('append', 'Append content to a file', 'append <file> <content>', (ctx) => {
  if (ctx.args.length < 1) return ['append: missing operand', 'Usage: append <file> <content>']
  const file = ctx.args[0]
  let content: string
  if (ctx.args.length > 1) {
    content = ctx.args.slice(1).join(' ')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    content = ctx.stdin.join('\n')
  } else {
    return ['append: missing content']
  }
  const error = ctx.appendFile(file, content + '\n')
  if (error) return [error]
  ctx.onFsMutate()
  return []
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
  const node = rp(ctx.root, ctx.cwd, searchPath, ctx.env)
  if (!node) return [`find: '${searchPath}': No such file or directory`]
  if (node.type !== 'dir') return [searchPath]
  const results: string[] = []
  const globRegex = new RegExp(
    '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
  )
  function walk(n: FSDirNode, path: string) {
    for (const [name, child] of n.children) {
      const childPath = path === '/' ? `/${name}` : `${path}/${name}`
      if (globRegex.test(name)) results.push(childPath)
      if (child.type === 'dir') walk(child, childPath)
    }
  }
  if (isDir(node)) walk(node, searchPath === '.' ? '' : searchPath)
  return results.length > 0 ? results : ['(no matches)']
})
