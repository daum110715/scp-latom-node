import type { EntryContentResponse } from './crawler'

/**
 * Generate a standalone HTML document for an SCP entry and trigger a download.
 */
export function downloadEntry(
  scpNumber: number,
  lang: 'en' | 'cn',
  data: EntryContentResponse
): void {
  const scpId = `SCP-${String(scpNumber).padStart(3, '0')}`
  const title = data.name ? `${scpId} — ${data.name}` : scpId
  const langLabel = lang === 'en' ? 'English' : '中文'

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --bg-surface: #141419;
      --text: #e8e6e3;
      --text-secondary: #9b9a97;
      --accent: #c9a44a;
      --border: #2a2a2e;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
    }
    .header h1 .id {
      color: var(--accent);
      font-family: 'Courier New', monospace;
    }
    .meta {
      display: flex;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }
    .meta span { display: inline-flex; gap: 0.25rem; }
    .object-class {
      display: inline-block;
      padding: 0.15rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }
    .class-safe { background: #1a3a2a; color: #4ade80; }
    .class-euclid { background: #3a2f1a; color: #facc15; }
    .class-keter { background: #3a1a1a; color: #f87171; }
    .class-thaumiel { background: #1a2a3a; color: #60a5fa; }
    .class-apollyon { background: #3a1a2a; color: #f472b6; }
    .class-neutralized { background: #2a2a2a; color: #9ca3af; }
    .content { line-height: 1.8; }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
      margin: 1.5em 0 0.5em;
      color: var(--text);
    }
    .content p { margin: 0.5em 0; }
    .content ul, .content ol { margin: 0.5em 0 0.5em 1.5em; }
    .content a { color: var(--accent); text-decoration: none; }
    .content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .content th, .content td {
      border: 1px solid var(--border);
      padding: 0.5rem;
      text-align: left;
    }
    .content th { background: var(--bg-surface); }
    .content blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 1rem;
      margin: 1em 0;
      color: var(--text-secondary);
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    ${data.objectClass ? `<span class="object-class class-${data.objectClass.toLowerCase()}">${escapeHtml(data.objectClass)}</span>` : ''}
    <h1><span class="id">${escapeHtml(scpId)}</span>${data.name ? ` — ${escapeHtml(data.name)}` : ''}</h1>
    <div class="meta">
      <span>Language: ${langLabel}</span>
      <span>Source: SCP Foundation Latom Node</span>
      ${data.fetchedAt ? `<span>Cached: ${new Date(data.fetchedAt).toLocaleDateString()}</span>` : ''}
    </div>
  </div>
  <div class="content">${data.content ? sanitizeHtml(data.content) : '<p>No content available.</p>'}</div>
  <div class="footer">
    Downloaded from SCP Foundation Latom Node · ${new Date().toISOString().slice(0, 10)}
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${scpId}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, c => map[c])
}

/**
 * Sanitize HTML content for safe insertion into a standalone document.
 * Removes dangerous URL protocols (javascript:, data:, vbscript:) from
 * href/src/action attributes — defense-in-depth against XSS.
 */
function sanitizeHtml(html: string): string {
  // Neutralize dangerous protocol URLs in quoted attribute values
  let safe = html.replace(
    /\b(href|src|action)\s*=\s*(?:"(javascript|data|vbscript):[^"]*"|'(javascript|data|vbscript):[^']*')/gi,
    (_match, attr) => `${attr}=""`,
  )
  // Handle unquoted values
  safe = safe.replace(
    /\b(href|src|action)\s*=\s*((?:javascript|data|vbscript):[^\s>]+)/gi,
    (_match, attr) => `${attr}=""`,
  )
  return safe
}
