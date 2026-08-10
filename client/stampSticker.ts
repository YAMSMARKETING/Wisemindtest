import { TLImageShape, createShapeId, Editor } from 'tldraw'
import { countOwnedMedia, createStickerAsset } from './block'
import { getScrapbookOwnerKey } from './scrapbookSession'
import { MAX_STICKERS_PER_SUBMISSION, type StickerDef } from './stickers'
import { showToast } from './toastBridge'

const STICKER_SIZE = 72

/** Stamp a sticker onto the open canvas at the current pointer (or viewport center). */
export function stampStickerOnCanvas(editor: Editor, sticker: StickerDef) {
	const owner = getScrapbookOwnerKey()
	if (!owner) {
		showToast({ title: 'Join first to add stickers', severity: 'warning' })
		return false
	}

	if (countOwnedMedia(editor, owner, 'sticker') >= MAX_STICKERS_PER_SUBMISSION) {
		showToast({ title: '2 sticker limit reached', severity: 'warning' })
		return false
	}

	const point = editor.inputs.currentPagePoint
	const x = point.x - STICKER_SIZE / 2
	const y = point.y - STICKER_SIZE / 2

	const assetId = createStickerAsset(editor, sticker.svg, sticker.label)
	const shapeId = createShapeId()

	editor.createShape({
		id: shapeId,
		type: 'image',
		x,
		y,
		props: {
			assetId,
			w: STICKER_SIZE,
			h: STICKER_SIZE,
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

/** @deprecated Use stampStickerOnCanvas */
export const stampStickerInReservedBlock = stampStickerOnCanvas
