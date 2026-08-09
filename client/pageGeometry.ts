/**
 * Fayetteville Scrapbook — page + tile geometry (CHECK A).
 *
 * Design size ≠ print size. This page frame is the compose/layout coordinate
 * system; SVG export is the print master and scales to the wall.
 *
 * Aspect: ISO A-series landscape (1 : √2 ≈ 1:1.414) until wall dims are known.
 * Capacity note (for CHECK B tuning): at COLUMN_COUNT × (PAGE_HEIGHT / avgH)
 * we want ~360. With 18 cols and avg tile ~210u → ~364 slots.
 */

/** √2 — A-series long/short ratio. */
export const A_RATIO = Math.SQRT2

/** Page frame width in tldraw page units. */
export const PAGE_WIDTH = 6000

/** Page frame height (A-ratio landscape). 6000 / √2 ≈ 4242.64 */
export const PAGE_HEIGHT = Math.round(PAGE_WIDTH / A_RATIO)

/** Fixed masonry column count. Tuned with PAGE_* in CHECK B. */
export const COLUMN_COUNT = 18

export const COLUMN_WIDTH = PAGE_WIDTH / COLUMN_COUNT

/**
 * Generous starter tile height for compose (max content before shrink).
 * Capped so one claim cannot eat an entire column.
 */
export const STARTER_TILE_HEIGHT = 480

/** Hard ceiling after shrink (and for starter). */
export const MAX_TILE_HEIGHT = 520

/** Floor so empty/minimal tiles still read as a cell. */
export const MIN_TILE_HEIGHT = 120

/** Inner padding when measuring content for shrink-to-fit. */
export const TILE_PADDING = 16

/** Page-space origin of the scrapbook frame (top-left). */
export const PAGE_ORIGIN = { x: 0, y: 0 } as const

/** Bounds used to camera-frame the whole page. */
export const PAGE_BOUNDS = {
	x: PAGE_ORIGIN.x,
	y: PAGE_ORIGIN.y,
	w: PAGE_WIDTH,
	h: PAGE_HEIGHT,
} as const

export function columnX(columnIndex: number) {
	return PAGE_ORIGIN.x + columnIndex * COLUMN_WIDTH
}

/** Rough capacity estimate at a given average tile height. */
export function estimatedCapacity(averageTileHeight: number) {
	if (averageTileHeight <= 0) return 0
	return Math.floor(COLUMN_COUNT * (PAGE_HEIGHT / averageTileHeight))
}
