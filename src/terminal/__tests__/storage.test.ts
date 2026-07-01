import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFilesystem, type FSNode } from '../filesystem'
import {
  serializeFSNode,
  deserializeFSNode,
  computeFSDelta,
  mergeFilesystemDelta,
  type SerializedFSDelta,
  type PersistedState,
  type TerminalStorage,
  createDebouncedSave,
} from '../storage'

// ── Serialization ──

describe('serializeFSNode', () => {
  it('serializes a file node', () => {
    const node: FSNode = { type: 'file', name: 'test.txt', content: 'hello' }
    const result = serializeFSNode(node)
    expect(result).toEqual({ type: 'file', content: 'hello' })
  })

  it('serializes a file node with empty content', () => {
    const node: FSNode = { type: 'file', name: 'empty.txt', content: '' }
    const result = serializeFSNode(node)
    expect(result).toEqual({ type: 'file', content: '' })
  })

  it('serializes a directory with children', () => {
    const dir: FSNode = {
      type: 'dir',
      name: 'root',
      children: new Map([
        ['a.txt', { type: 'file', name: 'a.txt', content: 'aaa' }],
        ['b.txt', { type: 'file', name: 'b.txt', content: 'bbb' }],
      ]),
    }
    const result = serializeFSNode(dir)
    expect(result).toEqual({
      type: 'dir',
      children: {
        'a.txt': { type: 'file', content: 'aaa' },
        'b.txt': { type: 'file', content: 'bbb' },
      },
    })
  })

  it('serializes nested directories', () => {
    const root: FSNode = {
      type: 'dir',
      name: '/',
      children: new Map([
        [
          'sub',
          {
            type: 'dir',
            name: 'sub',
            children: new Map([['deep.txt', { type: 'file', name: 'deep.txt', content: 'deep' }]]),
          },
        ],
      ]),
    }
    const result = serializeFSNode(root)
    expect(result).toEqual({
      type: 'dir',
      children: {
        sub: {
          type: 'dir',
          children: {
            'deep.txt': { type: 'file', content: 'deep' },
          },
        },
      },
    })
  })

  it('serializes an empty directory', () => {
    const dir: FSNode = { type: 'dir', name: 'empty', children: new Map() }
    const result = serializeFSNode(dir)
    expect(result).toEqual({ type: 'dir', children: {} })
  })
})

// ── Deserialization ──

describe('deserializeFSNode', () => {
  it('deserializes a file node', () => {
    const data = { type: 'file' as const, content: 'hello' }
    const result = deserializeFSNode('test.txt', data)
    expect(result).toEqual({ type: 'file', name: 'test.txt', content: 'hello' })
  })

  it('deserializes a directory with children', () => {
    const data = {
      type: 'dir' as const,
      children: {
        'a.txt': { type: 'file' as const, content: 'aaa' },
      },
    }
    const result = deserializeFSNode('root', data)
    expect(result.type).toBe('dir')
    expect(result.name).toBe('root')
    expect(result.children).toBeInstanceOf(Map)
    expect(result.children?.get('a.txt')).toEqual({ type: 'file', name: 'a.txt', content: 'aaa' })
  })

  it('roundtrips through serialize and deserialize', () => {
    const original = createFilesystem()
    const serialized = serializeFSNode(original)
    const restored = deserializeFSNode('/', serialized)

    // Check top-level structure
    expect(restored.type).toBe('dir')
    expect(restored.children?.has('etc')).toBe(true)
    expect(restored.children?.has('scp')).toBe(true)

    // Check nested file
    const etc = restored.children?.get('etc')
    expect(etc?.children?.get('hostname')?.content).toBe('LATOM-7\n')
  })
})

// ── Delta Computation ──

describe('computeFSDelta', () => {
  it('returns empty delta for identical trees', () => {
    const root = createFilesystem()
    const delta = computeFSDelta(root, root)
    expect(delta).toEqual({})
  })

  it('detects user-added files', () => {
    const current = createFilesystem()
    const defaultTree = createFilesystem()

    // Add a new file to /home/researcher
    const home = current.children?.get('home')
    const researcher = home?.children?.get('researcher')
    if (researcher?.children) {
      researcher.children.set('user-file.txt', {
        type: 'file',
        name: 'user-file.txt',
        content: 'user content',
      })
    }

    const delta = computeFSDelta(current, defaultTree)
    // Delta is nested: home -> researcher -> user-file.txt
    const researcherDelta = delta.home?.children?.researcher
    expect(researcherDelta?.children?.['user-file.txt']).toEqual({
      type: 'file',
      content: 'user content',
    })
  })

  it('detects user-added directories', () => {
    const current = createFilesystem()
    const defaultTree = createFilesystem()

    // Add a new directory to /home/researcher
    const home = current.children?.get('home')
    const researcher = home?.children?.get('researcher')
    if (researcher?.children) {
      researcher.children.set('mydir', {
        type: 'dir',
        name: 'mydir',
        children: new Map(),
      })
    }

    const delta = computeFSDelta(current, defaultTree)
    const researcherDelta = delta.home?.children?.researcher
    expect(researcherDelta?.children?.['mydir']).toEqual({
      type: 'dir',
      children: {},
    })
  })

  it('detects modified file content', () => {
    const current = createFilesystem()
    const defaultTree = createFilesystem()

    // Modify an existing file
    const home = current.children?.get('home')
    const researcher = home?.children?.get('researcher')
    const notes = researcher?.children?.get('notes.txt')
    if (notes) {
      notes.content = 'modified content'
    }

    const delta = computeFSDelta(current, defaultTree)
    const researcherDelta = delta.home?.children?.researcher
    expect(researcherDelta?.children?.['notes.txt']).toEqual({
      type: 'file',
      content: 'modified content',
    })
  })

  it('detects deleted nodes', () => {
    const current = createFilesystem()
    const defaultTree = createFilesystem()

    // Delete a file from /home/researcher
    const home = current.children?.get('home')
    const researcher = home?.children?.get('researcher')
    researcher?.children?.delete('notes.txt')

    const delta = computeFSDelta(current, defaultTree)
    const researcherDelta = delta.home?.children?.researcher
    expect(researcherDelta?.children?.['notes.txt']).toEqual({ type: 'dir', deleted: true })
  })

  it('does not include unchanged files in delta', () => {
    const current = createFilesystem()
    const defaultTree = createFilesystem()

    // Add one new file
    const home = current.children?.get('home')
    const researcher = home?.children?.get('researcher')
    if (researcher?.children) {
      researcher.children.set('new.txt', { type: 'file', name: 'new.txt', content: 'new' })
    }

    const delta = computeFSDelta(current, defaultTree)
    const researcherDelta = delta.home?.children?.researcher
    // Only the new file should be in the delta, not existing files
    expect(researcherDelta?.children?.['notes.txt']).toBeUndefined()
    expect(researcherDelta?.children?.['.bashrc']).toBeUndefined()
    expect(researcherDelta?.children?.['new.txt']).toBeDefined()
  })
})

// ── Delta Merge ──

describe('mergeFilesystemDelta', () => {
  it('applies user-added files to default tree', () => {
    const defaultTree = createFilesystem()
    const delta: SerializedFSDelta = {
      home: {
        type: 'dir',
        children: {
          researcher: {
            type: 'dir',
            children: {
              'user-file.txt': { type: 'file', content: 'user content' },
            },
          },
        },
      },
    }

    const merged = mergeFilesystemDelta(defaultTree, delta)
    const home = merged.children?.get('home')
    const researcher = home?.children?.get('researcher')
    const userFile = researcher?.children?.get('user-file.txt')
    expect(userFile).toBeDefined()
    expect(userFile?.content).toBe('user content')

    // Default files should still exist
    expect(researcher?.children?.has('notes.txt')).toBe(true)
  })

  it('applies deleted nodes from delta', () => {
    const defaultTree = createFilesystem()
    const delta: SerializedFSDelta = {
      home: {
        type: 'dir',
        children: {
          researcher: {
            type: 'dir',
            children: {
              'notes.txt': { type: 'file', deleted: true },
            },
          },
        },
      },
    }

    const merged = mergeFilesystemDelta(defaultTree, delta)
    const home = merged.children?.get('home')
    const researcher = home?.children?.get('researcher')
    expect(researcher?.children?.has('notes.txt')).toBe(false)
    // Other files should remain
    expect(researcher?.children?.has('.bashrc')).toBe(true)
  })

  it('preserves default tree when delta is empty', () => {
    const defaultTree = createFilesystem()
    const merged = mergeFilesystemDelta(defaultTree, {})

    expect(merged.children?.has('etc')).toBe(true)
    expect(merged.children?.has('scp')).toBe(true)
    expect(merged.children?.has('home')).toBe(true)
  })

  it('does not mutate the default tree', () => {
    const defaultTree = createFilesystem()
    const etcBefore = defaultTree.children?.get('etc')?.children?.get('hostname')?.content

    const delta: SerializedFSDelta = {
      home: {
        type: 'dir',
        children: {
          researcher: {
            type: 'dir',
            children: {
              'new.txt': { type: 'file', content: 'new' },
            },
          },
        },
      },
    }

    mergeFilesystemDelta(defaultTree, delta)

    // Default tree should be unchanged
    const etcAfter = defaultTree.children?.get('etc')?.children?.get('hostname')?.content
    expect(etcAfter).toBe(etcBefore)
  })

  it('full roundtrip: compute delta then merge', () => {
    const defaultTree = createFilesystem()
    const modified = createFilesystem()

    // Make changes
    const modHome = modified.children?.get('home')
    const modResearcher = modHome?.children?.get('researcher')
    if (modResearcher?.children) {
      modResearcher.children.set('test.txt', { type: 'file', name: 'test.txt', content: 'test' })
      modResearcher.children.delete('notes.txt')
    }

    // Compute delta
    const delta = computeFSDelta(modified, defaultTree)

    // Merge delta onto fresh default
    const merged = mergeFilesystemDelta(defaultTree, delta)

    // Verify merged tree matches modified tree
    const mHome = merged.children?.get('home')
    const mResearcher = mHome?.children?.get('researcher')
    expect(mResearcher?.children?.has('test.txt')).toBe(true)
    expect(mResearcher?.children?.get('test.txt')?.content).toBe('test')
    expect(mResearcher?.children?.has('notes.txt')).toBe(false)
  })
})

// ── Debounced Save ──

describe('createDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('debounces save calls', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const storage: TerminalStorage = { load: vi.fn(), save, clear: vi.fn() }
    const getState = vi.fn().mockReturnValue({
      cwd: '/home/researcher',
      history: [],
      env: {},
      filesystemDelta: {},
    })

    const debounced = createDebouncedSave(storage, getState, 500)

    debounced()
    debounced()
    debounced()

    expect(save).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    // Wait for the microtask
    await vi.runAllTimersAsync()

    expect(save).toHaveBeenCalledTimes(1)
  })
})
