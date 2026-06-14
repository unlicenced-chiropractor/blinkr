<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import {
  AESTHETIC_CATEGORIES,
  AESTHETIC_THEME_COUNT,
  filterAestheticThemes,
  type AestheticCategory,
} from '@/lib/aesthetic-themes'

const theme = useThemeStore()

const query = ref('')
const activeCategory = ref<AestheticCategory>('featured')

const visibleThemes = computed(() =>
  filterAestheticThemes(query.value, activeCategory.value),
)
</script>

<template>
  <div class="app-shell flex min-h-dvh flex-col">
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
            {{ AESTHETIC_THEME_COUNT }} skins · {{ theme.currentAesthetic.name }}
          </p>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
      <input
        v-model="query"
        type="search"
        placeholder="Search themes…"
        class="mb-4 w-full rounded-xl bg-elevated-light px-4 py-2.5 outline-none ring-1 ring-border-light transition placeholder:text-text-secondary-light focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark dark:placeholder:text-text-secondary-dark"
      >

      <div class="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          v-for="chip in AESTHETIC_CATEGORIES"
          :key="chip.id"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="activeCategory === chip.id
            ? 'gradient-brand text-white shadow-sm'
            : 'bg-elevated-light text-text-secondary-light hover:text-text-primary-light dark:bg-elevated-dark dark:text-text-secondary-dark dark:hover:text-text-primary-dark'"
          @click="activeCategory = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <p class="mb-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {{ visibleThemes.length }} themes
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="item in visibleThemes"
          :key="item.id"
          type="button"
          class="rounded-2xl p-3 text-left ring-1 transition"
          :class="theme.aestheticId === item.id
            ? 'ring-2 ring-blink-500 bg-blink-500/10 dark:bg-blink-500/15'
            : 'ring-border-light bg-elevated-light hover:ring-blink-400/50 dark:ring-border-dark dark:bg-elevated-dark'"
          @click="theme.setAesthetic(item.id)"
        >
          <div
            class="mb-3 aspect-[2/1] w-full rounded-xl shadow-inner ring-1 ring-black/10 dark:ring-white/10"
            :style="{ background: `linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})` }"
          />
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <span class="block text-sm font-semibold">{{ item.name }}</span>
              <span class="mt-0.5 block text-xs leading-snug text-text-secondary-light dark:text-text-secondary-dark">
                {{ item.description }}
              </span>
            </div>
            <span
              v-if="item.featured"
              class="shrink-0 rounded-full bg-blink-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blink-600 dark:text-blink-400"
            >
              Featured
            </span>
          </div>
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
