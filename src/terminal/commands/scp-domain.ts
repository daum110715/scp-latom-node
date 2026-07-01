/**
 * SCP Foundation domain commands: scp, about, matrix, classify, clearance,
 * incident, protocol, status, audit, alert, staff.
 */

import { isFile } from '../filesystem'
import { register, rp } from './types'

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
  const node = rp(ctx.root, '/', filePath, ctx.env)
  if (!node || !isFile(node)) {
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
    const node = rp(ctx.root, '/', '/documents/incident-report-2024-03.txt', ctx.env)
    if (node && isFile(node)) return node.content.split('\n')
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
    const node = rp(ctx.root, '/', '/documents/protocol-omega.txt', ctx.env)
    if (node && isFile(node)) return node.content.split('\n')
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
  const node = rp(ctx.root, '/', '/logs/access.log', ctx.env)
  if (!node || !isFile(node)) return ['(no audit records)']
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
