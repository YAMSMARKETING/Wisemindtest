import { useSync } from '@tldraw/sync'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Editor, Tldraw, react } from 'tldraw'
import { isAdminFromSearch } from '../admin'
import {
	findOwnedReservedBlock,
	getShapeOwnerKey,
	isScrapbookTile,
	placeBlockOnServer,
	submitBlockOnServer,
} from '../block'
import { TLDRAW_LICENSE_KEY } from '../constants'
import { clearBoard, exportBoardAsPdf, exportBoardAsPng } from '../exportBoard'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { InstagramGate } from '../InstagramGate'
import { getStoredInstagramHandle } from '../instagramHandle'
import { apiClearLayout } from '../layoutApi'
import { multiplayerAssetStore } from '../multiplayerAssetStore'
import { getOrCreateOwnerId } from '../ownerId'
import { PAGE_BOUNDS } from '../pageGeometry'
import { setScrapbookOwnerKey } from '../scrapbookSession'
import {
	canUserMutateShape,
	isInsideSubmittedBlock,
	isMovementChange,
} from '../shapeGuards'
import { StickerTool } from '../StickerTool'
import { MAX_IMAGES_PER_SUBMISSION, MAX_STICKERS_PER_SUBMISSION } from '../stickers'
import { countOwnedMedia } from '../block'
import { showToast } from '../toastBridge'
import {
	adminComponents,
	adminOverrides,
	communalComponents,
	communalOverrides,
} from '../uiConfig'

export function Room() {
	const { roomId } = useParams<{ roomId: string }>()
	const ownerId = useMemo(() => getOrCreateOwnerId(), [])
	const isAdmin = useMemo(() => isAdminFromSearch(), [])
	const [instagramHandle, setInstagramHandle] = useState<string | null>(() =>
		getStoredInstagramHandle()
	)
	const [editor, setEditor] = useState<Editor | null>(null)
	const [exportStatus, setExportStatus] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)

	const identityRef = useRef({ ownerId, isAdmin, instagramHandle })
	identityRef.current = { ownerId, isAdmin, instagramHandle }

	useEffect(() => {
		setScrapbookOwnerKey(ownerId)
		return () => setScrapbookOwnerKey(null)
	}, [ownerId])

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

	const handleClearBoard = useCallback(async () => {
		if (!editor || !roomId) return
		if (!window.confirm('Clear the entire board for everyone?')) return
		try {
			await apiClearLayout(roomId)
			clearBoard(editor)
			setExportStatus('Board cleared')
		} catch (error) {
			console.error(error)
			setExportStatus(error instanceof Error ? error.message : 'Clear failed')
		}
	}, [editor, roomId])

	const handlePlaceBlock = useCallback(async () => {
		if (!editor || !instagramHandle || !roomId) return
		try {
			const result = await placeBlockOnServer(editor, {
				roomId,
				ownerKey: ownerId,
				displayName: `@${instagramHandle}`,
			})
			if (result.alreadyHad) {
				setStatus('You already have a reserved block')
				return
			}
			setStatus(
				result.nudged
					? 'Placed (nudged to clear spot) — compose, then Submit'
					: 'Block reserved — compose inside, then Submit'
			)
		} catch (error) {
			console.error(error)
			setStatus(error instanceof Error ? error.message : 'Could not place block')
		}
	}, [editor, instagramHandle, ownerId, roomId])

	const handleSubmitBlock = useCallback(async () => {
		if (!editor || !instagramHandle || !roomId) return
		try {
			const blockId = findOwnedReservedBlock(editor, ownerId)
			if (!blockId) {
				setStatus('No reserved block — place one first')
				return
			}
			const size = await submitBlockOnServer(editor, {
				roomId,
				ownerKey: ownerId,
				blockId,
			})
			setStatus(
				`Submitted — ${Math.round(size.before.width)}×${Math.round(size.before.height)} → ${Math.round(size.width)}×${Math.round(size.height)}`
			)
		} catch (error) {
			console.error(error)
			setStatus(error instanceof Error ? error.message : 'Submit failed')
		}
	}, [editor, instagramHandle, ownerId, roomId])

	useEffect(() => {
		if (!exportStatus && !status) return
		const timeout = setTimeout(() => {
			setExportStatus(null)
			setStatus(null)
		}, 4500)
		return () => clearTimeout(timeout)
	}, [exportStatus, status])

	useEffect(() => {
		if (!editor) return
		editor.updateInstanceState({ isReadonly: !instagramHandle })
		if (instagramHandle) {
			editor.user.updateUserPreferences({
				name: `@${instagramHandle}`,
				colorScheme: 'dark',
			})
		}
		editor.zoomToBounds(PAGE_BOUNDS, {
			inset: 48,
			animation: { duration: 0 },
		})
	}, [editor, instagramHandle])

	const components = isAdmin ? adminComponents : communalComponents
	const overrides = isAdmin ? adminOverrides : communalOverrides

	return (
		<RoomShell
			isAdmin={isAdmin}
			instagramHandle={instagramHandle}
			exportStatus={exportStatus}
			status={status}
			onExportPng={handleExportPng}
			onExportPdf={handleExportPdf}
			onClearBoard={handleClearBoard}
			onPlaceBlock={handlePlaceBlock}
			onSubmitBlock={handleSubmitBlock}
		>
			<Tldraw
				store={store}
				licenseKey={TLDRAW_LICENSE_KEY}
				colorScheme="dark"
				components={components}
				overrides={overrides}
				tools={[StickerTool]}
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

					mountedEditor.zoomToBounds(PAGE_BOUNDS, {
						inset: 48,
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
							const { ownerId: currentOwnerId, instagramHandle: currentHandle, isAdmin: admin } =
								identityRef.current
							if (!currentHandle && !admin) {
								throw new Error('Enter your Instagram handle to draw')
							}

							// Image / sticker caps (toast, then abort create)
							if (shape.type === 'image') {
								const isSticker = shape.meta.kind === 'sticker'
								if (isSticker) {
									if (
										countOwnedMedia(mountedEditor, currentOwnerId, 'sticker') >=
										MAX_STICKERS_PER_SUBMISSION
									) {
										showToast({ title: '2 sticker limit reached', severity: 'warning' })
										throw new Error('STICKER_LIMIT')
									}
								} else if (
									countOwnedMedia(mountedEditor, currentOwnerId, 'image') >=
									MAX_IMAGES_PER_SUBMISSION
								) {
									showToast({ title: '3 image limit reached', severity: 'warning' })
									throw new Error('IMAGE_LIMIT')
								}
							}

							if (getShapeOwnerKey(shape)) return shape

							// meta must be JSON-serializable — never write `undefined` values
							const meta: Record<string, string> = {
								ownerKey: currentOwnerId,
								ownerId: currentOwnerId,
							}
							if (currentHandle) {
								meta.displayName = `@${currentHandle}`
							} else if (typeof shape.meta.displayName === 'string') {
								meta.displayName = shape.meta.displayName
							}
							if (shape.type === 'image') {
								meta.kind = shape.meta.kind === 'sticker' ? 'sticker' : 'image'
							} else if (typeof shape.meta.kind === 'string') {
								meta.kind = shape.meta.kind
							}

							return {
								...shape,
								meta,
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

							if (
								!canUserMutateShape(prev, { ownerKey: currentOwnerId, isAdmin: admin }) ||
								isInsideSubmittedBlock(prev, (id) => mountedEditor.getShape(id as never))
							) {
								return prev
							}

							// Also block mutating others' shapes when ownerKey missing on legacy
							if (prev.meta.ownerId && prev.meta.ownerId !== currentOwnerId) {
								return prev
							}
							if (!getShapeOwnerKey(prev) && isMovementChange(prev, next)) {
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
							if (
								!canUserMutateShape(shape, { ownerKey: currentOwnerId, isAdmin: admin }) ||
								isInsideSubmittedBlock(shape, (id) => mountedEditor.getShape(id as never))
							) {
								return false
							}
							if (getShapeOwnerKey(shape) === currentOwnerId) return
							return false
						}
					)

					// Selection lock: drop anything the user doesn't own (admin bypass).
					const unsubSelection = react('scrapbook-selection-lock', () => {
						const { ownerId: currentOwnerId, isAdmin: admin } = identityRef.current
						if (admin) return
						const selected = mountedEditor.getSelectedShapes()
						const allowed = selected.filter((shape) => {
							const owner = getShapeOwnerKey(shape)
							if (!owner) {
								// Allow selecting own in-progress unmarked? Prefer only owned.
								if (isScrapbookTile(shape)) return false
								return false
							}
							return owner === currentOwnerId
						})
						if (allowed.length !== selected.length) {
							mountedEditor.setSelectedShapes(allowed.map((s) => s.id))
						}
					})

					return () => {
						disposeBeforeCreate()
						disposePageCreate()
						disposeBeforeChange()
						disposeBeforeDelete()
						unsubSelection()
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
	status,
	onExportPng,
	onExportPdf,
	onClearBoard,
	onPlaceBlock,
	onSubmitBlock,
}: {
	children: ReactNode
	isAdmin: boolean
	instagramHandle: string | null
	exportStatus: string | null
	status: string | null
	onExportPng: () => void
	onExportPdf: () => void
	onClearBoard: () => void
	onPlaceBlock: () => void
	onSubmitBlock: () => void
}) {
	return (
		<div className="RoomWrapper">
			{instagramHandle && (
				<div className="RoomWrapper-checkBar">
					<span className="RoomWrapper-adminBadge">CHECK B/C</span>
					<span className="RoomWrapper-handle">@{instagramHandle}</span>
					<button className="RoomWrapper-button" onClick={onPlaceBlock}>
						Place block
					</button>
					<button className="RoomWrapper-button" onClick={onSubmitBlock}>
						Submit
					</button>
					{isAdmin && (
						<>
							<button className="RoomWrapper-button" onClick={onExportPng}>
								Export PNG
							</button>
							<button className="RoomWrapper-button" onClick={onExportPdf}>
								Export PDF
							</button>
							<button className="RoomWrapper-button" onClick={onClearBoard}>
								Clear board
							</button>
						</>
					)}
					{(status || exportStatus) && (
						<span className="RoomWrapper-status">{status || exportStatus}</span>
					)}
				</div>
			)}
			<div className="RoomWrapper-content">{children}</div>
		</div>
	)
}
