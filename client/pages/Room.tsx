import { useSync } from '@tldraw/sync'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Editor, Tldraw } from 'tldraw'
import { isAdminFromSearch } from '../admin'
import { clearBoard, exportBoardAsPdf, exportBoardAsPng } from '../exportBoard'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { multiplayerAssetStore } from '../multiplayerAssetStore'
import { getOrCreateOwnerId } from '../ownerId'

export function Room() {
	const { roomId } = useParams<{ roomId: string }>()
	const ownerId = useMemo(() => getOrCreateOwnerId(), [])
	const isAdmin = useMemo(() => isAdminFromSearch(), [])
	const [editor, setEditor] = useState<Editor | null>(null)
	const [exportStatus, setExportStatus] = useState<string | null>(null)

	// Create a store connected to multiplayer.
	const store = useSync({
		// We need to know the websockets URI...
		uri: `${window.location.origin}/api/connect/${roomId}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssetStore,
	})

	const handleExportPng = useCallback(async () => {
		if (!editor) return
		try {
			setExportStatus('Exporting PNG…')
			await exportBoardAsPng(editor)
			setExportStatus('PNG downloaded')
		} catch (error) {
			console.error(error)
			setExportStatus(error instanceof Error ? error.message : 'PNG export failed')
		}
	}, [editor])

	const handleExportPdf = useCallback(async () => {
		if (!editor) return
		try {
			setExportStatus('Exporting PDF…')
			await exportBoardAsPdf(editor)
			setExportStatus('PDF downloaded')
		} catch (error) {
			console.error(error)
			setExportStatus(error instanceof Error ? error.message : 'PDF export failed')
		}
	}, [editor])

	const handleClearBoard = useCallback(() => {
		if (!editor) return
		if (!window.confirm('Clear the entire board for everyone?')) return
		clearBoard(editor)
		setExportStatus('Board cleared')
	}, [editor])

	useEffect(() => {
		if (!exportStatus) return
		const timeout = setTimeout(() => setExportStatus(null), 3000)
		return () => clearTimeout(timeout)
	}, [exportStatus])

	return (
		<RoomWrapper
			roomId={roomId}
			isAdmin={isAdmin}
			exportStatus={exportStatus}
			onExportPng={handleExportPng}
			onExportPdf={handleExportPdf}
			onClearBoard={handleClearBoard}
		>
			<Tldraw
				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				options={{ deepLinks: true }}
				onMount={(mountedEditor) => {
					setEditor(mountedEditor)

					// when the editor is ready, we need to register our bookmark unfurling service
					mountedEditor.registerExternalAssetHandler('url', getBookmarkPreview)

					// Stamp anonymous ownership on every locally created shape.
					const disposeBeforeCreate = mountedEditor.sideEffects.registerBeforeCreateHandler(
						'shape',
						(shape, source) => {
							// Only enforce local creation rules; remote sync must pass through.
							if (source !== 'user') return shape

							// One image at a time for the whole board (slot frees when deleted).
							if (shape.type === 'image') {
								const imageAlreadyExists = mountedEditor
									.getCurrentPageShapes()
									.some((existing) => existing.type === 'image')
								if (imageAlreadyExists) {
									// Throwing aborts the store transaction so the shape is never created.
									throw new Error('Only one image is allowed on the board at a time')
								}
							}

							if (shape.meta.ownerId) return shape

							return {
								...shape,
								meta: {
									...shape.meta,
									ownerId,
								},
							}
						}
					)

					// Ownership-gated deletion (admin can delete anything).
					const disposeBeforeDelete = mountedEditor.sideEffects.registerBeforeDeleteHandler(
						'shape',
						(shape, source) => {
							if (source !== 'user') return
							if (isAdmin) return
							if (shape.meta.ownerId === ownerId) return
							return false
						}
					)

					return () => {
						disposeBeforeCreate()
						disposeBeforeDelete()
						setEditor((current) => (current === mountedEditor ? null : current))
					}
				}}
			/>
		</RoomWrapper>
	)
}

function RoomWrapper({
	children,
	roomId,
	isAdmin,
	exportStatus,
	onExportPng,
	onExportPdf,
	onClearBoard,
}: {
	children: ReactNode
	roomId?: string
	isAdmin: boolean
	exportStatus: string | null
	onExportPng: () => void
	onExportPdf: () => void
	onClearBoard: () => void
}) {
	const [didCopy, setDidCopy] = useState(false)

	useEffect(() => {
		if (!didCopy) return
		const timeout = setTimeout(() => setDidCopy(false), 3000)
		return () => clearTimeout(timeout)
	}, [didCopy])

	return (
		<div className="RoomWrapper">
			<div className="RoomWrapper-header">
				<WifiIcon />
				<div>{roomId}</div>
				{isAdmin && <span className="RoomWrapper-adminBadge">Admin</span>}
				<button
					className="RoomWrapper-copy"
					onClick={() => {
						navigator.clipboard.writeText(window.location.href)
						setDidCopy(true)
					}}
					aria-label="copy room link"
				>
					Copy link
					{didCopy && <div className="RoomWrapper-copied">Copied!</div>}
				</button>
				{isAdmin && (
					<div className="RoomWrapper-adminActions">
						<button className="RoomWrapper-copy" onClick={onExportPng}>
							Export PNG
						</button>
						<button className="RoomWrapper-copy" onClick={onExportPdf}>
							Export PDF
						</button>
						<button className="RoomWrapper-copy" onClick={onClearBoard}>
							Clear board
						</button>
					</div>
				)}
				{exportStatus && <div className="RoomWrapper-status">{exportStatus}</div>}
			</div>
			<div className="RoomWrapper-content">{children}</div>
		</div>
	)
}

function WifiIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={16}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
			/>
		</svg>
	)
}
