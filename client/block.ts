import {
	AssetRecordType,
	Box,
	createShapeId,
	Editor,
	TLAssetId,
	TLFrameShape,
	TLShapeId,
	toRichText,
} from 'tldraw'
import { apiPlaceBlock, apiSubmitBlock } from './layoutApi'
import {
	BLOCK_PADDING,
	MAX_BLOCK_HEIGHT,
	MAX_BLOCK_WIDTH,
	MIN_BLOCK_HEIGHT,
	MIN_BLOCK_WIDTH,
	PAGE_BOUNDS,
	STARTER_BLOCK_HEIGHT,
	STARTER_BLOCK_WIDTH,
} from './pageGeometry'

export const BLOCK_META_KIND = 'scrapbook-block'

export type BlockStatus = 'reserved' | 'submitted'

export function isScrapbookBlock(shape: { type: string; meta: Record<string, unknown> }) {
	return shape.type === 'frame' && shape.meta.kind === BLOCK_META_KIND
}

/** Accept legacy CHECK A tile meta during transition. */
export function isScrapbookTile(shape: { type: string; meta: Record<string, unknown> }) {
	return (
		isScrapbookBlock(shape) ||
		(shape.type === 'frame' && shape.meta.kind === 'scrapbook-tile')
	)
}

export function getShapeOwnerKey(shape: { meta: Record<string, unknown> }): string | null {
	const key = shape.meta.ownerKey ?? shape.meta.ownerId
	return typeof key === 'string' && key.length > 0 ? key : null
}

export function measureBlockContentBounds(editor: Editor, blockId: TLShapeId): Box | null {
	const childIds = editor.getSortedChildIdsForParent(blockId)
	if (childIds.length === 0) return null

	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const childId of childIds) {
		const child = editor.getShape(childId)
		if (!child) continue
		const geo = editor.getShapeGeometry(child)
		const b = geo.bounds
		const left = child.x + b.x
		const top = child.y + b.y
		const right = left + b.w
		const bottom = top + b.h
		minX = Math.min(minX, left)
		minY = Math.min(minY, top)
		maxX = Math.max(maxX, right)
		maxY = Math.max(maxY, bottom)
	}

	if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
	return new Box(minX, minY, maxX - minX, maxY - minY)
}

/** Local shrink only — call apiSubmitBlock after to lock server layout bounds. */
export function shrinkBlockToContent(editor: Editor, blockId: TLShapeId) {
	const block = editor.getShape(blockId) as TLFrameShape | undefined
	if (!block || !isScrapbookTile(block)) {
		throw new Error('Not a scrapbook block')
	}

	const content = measureBlockContentBounds(editor, blockId)
	const before = { width: block.props.w, height: block.props.h }

	if (!content) {
		editor.updateShape({
			id: blockId,
			type: 'frame',
			props: {
				w: MIN_BLOCK_WIDTH,
				h: MIN_BLOCK_HEIGHT,
				name: block.props.name,
			},
			meta: { ...block.meta, status: 'submitted' satisfies BlockStatus },
		})
		return { width: MIN_BLOCK_WIDTH, height: MIN_BLOCK_HEIGHT, before }
	}

	const dx = BLOCK_PADDING - content.x
	const dy = BLOCK_PADDING - content.y
	const childIds = editor.getSortedChildIdsForParent(blockId)
	if (dx !== 0 || dy !== 0) {
		editor.updateShapes(
			childIds.map((id) => {
				const child = editor.getShape(id)!
				return { id, type: child.type, x: child.x + dx, y: child.y + dy }
			})
		)
	}

	const fittedW = Math.round(content.w + BLOCK_PADDING * 2)
	const fittedH = Math.round(content.h + BLOCK_PADDING * 2)
	const width = Math.min(MAX_BLOCK_WIDTH, Math.max(MIN_BLOCK_WIDTH, fittedW))
	const height = Math.min(MAX_BLOCK_HEIGHT, Math.max(MIN_BLOCK_HEIGHT, fittedH))

	editor.updateShape({
		id: blockId,
		type: 'frame',
		props: { w: width, h: height, name: block.props.name },
		meta: { ...block.meta, status: 'submitted' satisfies BlockStatus },
	})

	return { width, height, before }
}

export function findOwnedReservedBlock(editor: Editor, ownerKey: string): TLShapeId | null {
	for (const shape of editor.getCurrentPageShapes()) {
		if (!isScrapbookTile(shape)) continue
		if (getShapeOwnerKey(shape) !== ownerKey) continue
		if (shape.meta.status === 'submitted') continue
		return shape.id
	}
	return null
}

export function getReservedBlockForOwner(editor: Editor, ownerKey: string) {
	const id = findOwnedReservedBlock(editor, ownerKey)
	return id ? (editor.getShape(id) as TLFrameShape | undefined) : undefined
}

/** Preferred place point: viewport center, clamped toward page. */
export function getPreferredPlacePoint(editor: Editor) {
	const bounds = editor.getViewportPageBounds()
	return {
		x: bounds.midX - STARTER_BLOCK_WIDTH / 2,
		y: bounds.midY - STARTER_BLOCK_HEIGHT / 2,
	}
}

export type PlaceBlockOpts = {
	roomId: string
	ownerKey: string
	displayName: string
	x?: number
	y?: number
}

/**
 * Server-authoritative place: reserve via DO (nudged if needed), then create the frame.
 */
export async function placeBlockOnServer(editor: Editor, opts: PlaceBlockOpts) {
	const existing = findOwnedReservedBlock(editor, opts.ownerKey)
	if (existing) return { shapeId: existing, nudged: false, alreadyHad: true as const }

	const preferred = opts.x != null && opts.y != null
		? { x: opts.x, y: opts.y }
		: getPreferredPlacePoint(editor)

	const shapeId = createShapeId()
	const { block, nudged } = await apiPlaceBlock(opts.roomId, {
		ownerKey: opts.ownerKey,
		displayName: opts.displayName,
		shapeId,
		x: preferred.x,
		y: preferred.y,
		w: STARTER_BLOCK_WIDTH,
		h: STARTER_BLOCK_HEIGHT,
	})

	editor.createShape({
		id: shapeId,
		type: 'frame',
		x: block.x,
		y: block.y,
		props: {
			w: block.w,
			h: block.h,
			name: opts.displayName || 'Your memory',
		},
		meta: {
			kind: BLOCK_META_KIND,
			ownerKey: opts.ownerKey,
			ownerId: opts.ownerKey,
			displayName: opts.displayName,
			status: 'reserved' satisfies BlockStatus,
		},
	})

	// Seed a caption so the block isn't empty.
	editor.createShape({
		type: 'text',
		parentId: shapeId,
		x: BLOCK_PADDING,
		y: BLOCK_PADDING,
		props: {
			size: 's',
			font: 'sans',
			textAlign: 'start',
			scale: 1,
			autoSize: false,
			w: Math.min(280, block.w - BLOCK_PADDING * 2),
			richText: toRichText(`${opts.displayName}\nWrite your memory here.`),
		},
		meta: {
			ownerKey: opts.ownerKey,
			ownerId: opts.ownerKey,
			displayName: opts.displayName,
		},
	})

	editor.select(shapeId)
	const pageBounds = editor.getShapePageBounds(shapeId)
	if (pageBounds) {
		editor.zoomToBounds(pageBounds, { inset: 64, animation: { duration: 220 } })
	} else {
		editor.zoomToBounds(PAGE_BOUNDS, { inset: 48, animation: { duration: 220 } })
	}

	return { shapeId, nudged, alreadyHad: false as const, block }
}

export async function submitBlockOnServer(
	editor: Editor,
	opts: { roomId: string; ownerKey: string; blockId: TLShapeId }
) {
	const size = shrinkBlockToContent(editor, opts.blockId)
	await apiSubmitBlock(opts.roomId, {
		ownerKey: opts.ownerKey,
		shapeId: opts.blockId,
		w: size.width,
		h: size.height,
	})

	// Lock the frame visually
	const block = editor.getShape(opts.blockId) as TLFrameShape | undefined
	if (block) {
		editor.updateShape({
			id: opts.blockId,
			type: 'frame',
			meta: { ...block.meta, status: 'submitted' satisfies BlockStatus, locked: true },
		})
	}

	editor.select(opts.blockId)
	const bounds = editor.getShapePageBounds(opts.blockId)
	if (bounds) editor.zoomToBounds(bounds, { inset: 64, animation: { duration: 220 } })

	return size
}

/** Count images owned by ownerKey that are stickers or photos. */
export function countOwnedMedia(
	editor: Editor,
	ownerKey: string,
	kind: 'image' | 'sticker'
) {
	let count = 0
	for (const shape of editor.getCurrentPageShapes()) {
		if (getShapeOwnerKey(shape) !== ownerKey) continue
		if (kind === 'sticker') {
			if (shape.meta.kind === 'sticker') count++
		} else if (shape.type === 'image' && shape.meta.kind !== 'sticker') {
			count++
		}
	}
	return count
}

export function createStickerAsset(editor: Editor, svg: string, name: string): TLAssetId {
	const assetId = AssetRecordType.createId()
	const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
	editor.createAssets([
		{
			id: assetId,
			type: 'image',
			typeName: 'asset',
			props: {
				name,
				src,
				w: 96,
				h: 96,
				mimeType: 'image/svg+xml',
				isAnimated: false,
			},
			meta: {},
		},
	])
	return assetId
}
