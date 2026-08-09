import { TLShape } from 'tldraw'
import { getShapeOwnerKey, isScrapbookTile } from './block'

/** True when a shape update changes position/size. */
export function isMovementChange(prev: TLShape, next: TLShape) {
	if (prev.x !== next.x || prev.y !== next.y || prev.rotation !== next.rotation) return true

	const prevProps = prev.props as Record<string, unknown>
	const nextProps = next.props as Record<string, unknown>
	for (const key of ['w', 'h', 'scale', 'size'] as const) {
		if (prevProps[key] !== nextProps[key]) return true
	}
	return false
}

export function canUserMutateShape(
	shape: TLShape,
	opts: { ownerKey: string; isAdmin: boolean }
) {
	if (opts.isAdmin) return true
	const owner = getShapeOwnerKey(shape)
	if (!owner) return false
	if (owner !== opts.ownerKey) return false
	// Submitted scrapbook blocks (and anything inside them) are locked for the owner.
	if (isScrapbookTile(shape) && shape.meta.status === 'submitted') return false
	return true
}

export function isInsideSubmittedBlock(
	shape: TLShape,
	getParent: (id: string) => TLShape | undefined
) {
	let current: TLShape | undefined = shape
	while (current?.parentId) {
		const parent = getParent(current.parentId)
		if (!parent) break
		if (isScrapbookTile(parent) && parent.meta.status === 'submitted') return true
		current = parent
	}
	return false
}
