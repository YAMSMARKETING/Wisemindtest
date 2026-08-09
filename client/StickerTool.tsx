import { StateNode, TLImageShape, createShapeId } from 'tldraw'
import { createStickerAsset, findOwnedReservedBlock } from './block'
import { BLOCK_PADDING } from './pageGeometry'
import { getScrapbookOwnerKey } from './scrapbookSession'
import { MAX_STICKERS_PER_SUBMISSION } from './stickers'
import { countOwnedMedia } from './block'
import { getPendingSticker } from './stickerPending'
import { showToast } from './toastBridge'

/**
 * Sticker tool: click places the pending SVG sticker inside the owner's reserved block.
 */
export class StickerTool extends StateNode {
	static override id = 'sticker'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const sticker = getPendingSticker()
		if (!sticker) {
			showToast({ title: 'Pick a sticker first', severity: 'info' })
			return
		}

		const owner = getScrapbookOwnerKey()
		if (!owner) {
			showToast({ title: 'Join first to add stickers', severity: 'warning' })
			return
		}

		const blockId = findOwnedReservedBlock(this.editor, owner)
		if (!blockId) {
			showToast({
				title: 'Place your block first',
				description: 'Stickers go inside your reserved memory block.',
				severity: 'warning',
			})
			return
		}

		if (countOwnedMedia(this.editor, owner, 'sticker') >= MAX_STICKERS_PER_SUBMISSION) {
			showToast({ title: '2 sticker limit reached', severity: 'warning' })
			return
		}

		const frame = this.editor.getShape(blockId)
		if (!frame || frame.type !== 'frame') return

		const point = this.editor.inputs.getCurrentPagePoint()
		const local = this.editor.getPointInShapeSpace(frame, point)
		const size = 72
		const x = Math.max(
			BLOCK_PADDING,
			Math.min(local.x - size / 2, (frame.props as { w: number }).w - size - BLOCK_PADDING)
		)
		const y = Math.max(
			BLOCK_PADDING,
			Math.min(local.y - size / 2, (frame.props as { h: number }).h - size - BLOCK_PADDING)
		)

		const assetId = createStickerAsset(this.editor, sticker.svg, sticker.label)
		const shapeId = createShapeId()

		this.editor.createShape({
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

		this.editor.setCurrentTool('select')
	}
}
