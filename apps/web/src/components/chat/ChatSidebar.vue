<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BlinkrLogo from '@/components/ui/BlinkrLogo.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import ConversationItem from '@/components/chat/ConversationItem.vue'
import CreateGroupModal from '@/components/chat/CreateGroupModal.vue'
import type { Conversation } from '@blinkr/shared'

const props = defineProps<{
  conversations: Conversation[]
  activeId: string | null
  getDisplayName: (c: Conversation) => string
  getAvatarUrl: (c: Conversation) => string | null
  getPreview: (c: Conversation) => string
  getUnread?: (c: Conversation) => number
}>()

const emit = defineEmits<{ select: [id: string]; groupCreated: [id: string] }>()

const searchQuery = ref('')
const showCreateGroup = ref(false)

const filteredConversations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.conversations
  return props.conversations.filter((c) => {
    const name = props.getDisplayName(c).toLowerCase()
    const preview = props.getPreview(c).toLowerCase()
    const username = c.peer?.username?.toLowerCase() ?? ''
    return name.includes(q) || preview.includes(q) || username.includes(q)
  })
})
</script>

<template>
  <aside class="flex h-full w-full flex-col border-r border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark md:w-80 lg:w-96">
    <header class="flex items-center justify-between border-b border-border-light px-4 py-4 dark:border-border-dark">
      <BlinkrLogo size="sm" />
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary-light transition hover:bg-elevated-light hover:text-blink-600 dark:text-text-secondary-dark dark:hover:bg-elevated-dark dark:hover:text-blink-400"
          title="New group"
          @click="showCreateGroup = true"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <RouterLink
          to="/friends"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary-light transition hover:bg-elevated-light hover:text-blink-600 dark:text-text-secondary-dark dark:hover:bg-elevated-dark"
          title="Friends"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </RouterLink>
        <RouterLink
          to="/settings"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary-light transition hover:bg-elevated-light hover:text-blink-600 dark:text-text-secondary-dark dark:hover:bg-elevated-dark"
          title="Settings"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </RouterLink>
        <ThemeToggle />
      </div>
    </header>

    <div class="px-4 py-3">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search chats..."
          class="w-full rounded-xl bg-elevated-light py-2.5 pl-10 pr-4 text-sm outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
        />
      </div>
    </div>

    <div class="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
      <ConversationItem
        v-for="conv in filteredConversations"
        :key="conv.id"
        :conversation="conv"
        :active="conv.id === activeId"
        :display-name="getDisplayName(conv)"
        :avatar-url="getAvatarUrl(conv)"
        :preview="getPreview(conv)"
        :unread="getUnread?.(conv) ?? conv.unreadCount ?? 0"
        @select="emit('select', conv.id)"
      />
      <p
        v-if="!filteredConversations.length"
        class="px-4 py-8 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark"
      >
        {{ searchQuery ? 'No chats match your search' : 'No conversations yet. Add friends to start chatting!' }}
      </p>
    </div>
  </aside>

  <CreateGroupModal
    v-model:open="showCreateGroup"
    @created="(id) => { emit('groupCreated', id); emit('select', id) }"
  />
</template>
