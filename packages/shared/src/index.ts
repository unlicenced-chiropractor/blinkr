export type UserId = string
export type ConversationId = string
export type MessageId = string

export interface User {
  id: UserId
  username: string
  displayName: string
  avatarUrl: string | null
  bio?: string
  createdAt: string
}

export interface UserSearchResult extends User {
  exactMatch: boolean
  isFriend?: boolean
  outgoingRequest?: boolean
  incomingRequestId?: string | null
}

export interface UserSearchResponse {
  query: string
  results: UserSearchResult[]
}

export interface FriendRequest {
  id: string
  fromUserId: UserId
  toUserId: UserId
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  fromUser?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
}

export interface ConversationPeer {
  id: UserId
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface Conversation {
  id: ConversationId
  type: 'direct' | 'group'
  name: string | null
  iconUrl: string | null
  memberIds: UserId[]
  peer?: ConversationPeer | null
  unreadCount?: number
  lastMessageAt: string | null
  createdAt: string
}

export interface MessageReaction {
  emoji: string
  userIds: UserId[]
}

export interface Message {
  id: MessageId
  conversationId: ConversationId
  senderId: UserId
  content: string
  type: 'text' | 'image'
  imageUrl?: string
  replyToId?: MessageId
  reactions: MessageReaction[]
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
}

export interface ReadReceipt {
  userId: UserId
  messageId: MessageId
  readAt: string
  conversationId?: ConversationId
}

export interface TypingState {
  conversationId: ConversationId
  userId: UserId
  isTyping: boolean
}

export type WsClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'subscribe'; conversationId: ConversationId }
  | { type: 'unsubscribe'; conversationId: ConversationId }
  | { type: 'typing'; conversationId: ConversationId; isTyping: boolean }
  | { type: 'read'; conversationId: ConversationId; messageId: MessageId }
  | { type: 'ping' }

export type WsServerMessage =
  | { type: 'authenticated'; userId: UserId }
  | { type: 'message'; message: Message }
  | { type: 'message_updated'; message: Message }
  | { type: 'message_deleted'; messageId: MessageId; conversationId: ConversationId }
  | { type: 'typing'; state: TypingState }
  | { type: 'read_receipt'; receipt: ReadReceipt }
  | { type: 'presence'; userId: UserId; online: boolean }
  | { type: 'error'; message: string }
  | { type: 'pong' }

export const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const
