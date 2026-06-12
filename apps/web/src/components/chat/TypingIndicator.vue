<script setup lang="ts">
defineProps<{
  names: string[]
}>()
</script>

<template>
  <div class="flex items-center gap-2 px-4 py-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
    <div class="flex gap-1">
      <span class="typing-dot h-1.5 w-1.5 rounded-full bg-blink-500" />
      <span class="typing-dot h-1.5 w-1.5 rounded-full bg-blink-500" />
      <span class="typing-dot h-1.5 w-1.5 rounded-full bg-blink-500" />
    </div>
    <span>
      {{ names.join(', ') }}
      {{ names.length === 1 ? 'is' : 'are' }} typing...
    </span>
  </div>
</template>

<style scoped>
.typing-dot {
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
