/** Everyone joins this single shared Durable Object room. */
export const SHARED_ROOM_ID = 'communal-whiteboard'

/** Max upload size for images/videos (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/**
 * Admin gate secret. Prefer setting VITE_ADMIN_SECRET in production.
 * Enter admin with `?admin=<secret>`.
 */
export const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'communal-admin'

/** Optional hobby/commercial license for production HTTPS. */
export const TLDRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY || undefined

export const OWNER_ID_STORAGE_KEY = 'communal-whiteboard-owner-id'
