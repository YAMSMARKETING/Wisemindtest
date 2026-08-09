/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_ADMIN_SECRET?: string
	readonly VITE_TLDRAW_LICENSE_KEY?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
