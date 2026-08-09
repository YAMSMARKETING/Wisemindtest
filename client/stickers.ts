/** Small open SVG sticker set (inline, no third-party API). */

export type StickerDef = {
	id: string
	label: string
	svg: string
}

function svgIcon(paths: string, viewBox = '0 0 64 64') {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="96" height="96">${paths}</svg>`
}

export const STICKERS: StickerDef[] = [
	{
		id: 'heart',
		label: 'Heart',
		svg: svgIcon(
			`<path fill="#e4572e" d="M32 54S8 38 8 22a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 32-24 32z"/>`
		),
	},
	{
		id: 'star',
		label: 'Star',
		svg: svgIcon(
			`<path fill="#f0a202" d="m32 6 7.4 15.1L56 23.5 44 35.2l2.8 16.3L32 43.6 17.2 51.5 20 35.2 8 23.5l16.6-2.4z"/>`
		),
	},
	{
		id: 'sun',
		label: 'Sun',
		svg: svgIcon(
			`<circle cx="32" cy="32" r="12" fill="#f4d35e"/><g stroke="#f4d35e" stroke-width="4" stroke-linecap="round"><path d="M32 6v8M32 50v8M6 32h8M50 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/></g>`
		),
	},
	{
		id: 'leaf',
		label: 'Leaf',
		svg: svgIcon(
			`<path fill="#2a9d8f" d="M48 12C28 14 14 30 14 48c18 0 34-14 36-34 0-1-1-2-2-2z"/><path fill="none" stroke="#1d6f65" stroke-width="3" d="M20 44c10-8 18-18 26-30"/>`
		),
	},
	{
		id: 'house',
		label: 'House',
		svg: svgIcon(
			`<path fill="#4a6fa5" d="M10 30 32 12l22 18v22H10z"/><rect x="26" y="36" width="12" height="16" fill="#f7f3e8"/>`
		),
	},
	{
		id: 'smile',
		label: 'Smile',
		svg: svgIcon(
			`<circle cx="32" cy="32" r="22" fill="#ffe66d" stroke="#333" stroke-width="2"/><circle cx="24" cy="26" r="3" fill="#333"/><circle cx="40" cy="26" r="3" fill="#333"/><path d="M22 38c4 6 16 6 20 0" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round"/>`
		),
	},
]

export const MAX_IMAGES_PER_SUBMISSION = 3
export const MAX_STICKERS_PER_SUBMISSION = 2
