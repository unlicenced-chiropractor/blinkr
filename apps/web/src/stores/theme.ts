import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import {
  DEFAULT_AESTHETIC_ID,
  getAestheticTheme,
  isAestheticThemeId,
  type AestheticTheme,
} from '@/lib/aesthetic-themes'
import {
  applyThemeTokens,
  cacheThemeTokens,
  type ThemeTokens,
} from '@/lib/theme-tokens'

export type ThemeMode = 'light' | 'dark' | 'system'

const MODE_KEY = 'blinkr-theme'
const AESTHETIC_KEY = 'blinkr-aesthetic'

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

function readStoredAesthetic(): string {
  const stored = localStorage.getItem(AESTHETIC_KEY)
  return isAestheticThemeId(stored) ? stored : DEFAULT_AESTHETIC_ID
}

function updateThemeColorMeta(isDark: boolean, tokens: ThemeTokens) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  meta.setAttribute(
    'content',
    isDark ? tokens['--theme-surface-dark'] : tokens['--theme-surface-light'],
  )
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const aestheticId = ref<string>(readStoredAesthetic())
  const prefersDark = usePreferredDark()
  const isDark = ref(false)

  const currentAesthetic = computed((): AestheticTheme => {
    return getAestheticTheme(aestheticId.value) ?? getAestheticTheme(DEFAULT_AESTHETIC_ID)!
  })

  function resolveDark(theme: AestheticTheme): boolean {
    if (theme.appearance === 'light') return false
    if (theme.appearance === 'dark') return true
    return mode.value === 'dark' || (mode.value === 'system' && prefersDark.value)
  }

  function apply() {
    const theme = currentAesthetic.value
    const dark = resolveDark(theme)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.aesthetic = theme.id
    applyThemeTokens(document.documentElement, theme.tokens)
    cacheThemeTokens(theme.tokens)
    updateThemeColorMeta(dark, theme.tokens)
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem(MODE_KEY, newMode)
    apply()
  }

  function setAesthetic(id: string) {
    if (!isAestheticThemeId(id)) return
    aestheticId.value = id
    localStorage.setItem(AESTHETIC_KEY, id)
    apply()
  }

  function init() {
    apply()
    watch([mode, aestheticId, prefersDark], apply)
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  /** Whether light/dark mode picker applies (default theme or auto appearance) */
  const modePickerEnabled = computed(() => {
    const theme = currentAesthetic.value
    return theme.id === DEFAULT_AESTHETIC_ID || !theme.appearance
  })

  return {
    mode,
    aestheticId,
    currentAesthetic,
    isDark,
    modePickerEnabled,
    setMode,
    setAesthetic,
    toggle,
    init,
  }
})
