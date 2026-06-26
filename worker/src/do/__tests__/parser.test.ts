import { describe, it, expect } from 'vitest'
import { parseScpIndexPage, SERIES_PAGES, getWikiBaseUrl } from '../parser'

describe('parseScpIndexPage', () => {
  const baseUrl = 'https://scp-wiki.wikidot.com'

  it('parses a simple list of SCP entries', () => {
    const html = `
      <div id="page-content">
        <p><a href="/scp-173">SCP-173</a> - Object Class: Euclid</p>
        <p><a href="/scp-682">SCP-682</a> - Object Class: Keter</p>
        <p><a href="/scp-999">SCP-999</a> - Object Class: Safe</p>
      </div>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(3)
    expect(result.errors).toHaveLength(0)

    expect(result.entries[0].scpNumber).toBe(173)
    expect(result.entries[0].objectClass).toBe('Euclid')
    expect(result.entries[0].url).toBe('https://scp-wiki.wikidot.com/scp-173')
    expect(result.entries[0].series).toBe(1)

    expect(result.entries[1].scpNumber).toBe(682)
    expect(result.entries[1].objectClass).toBe('Keter')
    expect(result.entries[1].series).toBe(1)

    expect(result.entries[2].scpNumber).toBe(999)
    expect(result.entries[2].objectClass).toBe('Safe')
    expect(result.entries[2].series).toBe(1)
  })

  it('extracts names from link text with dash separator', () => {
    const html = `
      <p><a href="/scp-173">SCP-173 - The Sculpture</a> - Object Class: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('The Sculpture')
  })

  it('extracts names from text after the link', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - The Sculpture - Object Class: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('The Sculpture')
  })

  it('handles object class wrapped in styled tags', () => {
    const html = `
      <p><a href="/scp-682">SCP-682</a> - Object Class: <span style="color:red">Keter</span></p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Keter')
  })

  it('handles object class in strong tags', () => {
    const html = `
      <p><a href="/scp-999">SCP-999</a> - <strong>Object Class:</strong> Safe</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Safe')
  })

  it('deduplicates entries by SCP number', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - Object Class: Euclid</p>
      <p><a href="/scp-173">SCP-173 - The Sculpture</a> - Object Class: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
  })

  it('assigns correct series numbers', () => {
    const html = `
      <p><a href="/scp-1">SCP-1</a> - Object Class: Safe</p>
      <p><a href="/scp-1000">SCP-1000</a> - Object Class: Safe</p>
      <p><a href="/scp-2000">SCP-2000</a> - Object Class: Safe</p>
      <p><a href="/scp-5000">SCP-5000</a> - Object Class: Safe</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en', seriesHint: 0 })

    expect(result.entries[0].series).toBe(1)
    expect(result.entries[1].series).toBe(2)
    expect(result.entries[2].series).toBe(3)
    expect(result.entries[3].series).toBe(6)
  })

  it('uses seriesHint when provided', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - Object Class: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en', seriesHint: 3 })

    expect(result.entries[0].series).toBe(3)
  })

  it('handles Chinese object class "等级"', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 等级: Euclid</p>
    `
    const result = parseScpIndexPage(html, {
      baseUrl: 'https://scp-wiki-cn.wikidot.com',
      language: 'cn',
    })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Euclid')
  })

  it('handles full URLs in href', () => {
    const html = `
      <p><a href="https://scp-wiki.wikidot.com/scp-173">SCP-173</a> - Object Class: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].url).toBe('https://scp-wiki.wikidot.com/scp-173')
  })

  it('handles SCP numbers with suffixes', () => {
    const html = `
      <p><a href="/scp-500-j">SCP-500-J</a> - Object Class: Safe</p>
      <p><a href="/scp-001-ex">SCP-001-EX</a> - Object Class: Explained</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].scpNumber).toBe(500)
    expect(result.entries[1].scpNumber).toBe(1)
  })

  it('returns empty array for HTML with no SCP links', () => {
    const html = '<div><p>No SCPs here</p></div>'
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles unknown object classes gracefully', () => {
    const html = `
      <p><a href="/scp-9999">SCP-9999</a> - Object Class: Thaumiel</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Thaumiel')
  })

  it('marks unknown class when no class found', () => {
    const html = `
      <p><a href="/scp-173">SCP-173 - The Sculpture</a></p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Unknown')
  })

  it('builds correct URLs for Chinese wiki', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 等级: Euclid</p>
    `
    const result = parseScpIndexPage(html, {
      baseUrl: 'https://scp-wiki-cn.wikidot.com',
      language: 'cn',
    })

    expect(result.entries[0].url).toBe('https://scp-wiki-cn.wikidot.com/scp-173')
  })

  it('handles a realistic page with many entries', () => {
    const entries = Array.from({ length: 100 }, (_, i) => {
      const num = i + 1
      const cls = ['Safe', 'Euclid', 'Keter'][i % 3]
      return `<p><a href="/scp-${num}">SCP-${num}</a> - Object Class: ${cls}</p>`
    }).join('\n')

    const html = `<div id="page-content">${entries}</div>`
    const result = parseScpIndexPage(html, { baseUrl, language: 'en', seriesHint: 1 })

    expect(result.entries).toHaveLength(100)
    expect(result.entries.every((e) => e.series === 1)).toBe(true)
  })

  it('does not match CN "等级" pattern when language is EN', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 等级: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl, language: 'en' })

    expect(result.entries).toHaveLength(1)
    // EN parser should not find "等级" as class marker
    expect(result.entries[0].objectClass).toBe('Unknown')
  })
})

describe('parseScpIndexPage — CN configuration', () => {
  const cnBaseUrl = 'https://scp-wiki-cn.wikidot.com'

  it('parses CN entries with "等级" class marker', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 等级: Euclid</p>
      <p><a href="/scp-682">SCP-682</a> - 等级: Keter</p>
      <p><a href="/scp-999">SCP-999</a> - 等级: Safe</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(3)
    expect(result.entries[0].objectClass).toBe('Euclid')
    expect(result.entries[1].objectClass).toBe('Keter')
    expect(result.entries[2].objectClass).toBe('Safe')
  })

  it('handles CN full-width colon "等级："', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 等级：Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Euclid')
  })

  it('normalizes Chinese class names to English', () => {
    const html = `
      <p><a href="/scp-1">SCP-1</a> - 等级: 已解除</p>
      <p><a href="/scp-2">SCP-2</a> - 等级: 无效化</p>
      <p><a href="/scp-3">SCP-3</a> - 等级: 未收容</p>
      <p><a href="/scp-4">SCP-4</a> - 等级: 待分级</p>
      <p><a href="/scp-5">SCP-5</a> - 等级: 已解释</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(5)
    expect(result.entries[0].objectClass).toBe('Neutralized')
    expect(result.entries[1].objectClass).toBe('Neutralized')
    expect(result.entries[2].objectClass).toBe('Uncontained')
    expect(result.entries[3].objectClass).toBe('Pending')
    expect(result.entries[4].objectClass).toBe('Explained')
  })

  it('handles CN class in styled tags', () => {
    const html = `
      <p><a href="/scp-682">SCP-682</a> - 等级: <span style="color:red">Keter</span></p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].objectClass).toBe('Keter')
  })

  it('does not match EN "Object Class" pattern when language is CN', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - Object Class: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(1)
    // CN parser should not find "Object Class" as class marker
    expect(result.entries[0].objectClass).toBe('Unknown')
  })

  it('extracts names from CN link text', () => {
    const html = `
      <p><a href="/scp-173">SCP-173 - 雕塑</a> - 等级: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('雕塑')
  })

  it('extracts names from text after CN link', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 雕塑 - 等级: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('雕塑')
  })

  it('builds correct URLs for CN wiki', () => {
    const html = `
      <p><a href="/scp-173">SCP-173</a> - 等级: Euclid</p>
    `
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn' })

    expect(result.entries[0].url).toBe('https://scp-wiki-cn.wikidot.com/scp-173')
  })

  it('handles a realistic CN page with many entries', () => {
    const classes = ['Safe', 'Euclid', 'Keter']
    const entries = Array.from({ length: 50 }, (_, i) => {
      const num = i + 1
      const cls = classes[i % 3]
      return `<p><a href="/scp-${num}">SCP-${num}</a> - 等级: ${cls}</p>`
    }).join('\n')

    const html = `<div id="page-content">${entries}</div>`
    const result = parseScpIndexPage(html, { baseUrl: cnBaseUrl, language: 'cn', seriesHint: 1 })

    expect(result.entries).toHaveLength(50)
    expect(result.entries.every((e) => e.series === 1)).toBe(true)
    expect(result.entries.every((e) => e.url.startsWith(cnBaseUrl))).toBe(true)
  })
})

describe('SERIES_PAGES', () => {
  it('has 8 series pages', () => {
    expect(SERIES_PAGES).toHaveLength(8)
  })

  it('starts with scp-series', () => {
    expect(SERIES_PAGES[0]).toBe('scp-series')
  })

  it('ends with scp-series-8', () => {
    expect(SERIES_PAGES[7]).toBe('scp-series-8')
  })
})

describe('getWikiBaseUrl', () => {
  it('returns English wiki URL for en', () => {
    expect(getWikiBaseUrl('en')).toBe('https://scp-wiki.wikidot.com')
  })

  it('returns Chinese wiki URL for cn', () => {
    expect(getWikiBaseUrl('cn')).toBe('https://scp-wiki-cn.wikidot.com')
  })
})
