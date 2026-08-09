/**
 * Shared scrapbook page + block geometry (client + worker).
 * Design size ≠ print size; SVG export is the print master.
 */

export const A_RATIO = Math.SQRT2

export const PAGE_WIDTH = 6000
export const PAGE_HEIGHT = Math.round(PAGE_WIDTH / A_RATIO)

export const MAX_BLOCK_WIDTH = 420
export const MAX_BLOCK_HEIGHT = 420

export const STARTER_BLOCK_WIDTH = MAX_BLOCK_WIDTH
export const STARTER_BLOCK_HEIGHT = MAX_BLOCK_HEIGHT

export const MIN_BLOCK_WIDTH = 120
export const MIN_BLOCK_HEIGHT = 100

export const BLOCK_PADDING = 16

/** Minimum gap so blocks never touch. */
export const MIN_BLOCK_GAP = 24

/** Reserved blocks expire if never submitted. */
export const RESERVATION_TTL_MS = 30 * 60 * 1000

export const PAGE_ORIGIN = { x: 0, y: 0 } as const

export const PAGE_BOUNDS = {
	x: PAGE_ORIGIN.x,
	y: PAGE_ORIGIN.y,
	w: PAGE_WIDTH,
	h: PAGE_HEIGHT,
} as const

export type Rect = { x: number; y: number; w: number; h: number }
