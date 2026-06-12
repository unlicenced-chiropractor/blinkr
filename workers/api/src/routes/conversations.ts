import type { Env } from '../env'
import { error, getUserId, id, json } from '../utils'

async function formatMessage(env: Env, row: Record<string, unknown>) {
  const { results: reactions } = await env.DB.prepare(
    'SELECT emoji, user_id FROM message_reactions WHERE message_id = ?',
  )
    .bind(row.id)
    .all<{ emoji: string; user_id: string }>()

  const reactionMap = new Map<string, string[]>()
  for (const r of reactions) {
    const list = reactionMap.get(r.emoji) ?? []
    list.push(r.user_id)
    reactionMap.set(r.emoji, list)
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type,
    imageUrl: row.image_url,
    replyToId: row.reply_to_id,
    reactions: Array.from(reactionMap.entries()).map(([emoji, userIds]) => ({ emoji, userIds })),
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  }
}

export async function handleConversations(request: Request, env: Env, path: string): Promise<Response | null> {
  const userId = await getUserId(request, env)
  if (!userId) return error('Unauthorized', 401)

  if (path === '/conversations' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT c.id, c.type, c.name, c.icon_url, c.last_message_at, c.created_at
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE cm.user_id = ?
      ORDER BY c.last_message_at DESC NULLS LAST
    `).bind(userId).all()

    const conversations = []
    for (const c of results) {
      const { results: members } = await env.DB.prepare(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ?',
      )
        .bind(c.id)
        .all<{ user_id: string }>()

      conversations.push({
        id: c.id,
        type: c.type,
        name: c.name,
        iconUrl: c.icon_url,
        memberIds: members.map((m) => m.user_id),
        lastMessageAt: c.last_message_at,
        createdAt: c.created_at,
      })
    }

    return json(conversations)
  }

  const messagesMatch = path.match(/^\/conversations\/([^/]+)\/messages$/)
  if (messagesMatch && request.method === 'GET') {
    const conversationId = messagesMatch[1]
    const { results } = await env.DB.prepare(`
      SELECT m.* FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.conversation_id = ? AND cm.user_id = ?
      ORDER BY m.created_at ASC
    `)
      .bind(conversationId, userId)
      .all()

    const messages = []
    for (const row of results) {
      messages.push(await formatMessage(env, row))
    }
    return json(messages)
  }

  if (messagesMatch && request.method === 'POST') {
    const conversationId = messagesMatch[1]
    const body = await request.json<{ content: string; replyToId?: string }>()
    const messageId = id()
    const now = new Date().toISOString()

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, content, reply_to_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(messageId, conversationId, userId, body.content, body.replyToId ?? null, now),
      env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
        .bind(now, conversationId),
    ])

    const message = await formatMessage(env, {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      content: body.content,
      type: 'text',
      image_url: null,
      reply_to_id: body.replyToId ?? null,
      edited_at: null,
      deleted_at: null,
      created_at: now,
    })

    const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(conversationId))
    await room.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'message', message }),
    }))

    return json(message, 201)
  }

  const imageMatch = path.match(/^\/conversations\/([^/]+)\/messages\/image$/)
  if (imageMatch && request.method === 'POST') {
    const conversationId = imageMatch[1]
    const form = await request.formData()
    const image = form.get('image') as File | null
    const caption = (form.get('caption') as string) ?? ''

    if (!image) return error('No image provided')

    const imageId = id()
    const ext = image.name.split('.').pop() ?? 'jpg'
    const key = `images/${conversationId}/${imageId}.${ext}`
    await env.IMAGES.put(key, image.stream(), {
      httpMetadata: { contentType: image.type },
    })

    const messageId = id()
    const now = new Date().toISOString()
    const imageUrl = `/images/${key}`

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, content, type, image_url, created_at)
        VALUES (?, ?, ?, ?, 'image', ?, ?)
      `).bind(messageId, conversationId, userId, caption, imageUrl, now),
      env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
        .bind(now, conversationId),
    ])

    const message = await formatMessage(env, {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      content: caption,
      type: 'image',
      image_url: imageUrl,
      reply_to_id: null,
      edited_at: null,
      deleted_at: null,
      created_at: now,
    })

    const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(conversationId))
    await room.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'message', message }),
    }))

    return json(message, 201)
  }

  const messageMatch = path.match(/^\/conversations\/([^/]+)\/messages\/([^/]+)$/)
  if (messageMatch) {
    const [, conversationId, messageId] = messageMatch

    if (request.method === 'PATCH') {
      const body = await request.json<{ content: string }>()
      const now = new Date().toISOString()
      await env.DB.prepare(
        'UPDATE messages SET content = ?, edited_at = ? WHERE id = ? AND sender_id = ?',
      )
        .bind(body.content, now, messageId, userId)
        .run()

      const row = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first()
      if (!row) return error('Message not found', 404)
      const message = await formatMessage(env, row)

      const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(conversationId))
      await room.fetch(new Request('https://internal/broadcast', {
        method: 'POST',
        body: JSON.stringify({ type: 'message_updated', message }),
      }))

      return json(message)
    }

    if (request.method === 'DELETE') {
      const now = new Date().toISOString()
      await env.DB.prepare(
        'UPDATE messages SET deleted_at = ?, content = ? WHERE id = ? AND sender_id = ?',
      )
        .bind(now, '', messageId, userId)
        .run()

      const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(conversationId))
      await room.fetch(new Request('https://internal/broadcast', {
        method: 'POST',
        body: JSON.stringify({ type: 'message_deleted', messageId, conversationId }),
      }))

      return new Response(null, { status: 204 })
    }
  }

  const reactMatch = path.match(/^\/conversations\/([^/]+)\/messages\/([^/]+)\/react$/)
  if (reactMatch && request.method === 'POST') {
    const [, , messageId] = reactMatch
    const body = await request.json<{ emoji: string }>()

    const existing = await env.DB.prepare(
      'SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    )
      .bind(messageId, userId, body.emoji)
      .first()

    if (existing) {
      await env.DB.prepare(
        'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      )
        .bind(messageId, userId, body.emoji)
        .run()
    } else {
      await env.DB.prepare(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
      )
        .bind(messageId, userId, body.emoji)
        .run()
    }

    const row = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first()
    if (!row) return error('Message not found', 404)
    return json(await formatMessage(env, row))
  }

  return null
}
