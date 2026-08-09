/**
 * Fayetteville Scrapbook — page + block geometry (CHECK A).
 *
 * Design size ≠ print size. This page frame is the compose/layout coordinate
 * system; SVG export is the print master and scales to the wall.
 *
 * Aspect: ISO A-series landscape (1 : √2 ≈ 1:1.414) until wall dims are known.
 *
 * Layout (CHECK B): free placement, no overlap / no touch. Columns & masonry
 * are intentionally gone. 300 submissions/page is a soft target sized toward,
 * not a guarantee — organic gaps pack less tightly than a grid.
 */

/** √2 — A-series long/short ratio. */
export const A_RATIO = Math.SQRT2

/** Page frame width in tldraw page units. */
export const PAGE_WIDTH = 6000

/** Page frame height (A-ratio landscape). 6000 / √2 ≈ 4242.64 */
export const PAGE_HEIGHT = Math.round(PAGE_WIDTH / A_RATIO)

/**
 * Max footprint for a reserved/composed block (width × height).
 * Caps how much of the page one person can claim before shrink-to-fit.
 */
export const MAX_BLOCK_WIDTH = 420
export const MAX_BLOCK_HEIGHT = 420

/** Starter reservation uses the full max footprint while composing. */
export const STARTER_BLOCK_WIDTH = MAX_BLOCK_WIDTH
export const STARTER_BLOCK_HEIGHT = MAX_BLOCK_HEIGHT

/** Floor after shrink so tiny submissions still read as a block. */
export const MIN_BLOCK_WIDTH = 120
export const MIN_BLOCK_HEIGHT = 100

/** Inner padding when measuring content for shrink-to-fit. */
export const BLOCK_PADDING = 16

/**
 * Minimum gap between placed blocks (CHECK B collision-and-nudge).
 * Defined here so geometry stays in one place; unused until CHECK B.
 */
export const MIN_BLOCK_GAP = 24

/** Page-space origin of the scrapbook frame (top-left). */
export const PAGE_ORIGIN = { x: 0, y: 0 } as const

/** Bounds used to camera-frame the whole page. */
export const PAGE_BOUNDS = {
	x: PAGE_ORIGIN.x,
	y: PAGE_ORIGIN.y,
	w: PAGE_WIDTH,
	h: PAGE_HEIGHT,
} as const

/** Soft capacity hint at a given average block area (ignores packing waste). */
export function estimatedSoftCapacity(averageBlockArea: number) {
	if (averageBlockArea <= 0) return 0
	const pageArea = PAGE_WIDTH * PAGE_HEIGHT
	// Rough: leave ~35% for gaps / organic waste under free placement.
	return Math.floor((pageArea * 0.65) / averageBlockArea)
}
