export type ThemePalette = 'violet' | 'ocean' | 'rose' | 'forest' | 'sunset' | 'mono'

export interface ThemePaletteOption {
  id: ThemePalette
  label: string
  hint: string
  /** Gradient swatch for settings preview [primary, accent] */
  swatch: [string, string]
}

export const THEME_PALETTES: ThemePaletteOption[] = [
  { id: 'violet', label: 'Violet', hint: 'Purple & cyan', swatch: ['#7c3aed', '#06b6d4'] },
  { id: 'ocean', label: 'Ocean', hint: 'Blue & teal', swatch: ['#2563eb', '#14b8a6'] },
  { id: 'rose', label: 'Rose', hint: 'Pink & coral', swatch: ['#e11d48', '#f97316'] },
  { id: 'forest', label: 'Forest', hint: 'Green & lime', swatch: ['#059669', '#84cc16'] },
  { id: 'sunset', label: 'Sunset', hint: 'Amber & red', swatch: ['#ea580c', '#ef4444'] },
  { id: 'mono', label: 'Mono', hint: 'Neutral gray', swatch: ['#52525b', '#71717a'] },
]

export const DEFAULT_THEME_PALETTE: ThemePalette = 'violet'

export function isThemePalette(value: string | null): value is ThemePalette {
  return THEME_PALETTES.some((t) => t.id === value)
}
