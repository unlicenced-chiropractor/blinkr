<script setup lang="ts">
import { computed } from 'vue'
import { linkify } from '@/lib/linkify'

const props = defineProps<{
  content: string
  isOwn?: boolean
}>()

const segments = computed(() => linkify(props.content))
</script>

<template>
  <span class="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
    <template v-for="(segment, i) in segments" :key="i">
      <a
        v-if="segment.type === 'link'"
        :href="segment.href"
        target="_blank"
        rel="noopener noreferrer"
        class="underline underline-offset-2 transition hover:opacity-80"
        :class="isOwn ? 'font-medium text-white underline decoration-white/80 underline-offset-2 hover:decoration-white' : 'text-blink-600 underline decoration-blink-600/50 underline-offset-2 hover:decoration-blink-600 dark:text-blink-400 dark:decoration-blink-400/50'"
        @click.stop
      >{{ segment.text }}</a>
      <span v-else>{{ segment.text }}</span>
    </template>
  </span>
</template>
