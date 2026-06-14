import type { Env } from '../env'
import { broadcastToConversation } from '../services/broadcast'
import { formatConversation, formatConversationsBatch } from '../services/conversation-format'
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
  markConversationRead,
} from '../services/read-receipts'
import { error, getUserId, id, json } from '../utils'

function formatMessageRow(
  row: Record<string, unknown>,
  reactionsByMessage: Map<string, Map<string, string[]>>,
) {
  const reactionMap = reactionsByMessage.get(row.id as string) ?? new Map()
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

async function loadReactionsForMessages(
  env: Env,
  messageIds: string[],
): Promise<Map<string, Map<string, string[]>>> {
  const reactionsByMessage = new Map<string, Map<string, string[]>>()
  if (!messageIds.length) return reactionsByMessage

  const placeholders = messageIds.map(() => '?').join(', ')
  const { results } = await env.DB.prepare(`
    SELECT message_id, emoji, user_id FROM message_reactions
    WHERE message_id IN (${placeholders})
  `)
    .bind(...messageIds)
    .all<{ message_id: string; emoji: string; user_id: string }>()

  for (const reaction of results) {
    let emojiMap = reactionsByMessage.get(reaction.message_id)
    if (!emojiMap) {
      emojiMap = new Map()
      reactionsByMessage.set(reaction.message_id, emojiMap)
    }
    const list = emojiMap.get(reaction.emoji) ?? []
    list.push(reaction.user_id)
    emojiMap.set(reaction.emoji, list)
  }
  return reactionsByMessage
}

async function formatMessage(env: Env, row: Record<string, unknown>) {
  const reactionsByMessage = await loadReactionsForMessages(env, [row.id as string])
  return formatMessageRow(row, reactionsByMessage)
}

async function formatMessages(env: Env, rows: Record<string, unknown>[]) {
  const reactionsByMessage = await loadReactionsForMessages(
    env,
    rows.map((row) => row.id as string),
  )
  return rows.map((row) => formatMessageRow(row, reactionsByMessage))
}

export async function handleConversations(
  request: Request,
  env: Env,
  path: string,
  ctx?: ExecutionContext,
): Promise<Response | null> {
  if (!path.startsWith('/conversations')) return null

  const userId = await getUserId(request, env)
  if (!userId) return error('Unauthorized', 401)

  const schedulePrune = (conversationId: string) => {
    const task = pruneConversationMessages(env, conversationId)
    if (ctx) ctx.waitUntil(task)
    else void task
  }

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
    `).bind(userId).all<{
      id: string
      type: string
      name: string | null
      icon_url: string | null
      last_message_at: string | null
      created_at: string
    }>()

    return json(await formatConversationsBatch(env, results, userId))
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

    const [{ results }, readReceipts] = await Promise.all([
      env.DB.prepare(`
        SELECT m.* FROM messages m
        WHERE m.conversation_id = ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `)
        .bind(conversationId, HISTORY_FETCH_LIMIT)
        .all(),
      getConversationReadReceipts(env, conversationId),
    ])

    const messages = await formatMessages(env, [...results].reverse())
    return json({ messages, readReceipts })
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

    schedulePrune(conversationId)

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

    schedulePrune(conversationId)

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
