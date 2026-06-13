import type { Env } from '../env'
import { broadcastToConversation } from '../services/broadcast'
import {
  areFriends,
  createGroupConversation,
  getOrCreateDirectConversation,
  isConversationMember,
} from '../services/conversations'
import {
  MAX_MESSAGE_IMAGE_BYTES,
  mediaPath,
  putMedia,
  readImageFile,
} from '../services/media-storage'
import {
  HISTORY_FETCH_LIMIT,
  pruneConversationMessages,
} from '../services/message-retention'
import {
  getConversationReadReceipts,
  getUnreadCount,
  markConversationRead,
} from '../services/read-receipts'
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

async function getPeerForDirect(env: Env, conversationId: string, userId: string) {
  const peer = await env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url
    FROM conversation_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ? AND cm.user_id != ?
    LIMIT 1
  `)
    .bind(conversationId, userId)
    .first<{
      id: string
      username: string
      display_name: string
      avatar_url: string | null
    }>()

  if (!peer) return null
  return {
    id: peer.id,
    username: peer.username,
    displayName: peer.display_name,
    avatarUrl: peer.avatar_url,
  }
}

async function getMembersForConversation(env: Env, conversationId: string) {
  const { results } = await env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url
    FROM conversation_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ?
    ORDER BY u.display_name
  `)
    .bind(conversationId)
    .all<{
      id: string
      username: string
      display_name: string
      avatar_url: string | null
    }>()

  return results.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarUrl: u.avatar_url,
  }))
}

async function formatConversation(
  env: Env,
  c: Record<string, unknown>,
  userId: string,
) {
  const { results: memberRows } = await env.DB.prepare(
    'SELECT user_id FROM conversation_members WHERE conversation_id = ?',
  )
    .bind(c.id)
    .all<{ user_id: string }>()

  const peer = c.type === 'direct' ? await getPeerForDirect(env, c.id as string, userId) : null
  const members = c.type === 'group' ? await getMembersForConversation(env, c.id as string) : undefined
  const unreadCount = await getUnreadCount(env, c.id as string, userId)

  return {
    id: c.id,
    type: c.type,
    name: c.name,
    iconUrl: c.icon_url,
    memberIds: memberRows.map((m) => m.user_id),
    members,
    peer,
    unreadCount,
    lastMessageAt: c.last_message_at,
    createdAt: c.created_at,
  }
}

export async function handleConversations(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/conversations')) return null

  const userId = await getUserId(request, env)
  if (!userId) return error('Unauthorized', 401)

  if (path === '/conversations/direct' && request.method === 'POST') {
    const body = await request.json<{ friendId: string }>()
    if (!body.friendId) return error('friendId required')
    if (body.friendId === userId) return error('Cannot message yourself')

    const friends = await areFriends(env, userId, body.friendId)
    if (!friends) return error('You can only message friends', 403)

    const conversationId = await getOrCreateDirectConversation(env, userId, body.friendId)
    const row = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
      .bind(conversationId)
      .first()

    if (!row) return error('Conversation not found', 404)
    return json(await formatConversation(env, row, userId))
  }

  if (path === '/conversations/group' && request.method === 'POST') {
    const body = await request.json<{ name: string; memberIds: string[] }>()
    if (!body.name?.trim()) return error('Group name required')
    if (!Array.isArray(body.memberIds)) return error('memberIds required')

    try {
      const conversationId = await createGroupConversation(
        env,
        userId,
        body.name,
        body.memberIds,
      )
      const row = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
        .bind(conversationId)
        .first()

      if (!row) return error('Conversation not found', 404)
      return json(await formatConversation(env, row, userId), 201)
    } catch (e) {
      return error(e instanceof Error ? e.message : 'Could not create group')
    }
  }

  if (path === '/conversations' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT c.id, c.type, c.name, c.icon_url, c.last_message_at, c.created_at
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE cm.user_id = ?
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `).bind(userId).all()

    const conversations = await Promise.all(
      results.map((c) => formatConversation(env, c, userId)),
    )

    return json(conversations)
  }

  const readMatch = path.match(/^\/conversations\/([^/]+)\/read$/)
  if (readMatch && request.method === 'POST') {
    const conversationId = readMatch[1]
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }
    const body = await request.json<{ messageId: string }>()
    if (!body.messageId) return error('messageId required')
    await markConversationRead(env, conversationId, userId, body.messageId)
    return json({ ok: true })
  }

  const receiptsMatch = path.match(/^\/conversations\/([^/]+)\/read-receipts$/)
  if (receiptsMatch && request.method === 'GET') {
    const conversationId = receiptsMatch[1]
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }
    return json(await getConversationReadReceipts(env, conversationId))
  }

  const messagesMatch = path.match(/^\/conversations\/([^/]+)\/messages$/)
  if (messagesMatch && request.method === 'GET') {
    const conversationId = messagesMatch[1]
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }

    const { results } = await env.DB.prepare(`
      SELECT m.* FROM messages m
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `)
      .bind(conversationId, HISTORY_FETCH_LIMIT)
      .all()

    const messages = await Promise.all(
      results.reverse().map((row) => formatMessage(env, row)),
    )
    return json(messages)
  }

  if (messagesMatch && request.method === 'POST') {
    const conversationId = messagesMatch[1]
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }

    const body = await request.json<{ content: string; replyToId?: string }>()
    if (!body.content?.trim()) return error('Message cannot be empty')

    const messageId = id()
    const now = new Date().toISOString()

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, content, reply_to_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(messageId, conversationId, userId, body.content.trim(), body.replyToId ?? null, now),
      env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
        .bind(now, conversationId),
    ])

    await pruneConversationMessages(env, conversationId)

    const message = await formatMessage(env, {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      content: body.content.trim(),
      type: 'text',
      image_url: null,
      reply_to_id: body.replyToId ?? null,
      edited_at: null,
      deleted_at: null,
      created_at: now,
    })

    await broadcastToConversation(env, { type: 'message', message })

    return json(message, 201)
  }

  const imageMatch = path.match(/^\/conversations\/([^/]+)\/messages\/image$/)
  if (imageMatch && request.method === 'POST') {
    const conversationId = imageMatch[1]
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }

    const form = await request.formData()
    const image = form.get('image') as File | null
    const caption = (form.get('caption') as string) ?? ''

    if (!image) return error('No image provided')

    const parsed = await readImageFile(image, MAX_MESSAGE_IMAGE_BYTES)
    if (parsed instanceof Response) return parsed

    const imageId = id()
    const ext = image.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const key = `images/${conversationId}/${imageId}.${ext}`
    await putMedia(env, key, parsed.data, parsed.contentType)

    const messageId = id()
    const now = new Date().toISOString()
    const imageUrl = mediaPath(key)

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, content, type, image_url, created_at)
        VALUES (?, ?, ?, ?, 'image', ?, ?)
      `).bind(messageId, conversationId, userId, caption, imageUrl, now),
      env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
        .bind(now, conversationId),
    ])

    await pruneConversationMessages(env, conversationId)

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

    await broadcastToConversation(env, { type: 'message', message })

    return json(message, 201)
  }

  const messageMatch = path.match(/^\/conversations\/([^/]+)\/messages\/([^/]+)$/)
  if (messageMatch) {
    const [, conversationId, messageId] = messageMatch
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }

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

      await broadcastToConversation(env, { type: 'message_updated', message })

      return json(message)
    }

    if (request.method === 'DELETE') {
      const now = new Date().toISOString()
      await env.DB.prepare(
        'UPDATE messages SET deleted_at = ?, content = ? WHERE id = ? AND sender_id = ?',
      )
        .bind(now, '', messageId, userId)
        .run()

      await broadcastToConversation(env, { type: 'message_deleted', messageId, conversationId })

      return new Response(null, { status: 204 })
    }
  }

  const reactMatch = path.match(/^\/conversations\/([^/]+)\/messages\/([^/]+)\/react$/)
  if (reactMatch && request.method === 'POST') {
    const [, conversationId, messageId] = reactMatch
    if (!(await isConversationMember(env, conversationId, userId))) {
      return error('Not a member of this conversation', 403)
    }

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
    const message = await formatMessage(env, row)

    await broadcastToConversation(env, { type: 'message_updated', message })

    return json(message)
  }

  return null
}
