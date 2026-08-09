import { getLocalStorageItem, setLocalStorageItem } from './localStorage'

export const INSTAGRAM_HANDLE_STORAGE_KEY = 'villescrapbook-instagram-handle'

/** Normalize to a bare handle without leading @. */
export function normalizeInstagramHandle(raw: string): string {
	return raw.trim().replace(/^@+/, '').toLowerCase()
}

export function isValidInstagramHandle(raw: string): boolean {
	const handle = normalizeInstagramHandle(raw)
	// Instagram allows 1–30 letters, numbers, periods, underscores.
	return /^[a-z0-9._]{1,30}$/.test(handle)
}

export function getStoredInstagramHandle(): string | null {
	const existing = getLocalStorageItem(INSTAGRAM_HANDLE_STORAGE_KEY)
	if (!existing || !isValidInstagramHandle(existing)) return null
	return normalizeInstagramHandle(existing)
}

export function storeInstagramHandle(raw: string): string {
	const handle = normalizeInstagramHandle(raw)
	if (!isValidInstagramHandle(handle)) {
		throw new Error('Enter a valid Instagram handle')
	}
	setLocalStorageItem(INSTAGRAM_HANDLE_STORAGE_KEY, handle)
	return handle
}
