import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem('blinkr-theme') as ThemeMode) || 'dark')
  const prefersDark = usePreferredDark()

  const isDark = ref(false)

  function apply() {
    const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark.value)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem('blinkr-theme', newMode)
    apply()
  }

  function init() {
    apply()
    watch([mode, prefersDark], apply)
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  return { mode, isDark, setMode, toggle, init }
})
