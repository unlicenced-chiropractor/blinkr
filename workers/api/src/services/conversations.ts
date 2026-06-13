import type { Env } from '../env'
import { id } from '../utils'

export async function areFriends(env: Env, userId: string, otherId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    'SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?',
  )
    .bind(userId, otherId)
    .first()
  return !!row
}

export async function isConversationMember(
  env: Env,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
  )
    .bind(conversationId, userId)
    .first()
  return !!row
}

export async function findDirectConversation(
  env: Env,
  userA: string,
  userB: string,
): Promise<string | null> {
  const row = await env.DB.prepare(`
    SELECT c.id
    FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
    JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
    WHERE c.type = 'direct'
    LIMIT 1
  `)
    .bind(userA, userB)
    .first<{ id: string }>()

  return row?.id ?? null
}

export async function getOrCreateDirectConversation(
  env: Env,
  userId: string,
  friendId: string,
): Promise<string> {
  const existing = await findDirectConversation(env, userId, friendId)
  if (existing) return existing

  const conversationId = id()
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO conversations (id, type, created_at) VALUES (?, ?, ?)',
    ).bind(conversationId, 'direct', now),
    env.DB.prepare(
      'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)',
    ).bind(conversationId, userId),
    env.DB.prepare(
      'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)',
    ).bind(conversationId, friendId),
  ])

  return conversationId
}

const MAX_GROUP_MEMBERS = 50

export async function createGroupConversation(
  env: Env,
  userId: string,
  name: string,
  memberIds: string[],
): Promise<string> {
  const trimmedName = name.trim()
  if (trimmedName.length < 1 || trimmedName.length > 64) {
    throw new Error('Group name must be 1–64 characters')
  }

  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))]
  if (uniqueMembers.length < 1) {
    throw new Error('Add at least one friend to the group')
  }
  if (uniqueMembers.length + 1 > MAX_GROUP_MEMBERS) {
    throw new Error(`Groups can have at most ${MAX_GROUP_MEMBERS} members`)
  }

  for (const memberId of uniqueMembers) {
    if (!(await areFriends(env, userId, memberId))) {
      throw new Error('You can only add friends to a group')
    }
  }

  const conversationId = id()
  const now = new Date().toISOString()
  const allMembers = [userId, ...uniqueMembers]

  const statements = [
    env.DB.prepare(
      'INSERT INTO conversations (id, type, name, created_at) VALUES (?, ?, ?, ?)',
    ).bind(conversationId, 'group', trimmedName, now),
    ...allMembers.map((memberId) =>
      env.DB.prepare(
        'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)',
      ).bind(conversationId, memberId),
    ),
  ]

  await env.DB.batch(statements)
  return conversationId
}
