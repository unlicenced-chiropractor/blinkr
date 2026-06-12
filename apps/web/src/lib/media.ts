const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  let normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized.startsWith('/images/')) {
    normalized = `/media/${normalized.slice('/images/'.length)}`
  }
  if (API_BASE === '/api') return `${API_BASE}${normalized}`
  return `${API_BASE.replace(/\/$/, '')}${normalized}`
}
