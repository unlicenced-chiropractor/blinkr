export type { ThemeDefinition, ThemeCategory, ThemeStoreFilter } from '@/lib/theme-catalog'
export {
  DEFAULT_THEME_ID,
  THEME_CATALOG,
  THEME_CATALOG_COUNT,
  THEME_STORE_FILTERS,
  filterThemes,
  getThemeById,
  isKnownThemeId,
} from '@/lib/theme-catalog'

import {
  DEFAULT_THEME_ID,
  isKnownThemeId,
  THEME_CATALOG,
} from '@/lib/theme-catalog'

/** Back-compat alias */
export type ThemePalette = string

export const DEFAULT_THEME_PALETTE = DEFAULT_THEME_ID

export const THEME_PALETTES = THEME_CATALOG.filter((t) => t.category === 'featured')

export function isThemePalette(value: string | null): value is string {
  return isKnownThemeId(value)
}
