<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Message } from '@blinkr/shared'

const props = defineProps<{
  replyTo?: Message | null
  editingMessage?: Message | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [content: string, replyToId?: string]
  saveEdit: [content: string]
  sendImage: [file: File]
  typing: [isTyping: boolean]
  cancelReply: []
  cancelEdit: []
}>()

const text = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)

const debouncedStopTyping = useDebounceFn(() => emit('typing', false), 2000)

watch(() => props.editingMessage, (msg) => {
  text.value = msg?.content ?? ''
}, { immediate: true })

watch(text, (val) => {
  if (props.editingMessage) return
  if (val) {
    emit('typing', true)
    debouncedStopTyping()
  } else {
    emit('typing', false)
  }
})

function submit() {
  const content = text.value.trim()
  if (!content) return
  if (props.editingMessage) {
    emit('saveEdit', content)
    text.value = ''
    return
  }
  emit('send', content, props.replyTo?.id)
  text.value = ''
  emit('typing', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.editingMessage) {
    emit('cancelEdit')
    text.value = ''
    return
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('sendImage', file)
    input.value = ''
  }
}
</script>

<template>
  <div class="border-t border-border-light bg-panel-light/80 p-3 backdrop-blur-xl dark:border-border-dark dark:bg-panel-dark/80">
    <div
      v-if="editingMessage"
      class="mb-2 flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 ring-1 ring-amber-500/30"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium text-amber-600 dark:text-amber-400">Editing message</p>
        <p class="truncate text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {{ editingMessage.content }}
        </p>
      </div>
      <button
        type="button"
        class="ml-2 shrink-0 rounded-lg p-1 text-text-secondary-light hover:bg-panel-light dark:text-text-secondary-dark dark:hover:bg-panel-dark"
        @click="emit('cancelEdit'); text = ''"
      >
        ✕
      </button>
    </div>

    <div
      v-else-if="replyTo"
      class="mb-2 flex items-center justify-between rounded-xl bg-elevated-light px-3 py-2 dark:bg-elevated-dark"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium text-blink-600 dark:text-blink-400">Replying to</p>
        <p class="truncate text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {{ replyTo.content }}
        </p>
      </div>
      <button
        type="button"
        class="ml-2 shrink-0 rounded-lg p-1 text-text-secondary-light hover:bg-panel-light dark:text-text-secondary-dark dark:hover:bg-panel-dark"
        @click="emit('cancelReply')"
      >
        ✕
      </button>
    </div>

    <div class="flex items-end gap-2">
      <div v-if="!editingMessage" class="flex gap-1">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary-light transition hover:bg-elevated-light hover:text-blink-600 dark:text-text-secondary-dark dark:hover:bg-elevated-dark dark:hover:text-blink-400 disabled:opacity-40"
          title="Attach photo"
          :disabled="disabled"
          @click="fileInput?.click()"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary-light transition hover:bg-elevated-light hover:text-blink-600 dark:text-text-secondary-dark dark:hover:bg-elevated-dark dark:hover:text-blink-400 disabled:opacity-40"
          title="Take photo"
          :disabled="disabled"
          @click="cameraInput?.click()"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
        <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onFileChange" />
      </div>

      <div class="relative flex-1">
        <textarea
          v-model="text"
          rows="1"
          :placeholder="editingMessage ? 'Edit message...' : 'Message...'"
          class="max-h-32 w-full resize-none rounded-2xl bg-elevated-light px-4 py-2.5 text-[15px] outline-none ring-1 ring-border-light transition placeholder:text-text-secondary-light focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark dark:placeholder:text-text-secondary-dark"
          @keydown="onKeydown"
        />
      </div>

      <button
        type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-md shadow-blink-600/30 transition hover:scale-105 active:scale-95 disabled:opacity-40"
        :disabled="!text.trim()"
        @click="submit"
      >
        <svg v-if="editingMessage" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
