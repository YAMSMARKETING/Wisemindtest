import {
	Box,
	createShapeId,
	Editor,
	TLFrameShape,
	TLShapeId,
	toRichText,
} from 'tldraw'
import {
	BLOCK_PADDING,
	MAX_BLOCK_HEIGHT,
	MAX_BLOCK_WIDTH,
	MIN_BLOCK_HEIGHT,
	MIN_BLOCK_WIDTH,
	PAGE_HEIGHT,
	PAGE_WIDTH,
	STARTER_BLOCK_HEIGHT,
	STARTER_BLOCK_WIDTH,
} from './pageGeometry'

export const BLOCK_META_KIND = 'scrapbook-block'

export type BlockStatus = 'reserved' | 'submitted'

export function isScrapbookBlock(shape: { type: string; meta: Record<string, unknown> }) {
	return shape.type === 'frame' && shape.meta.kind === BLOCK_META_KIND
}

/** @deprecated Use isScrapbookBlock — kept briefly so older shapes still match if any. */
export function isScrapbookTile(shape: { type: string; meta: Record<string, unknown> }) {
	return (
		isScrapbookBlock(shape) ||
		(shape.type === 'frame' && shape.meta.kind === 'scrapbook-tile')
	)
}

/** Content AABB inside a block, in the block's local coordinates. */
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

/**
 * Shrink a reserved block to the smallest size that fits its content + padding,
 * clamped to the max footprint. CHECK A: hand-placed / client-side only —
 * CHECK B adds DO collision-and-nudge for final placement.
 */
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
				return {
					id,
					type: child.type,
					x: child.x + dx,
					y: child.y + dy,
				}
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
		props: {
			w: width,
			h: height,
			name: block.props.name,
		},
		meta: {
			...block.meta,
			status: 'submitted' satisfies BlockStatus,
		},
	})

	return { width, height, before }
}

export type PlaceSampleBlockOpts = {
	ownerKey: string
	displayName: string
	/** Page-space top-left for the hand-placed sample (CHECK A — not server-nudged). */
	x?: number
	y?: number
}

/**
 * Hand-placed sample block for CHECK A: a clipping frame at max footprint with
 * content clustered in the upper-left so Submit visibly sizes down.
 */
export function placeSampleBlock(editor: Editor, opts: PlaceSampleBlockOpts) {
	const x = opts.x ?? Math.round(PAGE_WIDTH * 0.12)
	const y = opts.y ?? Math.round(PAGE_HEIGHT * 0.18)
	const blockId = createShapeId()
	const textId = createShapeId()
	const doodleId = createShapeId()
	const chipId = createShapeId()
	const innerW = STARTER_BLOCK_WIDTH - BLOCK_PADDING * 2

	editor.createShapes([
		{
			id: blockId,
			type: 'frame',
			x,
			y,
			props: {
				w: STARTER_BLOCK_WIDTH,
				h: STARTER_BLOCK_HEIGHT,
				name: opts.displayName || 'Sample block',
			},
			meta: {
				kind: BLOCK_META_KIND,
				ownerKey: opts.ownerKey,
				displayName: opts.displayName,
				status: 'reserved' satisfies BlockStatus,
				checkA: true,
			},
		},
		{
			id: textId,
			type: 'text',
			parentId: blockId,
			x: BLOCK_PADDING,
			y: BLOCK_PADDING,
			props: {
				size: 's',
				font: 'sans',
				textAlign: 'start',
				scale: 1,
				autoSize: false,
				w: Math.min(280, innerW),
				richText: toRichText(
					`${opts.displayName}\nA memory from Fayetteville — CHECK A sample.`
				),
			},
			meta: {
				displayName: opts.displayName,
			},
		},
		{
			id: doodleId,
			type: 'geo',
			parentId: blockId,
			x: BLOCK_PADDING,
			y: 110,
			props: {
				geo: 'ellipse',
				w: 200,
				h: 80,
				color: 'red',
				fill: 'semi',
				dash: 'draw',
				size: 'm',
			},
			meta: {
				displayName: opts.displayName,
			},
		},
		{
			id: chipId,
			type: 'geo',
			parentId: blockId,
			x: BLOCK_PADDING + 8,
			y: 210,
			props: {
				geo: 'rectangle',
				w: 160,
				h: 36,
				color: 'blue',
				fill: 'solid',
				dash: 'solid',
				size: 's',
				richText: toRichText('shrink me'),
			},
			meta: {
				displayName: opts.displayName,
			},
		},
	])

	editor.select(blockId)
	const bounds = editor.getShapePageBounds(blockId)
	if (bounds) {
		editor.zoomToBounds(bounds, { inset: 64, animation: { duration: 220 } })
	}

	return blockId
}

export function findOwnedReservedBlock(editor: Editor, ownerKey: string): TLShapeId | null {
	for (const shape of editor.getCurrentPageShapes()) {
		if (!isScrapbookTile(shape)) continue
		if (shape.meta.ownerKey !== ownerKey) continue
		if (shape.meta.status === 'submitted') continue
		return shape.id
	}
	return null
}
