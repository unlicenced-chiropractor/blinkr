export interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  CHAT_ROOM: DurableObjectNamespace
  JWT_SECRET: string
  ENVIRONMENT: string
}
