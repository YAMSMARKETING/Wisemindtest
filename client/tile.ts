import {
	Box,
	createShapeId,
	Editor,
	TLFrameShape,
	TLShapeId,
	toRichText,
} from 'tldraw'
import {
	COLUMN_WIDTH,
	MAX_TILE_HEIGHT,
	MIN_TILE_HEIGHT,
	STARTER_TILE_HEIGHT,
	TILE_PADDING,
	columnX,
} from './pageGeometry'

export const TILE_META_KIND = 'scrapbook-tile'

export type TileStatus = 'claimed' | 'submitted'

export function isScrapbookTile(shape: { type: string; meta: Record<string, unknown> }) {
	return shape.type === 'frame' && shape.meta.kind === TILE_META_KIND
}

/** Content AABB inside a tile, in the tile's local coordinates. */
export function measureTileContentBounds(editor: Editor, tileId: TLShapeId): Box | null {
	const childIds = editor.getSortedChildIdsForParent(tileId)
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
 * Shrink a claimed tile to the smallest height that fits its content + padding.
 * Width stays one column (masonry). Children are shifted so content sits at the
 * top-left padding inset. CHECK A: hand-placed / client-side only — CHECK B
 * moves final placement into the Durable Object.
 */
export function shrinkTileToContent(editor: Editor, tileId: TLShapeId) {
	const tile = editor.getShape(tileId) as TLFrameShape | undefined
	if (!tile || !isScrapbookTile(tile)) {
		throw new Error('Not a scrapbook tile')
	}

	const content = measureTileContentBounds(editor, tileId)
	const width = COLUMN_WIDTH

	if (!content) {
		editor.updateShape({
			id: tileId,
			type: 'frame',
			props: { w: width, h: MIN_TILE_HEIGHT, name: tile.props.name },
			meta: { ...tile.meta, status: 'submitted' satisfies TileStatus },
		})
		return { width, height: MIN_TILE_HEIGHT, beforeHeight: tile.props.h }
	}

	const dx = TILE_PADDING - content.x
	const dy = TILE_PADDING - content.y

	const childIds = editor.getSortedChildIdsForParent(tileId)
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

	const fittedH = Math.round(content.h + TILE_PADDING * 2)
	const height = Math.min(MAX_TILE_HEIGHT, Math.max(MIN_TILE_HEIGHT, fittedH))

	editor.updateShape({
		id: tileId,
		type: 'frame',
		props: {
			w: width,
			h: height,
			name: tile.props.name,
		},
		meta: {
			...tile.meta,
			status: 'submitted' satisfies TileStatus,
		},
	})

	return { width, height, beforeHeight: tile.props.h }
}

export type PlaceSampleTileOpts = {
	ownerKey: string
	displayName: string
	/** Column index for the hand-placed sample (CHECK A — not server-assigned). */
	columnIndex?: number
	/** Vertical offset in page units. */
	y?: number
}

/**
 * Hand-placed sample tile for CHECK A: a clipping frame with content clustered
 * in the top ~240px of a 480px starter, so Submit visibly reclaims unused space.
 */
export function placeSampleTile(editor: Editor, opts: PlaceSampleTileOpts) {
	const columnIndex = opts.columnIndex ?? 1
	const x = columnX(columnIndex)
	const y = opts.y ?? 80
	const tileId = createShapeId()
	const textId = createShapeId()
	const doodleId = createShapeId()
	const chipId = createShapeId()
	const innerW = COLUMN_WIDTH - TILE_PADDING * 2

	editor.createShapes([
		{
			id: tileId,
			type: 'frame',
			x,
			y,
			props: {
				w: COLUMN_WIDTH,
				h: STARTER_TILE_HEIGHT,
				name: opts.displayName || 'Sample tile',
			},
			meta: {
				kind: TILE_META_KIND,
				ownerKey: opts.ownerKey,
				displayName: opts.displayName,
				status: 'claimed' satisfies TileStatus,
				checkA: true,
			},
		},
		{
			id: textId,
			type: 'text',
			parentId: tileId,
			x: TILE_PADDING,
			y: TILE_PADDING,
			props: {
				size: 's',
				font: 'sans',
				textAlign: 'start',
				scale: 1,
				w: innerW,
				richText: toRichText(
					`${opts.displayName}\nA memory from Fayetteville — CHECK A sample.`
				),
			},
			meta: {
				ownerKey: opts.ownerKey,
				displayName: opts.displayName,
			},
		},
		{
			id: doodleId,
			type: 'geo',
			parentId: tileId,
			x: TILE_PADDING,
			y: 100,
			props: {
				geo: 'ellipse',
				w: innerW,
				h: 72,
				color: 'red',
				fill: 'semi',
				dash: 'draw',
				size: 'm',
			},
			meta: {
				ownerKey: opts.ownerKey,
				displayName: opts.displayName,
			},
		},
		{
			id: chipId,
			type: 'geo',
			parentId: tileId,
			x: TILE_PADDING + 8,
			y: 190,
			props: {
				geo: 'rectangle',
				w: innerW - 16,
				h: 36,
				color: 'blue',
				fill: 'solid',
				dash: 'solid',
				size: 's',
				richText: toRichText('shrink me'),
			},
			meta: {
				ownerKey: opts.ownerKey,
				displayName: opts.displayName,
			},
		},
	])

	editor.select(tileId)
	const bounds = editor.getShapePageBounds(tileId)
	if (bounds) {
		editor.zoomToBounds(bounds, { inset: 64, animation: { duration: 220 } })
	}

	return tileId
}

export function findOwnedClaimedTile(editor: Editor, ownerKey: string): TLShapeId | null {
	for (const shape of editor.getCurrentPageShapes()) {
		if (!isScrapbookTile(shape)) continue
		if (shape.meta.ownerKey !== ownerKey) continue
		if (shape.meta.status === 'submitted') continue
		return shape.id
	}
	return null
}
