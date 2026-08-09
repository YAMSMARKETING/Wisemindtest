import {
	MAX_BLOCK_HEIGHT,
	MAX_BLOCK_WIDTH,
	MIN_BLOCK_GAP,
	PAGE_HEIGHT,
	PAGE_WIDTH,
	RESERVATION_TTL_MS,
	type Rect,
} from '../shared/pageGeometry'
import { nudgeToClearSpot } from '../shared/placement'

export type LayoutBlockStatus = 'reserved' | 'submitted'

export type LayoutBlock = {
	shapeId: string
	ownerKey: string
	displayName: string
	status: LayoutBlockStatus
	x: number
	y: number
	w: number
	h: number
	reservedAt: number
}

export type LayoutState = {
	blocks: LayoutBlock[]
}

const LAYOUT_KEY = 'scrapbook-layout'

export async function loadLayout(storage: DurableObjectStorage): Promise<LayoutState> {
	const existing = await storage.get<LayoutState>(LAYOUT_KEY)
	return existing ?? { blocks: [] }
}

export async function saveLayout(storage: DurableObjectStorage, state: LayoutState) {
	await storage.put(LAYOUT_KEY, state)
}

export function purgeExpired(state: LayoutState, now = Date.now()): LayoutState {
	const blocks = state.blocks.filter((block) => {
		if (block.status !== 'reserved') return true
		return now - block.reservedAt < RESERVATION_TTL_MS
	})
	return { blocks }
}

function occupiedRects(state: LayoutState, exceptShapeId?: string): Rect[] {
	return state.blocks
		.filter((b) => b.shapeId !== exceptShapeId)
		.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }))
}

export type PlaceRequest = {
	ownerKey: string
	displayName: string
	shapeId: string
	x: number
	y: number
	w?: number
	h?: number
}

export type PlaceResult =
	| { ok: true; block: LayoutBlock; nudged: boolean }
	| { ok: false; error: string; code: number }

export function placeBlock(state: LayoutState, req: PlaceRequest, now = Date.now()): PlaceResult {
	const cleaned = purgeExpired(state, now)

	if (!req.ownerKey || !req.shapeId) {
		return { ok: false, error: 'Missing ownerKey or shapeId', code: 400 }
	}

	const existingReserved = cleaned.blocks.find(
		(b) => b.ownerKey === req.ownerKey && b.status === 'reserved'
	)
	if (existingReserved) {
		return { ok: false, error: 'You already have a reserved block', code: 409 }
	}

	const w = Math.min(req.w ?? MAX_BLOCK_WIDTH, MAX_BLOCK_WIDTH)
	const h = Math.min(req.h ?? MAX_BLOCK_HEIGHT, MAX_BLOCK_HEIGHT)
	const desired = { x: req.x, y: req.y, w, h }
	const spot = nudgeToClearSpot(desired, occupiedRects(cleaned), {
		gap: MIN_BLOCK_GAP,
		pageW: PAGE_WIDTH,
		pageH: PAGE_HEIGHT,
	})

	if (!spot) {
		return { ok: false, error: 'Page is full — no clear spot for a new block', code: 409 }
	}

	const nudged = spot.x !== desired.x || spot.y !== desired.y
	const block: LayoutBlock = {
		shapeId: req.shapeId,
		ownerKey: req.ownerKey,
		displayName: req.displayName || 'Anonymous',
		status: 'reserved',
		x: spot.x,
		y: spot.y,
		w: spot.w,
		h: spot.h,
		reservedAt: now,
	}

	return {
		ok: true,
		nudged,
		block,
		// caller merges into state
	}
}

export function applyPlace(state: LayoutState, block: LayoutBlock): LayoutState {
	const cleaned = purgeExpired(state)
	return { blocks: [...cleaned.blocks.filter((b) => b.shapeId !== block.shapeId), block] }
}

export type SubmitRequest = {
	ownerKey: string
	shapeId: string
	w: number
	h: number
}

export function submitBlock(state: LayoutState, req: SubmitRequest, now = Date.now()): PlaceResult {
	const cleaned = purgeExpired(state, now)
	const block = cleaned.blocks.find((b) => b.shapeId === req.shapeId)
	if (!block) return { ok: false, error: 'Reservation not found', code: 404 }
	if (block.ownerKey !== req.ownerKey) return { ok: false, error: 'Not your block', code: 403 }
	if (block.status === 'submitted') {
		return { ok: true, nudged: false, block }
	}

	const w = Math.min(MAX_BLOCK_WIDTH, Math.max(1, Math.round(req.w)))
	const h = Math.min(MAX_BLOCK_HEIGHT, Math.max(1, Math.round(req.h)))
	const next: LayoutBlock = {
		...block,
		w,
		h,
		status: 'submitted',
	}

	return { ok: true, nudged: false, block: next }
}

export function applySubmit(state: LayoutState, block: LayoutBlock): LayoutState {
	return {
		blocks: state.blocks.map((b) => (b.shapeId === block.shapeId ? block : b)),
	}
}

export function releaseBlock(
	state: LayoutState,
	ownerKey: string,
	shapeId: string
): { ok: true; state: LayoutState } | { ok: false; error: string; code: number } {
	const block = state.blocks.find((b) => b.shapeId === shapeId)
	if (!block) return { ok: false, error: 'Not found', code: 404 }
	if (block.ownerKey !== ownerKey) return { ok: false, error: 'Not your block', code: 403 }
	if (block.status === 'submitted') {
		return { ok: false, error: 'Submitted blocks cannot be released', code: 409 }
	}
	return {
		ok: true,
		state: { blocks: state.blocks.filter((b) => b.shapeId !== shapeId) },
	}
}

export function clearLayout(): LayoutState {
	return { blocks: [] }
}

export function removeBlock(state: LayoutState, shapeId: string): LayoutState {
	return { blocks: state.blocks.filter((b) => b.shapeId !== shapeId) }
}
