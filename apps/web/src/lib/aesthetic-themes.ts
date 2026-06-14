import {
  brandScale,
  mergeTokens,
  surfaces,
  type ThemeTokens,
} from '@/lib/theme-tokens'

export type AestheticCategory =
  | 'all'
  | 'featured'
  | 'retro'
  | 'nature'
  | 'cozy'
  | 'dark'
  | 'vibrant'

export type AppearanceMode = 'auto' | 'light' | 'dark'

export interface AestheticTheme {
  id: string
  name: string
  description: string
  category: Exclude<AestheticCategory, 'all'>
  featured?: boolean
  tags: string[]
  swatch: [string, string]
  tokens: ThemeTokens
  /** When set, overrides light/dark/system mode */
  appearance?: AppearanceMode
}

function t(
  id: string,
  name: string,
  description: string,
  category: AestheticTheme['category'],
  swatch: [string, string],
  tokens: ThemeTokens,
  opts?: { featured?: boolean; tags?: string[]; appearance?: AppearanceMode },
): AestheticTheme {
  return {
    id,
    name,
    description,
    category,
    swatch,
    tokens,
    featured: opts?.featured,
    tags: opts?.tags ?? [],
    appearance: opts?.appearance,
  }
}

const AESTHETIC_THEMES: AestheticTheme[] = [
  t(
    'default',
    'Blinkr',
    'The default violet look — works with light, dark, or system mode.',
    'featured',
    ['#7c3aed', '#06b6d4'],
    mergeTokens(
      brandScale(258, 88, '#06b6d4'),
      surfaces(
        { surface: '#faf9fc', panel: '#ffffff', elevated: '#f3f1f7', border: '#e8e4ef', text: '#1a1025', textMuted: '#6b5f7a' },
        { surface: '#000000', panel: '#0a0a0a', elevated: '#141414', border: '#262626', text: '#fafafa', textMuted: '#a3a3a3' },
      ),
    ),
    { featured: true, tags: ['default', 'violet'] },
  ),

  t(
    'frutiger-aero',
    'Frutiger Aero',
    'Glossy sky-and-grass optimism — glassy panels, aqua accents, Y2K nature vibes.',
    'retro',
    ['#5eb3d9', '#7ec850'],
    mergeTokens(
      brandScale(198, 72, '#3cb878'),
      surfaces(
        { surface: '#c8e8f8', panel: 'rgba(255,255,255,0.72)', elevated: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.65)', text: '#0c3d5c', textMuted: '#2a6a8a' },
        { surface: '#1a3a52', panel: 'rgba(30,70,100,0.85)', elevated: 'rgba(40,90,120,0.7)', border: 'rgba(100,180,220,0.35)', text: '#e8f4fc', textMuted: '#8ec8e8' },
        '1rem',
      ),
    ),
    { featured: true, tags: ['aero', 'y2k', 'glossy', 'nature'], appearance: 'light' },
  ),

  t(
    'matte',
    'Matte',
    'Flat, muted surfaces with zero gloss — calm and distraction-free.',
    'cozy',
    ['#64748b', '#94a3b8'],
    mergeTokens(
      brandScale(215, 18, '#64748b'),
      surfaces(
        { surface: '#eef1f4', panel: '#f7f8fa', elevated: '#e2e6eb', border: '#d1d7de', text: '#1e293b', textMuted: '#64748b' },
        { surface: '#121416', panel: '#1a1c1f', elevated: '#22252a', border: '#2e3238', text: '#e8eaed', textMuted: '#9aa0a8' },
        '0.5rem',
      ),
    ),
    { featured: true, tags: ['flat', 'minimal', 'muted'] },
  ),

  t(
    'neumorphic',
    'Neumorphic',
    'Soft extruded buttons and gentle dual shadows — cozy and tactile.',
    'cozy',
    ['#d1d9e6', '#a8b8cc'],
    mergeTokens(
      brandScale(214, 28, '#7c9cb8'),
      surfaces(
        { surface: '#e0e5ec', panel: '#e0e5ec', elevated: '#e8edf4', border: '#c8d0dc', text: '#3d4f63', textMuted: '#6b7d92' },
        { surface: '#2d3436', panel: '#2d3436', elevated: '#353b3d', border: '#404648', text: '#dfe6e9', textMuted: '#95a5a6' },
        '1.25rem',
      ),
    ),
    { featured: true, tags: ['soft', 'squishy', 'shadows'], appearance: 'light' },
  ),

  t(
    'beach-day',
    'Beach Day',
    'Warm sand, sunny sky, and breezy coastal colours.',
    'nature',
    ['#f4c97a', '#5eb8e8'],
    mergeTokens(
      brandScale(38, 85, '#3aa8dc'),
      surfaces(
        { surface: '#fef6e8', panel: '#fffaf2', elevated: '#fcefd8', border: '#f0dcc0', text: '#5c3d1e', textMuted: '#9a7350' },
        { surface: '#1a2838', panel: '#243448', elevated: '#2e4058', border: '#3a5068', text: '#fef6e8', textMuted: '#c8b898' },
        '1rem',
      ),
    ),
    { featured: true, tags: ['beach', 'summer', 'warm'], appearance: 'light' },
  ),

  t(
    'alpine',
    'Alpine',
    'Cool lake blues, pine greens, and overcast mountain light.',
    'nature',
    ['#3d6b8a', '#2d5a40'],
    mergeTokens(
      brandScale(205, 45, '#3d7a58'),
      surfaces(
        { surface: '#e8eef2', panel: '#f2f6f8', elevated: '#dce4ea', border: '#c5d0da', text: '#1a3040', textMuted: '#5a7080' },
        { surface: '#0f1a22', panel: '#152028', elevated: '#1c2830', border: '#2a3844', text: '#d8e4ec', textMuted: '#7a9098' },
      ),
    ),
    { featured: true, tags: ['forest', 'water', 'cool'] },
  ),

  t(
    'sunset',
    'Sunset',
    'Warm orange-pink gradients with cozy evening tones.',
    'vibrant',
    ['#f97316', '#ec4899'],
    mergeTokens(
      brandScale(18, 90, '#ec4899'),
      surfaces(
        { surface: '#fff5f0', panel: '#fffaf7', elevated: '#ffe8dc', border: '#ffd0b8', text: '#4a2010', textMuted: '#9a5840' },
        { surface: '#1a0a12', panel: '#241018', elevated: '#301820', border: '#482830', text: '#ffe8dc', textMuted: '#c88878' },
      ),
    ),
    { featured: true, tags: ['warm', 'gradient', 'cozy'], appearance: 'dark' },
  ),

  t(
    'space',
    'Space',
    'Deep cosmic purples, nebula accents, and starfield darkness.',
    'dark',
    ['#6366f1', '#a855f7'],
    mergeTokens(
      brandScale(265, 75, '#c084fc'),
      surfaces(
        { surface: '#0f0a1a', panel: '#16102a', elevated: '#1e1638', border: '#2e2450', text: '#ede9fe', textMuted: '#a89cc8' },
        { surface: '#050308', panel: '#0a0614', elevated: '#100a1e', border: '#1a1230', text: '#f5f3ff', textMuted: '#9080b8' },
      ),
    ),
    { featured: true, tags: ['cosmic', 'purple', 'stars'], appearance: 'dark' },
  ),

  t(
    'forest',
    'Forest',
    'Rich greens and earthy browns — the outdoors on your screen.',
    'nature',
    ['#166534', '#84cc16'],
    mergeTokens(
      brandScale(145, 55, '#65a30d'),
      surfaces(
        { surface: '#eef5ea', panel: '#f6faf2', elevated: '#dfebd4', border: '#c8dbb8', text: '#1a3010', textMuted: '#4a6840' },
        { surface: '#0a1208', panel: '#101a0c', elevated: '#162210', border: '#243818', text: '#e8f0e0', textMuted: '#88a878' },
      ),
    ),
    { tags: ['green', 'nature', 'earth'] },
  ),

  t(
    'hacker',
    'Hacker',
    'Neon green terminal aesthetic on a black canvas.',
    'dark',
    ['#22c55e', '#4ade80'],
    mergeTokens(
      brandScale(142, 85, '#4ade80'),
      surfaces(
        { surface: '#0a0f0a', panel: '#0d140d', elevated: '#111a11', border: '#1a3020', text: '#4ade80', textMuted: '#228838' },
        { surface: '#000000', panel: '#050805', elevated: '#0a100a', border: '#143020', text: '#4ade80', textMuted: '#1a6028' },
        '0.25rem',
      ),
    ),
    { tags: ['terminal', 'neon', 'matrix'], appearance: 'dark' },
  ),

  t(
    'xp-luna',
    'Windows XP Luna',
    'Classic Luna blue title bars, cream panels, and beveled controls.',
    'retro',
    ['#0058e6', '#ece9d8'],
    mergeTokens(
      brandScale(220, 95, '#0058e6'),
      surfaces(
        { surface: '#ece9d8', panel: '#ffffff', elevated: '#f5f4ea', border: '#aca899', text: '#000000', textMuted: '#444444' },
        { surface: '#ece9d8', panel: '#ffffff', elevated: '#f0efe6', border: '#999088', text: '#000000', textMuted: '#555555' },
        '0.375rem',
      ),
    ),
    { tags: ['windows', 'xp', 'classic'], appearance: 'light' },
  ),

  t(
    'retro-crt',
    'Retro CRT',
    'Amber phosphor glow with subtle scanline texture.',
    'retro',
    ['#ffb000', '#cc8800'],
    mergeTokens(
      brandScale(40, 100, '#ffb000'),
      surfaces(
        { surface: '#0c0a00', panel: '#121000', elevated: '#1a1600', border: '#2a2200', text: '#ffb000', textMuted: '#886600' },
        { surface: '#080600', panel: '#0e0c00', elevated: '#141100', border: '#221c00', text: '#ffc820', textMuted: '#705010' },
        '0.25rem',
      ),
    ),
    { tags: ['crt', 'terminal', 'amber'], appearance: 'dark' },
  ),

  t(
    'arctic-aurora',
    'Arctic Aurora',
    'Polar night backgrounds with icy surfaces and aurora accents.',
    'dark',
    ['#22d3ee', '#818cf8'],
    mergeTokens(
      brandScale(190, 70, '#818cf8'),
      surfaces(
        { surface: '#0a1418', panel: '#0f1c22', elevated: '#142430', border: '#1e3848', text: '#e0f4fa', textMuted: '#6898a8' },
        { surface: '#060c10', panel: '#0a1218', elevated: '#0e1820', border: '#183040', text: '#e8f8ff', textMuted: '#508898' },
      ),
    ),
    { tags: ['ice', 'aurora', 'calm'], appearance: 'dark' },
  ),

  t(
    'strawberry-milk',
    'Strawberry Milk',
    'Soft strawberry pink over a creamy milk background.',
    'vibrant',
    ['#f472b6', '#fce7f3'],
    mergeTokens(
      brandScale(330, 75, '#ec4899'),
      surfaces(
        { surface: '#fff5f8', panel: '#fffafc', elevated: '#fce8f0', border: '#f5d0e0', text: '#5c2038', textMuted: '#a06078' },
        { surface: '#1a0810', panel: '#241018', elevated: '#301820', border: '#482830', text: '#fce8f0', textMuted: '#c08098' },
        '1rem',
      ),
    ),
    { tags: ['pink', 'sweet', 'soft'], appearance: 'light' },
  ),

  t(
    'coral',
    'Coral',
    'Coral pinks paired with deep teal complements.',
    'vibrant',
    ['#fb7185', '#14b8a6'],
    mergeTokens(
      brandScale(350, 80, '#14b8a6'),
      surfaces(
        { surface: '#fff8f6', panel: '#fffcfa', elevated: '#ffe8e4', border: '#ffd0c8', text: '#4a1820', textMuted: '#986058' },
        { surface: '#140808', panel: '#1c1010', elevated: '#281818', border: '#402828', text: '#ffe8e4', textMuted: '#c88880' },
      ),
    ),
    { tags: ['coral', 'teal', 'tropical'] },
  ),

  t(
    'pink-dream',
    'Pink Dream',
    'Vibrant pink gradients with playful pop aesthetics.',
    'vibrant',
    ['#ec4899', '#f472b6'],
    mergeTokens(
      brandScale(330, 85, '#f472b6'),
      surfaces(
        { surface: '#fdf2f8', panel: '#fef7fb', elevated: '#fce7f3', border: '#f9c8e0', text: '#500724', textMuted: '#9d4070' },
        { surface: '#180810', panel: '#200a18', elevated: '#2a1020', border: '#401830', text: '#fce7f3', textMuted: '#d080a8' },
      ),
    ),
    { tags: ['pink', 'sparkly', 'fun'] },
  ),

  t(
    'rainforest',
    'Rainforest',
    'Deep jungle greens with humid, shadowy undertones.',
    'nature',
    ['#15803d', '#065f46'],
    mergeTokens(
      brandScale(155, 60, '#0d9488'),
      surfaces(
        { surface: '#ecfdf5', panel: '#f0fdf4', elevated: '#d1fae5', border: '#a7f3d0', text: '#052e16', textMuted: '#166534' },
        { surface: '#041008', panel: '#081810', elevated: '#0c2018', border: '#143028', text: '#d1fae5', textMuted: '#4ade80' },
      ),
    ),
    { tags: ['jungle', 'green', 'deep'], appearance: 'dark' },
  ),

  t(
    'monochrome',
    'Monochrome',
    'Pure black and white — no colour, maximum clarity.',
    'cozy',
    ['#525252', '#a3a3a3'],
    mergeTokens(
      brandScale(0, 0, '#737373'),
      surfaces(
        { surface: '#fafafa', panel: '#ffffff', elevated: '#f5f5f5', border: '#e5e5e5', text: '#171717', textMuted: '#737373' },
        { surface: '#000000', panel: '#0a0a0a', elevated: '#141414', border: '#262626', text: '#fafafa', textMuted: '#a3a3a3' },
        '0.375rem',
      ),
    ),
    { tags: ['gray', 'minimal', 'bw'] },
  ),
]

export const DEFAULT_AESTHETIC_ID = 'default'

const themeMap = new Map(AESTHETIC_THEMES.map((theme) => [theme.id, theme]))

export function getAestheticTheme(id: string): AestheticTheme | undefined {
  return themeMap.get(id)
}

export function isAestheticThemeId(id: string | null): id is string {
  return !!id && themeMap.has(id)
}

export const AESTHETIC_THEME_COUNT = AESTHETIC_THEMES.length

export const AESTHETIC_CATEGORIES: { id: AestheticCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'featured', label: 'Featured' },
  { id: 'retro', label: 'Retro' },
  { id: 'nature', label: 'Nature' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'dark', label: 'Dark' },
  { id: 'vibrant', label: 'Vibrant' },
]

export function filterAestheticThemes(query: string, category: AestheticCategory): AestheticTheme[] {
  const q = query.trim().toLowerCase()
  return AESTHETIC_THEMES.filter((theme) => {
    if (category !== 'all') {
      if (category === 'featured' && !theme.featured) return false
      if (category !== 'featured' && theme.category !== category) return false
    }
    if (!q) return true
    return theme.name.toLowerCase().includes(q)
      || theme.description.toLowerCase().includes(q)
      || theme.tags.some((tag) => tag.includes(q))
  })
}

export { AESTHETIC_THEMES }
