<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div class="flex items-center gap-2.5" :class="size === 'lg' ? 'gap-3' : ''">
    <div
      class="gradient-brand flex shrink-0 items-center justify-center rounded-xl shadow-lg shadow-blink-600/25"
      :class="{
        'h-8 w-8': size === 'sm' || !size,
        'h-10 w-10': size === 'md',
        'h-14 w-14 rounded-2xl': size === 'lg',
      }"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        class="text-white"
        :class="{
          'h-4 w-4': size === 'sm' || !size,
          'h-5 w-5': size === 'md',
          'h-7 w-7': size === 'lg',
        }"
      >
        <path
          d="M5 8c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-5l-3 2.5V16H7c-1.1 0-2-.9-2-2V8z"
          fill="currentColor"
          fill-opacity="0.95"
        />
      </svg>
    </div>
    <span
      class="font-display font-bold tracking-tight gradient-text"
      :class="{
        'text-lg': size === 'sm' || !size,
        'text-xl': size === 'md',
        'text-3xl': size === 'lg',
      }"
    >
      Blinkr
    </span>
  </div>
</template>
