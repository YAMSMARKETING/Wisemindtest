import { TLShape } from 'tldraw'

/** True when a shape update changes position/size (used by ownership before-change). */
export function isMovementChange(prev: TLShape, next: TLShape) {
	if (prev.x !== next.x || prev.y !== next.y || prev.rotation !== next.rotation) return true

	const prevProps = prev.props as Record<string, unknown>
	const nextProps = next.props as Record<string, unknown>
	for (const key of ['w', 'h', 'scale', 'size'] as const) {
		if (prevProps[key] !== nextProps[key]) return true
	}
	return false
}
