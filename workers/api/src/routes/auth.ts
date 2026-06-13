import type { Env } from '../env'
import { logAuthEvent } from '../services/auth-log'
import {
  MAX_AVATAR_BYTES,
  mediaPath,
  putMedia,
  readImageFile,
} from '../services/media-storage'
import { error, getUserId, hashPassword, id, json, signToken, verifyPassword } from '../utils'

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === '/auth/register' && request.method === 'POST') {
    const body = await request.json<{ username: string; displayName: string; password: string }>()
    if (!body.username || !body.displayName || !body.password) {
      return error('Missing fields')
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(body.username)) {
      return error('Invalid username')
    }
    if (body.password.length < 8) {
      return error('Password must be at least 8 characters')
    }

    const userId = id()
    const passwordHash = await hashPassword(body.password)

    try {
      await env.DB.prepare(
        'INSERT INTO users (id, username, display_name, password_hash) VALUES (?, ?, ?, ?)',
      )
        .bind(userId, body.username.toLowerCase(), body.displayName, passwordHash)
        .run()
    } catch {
      return error('Username already taken', 409)
    }

    await logAuthEvent(env, request, {
      type: 'register',
      userId,
      username: body.username.toLowerCase(),
    })

    const token = await signToken(userId, env.JWT_SECRET)
    return json({
      token,
      user: {
        id: userId,
        username: body.username.toLowerCase(),
        displayName: body.displayName,
        avatarUrl: null,
        bio: null,
        createdAt: new Date().toISOString(),
      },
    }, 201)
  }

  if (path === '/auth/login' && request.method === 'POST') {
    const body = await request.json<{ username: string; password: string }>()
    const user = await env.DB.prepare(
      'SELECT id, username, display_name, password_hash, avatar_url, bio, created_at FROM users WHERE username = ?',
    )
      .bind(body.username.toLowerCase())
      .first<{
        id: string
        username: string
        display_name: string
        password_hash: string
        avatar_url: string | null
        bio: string | null
        created_at: string
      }>()

    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      await logAuthEvent(env, request, {
        type: 'login_failed',
        username: body.username.toLowerCase(),
      })
      return error('Invalid credentials', 401)
    }

    await logAuthEvent(env, request, {
      type: 'login',
      userId: user.id,
      username: user.username,
    })

    const token = await signToken(user.id, env.JWT_SECRET)
    return json({
      token,
      user: formatUser(user),
    })
  }

  if (path === '/auth/avatar' && request.method === 'POST') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const form = await request.formData()
    const image = form.get('avatar') as File | null
    if (!image) return error('Valid image file required')

    const parsed = await readImageFile(image, MAX_AVATAR_BYTES)
    if (parsed instanceof Response) return parsed

    const key = `avatars/${userId}`
    await putMedia(env, key, parsed.data, parsed.contentType)

    const avatarUrl = `${mediaPath(key)}?v=${Date.now()}`
    await env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
      .bind(avatarUrl, userId)
      .run()

    const user = await env.DB.prepare(
      'SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE id = ?',
    )
      .bind(userId)
      .first<{
        id: string
        username: string
        display_name: string
        avatar_url: string | null
        bio: string | null
        created_at: string
      }>()

    if (!user) return error('User not found', 404)

    return json(formatUser(user))
  }

  if (path === '/auth/me' && request.method === 'GET') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const user = await env.DB.prepare(
      'SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE id = ?',
    )
      .bind(userId)
      .first<{
        id: string
        username: string
        display_name: string
        avatar_url: string | null
        bio: string | null
        created_at: string
      }>()

    if (!user) return error('User not found', 404)

    return json(formatUser(user))
  }

  if (path === '/auth/profile' && request.method === 'PATCH') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const body = await request.json<{ displayName?: string; bio?: string | null }>()
    const updates: string[] = []
    const values: unknown[] = []

    if (body.displayName !== undefined) {
      const name = body.displayName.trim()
      if (name.length < 1 || name.length > 50) {
        return error('Display name must be 1–50 characters')
      }
      updates.push('display_name = ?')
      values.push(name)
    }

    if (body.bio !== undefined) {
      const bio = body.bio === null ? null : body.bio.trim()
      if (bio && bio.length > 160) {
        return error('Bio must be 160 characters or less')
      }
      updates.push('bio = ?')
      values.push(bio || null)
    }

    if (!updates.length) return error('Nothing to update')

    values.push(userId)
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    const user = await env.DB.prepare(
      'SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE id = ?',
    )
      .bind(userId)
      .first<{
        id: string
        username: string
        display_name: string
        avatar_url: string | null
        bio: string | null
        created_at: string
      }>()

    if (!user) return error('User not found', 404)

    return json(formatUser(user))
  }

  return null
}

function formatUser(user: {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    createdAt: user.created_at,
  }
}
