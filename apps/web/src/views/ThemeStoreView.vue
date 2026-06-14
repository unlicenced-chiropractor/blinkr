<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import {
  THEME_CATALOG_COUNT,
  THEME_STORE_FILTERS,
  filterThemes,
  type ThemeStoreFilter,
} from '@/lib/theme-catalog'

const theme = useThemeStore()

const query = ref('')
const activeFilter = ref<ThemeStoreFilter>('all')

const visibleThemes = computed(() =>
  filterThemes(query.value, activeFilter.value, theme.favorites),
)

function selectTheme(id: string) {
  theme.setPalette(id)
}

function onFavoriteClick(event: MouseEvent, id: string) {
  event.stopPropagation()
  theme.toggleFavorite(id)
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface-light dark:bg-surface-dark">
    <header class="sticky top-0 z-10 border-b border-border-light bg-panel-light/90 px-4 py-3 backdrop-blur-xl dark:border-border-dark dark:bg-panel-dark/90">
      <div class="mx-auto flex max-w-3xl items-center gap-3">
        <RouterLink
          to="/settings"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elevated-light text-text-secondary-light transition hover:text-blink-600 dark:bg-elevated-dark dark:text-text-secondary-dark dark:hover:text-blink-400"
          aria-label="Back to settings"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <div class="min-w-0 flex-1">
          <h1 class="font-display text-lg font-bold">Theme store</h1>
          <p class="truncate text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {{ THEME_CATALOG_COUNT }} themes · using {{ theme.currentTheme.name }}
          </p>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
      <div class="mb-4">
        <input
          v-model="query"
          type="search"
          placeholder="Search themes…"
          class="w-full rounded-xl bg-elevated-light px-4 py-2.5 outline-none ring-1 ring-border-light transition placeholder:text-text-secondary-light focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark dark:placeholder:text-text-secondary-dark"
        >
      </div>

      <div class="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          v-for="chip in THEME_STORE_FILTERS"
          :key="chip.id"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="activeFilter === chip.id
            ? 'gradient-brand text-white shadow-sm'
            : 'bg-elevated-light text-text-secondary-light hover:text-text-primary-light dark:bg-elevated-dark dark:text-text-secondary-dark dark:hover:text-text-primary-dark'"
          @click="activeFilter = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <p class="mb-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {{ visibleThemes.length }} shown
      </p>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        <button
          v-for="item in visibleThemes"
          :key="item.id"
          type="button"
          class="group relative rounded-xl p-2 text-left transition ring-1"
          :class="theme.paletteId === item.id
            ? 'ring-blink-500 bg-blink-500/10 dark:bg-blink-500/15'
            : 'ring-transparent bg-elevated-light hover:ring-border-light dark:bg-elevated-dark dark:hover:ring-border-dark'"
          @click="selectTheme(item.id)"
        >
          <span
            class="mb-2 block aspect-[4/3] w-full rounded-lg shadow-inner ring-1 ring-black/10 dark:ring-white/10"
            :style="{ background: `linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})` }"
          />
          <span class="block truncate text-xs font-semibold">{{ item.name }}</span>
          <span class="block truncate text-[10px] text-text-secondary-light dark:text-text-secondary-dark">{{ item.hint }}</span>

          <button
            type="button"
            class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
            :class="theme.isFavorite(item.id) ? 'opacity-100' : ''"
            :aria-label="theme.isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'"
            @click="onFavoriteClick($event, item.id)"
          >
            <svg
              class="h-4 w-4"
              :class="theme.isFavorite(item.id) ? 'fill-current' : 'fill-none'"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        </button>
      </div>

      <p
        v-if="visibleThemes.length === 0"
        class="py-12 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark"
      >
        No themes match your search.
      </p>
    </main>
  </div>
</template>
