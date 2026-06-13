<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message } from '@blinkr/shared'
import { REACTION_EMOJIS } from '@blinkr/shared'
import Avatar from '@/components/ui/Avatar.vue'
import { mediaUrl } from '@/lib/media'

const props = defineProps<{
  message: Message
  isOwn: boolean
  senderName: string
  senderAvatar?: string | null
  replyTo?: Message | null
  replyToName?: string
  showAvatar?: boolean
  showSenderName?: boolean
  seen?: boolean
  isLastOwn?: boolean
}>()

const emit = defineEmits<{
  react: [emoji: string]
  reply: []
  edit: []
  delete: []
}>()

const showActions = ref(false)
const showReactions = ref(false)

const time = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  }),
)

const isDeleted = computed(() => !!props.message.deletedAt)
</script>

<template>
  <div
    class="group flex gap-2 px-4"
    :class="isOwn ? 'flex-row-reverse' : 'flex-row'"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false; showReactions = false"
  >
    <Avatar
      v-if="showAvatar && !isOwn"
      :src="senderAvatar"
      :name="senderName"
      size="sm"
      class="mt-1 self-end"
    />
    <div v-else-if="!isOwn" class="w-9 shrink-0" />

    <div
      class="relative max-w-[75%] sm:max-w-[65%]"
      :class="isOwn ? 'items-end' : 'items-start'"
    >
      <div
        v-if="replyTo"
        class="mb-1 rounded-xl border-l-2 border-blink-500 bg-elevated-light/80 px-3 py-1.5 text-xs dark:bg-elevated-dark/80"
      >
        <span class="font-medium text-blink-600 dark:text-blink-400">{{ replyToName ?? 'Message' }}</span>
        <p class="truncate text-text-secondary-light dark:text-text-secondary-dark">
          {{ replyTo.deletedAt ? 'Message deleted' : replyTo.content }}
        </p>
      </div>

      <p
        v-if="showSenderName && !isOwn"
        class="mb-1 text-xs font-semibold text-blink-600 dark:text-blink-400"
      >
        {{ senderName }}
      </p>

      <div
        class="relative rounded-2xl px-4 py-2.5 shadow-sm transition-transform duration-150 group-hover:scale-[1.01]"
        :class="isOwn
          ? 'rounded-br-md gradient-brand text-white'
          : 'rounded-bl-md bg-elevated-light text-text-primary-light dark:bg-elevated-dark dark:text-text-primary-dark'"
      >
        <img
          v-if="message.type === 'image' && message.imageUrl && !isDeleted"
          :src="mediaUrl(message.imageUrl) ?? undefined"
          alt="Shared image"
          class="mb-2 max-h-64 rounded-xl object-cover"
        />
        <p v-if="isDeleted" class="text-sm italic opacity-60">Message deleted</p>
        <p v-else class="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
          {{ message.content }}
        </p>
        <div
          class="mt-1 flex items-center gap-1.5"
          :class="isOwn ? 'justify-end text-white/70' : 'text-text-secondary-light dark:text-text-secondary-dark'"
        >
          <span class="text-[11px]">{{ time }}</span>
          <span v-if="message.editedAt" class="text-[11px]">· edited</span>
          <span v-if="isOwn && isLastOwn && seen" class="text-[11px]">· Seen</span>
        </div>
      </div>

      <div
        v-if="message.reactions.length"
        class="mt-1 flex flex-wrap gap-1"
        :class="isOwn ? 'justify-end' : 'justify-start'"
      >
        <button
          v-for="reaction in message.reactions"
          :key="reaction.emoji"
          type="button"
          class="flex items-center gap-0.5 rounded-full bg-panel-light px-2 py-0.5 text-sm shadow-sm ring-1 ring-border-light transition hover:scale-105 dark:bg-panel-dark dark:ring-border-dark"
          @click="emit('react', reaction.emoji)"
        >
          {{ reaction.emoji }}
          <span class="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {{ reaction.userIds.length }}
          </span>
        </button>
      </div>

      <Transition name="pop">
        <div
          v-if="showActions && !isDeleted"
          class="absolute -top-10 flex items-center gap-0.5 rounded-xl bg-panel-light p-1 shadow-lg ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          :class="isOwn ? 'right-0' : 'left-0'"
        >
          <button
            type="button"
            class="rounded-lg p-1.5 text-sm hover:bg-elevated-light dark:hover:bg-elevated-dark"
            title="React"
            @click="showReactions = !showReactions"
          >
            😊
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 text-sm hover:bg-elevated-light dark:hover:bg-elevated-dark"
            title="Reply"
            @click="emit('reply')"
          >
            ↩
          </button>
          <button
            v-if="isOwn"
            type="button"
            class="rounded-lg p-1.5 text-sm hover:bg-elevated-light dark:hover:bg-elevated-dark"
            title="Edit"
            @click="emit('edit')"
          >
            ✏️
          </button>
          <button
            v-if="isOwn"
            type="button"
            class="rounded-lg p-1.5 text-sm hover:bg-elevated-light dark:hover:bg-elevated-dark"
            title="Delete"
            @click="emit('delete')"
          >
            🗑
          </button>
        </div>
      </Transition>

      <Transition name="pop">
        <div
          v-if="showReactions"
          class="absolute -top-16 flex gap-1 rounded-xl bg-panel-light p-2 shadow-lg ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          :class="isOwn ? 'right-0' : 'left-0'"
        >
          <button
            v-for="emoji in REACTION_EMOJIS"
            :key="emoji"
            type="button"
            class="rounded-lg p-1 text-lg transition hover:scale-125 hover:bg-elevated-light dark:hover:bg-elevated-dark"
            @click="emit('react', emoji); showReactions = false"
          >
            {{ emoji }}
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.95);
}
</style>
