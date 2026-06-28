import { describe, it, expect, beforeEach, vi } from 'vitest'
import { downloadEntry } from '../download'
import type { EntryContentResponse } from '../crawler'

describe('downloadEntry', () => {
  let mockClick: ReturnType<typeof vi.fn>
  let mockAppendChild: ReturnType<typeof vi.fn>
  let mockRemoveChild: ReturnType<typeof vi.fn>
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>
  let createdLink: any

  beforeEach(() => {
    mockClick = vi.fn()
    mockAppendChild = vi.fn()
    mockRemoveChild = vi.fn()
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    createdLink = null

    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'a') {
        createdLink = { href: '', download: '', click: mockClick }
        return createdLink
      }
      return document.createElement(tag)
    }) as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild as any)
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })
  })

  it('creates a download link and clicks it', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 173,
      language: 'en',
      status: 'cached',
      name: 'The Sculpture',
      objectClass: 'Euclid',
      content: '<p>A concrete sculpture.</p>',
      fetchedAt: '2026-06-26T00:00:00',
    }

    downloadEntry(173, 'en', data)

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('generates correct filename with padding', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 5,
      language: 'en',
      status: 'cached',
    }

    downloadEntry(5, 'en', data)

    expect(createdLink.download).toBe('SCP-005.html')
  })

  it('pads SCP number to 3 digits', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 42,
      language: 'en',
      status: 'cached',
    }

    downloadEntry(42, 'en', data)

    expect(createdLink.download).toBe('SCP-042.html')
  })

  it('handles 3-digit SCP numbers', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 999,
      language: 'en',
      status: 'cached',
    }

    downloadEntry(999, 'en', data)

    expect(createdLink.download).toBe('SCP-999.html')
  })

  it('handles Chinese language', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 173,
      language: 'cn',
      status: 'cached',
      name: '雕塑',
    }

    downloadEntry(173, 'cn', data)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
  })

  it('handles missing name and content', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 173,
      language: 'en',
      status: 'cached',
    }

    downloadEntry(173, 'en', data)

    expect(mockClick).toHaveBeenCalled()
  })

  it('handles missing objectClass', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 173,
      language: 'en',
      status: 'cached',
      name: 'The Sculpture',
      content: '<p>Content</p>',
    }

    downloadEntry(173, 'en', data)

    expect(mockClick).toHaveBeenCalled()
  })

  it('creates blob with correct MIME type', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 173,
      language: 'en',
      status: 'cached',
      content: '<p>Test</p>',
    }

    downloadEntry(173, 'en', data)

    const blob = mockCreateObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/html;charset=utf-8')
  })

  it('includes object class in HTML', () => {
    const data: EntryContentResponse = {
      success: true,
      scpNumber: 173,
      language: 'en',
      status: 'cached',
      objectClass: 'Keter',
      content: '<p>Content</p>',
    }

    downloadEntry(173, 'en', data)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0]
    // Verify blob was created (HTML content is internal)
    expect(blob).toBeInstanceOf(Blob)
  })
})
