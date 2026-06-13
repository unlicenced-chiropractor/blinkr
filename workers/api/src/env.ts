export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  CHAT_ROOM: DurableObjectNamespace
  JWT_SECRET: string
  ENVIRONMENT: string
  B2_APPLICATION_KEY_ID?: string
  B2_APPLICATION_KEY?: string
  B2_BUCKET_NAME?: string
  B2_BUCKET_ID?: string
  /** When set (beta), fetch /media from this origin if blob is missing locally. */
  MEDIA_FALLBACK_ORIGIN?: string
}
