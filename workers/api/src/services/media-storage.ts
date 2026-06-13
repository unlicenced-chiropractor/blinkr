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
    .bind(key, contentType, data)
    .run()
}

export async function getMedia(
  env: Env,
  key: string,
): Promise<{ contentType: string; data: ArrayBuffer } | null> {
  if (isB2Enabled(env)) {
    return getB2Object(env, key)
  }

  const row = await env.DB.prepare(
    'SELECT content_type, data FROM media_blobs WHERE key = ?',
  )
    .bind(key)
    .first<{ content_type: string; data: ArrayBuffer }>()

  if (!row) return null
  return { contentType: row.content_type, data: row.data }
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
