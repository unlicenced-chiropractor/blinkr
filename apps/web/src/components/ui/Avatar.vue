<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
}>()

const initials = computed(() =>
  props.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)

const sizeClass = computed(() => {
  const map = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }
  return map[props.size ?? 'md']
})
</script>

<template>
  <div class="relative inline-flex shrink-0">
    <div
      v-if="src"
      class="overflow-hidden rounded-full ring-2 ring-border-light dark:ring-border-dark"
      :class="sizeClass"
    >
      <img :src="src" :alt="name" class="h-full w-full object-cover" />
    </div>
    <div
      v-else
      class="gradient-brand flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-border-light dark:ring-border-dark"
      :class="sizeClass"
    >
      {{ initials }}
    </div>
    <span
      v-if="online"
      class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-panel-light bg-emerald-400 dark:border-panel-dark"
    />
  </div>
</template>
