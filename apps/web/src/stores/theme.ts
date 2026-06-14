import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import {
  DEFAULT_THEME_ID,
  getThemeById,
  isKnownThemeId,
  type ThemeDefinition,
} from '@/lib/theme-catalog'
import {
  applyThemeVars,
  cacheThemeVars,
  type ThemeCssVars,
} from '@/lib/theme-engine'

export type ThemeMode = 'light' | 'dark' | 'system'

const MODE_KEY = 'blinkr-theme'
const PALETTE_KEY = 'blinkr-palette'
const FAVORITES_KEY = 'blinkr-theme-favorites'

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

function readStoredPaletteId(): string {
  const stored = localStorage.getItem(PALETTE_KEY)
  return isKnownThemeId(stored) ? stored : DEFAULT_THEME_ID
}

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return [DEFAULT_THEME_ID]
    const parsed = JSON.parse(raw) as string[]
    return parsed.filter(isKnownThemeId)
  } catch {
    return [DEFAULT_THEME_ID]
  }
}

function updateThemeColorMeta(isDark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  if (!isDark) {
    meta.setAttribute('content', '#faf9fc')
    return
  }
  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue('--theme-surface-dark')
    .trim()
  meta.setAttribute('content', surface || '#000000')
}

function applyPaletteVars(vars: ThemeCssVars) {
  applyThemeVars(document.documentElement, vars)
  cacheThemeVars(vars)
  updateThemeColorMeta(
    document.documentElement.classList.contains('dark'),
  )
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const paletteId = ref<string>(readStoredPaletteId())
  const favoriteIds = ref<string[]>(readFavorites())
  const prefersDark = usePreferredDark()
  const isDark = ref(false)

  const currentTheme = computed((): ThemeDefinition => {
    return getThemeById(paletteId.value) ?? getThemeById(DEFAULT_THEME_ID)!
  })

  const favorites = computed(() => new Set(favoriteIds.value))

  function apply() {
    const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark.value)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.theme = paletteId.value
    applyPaletteVars(currentTheme.value.vars)
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem(MODE_KEY, newMode)
    apply()
  }

  function setPalette(newId: string) {
    if (!isKnownThemeId(newId)) return
    paletteId.value = newId
    localStorage.setItem(PALETTE_KEY, newId)
    apply()
  }

  function toggleFavorite(id: string) {
    const set = new Set(favoriteIds.value)
    if (set.has(id)) {
      if (set.size <= 1) return
      set.delete(id)
    } else {
      set.add(id)
    }
    favoriteIds.value = [...set]
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds.value))
  }

  function isFavorite(id: string) {
    return favorites.value.has(id)
  }

  function init() {
    apply()
    watch([mode, paletteId, prefersDark], apply)
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  /** @deprecated use paletteId */
  const palette = paletteId

  /** @deprecated use setPalette */
  const setPaletteLegacy = setPalette

  return {
    mode,
    paletteId,
    palette,
    favoriteIds,
    favorites,
    currentTheme,
    isDark,
    setMode,
    setPalette,
    setPaletteLegacy,
    toggleFavorite,
    isFavorite,
    toggle,
    init,
  }
})
