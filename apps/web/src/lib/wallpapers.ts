export type WallpaperCategory = 'all' | 'nature' | 'city' | 'abstract' | 'minimal' | 'custom'

export interface WallpaperPreset {
  id: string
  name: string
  category: Exclude<WallpaperCategory, 'all' | 'custom'>
  /** Full-size image URL */
  url: string
  /** Thumbnail for the store grid */
  thumb: string
}

const CATEGORIES: { key: Exclude<WallpaperCategory, 'all' | 'custom'>; label: string; prefix: string; count: number }[] = [
  { key: 'nature', label: 'Nature', prefix: 'nature', count: 40 },
  { key: 'city', label: 'City', prefix: 'city', count: 40 },
  { key: 'abstract', label: 'Abstract', prefix: 'abstract', count: 40 },
  { key: 'minimal', label: 'Minimal', prefix: 'minimal', count: 40 },
]

function picsum(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/blinkr-${seed}/${w}/${h}`
}

function buildPresets(): WallpaperPreset[] {
  const presets: WallpaperPreset[] = []
  for (const cat of CATEGORIES) {
    for (let i = 0; i < cat.count; i++) {
      const seed = `${cat.prefix}-${i}`
      presets.push({
        id: seed,
        name: `${cat.label} ${i + 1}`,
        category: cat.key,
        url: picsum(seed, 1920, 1080),
        thumb: picsum(seed, 480, 320),
      })
    }
  }
  return presets
}

export const WALLPAPER_PRESETS = buildPresets()
export const WALLPAPER_COUNT = WALLPAPER_PRESETS.length

export const WALLPAPER_CATEGORIES: { id: WallpaperCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'nature', label: 'Nature' },
  { id: 'city', label: 'City' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'custom', label: 'Your photos' },
]

const presetById = new Map(WALLPAPER_PRESETS.map((p) => [p.id, p]))

export function getWallpaperPreset(id: string): WallpaperPreset | undefined {
  return presetById.get(id)
}

export function filterWallpapers(query: string, category: WallpaperCategory): WallpaperPreset[] {
  const q = query.trim().toLowerCase()
  return WALLPAPER_PRESETS.filter((item) => {
    if (category !== 'all' && category !== 'custom' && item.category !== category) return false
    if (category === 'custom') return false
    if (!q) return true
    return item.name.toLowerCase().includes(q) || item.id.includes(q)
  })
}

/** Resize and compress an image file for local storage */
export async function compressWallpaperFile(file: File, maxWidth = 1920): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not compress image'))),
      'image/jpeg',
      0.82,
    )
  })
  return blob
}
