import type { Env } from '../env'

interface B2Auth {
  authorizationToken: string
  apiUrl: string
  downloadUrl: string
  expiresAt: number
}

interface B2UploadTarget {
  uploadUrl: string
  authorizationToken: string
  expiresAt: number
}

let cachedAuth: B2Auth | null = null
let cachedUpload: B2UploadTarget | null = null

function b2Configured(env: Env): boolean {
  return Boolean(
    env.B2_APPLICATION_KEY_ID
    && env.B2_APPLICATION_KEY
    && env.B2_BUCKET_NAME
    && env.B2_BUCKET_ID,
  )
}

async function sha1Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function authorize(env: Env): Promise<B2Auth> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now()) return cachedAuth

  const credentials = btoa(`${env.B2_APPLICATION_KEY_ID}:${env.B2_APPLICATION_KEY}`)
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${credentials}` },
  })
  if (!res.ok) {
    throw new Error(`B2 authorize failed: ${res.status}`)
  }

  const data = await res.json<{
    authorizationToken: string
    apiUrl: string
    downloadUrl: string
  }>()

  cachedAuth = {
    authorizationToken: data.authorizationToken,
    apiUrl: data.apiUrl,
    downloadUrl: data.downloadUrl,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  }
  return cachedAuth
}

async function getUploadTarget(env: Env, auth: B2Auth): Promise<B2UploadTarget> {
  if (cachedUpload && cachedUpload.expiresAt > Date.now()) return cachedUpload

  const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId: env.B2_BUCKET_ID }),
  })
  if (!res.ok) {
    throw new Error(`B2 get upload URL failed: ${res.status}`)
  }

  const data = await res.json<{ uploadUrl: string; authorizationToken: string }>()
  cachedUpload = {
    uploadUrl: data.uploadUrl,
    authorizationToken: data.authorizationToken,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  }
  return cachedUpload
}

export function isB2Enabled(env: Env): boolean {
  return b2Configured(env)
}

function b2EncodeFileName(fileName: string): string {
  return fileName.split('/').map(encodeURIComponent).join('/')
}

export async function putB2Object(
  env: Env,
  key: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  if (!b2Configured(env)) throw new Error('B2 is not configured')

  const auth = await authorize(env)
  const upload = await getUploadTarget(env, auth)
  const sha1 = await sha1Hex(data)

  const res = await fetch(upload.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: upload.authorizationToken,
      'X-Bz-File-Name': b2EncodeFileName(key),
      'Content-Type': contentType,
      'X-Bz-Content-Sha1': sha1,
      'Content-Length': String(data.byteLength),
    },
    body: data,
  })

  if (!res.ok) {
    cachedUpload = null
    throw new Error(`B2 upload failed: ${res.status}`)
  }
}

export async function getB2Object(
  env: Env,
  key: string,
): Promise<{ contentType: string; data: ArrayBuffer } | null> {
  if (!b2Configured(env)) return null

  const auth = await authorize(env)
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  const url = `${auth.downloadUrl}/file/${env.B2_BUCKET_NAME}/${encodedKey}`

  const res = await fetch(url, {
    headers: { Authorization: auth.authorizationToken },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    if (res.status === 401) cachedAuth = null
    throw new Error(`B2 download failed: ${res.status}`)
  }

  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream'
  return { contentType, data: await res.arrayBuffer() }
}
