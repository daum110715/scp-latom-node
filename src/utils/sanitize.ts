import DOMPurify from 'dompurify'

/**
 * Sanitize HTML to prevent XSS attacks.
 * Strips dangerous tags (script, iframe, object, etc.) and event handlers
 * while preserving safe HTML structure for v-html rendering.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'mark',
      'small',
      'sub',
      'sup',
      'a',
      'code',
      'pre',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
      'img',
      'figure',
      'figcaption',
      'dl',
      'dt',
      'dd',
      'abbr',
      'cite',
      'q',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'class',
      'id',
      'src',
      'alt',
      'width',
      'height',
      'title',
      'colspan',
      'rowspan',
      'start',
      'type',
      'value',
    ],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Escape HTML entities in a string.
 * Use this before regex-based markdown-to-HTML conversion to prevent
 * raw HTML in the source from being rendered.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
