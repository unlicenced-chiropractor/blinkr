import type { Env } from '../env'
import { logAuthEvent } from '../services/auth-log'
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
        createdAt: new Date().toISOString(),
      },
    }, 201)
  }

  if (path === '/auth/login' && request.method === 'POST') {
    const body = await request.json<{ username: string; password: string }>()
    const user = await env.DB.prepare(
      'SELECT id, username, display_name, password_hash, avatar_url, created_at FROM users WHERE username = ?',
    )
      .bind(body.username.toLowerCase())
      .first<{
        id: string
        username: string
        display_name: string
        password_hash: string
        avatar_url: string | null
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
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
    })
  }

  if (path === '/auth/avatar' && request.method === 'POST') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const form = await request.formData()
    const image = form.get('avatar') as File | null
    if (!image || !image.type.startsWith('image/')) {
      return error('Valid image file required')
    }
    if (!env.IMAGES) return error('Image storage not configured', 503)

    const ext = image.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const key = `avatars/${userId}.${ext}`
    await env.IMAGES.put(key, image.stream(), {
      httpMetadata: { contentType: image.type },
    })

    const avatarUrl = `/media/${key}`
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

    return json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      createdAt: user.created_at,
    })
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

    return json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      createdAt: user.created_at,
    })
  }

  return null
}
