import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createShell } from '../shell'
import { executeCommand, getCompletions, getCommandNames } from '../commands'
import { createFilesystem, resolvePath, resolvePathString } from '../filesystem'

describe('filesystem', () => {
  const root = createFilesystem()

  it('creates root directory with expected children', () => {
    expect(root.type).toBe('dir')
    expect(root.children?.has('etc')).toBe(true)
    expect(root.children?.has('scp')).toBe(true)
    expect(root.children?.has('documents')).toBe(true)
    expect(root.children?.has('logs')).toBe(true)
    expect(root.children?.has('home')).toBe(true)
  })

  it('resolves absolute paths', () => {
    const node = resolvePath(root, '/', '/etc/hostname')
    expect(node).not.toBeNull()
    expect(node?.type).toBe('file')
    expect(node?.name).toBe('hostname')
    expect(node?.content).toContain('LATOM-7')
  })

  it('resolves relative paths', () => {
    const node = resolvePath(root, '/etc', 'hostname')
    expect(node).not.toBeNull()
    expect(node?.name).toBe('hostname')
  })

  it('resolves parent directory with ..', () => {
    const node = resolvePath(root, '/etc', '..')
    expect(node).not.toBeNull()
    expect(node?.type).toBe('dir')
  })

  it('resolves . for current directory', () => {
    const node = resolvePath(root, '/scp', '.')
    expect(node).not.toBeNull()
    expect(node?.type).toBe('dir')
  })

  it('returns null for non-existent paths', () => {
    const node = resolvePath(root, '/', '/nonexistent')
    expect(node).toBeNull()
  })

  it('returns null when accessing file as directory', () => {
    const node = resolvePath(root, '/etc', 'hostname/sub')
    expect(node).toBeNull()
  })

  it('resolvePathString produces correct absolute paths', () => {
    expect(resolvePathString('/home/researcher', '..')).toBe('/home')
    expect(resolvePathString('/home/researcher', '../..')).toBe('/')
    expect(resolvePathString('/home/researcher', './notes')).toBe('/home/researcher/notes')
    expect(resolvePathString('/', '/scp/scp-173.txt')).toBe('/scp/scp-173.txt')
  })
})

describe('commands', () => {
  const root = createFilesystem()
  const baseCtx = {
    cwd: '/home/researcher',
    root,
    history: [],
    env: { USER: 'researcher', HOME: '/home/researcher' },
    setcwd: vi.fn(),
    setenv: vi.fn(),
    clear: vi.fn(),
    mkdir: vi.fn(() => 'Permission denied (read-only filesystem)'),
    rm: vi.fn(() => 'Permission denied (read-only filesystem)'),
    touch: vi.fn(() => 'Permission denied (read-only filesystem)'),
    copy: vi.fn(() => 'Permission denied (read-only filesystem)'),
    move: vi.fn(() => 'Permission denied (read-only filesystem)'),
    rmrf: vi.fn(() => 'Permission denied (read-only filesystem)'),
    writeFile: vi.fn(() => 'Permission denied (read-only filesystem)'),
    appendFile: vi.fn(() => 'Permission denied (read-only filesystem)'),
    onFsMutate: vi.fn(),
  }

  describe('help', () => {
    it('lists all commands', () => {
      const output = executeCommand('help', baseCtx)
      expect(output.length).toBeGreaterThan(0)
      expect(output.join('\n')).toContain('SCP FOUNDATION TERMINAL')
    })

    it('shows help for a specific command', () => {
      const output = executeCommand('help ls', baseCtx)
      expect(output.join('\n')).toContain('List directory contents')
    })

    it('shows error for unknown command help', () => {
      const output = executeCommand('help foobar', baseCtx)
      expect(output.join('\n')).toContain('no help found')
    })
  })

  describe('pwd', () => {
    it('prints current working directory', () => {
      const output = executeCommand('pwd', baseCtx)
      expect(output).toEqual(['/home/researcher'])
    })
  })

  describe('whoami', () => {
    it('prints the current user', () => {
      const output = executeCommand('whoami', baseCtx)
      expect(output).toEqual(['researcher'])
    })
  })

  describe('hostname', () => {
    it('prints the hostname', () => {
      const output = executeCommand('hostname', baseCtx)
      expect(output).toEqual(['LATOM-7'])
    })
  })

  describe('echo', () => {
    it('prints arguments', () => {
      const output = executeCommand('echo hello world', baseCtx)
      expect(output).toEqual(['hello world'])
    })

    it('handles empty echo', () => {
      const output = executeCommand('echo', baseCtx)
      expect(output).toEqual([''])
    })
  })

  describe('uname', () => {
    it('prints kernel name by default', () => {
      const output = executeCommand('uname', baseCtx)
      expect(output).toEqual(['SCF-Linux'])
    })

    it('prints full info with -a', () => {
      const output = executeCommand('uname -a', baseCtx)
      expect(output[0]).toContain('SCF-Linux')
      expect(output[0]).toContain('LATOM-7')
    })
  })

  describe('ls', () => {
    it('lists root directory', () => {
      const output = executeCommand('ls /', { ...baseCtx, cwd: '/' })
      expect(output[0]).toContain('etc/')
      expect(output[0]).toContain('scp/')
    })

    it('lists current directory', () => {
      const output = executeCommand('ls', { ...baseCtx, cwd: '/scp' })
      expect(output[0]).toContain('scp-173.txt')
    })

    it('lists specific path', () => {
      const output = executeCommand('ls /documents', baseCtx)
      expect(output[0]).toContain('protocol-omega.txt')
    })

    it('shows error for non-existent path', () => {
      const output = executeCommand('ls /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('cd', () => {
    it('changes directory', () => {
      const setcwd = vi.fn()
      executeCommand('cd /scp', { ...baseCtx, setcwd })
      expect(setcwd).toHaveBeenCalledWith('/scp')
    })

    it('changes to home when no args', () => {
      const setcwd = vi.fn()
      executeCommand('cd', { ...baseCtx, setcwd })
      expect(setcwd).toHaveBeenCalledWith('/home/researcher')
    })

    it('shows error for non-existent directory', () => {
      const output = executeCommand('cd /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })

    it('shows error when trying to cd into a file', () => {
      const output = executeCommand('cd /etc/hostname', baseCtx)
      expect(output[0]).toContain('Not a directory')
    })
  })

  describe('cat', () => {
    it('displays file contents', () => {
      const output = executeCommand('cat /etc/hostname', baseCtx)
      expect(output.join('\n')).toContain('LATOM-7')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('cat /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })

    it('shows error for directory', () => {
      const output = executeCommand('cat /etc', baseCtx)
      expect(output[0]).toContain('Is a directory')
    })

    it('shows error when no operand given', () => {
      const output = executeCommand('cat', baseCtx)
      expect(output[0]).toContain('missing operand')
    })
  })

  describe('scp', () => {
    it('looks up an SCP entry', () => {
      const output = executeCommand('scp 173', baseCtx)
      expect(output.join('\n')).toContain('SCP-173')
      expect(output.join('\n')).toContain('Euclid')
    })

    it('pads short numbers', () => {
      const output = executeCommand('scp 49', baseCtx)
      expect(output.join('\n')).toContain('SCP-049')
    })

    it('shows not found for unknown entries', () => {
      const output = executeCommand('scp 9999', baseCtx)
      expect(output.join('\n')).toContain('FILE NOT FOUND')
    })

    it('shows usage when no args', () => {
      const output = executeCommand('scp', baseCtx)
      expect(output.join('\n')).toContain('Usage')
    })
  })

  describe('history', () => {
    it('shows empty history message', () => {
      const output = executeCommand('history', baseCtx)
      expect(output).toEqual(['(no history)'])
    })

    it('shows command history', () => {
      const output = executeCommand('history', { ...baseCtx, history: ['ls', 'pwd', 'help'] })
      expect(output).toHaveLength(3)
      expect(output[0]).toContain('ls')
    })
  })

  describe('env', () => {
    it('displays environment variables', () => {
      const output = executeCommand('env', baseCtx)
      expect(output.join('\n')).toContain('USER=researcher')
    })
  })

  describe('tree', () => {
    it('displays directory tree', () => {
      const output = executeCommand('tree /etc', baseCtx)
      expect(output.join('\n')).toContain('hostname')
      expect(output.join('\n')).toContain('motd')
    })

    it('shows error for non-existent path', () => {
      const output = executeCommand('tree /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('wc', () => {
    it('counts lines and words', () => {
      const output = executeCommand('wc /etc/hostname', baseCtx)
      expect(output[0]).toContain('/etc/hostname')
    })
  })

  describe('head', () => {
    it('shows first lines of a file', () => {
      const output = executeCommand('head /logs/access.log', baseCtx)
      expect(output.length).toBeLessThanOrEqual(10)
      expect(output[0]).toContain('LOGIN')
    })

    it('respects -n flag', () => {
      const output = executeCommand('head -n 2 /logs/access.log', baseCtx)
      expect(output).toHaveLength(2)
    })
  })

  describe('tail', () => {
    it('shows last lines of a file', () => {
      const output = executeCommand('tail /logs/access.log', baseCtx)
      expect(output.length).toBeLessThanOrEqual(10)
    })
  })

  describe('neofetch', () => {
    it('displays system info', () => {
      const output = executeCommand('neofetch', baseCtx)
      expect(output.join('\n')).toContain('LATOM-7')
      expect(output.join('\n')).toContain('Secure. Contain. Protect.')
    })
  })

  describe('about', () => {
    it('displays foundation info', () => {
      const output = executeCommand('about', baseCtx)
      expect(output.join('\n')).toContain('SCP FOUNDATION')
    })
  })

  describe('unknown command', () => {
    it('shows command not found', () => {
      const output = executeCommand('foobar', baseCtx)
      expect(output[0]).toContain('command not found')
    })
  })

  describe('empty input', () => {
    it('returns empty array', () => {
      const output = executeCommand('', baseCtx)
      expect(output).toEqual([])
    })
  })

  describe('read-only filesystem operations', () => {
    it('mkdir is denied', () => {
      const output = executeCommand('mkdir test', baseCtx)
      expect(output[0]).toContain('Permission denied')
    })

    it('rm is denied', () => {
      const output = executeCommand('rm test', baseCtx)
      expect(output[0]).toContain('Permission denied')
    })

    it('touch is denied', () => {
      const output = executeCommand('touch test', baseCtx)
      expect(output[0]).toContain('Permission denied')
    })
  })

  describe('find', () => {
    it('finds files by name pattern', () => {
      const output = executeCommand('find /etc -name hostname', baseCtx)
      expect(output[0]).toContain('hostname')
    })

    it('shows error for missing pattern', () => {
      const output = executeCommand('find /etc', baseCtx)
      expect(output[0]).toContain('missing -name pattern')
    })

    it('shows no matches for non-existent file', () => {
      const output = executeCommand('find / -name nonexistent', baseCtx)
      expect(output[0]).toContain('no matches')
    })

    it('shows error for non-existent path', () => {
      const output = executeCommand('find /nonexistent -name test', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('sort', () => {
    it('sorts lines of a file', () => {
      const output = executeCommand('sort /etc/hostname', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('sort', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('sort /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })

    it('shows error for directory', () => {
      const output = executeCommand('sort /etc', baseCtx)
      expect(output[0]).toContain('Is a directory')
    })
  })

  describe('uniq', () => {
    it('filters duplicate lines', () => {
      const output = executeCommand('uniq /etc/hostname', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('uniq', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('uniq /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('diff', () => {
    it('compares two files', () => {
      const output = executeCommand('diff /etc/hostname /etc/hostname', baseCtx)
      expect(output[0]).toContain('identical')
    })

    it('shows differences between files', () => {
      const output = executeCommand('diff /etc/hostname /etc/passwd', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('diff /etc/hostname', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('diff /nonexistent /etc/hostname', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('rev', () => {
    it('reverses lines of a file', () => {
      const output = executeCommand('rev /etc/hostname', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('rev', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('rev /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('nl', () => {
    it('numbers lines of a file', () => {
      const output = executeCommand('nl /etc/hostname', baseCtx)
      expect(output[0]).toContain('1')
      expect(output[0]).toContain('LATOM-7')
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('nl', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('nl /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('tr', () => {
    it('translates characters', () => {
      const output = executeCommand('tr abc xyz hello', baseCtx)
      expect(output[0]).toBe('hello')
    })

    it('shows usage for missing args', () => {
      const output = executeCommand('tr', baseCtx)
      expect(output[0]).toContain('Usage')
    })
  })

  describe('cut', () => {
    it('extracts fields from file', () => {
      const output = executeCommand('cut -d : -f 1 /etc/passwd', baseCtx)
      expect(output.length).toBeGreaterThan(0)
      expect(output[0]).toBe('root')
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('cut', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('cut -d : -f 1 /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('fmt', () => {
    it('formats text to specified width', () => {
      const output = executeCommand('fmt -w 40 /documents/site-directive.txt', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('fmt', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('fmt /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('seq', () => {
    it('generates sequence with single arg', () => {
      const output = executeCommand('seq 5', baseCtx)
      expect(output).toEqual(['1', '2', '3', '4', '5'])
    })

    it('generates sequence with two args', () => {
      const output = executeCommand('seq 3 5', baseCtx)
      expect(output).toEqual(['3', '4', '5'])
    })

    it('generates sequence with three args', () => {
      const output = executeCommand('seq 0 2 10', baseCtx)
      expect(output).toEqual(['0', '2', '4', '6', '8', '10'])
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('seq', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for invalid number', () => {
      const output = executeCommand('seq abc', baseCtx)
      expect(output[0]).toContain('invalid number')
    })
  })

  describe('uptime', () => {
    it('displays system uptime', () => {
      const output = executeCommand('uptime', baseCtx)
      expect(output[0]).toContain('up')
      expect(output[0]).toContain('user')
    })
  })

  describe('id', () => {
    it('displays user info for researcher', () => {
      const output = executeCommand('id researcher', baseCtx)
      expect(output[0]).toContain('uid=1000')
      expect(output[0]).toContain('researcher')
    })

    it('displays user info for root', () => {
      const output = executeCommand('id root', baseCtx)
      expect(output[0]).toContain('uid=0')
      expect(output[0]).toContain('root')
    })

    it('shows error for unknown user', () => {
      const output = executeCommand('id unknown', baseCtx)
      expect(output[0]).toContain('no such user')
    })
  })

  describe('groups', () => {
    it('displays groups for researcher', () => {
      const output = executeCommand('groups researcher', baseCtx)
      expect(output[0]).toContain('researcher')
      expect(output[0]).toContain('sudo')
    })

    it('shows error for unknown user', () => {
      const output = executeCommand('groups unknown', baseCtx)
      expect(output[0]).toContain('no such user')
    })
  })

  describe('tty', () => {
    it('prints terminal name', () => {
      const output = executeCommand('tty', baseCtx)
      expect(output[0]).toContain('/dev/pts/')
    })
  })

  describe('who', () => {
    it('shows logged-in users', () => {
      const output = executeCommand('who', baseCtx)
      expect(output.length).toBeGreaterThan(0)
      expect(output[0]).toContain('researcher')
    })
  })

  describe('last', () => {
    it('shows last login entries', () => {
      const output = executeCommand('last', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })
  })

  describe('ps', () => {
    it('shows running processes', () => {
      const output = executeCommand('ps', baseCtx)
      expect(output[0]).toContain('PID')
      expect(output.length).toBeGreaterThan(1)
    })
  })

  describe('free', () => {
    it('displays memory usage', () => {
      const output = executeCommand('free', baseCtx)
      expect(output[0]).toContain('total')
    })

    it('displays human-readable memory usage', () => {
      const output = executeCommand('free -h', baseCtx)
      expect(output[0]).toContain('total')
      expect(output[1]).toContain('Mi')
    })
  })

  describe('df', () => {
    it('displays disk usage', () => {
      const output = executeCommand('df', baseCtx)
      expect(output[0]).toContain('Filesystem')
    })

    it('displays human-readable disk usage', () => {
      const output = executeCommand('df -h', baseCtx)
      expect(output[0]).toContain('Filesystem')
      expect(output[1]).toContain('G')
    })
  })

  describe('du', () => {
    it('displays directory usage', () => {
      const output = executeCommand('du /etc', baseCtx)
      expect(output[0]).toContain('/etc')
    })

    it('displays file usage', () => {
      const output = executeCommand('du /etc/hostname', baseCtx)
      expect(output[0]).toContain('hostname')
    })

    it('shows error for non-existent path', () => {
      const output = executeCommand('du /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('stat', () => {
    it('displays file status', () => {
      const output = executeCommand('stat /etc/hostname', baseCtx)
      expect(output[0]).toContain('File:')
      expect(output[1]).toContain('Size:')
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('stat', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('stat /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('file', () => {
    it('determines file type', () => {
      const output = executeCommand('file /etc/hostname', baseCtx)
      expect(output[0]).toContain('hostname')
      expect(output[0]).toContain('ASCII text')
    })

    it('identifies directories', () => {
      const output = executeCommand('file /etc', baseCtx)
      expect(output[0]).toContain('directory')
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('file', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('file /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('which', () => {
    it('shows location for built-in commands', () => {
      const output = executeCommand('which ls', baseCtx)
      expect(output[0]).toContain('shell built-in')
    })

    it('shows not found for unknown commands', () => {
      const output = executeCommand('which nonexistent', baseCtx)
      expect(output[0]).toContain('not found')
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('which', baseCtx)
      expect(output[0]).toContain('missing operand')
    })
  })

  describe('type', () => {
    it('describes built-in commands', () => {
      const output = executeCommand('type ls', baseCtx)
      expect(output[0]).toContain('shell builtin')
    })

    it('shows not found for unknown commands', () => {
      const output = executeCommand('type nonexistent', baseCtx)
      expect(output[0]).toContain('not found')
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('type', baseCtx)
      expect(output[0]).toContain('missing operand')
    })
  })

  describe('man', () => {
    it('shows manual page for command', () => {
      const output = executeCommand('man ls', baseCtx)
      expect(output[0]).toContain('LS(1)')
      expect(output.join('\n')).toContain('List directory contents')
    })

    it('shows error for unknown command', () => {
      const output = executeCommand('man nonexistent', baseCtx)
      expect(output[0]).toContain('No manual entry')
    })

    it('shows usage for missing operand', () => {
      const output = executeCommand('man', baseCtx)
      expect(output[0]).toContain('What manual page')
    })
  })

  describe('alias', () => {
    it('shows all aliases', () => {
      const output = executeCommand('alias', baseCtx)
      expect(output.length).toBeGreaterThan(0)
      expect(output[0]).toContain('alias')
    })
  })

  describe('classify', () => {
    it('shows classification for current path', () => {
      const output = executeCommand('classify', { ...baseCtx, cwd: '/scp' })
      expect(output[0]).toContain('CONFIDENTIAL')
    })

    it('shows classification for specified path', () => {
      const output = executeCommand('classify /documents', baseCtx)
      expect(output[0]).toContain('RESTRICTED')
    })

    it('shows classification for SCP files', () => {
      const output = executeCommand('classify /scp/scp-173.txt', baseCtx)
      expect(output[0]).toContain('CONFIDENTIAL')
    })
  })

  describe('clearance', () => {
    it('shows clearance for researcher', () => {
      const output = executeCommand('clearance researcher', baseCtx)
      expect(output.join('\n')).toContain('Level 4')
    })

    it('shows clearance for root', () => {
      const output = executeCommand('clearance root', baseCtx)
      expect(output.join('\n')).toContain('Level 5')
    })

    it('shows error for unknown user', () => {
      const output = executeCommand('clearance unknown', baseCtx)
      expect(output[0]).toContain('unknown user')
    })
  })

  describe('incident', () => {
    it('shows incident report index', () => {
      const output = executeCommand('incident', baseCtx)
      expect(output.join('\n')).toContain('INCIDENT REPORT INDEX')
    })

    it('shows specific incident report', () => {
      const output = executeCommand('incident IR-2024-0312', baseCtx)
      expect(output.join('\n')).toContain('INCIDENT REPORT')
    })

    it('shows error for unknown report', () => {
      const output = executeCommand('incident unknown', baseCtx)
      expect(output[0]).toContain('not found')
    })
  })

  describe('protocol', () => {
    it('shows protocol index', () => {
      const output = executeCommand('protocol', baseCtx)
      expect(output.join('\n')).toContain('FOUNDATION PROTOCOLS')
    })

    it('shows specific protocol', () => {
      const output = executeCommand('protocol OMEGA-7', baseCtx)
      expect(output.join('\n')).toContain('PROTOCOL OMEGA-7')
    })

    it('shows classified message for unknown protocol', () => {
      const output = executeCommand('protocol unknown', baseCtx)
      expect(output[0]).toContain('CLASSIFIED')
    })
  })

  describe('status', () => {
    it('displays system status', () => {
      const output = executeCommand('status', baseCtx)
      expect(output.join('\n')).toContain('LATOM-7 SYSTEM STATUS')
      expect(output.join('\n')).toContain('ONLINE')
    })
  })

  describe('audit', () => {
    it('displays audit log', () => {
      const output = executeCommand('audit', baseCtx)
      expect(output.join('\n')).toContain('AUDIT LOG')
    })
  })

  describe('alert', () => {
    it('displays active alerts', () => {
      const output = executeCommand('alert', baseCtx)
      expect(output.join('\n')).toContain('ACTIVE ALERTS')
      expect(output.join('\n')).toContain('0 CRITICAL')
    })
  })

  describe('staff', () => {
    it('shows staff directory', () => {
      const output = executeCommand('staff', baseCtx)
      expect(output.join('\n')).toContain('STAFF DIRECTORY')
    })

    it('shows specific staff member', () => {
      const output = executeCommand('staff researcher', baseCtx)
      expect(output.join('\n')).toContain('Dr. Researcher')
    })

    it('shows error for unknown staff', () => {
      const output = executeCommand('staff unknown', baseCtx)
      expect(output[0]).toContain('not found')
    })
  })

  describe('strings', () => {
    it('prints printable strings from file', () => {
      const output = executeCommand('strings /etc/hostname', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('strings', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('strings /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })

  describe('fold', () => {
    it('wraps lines to specified width', () => {
      const output = executeCommand('fold -w 40 /documents/site-directive.txt', baseCtx)
      expect(output.length).toBeGreaterThan(0)
    })

    it('shows error for missing operand', () => {
      const output = executeCommand('fold', baseCtx)
      expect(output[0]).toContain('missing operand')
    })

    it('shows error for non-existent file', () => {
      const output = executeCommand('fold /nonexistent', baseCtx)
      expect(output[0]).toContain('No such file or directory')
    })
  })
})

describe('shell', () => {
  it('displays MOTD on initialization', () => {
    const written: string[] = []
    const shell = createShell({
      onWrite: (text) => written.push(text),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    const motd = shell.getMotd()
    expect(motd).toContain('LATOM NODE DOCUMENTATION TERMINAL')
  })

  it('processes commands and returns output', () => {
    const written: string[] = []
    const shell = createShell({
      onWrite: (text) => written.push(text),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    shell.writePrompt()
    const result = shell.processInput('whoami')
    expect(result).toBeNull()
    expect(written.some((w) => w.includes('researcher'))).toBe(true)
  })

  it('returns exit on exit command', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    shell.writePrompt()
    const result = shell.processInput('exit')
    expect(result).toBe('exit')
  })

  it('navigates directories with cd', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    shell.writePrompt()
    shell.processInput('cd /scp')
    expect(shell.state.cwd).toBe('/scp')
  })

  it('tracks command history', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    shell.writePrompt()
    shell.processInput('pwd')
    shell.processInput('whoami')
    expect(shell.state.history).toEqual(['pwd', 'whoami'])
  })

  it('provides history navigation', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    shell.writePrompt()
    shell.processInput('pwd')
    shell.processInput('whoami')

    expect(shell.getHistoryPrev()).toBe('whoami')
    expect(shell.getHistoryPrev()).toBe('pwd')
    expect(shell.getHistoryNext()).toBe('whoami')
    expect(shell.getHistoryNext()).toBe('')
  })

  it('provides tab completions for commands', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    const completions = shell.getCompletionsFor('he')
    expect(completions).toContain('help')
    expect(completions).toContain('head')
  })

  it('provides tab completions for file paths', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    const completions = shell.getCompletionsFor('cat /etc/hos')
    expect(completions).toContain('/etc/hostname')
  })

  it('skips duplicate consecutive history entries', () => {
    const shell = createShell({
      onWrite: vi.fn(),
      onClear: vi.fn(),
      onPrompt: vi.fn(),
    })
    shell.writePrompt()
    shell.processInput('pwd')
    shell.processInput('pwd')
    expect(shell.state.history).toEqual(['pwd'])
  })

  describe('filesystem mutations', () => {
    it('creates a directory with mkdir', () => {
      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('mkdir mydir')
      // Verify the directory exists in the filesystem
      const home = shell.state.root.children?.get('home')
      const researcher = home?.children?.get('researcher')
      expect(researcher?.children?.has('mydir')).toBe(true)
      expect(researcher?.children?.get('mydir')?.type).toBe('dir')
    })

    it('creates a file with touch', () => {
      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('touch myfile.txt')
      const home = shell.state.root.children?.get('home')
      const researcher = home?.children?.get('researcher')
      expect(researcher?.children?.has('myfile.txt')).toBe(true)
      expect(researcher?.children?.get('myfile.txt')?.type).toBe('file')
    })

    it('removes a file with rm', () => {
      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('touch tempfile.txt')
      const home = shell.state.root.children?.get('home')
      const researcher = home?.children?.get('researcher')
      expect(researcher?.children?.has('tempfile.txt')).toBe(true)

      shell.processInput('rm tempfile.txt')
      expect(researcher?.children?.has('tempfile.txt')).toBe(false)
    })

    it('prevents mkdir on protected paths', () => {
      const written: string[] = []
      const shell = createShell({
        onWrite: (text) => written.push(text),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('mkdir /etc/newdir')
      expect(written.some((w) => w.includes('Permission denied'))).toBe(true)
    })

    it('prevents rm on protected paths', () => {
      const written: string[] = []
      const shell = createShell({
        onWrite: (text) => written.push(text),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('rm /etc/hostname')
      expect(written.some((w) => w.includes('Permission denied'))).toBe(true)
    })

    it('prevents touch on protected paths', () => {
      const written: string[] = []
      const shell = createShell({
        onWrite: (text) => written.push(text),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('touch /scp/newfile.txt')
      expect(written.some((w) => w.includes('Permission denied'))).toBe(true)
    })

    it('prevents rm on non-empty directories', () => {
      const written: string[] = []
      const shell = createShell({
        onWrite: (text) => written.push(text),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('mkdir testdir')
      shell.processInput('touch testdir/file.txt')
      shell.processInput('rm testdir')
      expect(written.some((w) => w.includes('Directory not empty'))).toBe(true)
    })

    it('reports mkdir error for existing directory', () => {
      const written: string[] = []
      const shell = createShell({
        onWrite: (text) => written.push(text),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('mkdir existing')
      shell.processInput('mkdir existing')
      expect(written.some((w) => w.includes('File exists'))).toBe(true)
    })

    it('allows cd into user-created directory', () => {
      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('mkdir myproject')
      shell.processInput('cd myproject')
      expect(shell.state.cwd).toBe('/home/researcher/myproject')
    })

    it('allows listing user-created directory contents', () => {
      const written: string[] = []
      const shell = createShell({
        onWrite: (text) => written.push(text),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      shell.writePrompt()
      shell.processInput('mkdir testdir')
      shell.processInput('touch testdir/a.txt')
      shell.processInput('touch testdir/b.txt')
      shell.processInput('ls testdir')
      expect(written.some((w) => w.includes('a.txt') && w.includes('b.txt'))).toBe(true)
    })
  })

  describe('storage persistence', () => {
    it('save() completes without storage', async () => {
      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
      })
      // Should not throw
      await shell.save()
    })

    it('calls storage.save with current state', async () => {
      const storageSave = vi.fn().mockResolvedValue(undefined)
      const storage = {
        load: vi.fn().mockResolvedValue(null),
        save: storageSave,
        clear: vi.fn(),
      }

      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
        storage,
      })

      // Wait for init to complete
      await shell.ready

      shell.writePrompt()
      shell.processInput('cd /scp')
      shell.processInput('mkdir testdir')

      // Explicit save
      await shell.save()

      expect(storageSave).toHaveBeenCalled()
      const savedState = storageSave.mock.calls[0][0]
      expect(savedState.cwd).toBe('/scp')
      expect(savedState.history).toEqual(['cd /scp', 'mkdir testdir'])
    })

    it('restores state from storage on init', async () => {
      const storage = {
        load: vi.fn().mockResolvedValue({
          cwd: '/home/researcher/projects',
          history: ['ls', 'cd projects'],
          env: { USER: 'researcher', HOME: '/home/researcher', CUSTOM: 'value' },
          filesystemDelta: {
            home: {
              type: 'dir',
              children: {
                researcher: {
                  type: 'dir',
                  children: {
                    projects: {
                      type: 'dir',
                      children: {
                        'saved.txt': { type: 'file', content: 'saved data' },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        save: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn(),
      }

      const shell = createShell({
        onWrite: vi.fn(),
        onClear: vi.fn(),
        onPrompt: vi.fn(),
        storage,
      })

      await shell.ready

      expect(shell.state.cwd).toBe('/home/researcher/projects')
      expect(shell.state.history).toEqual(['ls', 'cd projects'])
      expect(shell.state.env.CUSTOM).toBe('value')

      // Verify merged filesystem
      const home = shell.state.root.children?.get('home')
      const researcher = home?.children?.get('researcher')
      const projects = researcher?.children?.get('projects')
      expect(projects?.children?.get('saved.txt')?.content).toBe('saved data')

      // Default files should still exist
      expect(researcher?.children?.has('notes.txt')).toBe(true)
    })
  })
})

describe('getCommandNames', () => {
  it('returns all registered command names', () => {
    const names = getCommandNames()
    expect(names).toContain('help')
    expect(names).toContain('ls')
    expect(names).toContain('cd')
    expect(names).toContain('cat')
    expect(names).toContain('scp')
    expect(names).toContain('clear')
    expect(names).toContain('neofetch')
    // New commands
    expect(names).toContain('find')
    expect(names).toContain('sort')
    expect(names).toContain('uniq')
    expect(names).toContain('diff')
    expect(names).toContain('rev')
    expect(names).toContain('nl')
    expect(names).toContain('tr')
    expect(names).toContain('cut')
    expect(names).toContain('fmt')
    expect(names).toContain('seq')
    expect(names).toContain('uptime')
    expect(names).toContain('id')
    expect(names).toContain('groups')
    expect(names).toContain('tty')
    expect(names).toContain('who')
    expect(names).toContain('last')
    expect(names).toContain('ps')
    expect(names).toContain('free')
    expect(names).toContain('df')
    expect(names).toContain('du')
    expect(names).toContain('stat')
    expect(names).toContain('file')
    expect(names).toContain('which')
    expect(names).toContain('type')
    expect(names).toContain('man')
    expect(names).toContain('alias')
    expect(names).toContain('classify')
    expect(names).toContain('clearance')
    expect(names).toContain('incident')
    expect(names).toContain('protocol')
    expect(names).toContain('status')
    expect(names).toContain('audit')
    expect(names).toContain('alert')
    expect(names).toContain('staff')
    expect(names).toContain('strings')
    expect(names).toContain('fold')
  })
})
