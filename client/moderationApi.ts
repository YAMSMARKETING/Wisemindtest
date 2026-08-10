import type { LayoutBlock } from './layoutApi'

export type ContributorRecord = {
	ownerKey: string
	name: string | null
	handle: string | null
	displayName: string
	createdAt: number
	updatedAt: number
}

export type BanRecord = {
	ownerKey?: string
	handle?: string
	displayName?: string
	reason?: string
	bannedAt: number
}

async function readError(res: Response) {
	try {
		const data = (await res.json()) as { error?: string }
		if (data?.error) return data.error
	} catch {
		// ignore
	}
	return res.statusText || `HTTP ${res.status}`
}

export async function apiRegisterContributor(
	roomId: string,
	body: {
		ownerKey: string
		name: string | null
		handle: string | null
		displayName: string
	}
) {
	const res = await fetch(`/api/moderation/${roomId}/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true; contributor: ContributorRecord }
}

export async function apiGetModeration(roomId: string) {
	const res = await fetch(`/api/moderation/${roomId}`)
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as {
		contributors: Record<string, ContributorRecord>
		bans: BanRecord[]
		blocks: LayoutBlock[]
	}
}

export async function apiBanContributor(
	roomId: string,
	body: {
		ownerKey?: string
		handle?: string
		displayName?: string
		reason?: string
		shapeId?: string
	}
) {
	const res = await fetch(`/api/moderation/${roomId}/ban`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true }
}

export async function apiUnbanContributor(
	roomId: string,
	body: { ownerKey?: string; handle?: string }
) {
	const res = await fetch(`/api/moderation/${roomId}/unban`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true }
}

export async function apiCheckBan(
	roomId: string,
	opts: { ownerKey: string; handle?: string | null; displayName?: string | null }
) {
	const params = new URLSearchParams({ ownerKey: opts.ownerKey })
	if (opts.handle) params.set('handle', opts.handle)
	if (opts.displayName) params.set('displayName', opts.displayName)
	const res = await fetch(`/api/moderation/${roomId}/check?${params}`)
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { banned: boolean }
}
