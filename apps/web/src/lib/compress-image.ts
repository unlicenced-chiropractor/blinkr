export interface CompressImageOptions {
  maxWidth: number
  maxHeight: number
  maxBytes: number
  initialQuality?: number
  minQuality?: number
}

export const AVATAR_IMAGE_OPTIONS: CompressImageOptions = {
  maxWidth: 512,
  maxHeight: 512,
  maxBytes: 400 * 1024,
  initialQuality: 0.88,
  minQuality: 0.55,
}

export const CHAT_IMAGE_OPTIONS: CompressImageOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  maxBytes: 900 * 1024,
  initialQuality: 0.85,
  minQuality: 0.5,
}

const OUTPUT_TYPE = 'image/jpeg'
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (IMAGE_EXT.test(file.name)) return true
  return file.type === '' || file.type === 'application/octet-stream'
}

function scaledSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function outputName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}.jpg`
}

async function loadImageSource(file: File): Promise<{
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  width: number
  height: number
  cleanup: () => void
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => {
          ctx.drawImage(bitmap, 0, 0, width, height)
        },
        cleanup: () => bitmap.close(),
      }
    } catch {
      // Fall through to HTMLImageElement (some formats differ by browser)
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not load image'))
      el.src = url
    })

    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, width, height) => {
        ctx.drawImage(img, 0, 0, width, height)
      },
      cleanup: () => {},
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      OUTPUT_TYPE,
      quality,
    )
  })
}

async function renderCompressed(
  file: File,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const source = await loadImageSource(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Compression failed')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    source.draw(ctx, width, height)

    return canvasToBlob(canvas, quality)
  } finally {
    source.cleanup()
  }
}

export async function compressImage(file: File, options: CompressImageOptions): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error('Not an image file')
  }

  if (file.type === 'image/gif') {
    if (file.size > options.maxBytes) {
      throw new Error(`GIF must be under ${Math.floor(options.maxBytes / 1024)}KB`)
    }
    return file
  }

  const initialQuality = options.initialQuality ?? 0.85
  const minQuality = options.minQuality ?? 0.5

  const probe = await loadImageSource(file)
  const origWidth = probe.width
  const origHeight = probe.height
  probe.cleanup()

  let { width, height } = scaledSize(origWidth, origHeight, options.maxWidth, options.maxHeight)

  for (let attempt = 0; attempt < 8; attempt++) {
    for (let quality = initialQuality; quality >= minQuality; quality -= 0.07) {
      const blob = await renderCompressed(file, width, height, quality)
      if (blob.size <= options.maxBytes) {
        return new File([blob], outputName(file), { type: OUTPUT_TYPE, lastModified: Date.now() })
      }
    }

    width = Math.max(1, Math.round(width * 0.85))
    height = Math.max(1, Math.round(height * 0.85))
  }

  throw new Error('Image is too large — try a smaller photo')
}
