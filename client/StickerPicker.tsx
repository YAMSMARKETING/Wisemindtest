import { useState } from 'react'
import { track, useEditor } from 'tldraw'
import { STICKERS } from './stickers'
import { setPendingSticker } from './stickerPending'

export const StickerPicker = track(function StickerPicker() {
	const editor = useEditor()
	const [open, setOpen] = useState(false)
	const tool = editor.getCurrentToolId()

	return (
		<div className="StickerPicker">
			<button
				type="button"
				className={`StickerPicker-toggle${tool === 'sticker' || open ? ' is-active' : ''}`}
				onClick={() => setOpen((v) => !v)}
				title="Stickers"
			>
				Stickers
			</button>
			{open && (
				<div className="StickerPicker-panel" role="listbox" aria-label="Sticker set">
					{STICKERS.map((sticker) => (
						<button
							key={sticker.id}
							type="button"
							className="StickerPicker-item"
							title={sticker.label}
							onClick={() => {
								setPendingSticker(sticker.id)
								editor.setCurrentTool('sticker')
								setOpen(false)
							}}
						>
							<span
								className="StickerPicker-preview"
								dangerouslySetInnerHTML={{ __html: sticker.svg }}
							/>
						</button>
					))}
				</div>
			)}
		</div>
	)
})
