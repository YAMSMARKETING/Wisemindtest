import { StateNode } from 'tldraw'
import { getPendingSticker } from './stickerPending'
import { stampStickerOnCanvas } from './stampSticker'
import { showToast } from './toastBridge'

/**
 * Sticker tool: click stamps the pending sticker onto the open canvas.
 * Picker can also stamp immediately without using this tool.
 */
export class StickerTool extends StateNode {
	static override id = 'sticker'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		const sticker = getPendingSticker()
		if (sticker) {
			stampStickerOnCanvas(this.editor, sticker)
			this.editor.setCurrentTool('select')
		}
	}

	override onPointerDown() {
		const sticker = getPendingSticker()
		if (!sticker) {
			showToast({ title: 'Pick a sticker from the Stickers panel', severity: 'info' })
			return
		}
		stampStickerOnCanvas(this.editor, sticker)
		this.editor.setCurrentTool('select')
	}
}
