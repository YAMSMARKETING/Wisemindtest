import { uniqueId } from 'tldraw'
import { OWNER_ID_STORAGE_KEY } from './constants'
import { getLocalStorageItem, setLocalStorageItem } from './localStorage'

/** Anonymous per-browser identity used for ownership-based deletion. */
export function getOrCreateOwnerId(): string {
	const existing = getLocalStorageItem(OWNER_ID_STORAGE_KEY)
	if (existing) return existing

	const ownerId = uniqueId()
	setLocalStorageItem(OWNER_ID_STORAGE_KEY, ownerId)
	return ownerId
}
