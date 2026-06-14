/** Design tokens applied as CSS custom properties on :root */

export interface ThemeTokens {
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
  '--theme-surface-light': string
  '--theme-surface-dark': string
  '--theme-panel-light': string
  '--theme-panel-dark': string
  '--theme-elevated-light': string
  '--theme-elevated-dark': string
  '--theme-border-light': string
  '--theme-border-dark': string
  '--theme-text-primary-light': string
  '--theme-text-primary-dark': string
  '--theme-text-secondary-light': string
  '--theme-text-secondary-dark': string
  '--theme-radius': string
}

export const TOKEN_KEYS = Object.keys({
  '--theme-blink-50': '',
  '--theme-blink-100': '',
  '--theme-blink-200': '',
  '--theme-blink-300': '',
  '--theme-blink-400': '',
  '--theme-blink-500': '',
  '--theme-blink-600': '',
  '--theme-blink-700': '',
  '--theme-blink-800': '',
  '--theme-blink-900': '',
  '--theme-accent': '',
  '--theme-accent-light': '',
  '--theme-surface-light': '',
  '--theme-surface-dark': '',
  '--theme-panel-light': '',
  '--theme-panel-dark': '',
  '--theme-elevated-light': '',
  '--theme-elevated-dark': '',
  '--theme-border-light': '',
  '--theme-border-dark': '',
  '--theme-text-primary-light': '',
  '--theme-text-primary-dark': '',
  '--theme-text-secondary-light': '',
  '--theme-text-secondary-dark': '',
  '--theme-radius': '',
}) as (keyof ThemeTokens)[]

export const THEME_TOKENS_CACHE_KEY = 'blinkr-aesthetic-vars'

export function applyThemeTokens(el: HTMLElement, tokens: ThemeTokens) {
  for (const [key, value] of Object.entries(tokens)) {
    el.style.setProperty(key, value)
  }
}

export function cacheThemeTokens(tokens: ThemeTokens) {
  localStorage.setItem(THEME_TOKENS_CACHE_KEY, JSON.stringify(tokens))
}

export function readCachedThemeTokens(): ThemeTokens | null {
  try {
    const raw = localStorage.getItem(THEME_TOKENS_CACHE_KEY)
    return raw ? JSON.parse(raw) as ThemeTokens : null
  } catch {
    return null
  }
}

export function applyCachedThemeTokens(el: HTMLElement) {
  const tokens = readCachedThemeTokens()
  if (tokens) applyThemeTokens(el, tokens)
}

/** Build a standard 10-step brand scale from a base hex + accent hex */
export function brandScale(baseHue: number, sat: number, accent: string): Pick<ThemeTokens,
  '--theme-blink-50' | '--theme-blink-100' | '--theme-blink-200' | '--theme-blink-300' |
  '--theme-blink-400' | '--theme-blink-500' | '--theme-blink-600' | '--theme-blink-700' |
  '--theme-blink-800' | '--theme-blink-900' | '--theme-accent' | '--theme-accent-light'
> {
  const h = ((baseHue % 360) + 360) % 360
  const steps = [97, 94, 86, 76, 66, 58, 48, 40, 32, 24] as const
  const keys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
  const out = {} as Record<string, string>
  keys.forEach((k, i) => {
    out[`--theme-blink-${k}`] = `hsl(${h} ${sat}% ${steps[i]}%)`
  })
  out['--theme-accent'] = accent
  out['--theme-accent-light'] = accent
  return out as Pick<ThemeTokens, '--theme-blink-50' | '--theme-blink-100' | '--theme-blink-200' | '--theme-blink-300' | '--theme-blink-400' | '--theme-blink-500' | '--theme-blink-600' | '--theme-blink-700' | '--theme-blink-800' | '--theme-blink-900' | '--theme-accent' | '--theme-accent-light'>
}

export function surfaces(
  light: { surface: string; panel: string; elevated: string; border: string; text: string; textMuted: string },
  dark: { surface: string; panel: string; elevated: string; border: string; text: string; textMuted: string },
  radius = '0.75rem',
): Pick<ThemeTokens,
  '--theme-surface-light' | '--theme-surface-dark' | '--theme-panel-light' | '--theme-panel-dark' |
  '--theme-elevated-light' | '--theme-elevated-dark' | '--theme-border-light' | '--theme-border-dark' |
  '--theme-text-primary-light' | '--theme-text-primary-dark' | '--theme-text-secondary-light' |
  '--theme-text-secondary-dark' | '--theme-radius'
> {
  return {
    '--theme-surface-light': light.surface,
    '--theme-panel-light': light.panel,
    '--theme-elevated-light': light.elevated,
    '--theme-border-light': light.border,
    '--theme-text-primary-light': light.text,
    '--theme-text-secondary-light': light.textMuted,
    '--theme-surface-dark': dark.surface,
    '--theme-panel-dark': dark.panel,
    '--theme-elevated-dark': dark.elevated,
    '--theme-border-dark': dark.border,
    '--theme-text-primary-dark': dark.text,
    '--theme-text-secondary-dark': dark.textMuted,
    '--theme-radius': radius,
  }
}

export function mergeTokens(
  brand: ReturnType<typeof brandScale>,
  surf: ReturnType<typeof surfaces>,
): ThemeTokens {
  return { ...brand, ...surf }
}
