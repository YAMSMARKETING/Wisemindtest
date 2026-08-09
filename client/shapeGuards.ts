import { Box, Editor, TLShape } from 'tldraw'
import { isScrapbookTile } from './block'

function boundsOverlap(a: Box, b: Box, padding = 8) {
	const left = Math.max(a.x, b.x)
	const right = Math.min(a.x + a.w, b.x + b.w)
	const top = Math.max(a.y, b.y)
	const bottom = Math.min(a.y + a.h, b.y + b.h)
	return right - left > padding && bottom - top > padding
}

/** True when this shape's page bounds meaningfully overlap another visitor's shape. */
export function overlapsAnotherUsersShape(editor: Editor, shape: TLShape, ownerId: string) {
	const bounds = editor.getShapePageBounds(shape)
	if (!bounds || bounds.w < 4 || bounds.h < 4) return false

	for (const other of editor.getCurrentPageShapes()) {
		if (other.id === shape.id) continue
		if (other.meta.ownerId === ownerId) continue
		// Ignore scrapbook blocks / their children — blocks are the submission unit.
		if (isScrapbookTile(other)) continue
		const parent = other.parentId ? editor.getShape(other.parentId) : undefined
		if (parent && isScrapbookTile(parent)) continue
		const otherBounds = editor.getShapePageBounds(other)
		if (!otherBounds) continue
		if (boundsOverlap(bounds, otherBounds)) return true
	}
	return false
}

export function isMovementChange(prev: TLShape, next: TLShape) {
	if (prev.x !== next.x || prev.y !== next.y || prev.rotation !== next.rotation) return true

	const prevProps = prev.props as Record<string, unknown>
	const nextProps = next.props as Record<string, unknown>
	for (const key of ['w', 'h', 'scale', 'size'] as const) {
		if (prevProps[key] !== nextProps[key]) return true
	}
	return false
}

/**
 * Overlap culling is for freeform writing over someone else's marks.
 * Scrapbook blocks (and media) are exempt — blocks are clipped containers.
 */
export function shouldCullOnOverlap(editor: Editor, shape: TLShape) {
	if (shape.type === 'image' || shape.type === 'video') return false
	if (isScrapbookTile(shape)) return false
	const parent = shape.parentId ? editor.getShape(shape.parentId) : undefined
	if (parent && isScrapbookTile(parent)) return false
	return true
}
