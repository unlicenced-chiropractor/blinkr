const MAX_TEXT_FILE_BYTES = 64 * 1024

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)$/i
const TEXT_EXT = /\.(txt|md|markdown|json|csv|log|xml|ya?ml|html?|css|js|ts|tsx?|jsx?|py|rs|toml|ini|env|sh|bat|ps1)$/i

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT.test(file.name)
}

export function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  if (file.type === 'application/json') return true
  return TEXT_EXT.test(file.name)
}

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_TEXT_FILE_BYTES) {
    throw new Error(`Text file too large (max ${MAX_TEXT_FILE_BYTES / 1024}KB)`)
  }
  const text = await file.text()
  const trimmed = text.trim()
  if (!trimmed) throw new Error('File is empty')
  return trimmed
}

export function hasFilePayload(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false
  return [...dataTransfer.items].some((item) => item.kind === 'file')
}

export type DroppedFileKind = 'image' | 'text' | 'unsupported'

export function classifyFile(file: File): DroppedFileKind {
  if (isImageFile(file)) return 'image'
  if (isTextFile(file)) return 'text'
  return 'unsupported'
}
