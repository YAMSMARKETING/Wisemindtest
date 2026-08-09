import {
	MAX_BLOCK_HEIGHT,
	MAX_BLOCK_WIDTH,
	MIN_BLOCK_GAP,
	PAGE_HEIGHT,
	PAGE_WIDTH,
	type Rect,
} from './pageGeometry'

/** True if a and b overlap or come within `gap` of each other. */
export function rectsConflict(a: Rect, b: Rect, gap = MIN_BLOCK_GAP) {
	return !(
		a.x + a.w + gap <= b.x ||
		b.x + b.w + gap <= a.x ||
		a.y + a.h + gap <= b.y ||
		b.y + b.h + gap <= a.y
	)
}

export function clampRectToPage(rect: Rect, pageW = PAGE_WIDTH, pageH = PAGE_HEIGHT): Rect {
	const w = Math.min(rect.w, pageW)
	const h = Math.min(rect.h, pageH)
	const x = Math.min(Math.max(0, rect.x), Math.max(0, pageW - w))
	const y = Math.min(Math.max(0, rect.y), Math.max(0, pageH - h))
	return { x, y, w, h }
}

export function isClear(candidate: Rect, occupied: Rect[], gap = MIN_BLOCK_GAP) {
	return occupied.every((other) => !rectsConflict(candidate, other, gap))
}

/**
 * Find the nearest clear placement for a block of size (w,h) near (x,y).
 * Spiral search in `gap`-sized steps. Returns null if the page is full.
 */
export function nudgeToClearSpot(
	desired: Rect,
	occupied: Rect[],
	opts: { gap?: number; pageW?: number; pageH?: number; maxRadius?: number } = {}
): Rect | null {
	const gap = opts.gap ?? MIN_BLOCK_GAP
	const pageW = opts.pageW ?? PAGE_WIDTH
	const pageH = opts.pageH ?? PAGE_HEIGHT
	const w = Math.min(desired.w || MAX_BLOCK_WIDTH, pageW)
	const h = Math.min(desired.h || MAX_BLOCK_HEIGHT, pageH)

	const start = clampRectToPage({ x: desired.x, y: desired.y, w, h }, pageW, pageH)
	if (isClear(start, occupied, gap)) return start

	const step = Math.max(8, Math.floor(gap / 2))
	const maxRadius =
		opts.maxRadius ?? Math.ceil(Math.hypot(pageW, pageH) / step) + 2

	for (let ring = 1; ring <= maxRadius; ring++) {
		for (let dx = -ring; dx <= ring; dx++) {
			for (let dy = -ring; dy <= ring; dy++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
				const candidate = clampRectToPage(
					{
						x: start.x + dx * step,
						y: start.y + dy * step,
						w,
						h,
					},
					pageW,
					pageH
				)
				if (isClear(candidate, occupied, gap)) return candidate
			}
		}
	}

	return null
}
