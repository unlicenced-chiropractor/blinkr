<script setup lang="ts">
import { computed } from 'vue'
import type { Conversation } from '@blinkr/shared'
import Avatar from '@/components/ui/Avatar.vue'

const props = defineProps<{
  conversation: Conversation
  active?: boolean
  displayName: string
  avatarUrl?: string | null
  preview?: string
  unread?: number
}>()

defineEmits<{ select: [] }>()

const timeLabel = computed(() => {
  if (!props.conversation.lastMessageAt) return ''
  const d = new Date(props.conversation.lastMessageAt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
})
</script>

<template>
  <button
    type="button"
    class="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200"
    :class="active
      ? 'bg-blink-600/10 dark:bg-blink-500/15'
      : 'hover:bg-elevated-light dark:hover:bg-elevated-dark'"
    @click="$emit('select')"
  >
    <Avatar :src="avatarUrl" :name="displayName" size="md" />
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="truncate font-semibold">{{ displayName }}</span>
        <span class="shrink-0 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {{ timeLabel }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <p class="truncate text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {{ preview || 'No messages yet' }}
        </p>
        <span
          v-if="unread"
          class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blink-600 px-1.5 text-[11px] font-bold text-white"
        >
          {{ unread }}
        </span>
      </div>
    </div>
  </button>
</template>
