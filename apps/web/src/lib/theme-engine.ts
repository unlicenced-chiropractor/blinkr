/** HSL → hex and CSS variable generation for dynamic themes */

export interface ThemeCssVars {
  '--theme-blink-50': string
  '--theme-blink-100': string
  '--theme-blink-200': string
  '--theme-blink-300': string
  '--theme-blink-400': string
  '--theme-blink-500': string
  '--theme-blink-600': string
  '--theme-blink-700': string
  '--theme-blink-800': string
  '--theme-blink-900': string
  '--theme-accent': string
  '--theme-accent-light': string
  '--theme-surface-dark': string
  '--theme-panel-dark': string
  '--theme-elevated-dark': string
  '--theme-border-dark': string
}

const SCALE_LIGHTNESS: Record<number, number> = {
  50: 97,
  100: 94,
  200: 86,
  300: 76,
  400: 66,
  500: 58,
  600: 48,
  700: 40,
  800: 32,
  900: 24,
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.max(0, Math.min(100, s)) / 100
  const light = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) { r = c; g = x }
  else if (hue < 120) { r = x; g = c }
  else if (hue < 180) { g = c; b = x }
  else if (hue < 240) { g = x; b = c }
  else if (hue < 300) { r = x; b = c }
  else { r = c; b = x }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function scaleColor(hue: number, saturation: number, step: number): string {
  return hslToHex(hue, saturation, SCALE_LIGHTNESS[step] ?? 50)
}

function darkTint(hue: number, lightness: number, sat = 18): string {
  return hslToHex(hue, sat, lightness)
}

export function buildThemeVars(
  primaryHue: number,
  accentHue: number,
  saturation: number,
  accentSaturation = saturation,
): ThemeCssVars {
  const hue = ((primaryHue % 360) + 360) % 360
  const accent = ((accentHue % 360) + 360) % 360

  return {
    '--theme-blink-50': scaleColor(hue, saturation, 50),
    '--theme-blink-100': scaleColor(hue, saturation, 100),
    '--theme-blink-200': scaleColor(hue, saturation, 200),
    '--theme-blink-300': scaleColor(hue, saturation, 300),
    '--theme-blink-400': scaleColor(hue, saturation, 400),
    '--theme-blink-500': scaleColor(hue, saturation, 500),
    '--theme-blink-600': scaleColor(hue, saturation, 600),
    '--theme-blink-700': scaleColor(hue, saturation, 700),
    '--theme-blink-800': scaleColor(hue, saturation, 800),
    '--theme-blink-900': scaleColor(hue, saturation, 900),
    '--theme-accent': hslToHex(accent, accentSaturation, 48),
    '--theme-accent-light': hslToHex(accent, Math.min(accentSaturation + 8, 100), 58),
    '--theme-surface-dark': darkTint(hue, 1.5, 22),
    '--theme-panel-dark': darkTint(hue, 4.5, 20),
    '--theme-elevated-dark': darkTint(hue, 9, 18),
    '--theme-border-dark': darkTint(hue, 17, 16),
  }
}

export function buildMonoVars(): ThemeCssVars {
  const g = (l: number) => hslToHex(0, 0, l)
  return {
    '--theme-blink-50': g(98),
    '--theme-blink-100': g(96),
    '--theme-blink-200': g(90),
    '--theme-blink-300': g(83),
    '--theme-blink-400': g(64),
    '--theme-blink-500': g(46),
    '--theme-blink-600': g(34),
    '--theme-blink-700': g(26),
    '--theme-blink-800': g(16),
    '--theme-blink-900': g(9),
    '--theme-accent': g(46),
    '--theme-accent-light': g(64),
    '--theme-surface-dark': '#000000',
    '--theme-panel-dark': '#0a0a0a',
    '--theme-elevated-dark': '#141414',
    '--theme-border-dark': '#262626',
  }
}

export function applyThemeVars(el: HTMLElement, vars: ThemeCssVars) {
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value)
  }
}

export function clearThemeVars(el: HTMLElement) {
  const keys: (keyof ThemeCssVars)[] = [
    '--theme-blink-50', '--theme-blink-100', '--theme-blink-200', '--theme-blink-300',
    '--theme-blink-400', '--theme-blink-500', '--theme-blink-600', '--theme-blink-700',
    '--theme-blink-800', '--theme-blink-900', '--theme-accent', '--theme-accent-light',
    '--theme-surface-dark', '--theme-panel-dark', '--theme-elevated-dark', '--theme-border-dark',
  ]
  for (const key of keys) el.style.removeProperty(key)
}

export const THEME_VARS_CACHE_KEY = 'blinkr-palette-vars'

export function cacheThemeVars(vars: ThemeCssVars) {
  localStorage.setItem(THEME_VARS_CACHE_KEY, JSON.stringify(vars))
}

export function readCachedThemeVars(): ThemeCssVars | null {
  try {
    const raw = localStorage.getItem(THEME_VARS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ThemeCssVars
  } catch {
    return null
  }
}

export function applyCachedThemeVars(el: HTMLElement) {
  const vars = readCachedThemeVars()
  if (vars) applyThemeVars(el, vars)
}
