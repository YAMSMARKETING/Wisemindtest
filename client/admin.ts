import { ADMIN_SECRET } from './constants'

/** Client-side admin gate via `?admin=SECRET`. Not real security. */
export function isAdminFromSearch(search = window.location.search): boolean {
	const params = new URLSearchParams(search)
	const secret = params.get('admin')
	return Boolean(secret && secret === ADMIN_SECRET)
}
