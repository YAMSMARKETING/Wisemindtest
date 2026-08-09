import { useSync } from '@tldraw/sync'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Editor, Tldraw } from 'tldraw'
import { isAdminFromSearch } from '../admin'
import { TLDRAW_LICENSE_KEY } from '../constants'
import { clearBoard, exportBoardAsPdf, exportBoardAsPng } from '../exportBoard'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { InstagramGate } from '../InstagramGate'
import { getStoredInstagramHandle } from '../instagramHandle'
import { multiplayerAssetStore } from '../multiplayerAssetStore'
import { getOrCreateOwnerId } from '../ownerId'
import { isMovementChange, overlapsAnotherUsersShape, shouldCullOnOverlap } from '../shapeGuards'
import { BRAND_FOCUS_BOUNDS } from '../BrandBackdrop'
import { communalComponents, communalOverrides } from '../uiConfig'

export function Room() {
	const { roomId } = useParams<{ roomId: string }>()
	const ownerId = useMemo(() => getOrCreateOwnerId(), [])
	const isAdmin = useMemo(() => isAdminFromSearch(), [])
	const [instagramHandle, setInstagramHandle] = useState<string | null>(() => getStoredInstagramHandle())
	const [editor, setEditor] = useState<Editor | null>(null)
	const [exportStatus, setExportStatus] = useState<string | null>(null)

	const identityRef = useRef({ ownerId, isAdmin, instagramHandle })
	identityRef.current = { ownerId, isAdmin, instagramHandle }

	const store = useSync({
		uri: `${window.location.origin}/api/connect/${roomId}`,
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

	useEffect(() => {
		if (!editor) return
		editor.updateInstanceState({ isReadonly: !instagramHandle })
		if (instagramHandle) {
			editor.user.updateUserPreferences({
				name: `@${instagramHandle}`,
				colorScheme: 'dark',
			})
		}
		// Keep framing on the logo whenever identity/editor is ready.
		editor.zoomToBounds(BRAND_FOCUS_BOUNDS, {
			inset: 48,
			targetZoom: 1,
			animation: { duration: 0 },
		})
	}, [editor, instagramHandle])

	return (
		<RoomShell
			isAdmin={isAdmin}
			instagramHandle={instagramHandle}
			exportStatus={exportStatus}
			onExportPng={handleExportPng}
			onExportPdf={handleExportPdf}
			onClearBoard={handleClearBoard}
		>
			<Tldraw
				store={store}
				licenseKey={TLDRAW_LICENSE_KEY}
				colorScheme="dark"
				components={communalComponents}
				overrides={communalOverrides}
				options={{ maxPages: 1 }}
				onMount={(mountedEditor) => {
					setEditor(mountedEditor)

					mountedEditor.updateInstanceState({
						isReadonly: !identityRef.current.instagramHandle,
					})

					const handle = identityRef.current.instagramHandle
					if (handle) {
						mountedEditor.user.updateUserPreferences({
							name: `@${handle}`,
							colorScheme: 'dark',
						})
					}

					// Always open centered on the brand mark.
					mountedEditor.zoomToBounds(BRAND_FOCUS_BOUNDS, {
						inset: 48,
						targetZoom: 1,
						animation: { duration: 0 },
					})

					mountedEditor.registerExternalAssetHandler('url', getBookmarkPreview)

					const pages = mountedEditor.getPages()
					if (pages.length > 1) {
						for (const page of pages.slice(1)) {
							mountedEditor.deletePage(page.id)
						}
					}

					const disposeBeforeCreate = mountedEditor.sideEffects.registerBeforeCreateHandler(
						'shape',
						(shape, source) => {
							if (source !== 'user') return shape
							const { ownerId: currentOwnerId, instagramHandle: currentHandle } =
								identityRef.current
							if (!currentHandle) {
								throw new Error('Enter your Instagram handle to draw')
							}

							if (shape.meta.ownerId) return shape

							return {
								...shape,
								meta: {
									...shape.meta,
									ownerId: currentOwnerId,
									instagramHandle: currentHandle,
								},
							}
						}
					)

					const disposePageCreate = mountedEditor.sideEffects.registerBeforeCreateHandler(
						'page',
						(page, source) => {
							if (source === 'user') {
								throw new Error('Only one page is allowed')
							}
							return page
						}
					)

					const disposeBeforeChange = mountedEditor.sideEffects.registerBeforeChangeHandler(
						'shape',
						(prev, next, source) => {
							if (source !== 'user') return next
							const { ownerId: currentOwnerId, isAdmin: admin } = identityRef.current
							if (admin) return next

							// Only the owner (or admin) can move/edit a shape.
							if (prev.meta.ownerId && prev.meta.ownerId !== currentOwnerId) {
								return prev
							}

							// Defensive: if somehow unowned and it's a move by non-admin stranger, block.
							if (!prev.meta.ownerId && isMovementChange(prev, next)) {
								return prev
							}

							return next
						}
					)

					const disposeBeforeDelete = mountedEditor.sideEffects.registerBeforeDeleteHandler(
						'shape',
						(shape, source) => {
							if (source !== 'user') return
							const { ownerId: currentOwnerId, isAdmin: admin } = identityRef.current
							if (admin) return
							if (shape.meta.ownerId === currentOwnerId) return
							return false
						}
					)

					const disposeAfterChange = mountedEditor.sideEffects.registerAfterChangeHandler(
						'shape',
						(_prev, next, source) => {
							if (source !== 'user') return
							const { ownerId: currentOwnerId, isAdmin: admin } = identityRef.current
							if (admin) return
							if (next.meta.ownerId !== currentOwnerId) return
							if (!shouldCullOnOverlap(next)) return
							if (!overlapsAnotherUsersShape(mountedEditor, next, currentOwnerId)) return

							// Small draw strokes are noisy; only cull once they cover real area.
							if (next.type === 'draw') {
								const bounds = mountedEditor.getShapePageBounds(next)
								if (!bounds || bounds.w < 24 || bounds.h < 24) return
							}

							mountedEditor.deleteShapes([next.id])
						}
					)

					const disposeAfterCreate = mountedEditor.sideEffects.registerAfterCreateHandler(
						'shape',
						(shape, source) => {
							if (source !== 'user') return
							const { ownerId: currentOwnerId, isAdmin: admin } = identityRef.current
							if (admin) return
							// Freehand strokes grow while drawing; don't delete on create.
							if (shape.type === 'draw') return
							if (!shouldCullOnOverlap(shape)) return
							if (!overlapsAnotherUsersShape(mountedEditor, shape, currentOwnerId)) return
							mountedEditor.deleteShapes([shape.id])
						}
					)

					return () => {
						disposeBeforeCreate()
						disposePageCreate()
						disposeBeforeChange()
						disposeBeforeDelete()
						disposeAfterChange()
						disposeAfterCreate()
						setEditor((current) => (current === mountedEditor ? null : current))
					}
				}}
			/>
			{!instagramHandle && <InstagramGate onJoined={setInstagramHandle} />}
		</RoomShell>
	)
}

function RoomShell({
	children,
	isAdmin,
	instagramHandle,
	exportStatus,
	onExportPng,
	onExportPdf,
	onClearBoard,
}: {
	children: ReactNode
	isAdmin: boolean
	instagramHandle: string | null
	exportStatus: string | null
	onExportPng: () => void
	onExportPdf: () => void
	onClearBoard: () => void
}) {
	return (
		<div className="RoomWrapper">
			{isAdmin && instagramHandle && (
				<div className="RoomWrapper-adminBar">
					<span className="RoomWrapper-adminBadge">Admin</span>
					<span className="RoomWrapper-handle">@{instagramHandle}</span>
					<button className="RoomWrapper-button" onClick={onExportPng}>
						Export PNG
					</button>
					<button className="RoomWrapper-button" onClick={onExportPdf}>
						Export PDF
					</button>
					<button className="RoomWrapper-button" onClick={onClearBoard}>
						Clear board
					</button>
					{exportStatus && <span className="RoomWrapper-status">{exportStatus}</span>}
				</div>
			)}
			<div className="RoomWrapper-content">{children}</div>
		</div>
	)
}
