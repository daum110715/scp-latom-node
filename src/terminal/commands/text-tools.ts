/**
 * Text processing commands: wc, sort, uniq, diff, rev, nl, tr, cut,
 * fmt, fold, strings, yes, tee, seq.
 */

import { register, rp } from './types'

// ── wc ──
register('wc', 'Count lines, words, and characters in a file', 'wc [file]', (ctx) => {
  let content: string
  let label: string
  if (ctx.args.length > 0) {
    const target = ctx.args[0]
    const node = rp(ctx.root, ctx.cwd, target, ctx.env)
    if (!node) return [`wc: ${target}: No such file or directory`]
    if (node.type === 'dir') return [`wc: ${target}: Is a directory`]
    content = node.content || ''
    label = target
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    content = ctx.stdin.join('\n')
    label = ''
  } else {
    return ['wc: missing operand']
  }
  const lines = content.split('\n').length
  const words = content.split(/\s+/).filter(Boolean).length
  const chars = content.length
  return [`  ${lines}  ${words}  ${chars} ${label}`]
})

// ── sort ──
register('sort', 'Sort lines of a file', 'sort [-r] [file]', (ctx) => {
  let reverse = false
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-r') reverse = true
    else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  let lines: string[]
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`sort: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`sort: ${fileArg}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['sort: missing operand']
  }
  const sorted = [...lines].sort((a, b) => a.localeCompare(b))
  if (reverse) sorted.reverse()
  return sorted
})

// ── uniq ──
register('uniq', 'Filter duplicate lines', 'uniq [-c] [file]', (ctx) => {
  let countMode = false
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-c') countMode = true
    else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  let lines: string[]
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`uniq: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`uniq: ${fileArg}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['uniq: missing operand']
  }
  if (lines.length === 0) return []
  const result: string[] = []
  let prev = lines[0]
  let count = 1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === prev) {
      count++
    } else {
      result.push(countMode ? `  ${String(count).padStart(4)}  ${prev}` : prev)
      prev = lines[i]
      count = 1
    }
  }
  result.push(countMode ? `  ${String(count).padStart(4)}  ${prev}` : prev)
  return result
})

// ── diff ──
register('diff', 'Compare two files', 'diff <file1> <file2>', (ctx) => {
  if (ctx.args.length < 2) return ['diff: missing operand']
  const node1 = rp(ctx.root, ctx.cwd, ctx.args[0], ctx.env)
  if (!node1) return [`diff: ${ctx.args[0]}: No such file or directory`]
  if (node1.type === 'dir') return [`diff: ${ctx.args[0]}: Is a directory`]
  const node2 = rp(ctx.root, ctx.cwd, ctx.args[1], ctx.env)
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
register('rev', 'Reverse lines of a file', 'rev [file]', (ctx) => {
  let lines: string[]
  if (ctx.args.length > 0) {
    const node = rp(ctx.root, ctx.cwd, ctx.args[0], ctx.env)
    if (!node) return [`rev: ${ctx.args[0]}: No such file or directory`]
    if (node.type === 'dir') return [`rev: ${ctx.args[0]}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['rev: missing operand']
  }
  return lines.map((line) => line.split('').reverse().join(''))
})

// ── nl (number lines) ──
register('nl', 'Number lines of a file', 'nl [file]', (ctx) => {
  let lines: string[]
  if (ctx.args.length > 0) {
    const node = rp(ctx.root, ctx.cwd, ctx.args[0], ctx.env)
    if (!node) return [`nl: ${ctx.args[0]}: No such file or directory`]
    if (node.type === 'dir') return [`nl: ${ctx.args[0]}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['nl: missing operand']
  }
  return lines.map((line, i) => `  ${String(i + 1).padStart(4)}  ${line}`)
})

// ── tr ──
register(
  'tr',
  'Translate or squeeze characters',
  'tr <from> <to> [text] | cmd | tr <from> <to>',
  (ctx) => {
    if (ctx.args.length < 2) return ['Usage: tr <from> <to> [text]']
    const from = ctx.args[0]
    const to = ctx.args[1]
    let lines: string[]
    const text = ctx.args.slice(2).join(' ')
    if (text) {
      lines = [text]
    } else if (ctx.stdin && ctx.stdin.length > 0) {
      lines = ctx.stdin
    } else {
      return ['tr: missing input text']
    }
    return lines.map((line) => {
      let result = ''
      for (const ch of line) {
        const idx = from.indexOf(ch)
        result += idx >= 0 ? (to[idx] ?? '') : ch
      }
      return result
    })
  },
)

// ── cut ──
register('cut', 'Extract fields from lines', 'cut -d <delim> -f <field> [file]', (ctx) => {
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
  let lines: string[]
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`cut: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`cut: ${fileArg}: Is a directory`]
    lines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    lines = ctx.stdin
  } else {
    return ['cut: missing operand']
  }
  return lines.map((line) => {
    const fields = line.split(delim)
    return fields[field - 1] ?? ''
  })
})

// ── fmt ──
register('fmt', 'Format text to specified width', 'fmt [-w WIDTH] [file]', (ctx) => {
  let width = 75
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-w' && i + 1 < ctx.args.length) {
      width = parseInt(ctx.args[i + 1], 10) || 75
      i++
    } else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  let content: string
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`fmt: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`fmt: ${fileArg}: Is a directory`]
    content = node.content || ''
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    content = ctx.stdin.join('\n')
  } else {
    return ['fmt: missing operand']
  }
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
register('tee', 'Pass stdin through while displaying it', 'tee [text]', (ctx) => {
  if (ctx.stdin && ctx.stdin.length > 0) return ctx.stdin
  if (ctx.args.length > 0) return [ctx.args.join(' ')]
  return ['tee: missing operand']
})

// ── strings ──
register('strings', 'Print printable strings from a file', 'strings [file]', (ctx) => {
  let content: string
  if (ctx.args.length > 0) {
    const node = rp(ctx.root, ctx.cwd, ctx.args[0], ctx.env)
    if (!node) return [`strings: ${ctx.args[0]}: No such file or directory`]
    if (node.type === 'dir') return [`strings: ${ctx.args[0]}: Is a directory`]
    content = node.content || ''
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    content = ctx.stdin.join('\n')
  } else {
    return ['strings: missing operand']
  }
  const strings = content.match(/[\x20-\x7E]{4,}/g)
  return strings || ['(no printable strings found)']
})

// ── fold ──
register('fold', 'Wrap lines to specified width', 'fold [-w WIDTH] [file]', (ctx) => {
  let width = 80
  let fileArg = ''
  for (let i = 0; i < ctx.args.length; i++) {
    if (ctx.args[i] === '-w' && i + 1 < ctx.args.length) {
      width = parseInt(ctx.args[i + 1], 10) || 80
      i++
    } else if (!ctx.args[i].startsWith('-') && !fileArg) fileArg = ctx.args[i]
  }
  let inputLines: string[]
  if (fileArg) {
    const node = rp(ctx.root, ctx.cwd, fileArg, ctx.env)
    if (!node) return [`fold: ${fileArg}: No such file or directory`]
    if (node.type === 'dir') return [`fold: ${fileArg}: Is a directory`]
    inputLines = (node.content || '').split('\n')
  } else if (ctx.stdin && ctx.stdin.length > 0) {
    inputLines = ctx.stdin
  } else {
    return ['fold: missing operand']
  }
  const result: string[] = []
  for (const line of inputLines) {
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
