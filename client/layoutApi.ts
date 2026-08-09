import {
	MAX_BLOCK_HEIGHT,
	MAX_BLOCK_WIDTH,
	type Rect,
} from './pageGeometry'

export type LayoutBlock = {
	shapeId: string
	ownerKey: string
	displayName: string
	status: 'reserved' | 'submitted'
	x: number
	y: number
	w: number
	h: number
	reservedAt: number
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

export async function apiGetLayout(roomId: string) {
	const res = await fetch(`/api/layout/${roomId}`)
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { blocks: LayoutBlock[] }
}

export async function apiPlaceBlock(
	roomId: string,
	body: {
		ownerKey: string
		displayName: string
		shapeId: string
		x: number
		y: number
		w?: number
		h?: number
	}
) {
	const res = await fetch(`/api/layout/${roomId}/place`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...body,
			w: body.w ?? MAX_BLOCK_WIDTH,
			h: body.h ?? MAX_BLOCK_HEIGHT,
		}),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true; nudged: boolean; block: LayoutBlock }
}

export async function apiSubmitBlock(
	roomId: string,
	body: { ownerKey: string; shapeId: string; w: number; h: number }
) {
	const res = await fetch(`/api/layout/${roomId}/submit`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true; block: LayoutBlock }
}

export async function apiReleaseBlock(
	roomId: string,
	body: { ownerKey: string; shapeId: string }
) {
	const res = await fetch(`/api/layout/${roomId}/release`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true }
}

export async function apiClearLayout(roomId: string) {
	const res = await fetch(`/api/layout/${roomId}/clear`, { method: 'POST' })
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true }
}

export async function apiRemoveBlock(roomId: string, shapeId: string) {
	const res = await fetch(`/api/layout/${roomId}/remove`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ shapeId }),
	})
	if (!res.ok) throw new Error(await readError(res))
	return (await res.json()) as { ok: true }
}

export type { Rect }
