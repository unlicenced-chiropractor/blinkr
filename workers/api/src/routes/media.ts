import type { Env } from '../env'
import { getMedia } from '../services/media-storage'
import { error } from '../utils'

export async function handleMedia(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/media/') || request.method !== 'GET') return null

  const key = path.slice('/media/'.length).split('?')[0]
  if (!key || key.includes('..')) return error('Invalid path', 400)

  const object = await getMedia(env, key)
  if (!object) return error('Not found', 404)

  const headers = new Headers()
  headers.set('Content-Type', object.contentType)
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(object.data, { headers })
}
