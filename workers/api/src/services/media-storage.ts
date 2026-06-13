import type { Env } from '../env'
import { getB2Object, isB2Enabled, putB2Object } from './b2-storage'
import { error } from '../utils'

export const MAX_AVATAR_BYTES = 512 * 1024
export const MAX_MESSAGE_IMAGE_BYTES = 1024 * 1024

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (IMAGE_EXT.test(file.name)) return true
  return file.type === '' || file.type === 'application/octet-stream'
}

/** D1 BLOB columns may come back as ArrayBuffer, typed arrays, or comma-separated strings. */
function blobAsBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data)
  }
  if (typeof data === 'string') {
    if (/^\d+(,\d+)*$/.test(data)) {
      return new Uint8Array(data.split(',').map((n) => Number(n)))
    }
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  throw new Error('Invalid blob data from storage')
}

async function getD1Media(
  env: Env,
  key: string,
): Promise<{ contentType: string; data: Uint8Array } | null> {
  const row = await env.DB.prepare(
    'SELECT content_type, data FROM media_blobs WHERE key = ?',
  )
    .bind(key)
    .first<{ content_type: string; data: unknown }>()

  if (!row) return null
  return { contentType: row.content_type, data: blobAsBytes(row.data) }
}

async function getFallbackMedia(
  env: Env,
  key: string,
): Promise<{ contentType: string; data: Uint8Array } | null> {
  const origin = env.MEDIA_FALLBACK_ORIGIN?.replace(/\/$/, '')
  if (!origin) return null

  const res = await fetch(`${origin}/media/${key}`)
  if (!res.ok) return null

  return {
    contentType: res.headers.get('Content-Type') ?? 'application/octet-stream',
    data: new Uint8Array(await res.arrayBuffer()),
  }
}

export async function putMedia(
  env: Env,
  key: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  if (isB2Enabled(env)) {
    await putB2Object(env, key, data, contentType)
    return
  }

  await env.DB.prepare(`
    INSERT INTO media_blobs (key, content_type, data, created_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      content_type = excluded.content_type,
      data = excluded.data,
      created_at = excluded.created_at
  `)
    .bind(key, contentType, new Uint8Array(data))
    .run()
}

export async function getMedia(
  env: Env,
  key: string,
): Promise<{ contentType: string; data: Uint8Array } | null> {
  if (isB2Enabled(env)) {
    try {
      const b2 = await getB2Object(env, key)
      if (b2) return { contentType: b2.contentType, data: new Uint8Array(b2.data) }
    } catch {
      // Fall through to D1 / remote fallback
    }
  }

  const d1 = await getD1Media(env, key)
  if (d1) return d1

  return getFallbackMedia(env, key)
}

export async function readImageFile(
  file: File,
  maxBytes: number,
): Promise<{ data: ArrayBuffer; contentType: string } | Response> {
  if (!isImageFile(file)) {
    return error('Valid image file required')
  }
  if (file.size > maxBytes) {
    return error(`Image must be under ${Math.floor(maxBytes / 1024)}KB — try a smaller photo`)
  }
  const contentType = file.type.startsWith('image/') ? file.type : 'image/jpeg'
  return { data: await file.arrayBuffer(), contentType }
}

export function mediaPath(key: string): string {
  return `/media/${key}`
}

export function mediaStorageBackend(env: Env): 'b2' | 'd1' {
  return isB2Enabled(env) ? 'b2' : 'd1'
}
