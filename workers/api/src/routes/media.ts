import type { Env } from '../env'
import { error } from '../utils'

export async function handleMedia(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/media/') || request.method !== 'GET') return null

  const key = path.slice('/media/'.length)
  if (!key || key.includes('..')) return error('Invalid path', 400)

  if (!env.IMAGES) return error('Image storage not configured', 503)

  const object = await env.IMAGES.get(key)
  if (!object) return error('Not found', 404)

  const headers = new Headers()
  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream'
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(object.body, { headers })
}
