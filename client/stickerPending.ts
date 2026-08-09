import { STICKERS, type StickerDef } from './stickers'

let pendingStickerId: string | null = null

export function setPendingSticker(id: string | null) {
	pendingStickerId = id
}

export function getPendingSticker(): StickerDef | null {
	if (!pendingStickerId) return null
	return STICKERS.find((s) => s.id === pendingStickerId) ?? null
}
