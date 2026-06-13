export type TextSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string }

// https://…, www.…, or bare domains like sortedsheep.org / blinkr.sortedsheep.org
const URL_PATTERN =
  /\b(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"']*)?)/gi

function normalizeHref(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('www.')) return `https://${url}`
  return `https://${url}`
}

function splitTrailingPunctuation(url: string): { href: string; trailing: string } {
  let href = url
  let trailing = ''
  while (href.length > 0) {
    const last = href.at(-1)
    if (!last || !/[),.;!?]/.test(last)) break
    if (last === ')' && (href.match(/\(/g)?.length ?? 0) > (href.match(/\)/g)?.length ?? 0)) break
    trailing = last + trailing
    href = href.slice(0, -1)
  }
  return { href, trailing }
}

function isEmailLocalPart(text: string, start: number): boolean {
  return start > 0 && text[start - 1] === '@'
}

export function linkify(text: string): TextSegment[] {
  if (!text) return []

  const segments: TextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0]
    const start = match.index ?? 0
    if (isEmailLocalPart(text, start)) continue
    if (start > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, start) })
    }

    const { href, trailing } = splitTrailingPunctuation(raw)
    if (href) {
      segments.push({ type: 'link', text: href, href: normalizeHref(href) })
    }
    if (trailing) {
      segments.push({ type: 'text', text: trailing })
    }

    lastIndex = start + raw.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: 'text', text }]
}
