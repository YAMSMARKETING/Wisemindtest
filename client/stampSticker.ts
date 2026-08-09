import { TLImageShape, createShapeId, Editor } from 'tldraw'
import { createStickerAsset, findOwnedReservedBlock } from './block'
import { BLOCK_PADDING } from './pageGeometry'
import { getScrapbookOwnerKey } from './scrapbookSession'
import { countOwnedMedia } from './block'
import { MAX_STICKERS_PER_SUBMISSION, type StickerDef } from './stickers'
import { showToast } from './toastBridge'

/** Stamp a sticker into the current user's reserved block (center). */
export function stampStickerInReservedBlock(editor: Editor, sticker: StickerDef) {
	const owner = getScrapbookOwnerKey()
	if (!owner) {
		showToast({ title: 'Join first to add stickers', severity: 'warning' })
		return false
	}

	const blockId = findOwnedReservedBlock(editor, owner)
	if (!blockId) {
		showToast({
			title: 'Place your block first',
			description: 'Stickers go inside your reserved memory block.',
			severity: 'warning',
		})
		return false
	}

	if (countOwnedMedia(editor, owner, 'sticker') >= MAX_STICKERS_PER_SUBMISSION) {
		showToast({ title: '2 sticker limit reached', severity: 'warning' })
		return false
	}

	const frame = editor.getShape(blockId)
	if (!frame || frame.type !== 'frame') return false

	const size = 72
	const w = (frame.props as { w: number }).w
	const h = (frame.props as { h: number }).h
	const x = Math.max(BLOCK_PADDING, (w - size) / 2)
	const y = Math.max(BLOCK_PADDING, Math.min(h - size - BLOCK_PADDING, h * 0.45))

	const assetId = createStickerAsset(editor, sticker.svg, sticker.label)
	const shapeId = createShapeId()

	editor.createShape({
		id: shapeId,
		type: 'image',
		parentId: blockId,
		x,
		y,
		props: {
			assetId,
			w: size,
			h: size,
			playing: false,
			url: '',
			crop: null,
			flipX: false,
			flipY: false,
			altText: sticker.label,
		} satisfies TLImageShape['props'],
		meta: {
			kind: 'sticker',
			ownerKey: owner,
			ownerId: owner,
			stickerId: sticker.id,
		},
	})

	editor.select(shapeId)
	showToast({ title: `Added ${sticker.label}`, severity: 'success' })
	return true
}
