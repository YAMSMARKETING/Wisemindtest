import { TLShape } from 'tldraw'
import { getShapeOwnerKey } from './block'

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

/** Owner may edit their own shapes; admin may edit anything. */
export function canUserMutateShape(
	shape: TLShape,
	opts: { ownerKey: string; isAdmin: boolean }
) {
	if (opts.isAdmin) return true
	const owner = getShapeOwnerKey(shape)
	if (!owner) return false
	return owner === opts.ownerKey
}
