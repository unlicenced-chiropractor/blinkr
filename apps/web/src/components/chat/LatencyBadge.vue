<script setup lang="ts">
defineProps<{
  wsRtt: number | null
  msgRtt: number | null
  apiRtt: number | null
}>()

function color(ms: number | null) {
  if (ms === null) return 'text-text-secondary-light dark:text-text-secondary-dark'
  if (ms < 80) return 'text-emerald-500'
  if (ms < 200) return 'text-amber-500'
  return 'text-red-500'
}
</script>

<template>
  <div
    class="flex items-center gap-2 rounded-xl bg-elevated-light px-2.5 py-1 font-mono text-[11px] dark:bg-elevated-dark"
    title="Live latency — WS ping, last message delivery, last API call"
  >
    <span :class="color(wsRtt)">
      ws {{ wsRtt ?? '—' }}ms
    </span>
    <span class="text-border-light dark:text-border-dark">|</span>
    <span :class="color(msgRtt)">
      msg {{ msgRtt ?? '—' }}ms
    </span>
    <span class="text-border-light dark:text-border-dark">|</span>
    <span :class="color(apiRtt)">
      api {{ apiRtt ?? '—' }}ms
    </span>
  </div>
</template>
