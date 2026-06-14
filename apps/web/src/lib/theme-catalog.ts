import {
  buildMonoVars,
  buildThemeVars,
  type ThemeCssVars,
} from '@/lib/theme-engine'

export type ThemeCategory =
  | 'featured'
  | 'vivid'
  | 'pastel'
  | 'neon'
  | 'contrast'
  | 'warm'
  | 'cool'
  | 'mono'

export type ThemeFamily = 'curated' | 'generated'

export interface ThemeDefinition {
  id: string
  name: string
  hint: string
  category: ThemeCategory
  family: ThemeFamily
  swatch: [string, string]
  vars: ThemeCssVars
}

const HUE_NAMES: { max: number; names: string[] }[] = [
  { max: 20, names: ['Cherry', 'Crimson', 'Ruby', 'Scarlet'] },
  { max: 45, names: ['Ember', 'Tangerine', 'Amber', 'Copper'] },
  { max: 70, names: ['Gold', 'Honey', 'Saffron', 'Marigold'] },
  { max: 95, names: ['Lime', 'Chartreuse', 'Spring', 'Leaf'] },
  { max: 140, names: ['Forest', 'Jade', 'Mint', 'Fern'] },
  { max: 175, names: ['Teal', 'Seafoam', 'Lagoon', 'Cove'] },
  { max: 210, names: ['Azure', 'Ocean', 'Cobalt', 'Sapphire'] },
  { max: 245, names: ['Indigo', 'Royal', 'Ultramarine', 'Denim'] },
  { max: 280, names: ['Violet', 'Amethyst', 'Grape', 'Plum'] },
  { max: 315, names: ['Orchid', 'Magenta', 'Fuchsia', 'Berry'] },
  { max: 360, names: ['Rose', 'Blush', 'Petal', 'Flamingo'] },
]

const STYLE_SUFFIX: Record<string, string> = {
  vivid: 'Pulse',
  pastel: 'Mist',
  neon: 'Glow',
  contrast: 'Split',
}

function hueName(hue: number): string {
  const h = ((hue % 360) + 360) % 360
  for (const bucket of HUE_NAMES) {
    if (h <= bucket.max) {
      return bucket.names[Math.floor(h / 4) % bucket.names.length]
    }
  }
  return 'Spectrum'
}

function toneCategory(hue: number): ThemeCategory | null {
  const h = ((hue % 360) + 360) % 360
  if (h >= 330 || h <= 55) return 'warm'
  if (h >= 160 && h <= 260) return 'cool'
  return null
}

function makeTheme(
  id: string,
  name: string,
  hint: string,
  category: ThemeCategory,
  family: ThemeFamily,
  vars: ThemeCssVars,
): ThemeDefinition {
  return {
    id,
    name,
    hint,
    category,
    family,
    swatch: [vars['--theme-blink-600'], vars['--theme-accent']],
    vars,
  }
}

function buildCuratedThemes(): ThemeDefinition[] {
  return [
    makeTheme('violet', 'Violet', 'Classic purple & cyan', 'featured', 'curated',
      buildThemeVars(258, 192, 88, 82)),
    makeTheme('ocean', 'Ocean', 'Deep blue & teal', 'featured', 'curated',
      buildThemeVars(217, 172, 88, 78)),
    makeTheme('rose', 'Rose', 'Pink & coral', 'featured', 'curated',
      buildThemeVars(347, 24, 88, 72)),
    makeTheme('forest', 'Forest', 'Green & lime', 'featured', 'curated',
      buildThemeVars(160, 84, 82, 76)),
    makeTheme('sunset', 'Sunset', 'Amber & red', 'featured', 'curated',
      buildThemeVars(25, 4, 88, 84)),
    makeTheme('mono', 'Mono', 'Neutral gray', 'mono', 'curated', buildMonoVars()),
  ]
}

const GENERATED_STYLES = [
  { key: 'vivid', category: 'vivid' as const, saturation: 88, accentOffset: 38, accentSat: 82 },
  { key: 'pastel', category: 'pastel' as const, saturation: 42, accentOffset: 52, accentSat: 48 },
  { key: 'neon', category: 'neon' as const, saturation: 100, accentOffset: 122, accentSat: 96 },
  { key: 'contrast', category: 'contrast' as const, saturation: 84, accentOffset: 180, accentSat: 80 },
] as const

function buildGeneratedThemes(): ThemeDefinition[] {
  const themes: ThemeDefinition[] = []

  for (let hue = 0; hue < 360; hue += 3) {
    for (const style of GENERATED_STYLES) {
      const id = `gen-${hue}-${style.key}`
      const baseName = hueName(hue)
      const name = `${baseName} ${STYLE_SUFFIX[style.key]}`
      const hint = `${style.key} · ${hue}°`
      const vars = buildThemeVars(hue, hue + style.accentOffset, style.saturation, style.accentSat)
      const tone = toneCategory(hue)

      themes.push(makeTheme(id, name, hint, style.category, 'generated', vars))
      if (tone && tone !== style.category) {
        themes[themes.length - 1] = {
          ...themes[themes.length - 1],
          category: style.category,
        }
      }
    }
  }

  for (let i = 0; i < 24; i++) {
    const warmth = i * 15
    const vars = buildThemeVars(warmth, (warmth + 180) % 360, 5, 10)
    themes.push(makeTheme(
      `mono-${i}`,
      `Slate ${i + 1}`,
      'Warm neutral',
      'mono',
      'generated',
      vars,
    ))
  }

  return themes
}

const CURATED = buildCuratedThemes()
const GENERATED = buildGeneratedThemes()

export const THEME_CATALOG: ThemeDefinition[] = [...CURATED, ...GENERATED]

export const DEFAULT_THEME_ID = 'violet'

const themeById = new Map(THEME_CATALOG.map((t) => [t.id, t]))

export function getThemeById(id: string): ThemeDefinition | undefined {
  return themeById.get(id)
}

export function isKnownThemeId(id: string | null): id is string {
  return !!id && themeById.has(id)
}

export type ThemeStoreFilter =
  | 'all'
  | 'favorites'
  | 'featured'
  | 'vivid'
  | 'pastel'
  | 'neon'
  | 'contrast'
  | 'warm'
  | 'cool'
  | 'mono'

export const THEME_STORE_FILTERS: { id: ThemeStoreFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'featured', label: 'Featured' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'neon', label: 'Neon' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'mono', label: 'Mono' },
]

export function filterThemes(
  query: string,
  filter: ThemeStoreFilter,
  favoriteIds: Set<string>,
): ThemeDefinition[] {
  const q = query.trim().toLowerCase()

  return THEME_CATALOG.filter((theme) => {
    if (filter === 'favorites' && !favoriteIds.has(theme.id)) return false
    if (filter !== 'all' && filter !== 'favorites') {
      if (filter === 'featured' && theme.category !== 'featured') return false
      if (filter === 'warm' || filter === 'cool') {
        const h = themeHue(theme)
        if (h == null) return false
        const cat = toneCategory(h)
        if (cat !== filter) return false
      } else if (theme.category !== filter) {
        return false
      }
    }
    if (!q) return true
    return theme.name.toLowerCase().includes(q)
      || theme.hint.toLowerCase().includes(q)
      || theme.id.includes(q)
  })
}

function themeHue(theme: ThemeDefinition): number | null {
  const match = theme.id.match(/^gen-(\d+)-/)
  if (match) return Number(match[1])
  const curatedHue: Record<string, number> = {
    violet: 258, ocean: 217, rose: 347, forest: 160, sunset: 25,
  }
  return curatedHue[theme.id] ?? null
}

export const THEME_CATALOG_COUNT = THEME_CATALOG.length
