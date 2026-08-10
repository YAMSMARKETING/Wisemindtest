import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './localStorage'
import {
	isValidInstagramHandle,
	normalizeInstagramHandle,
} from './instagramHandle'

export const IDENTITY_STORAGE_KEY = 'villescrapbook-identity'

export type StoredIdentity = {
	name: string | null
	handle: string | null
	displayName: string
}

/** Instagram handle wins for display credit; otherwise the typed name. */
export function resolveDisplayName(name: string | null | undefined, handle: string | null | undefined) {
	const normalizedHandle = handle ? normalizeInstagramHandle(handle) : ''
	const trimmedName = (name ?? '').trim()
	if (normalizedHandle && isValidInstagramHandle(normalizedHandle)) {
		return `@${normalizedHandle}`
	}
	if (trimmedName.length > 0) return trimmedName
	return null
}

export function validateIdentityInput(nameRaw: string, handleRaw: string): StoredIdentity {
	const name = nameRaw.trim() || null
	const handle = handleRaw.trim()
		? normalizeInstagramHandle(handleRaw)
		: null

	if (handle && !isValidInstagramHandle(handle)) {
		throw new Error('Handle: use letters, numbers, . or _')
	}
	if (!name && !handle) {
		throw new Error('Enter a name, an Instagram handle, or both')
	}
	if (name && name.length > 48) {
		throw new Error('Name must be 48 characters or fewer')
	}

	const displayName = resolveDisplayName(name, handle)
	if (!displayName) throw new Error('Enter a name, an Instagram handle, or both')

	return { name, handle, displayName }
}

export function getStoredIdentity(): StoredIdentity | null {
	const raw = getLocalStorageItem(IDENTITY_STORAGE_KEY)
	if (!raw) {
		// Migrate legacy handle-only storage if present
		const legacy = getLocalStorageItem('villescrapbook-instagram-handle')
		if (legacy && isValidInstagramHandle(legacy)) {
			const migrated = validateIdentityInput('', legacy)
			storeIdentity(migrated)
			return migrated
		}
		return null
	}
	try {
		const parsed = JSON.parse(raw) as Partial<StoredIdentity>
		const displayName = resolveDisplayName(parsed.name ?? null, parsed.handle ?? null)
		if (!displayName) return null
		return {
			name: parsed.name?.trim() || null,
			handle: parsed.handle ? normalizeInstagramHandle(parsed.handle) : null,
			displayName,
		}
	} catch {
		return null
	}
}

export function storeIdentity(identity: StoredIdentity): StoredIdentity {
	setLocalStorageItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity))
	return identity
}

export function clearStoredIdentity() {
	removeLocalStorageItem(IDENTITY_STORAGE_KEY)
}
