import { useSync } from '@tldraw/sync'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Editor, Tldraw, react } from 'tldraw'
import { AdminSubmissionsPanel } from '../AdminSubmissionsPanel'
import { isAdminFromSearch } from '../admin'
import { countOwnedMedia, getShapeOwnerKey } from '../block'
import { TLDRAW_LICENSE_KEY } from '../constants'
import { EntryGate } from '../EntryGate'
import { clearBoard, exportBoardAsPdf, exportBoardAsPng } from '../exportBoard'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { clearStoredIdentity, getStoredIdentity, type StoredIdentity } from '../identity'
import { apiClearLayout } from '../layoutApi'
import { apiCheckBan, apiRegisterContributor } from '../moderationApi'
import { multiplayerAssetStore } from '../multiplayerAssetStore'
import { getOrCreateOwnerId } from '../ownerId'
import { setScrapbookOwnerKey } from '../scrapbookSession'
import { canUserMutateShape, isMovementChange } from '../shapeGuards'
import { StickerTool } from '../StickerTool'
import { MAX_IMAGES_PER_SUBMISSION, MAX_STICKERS_PER_SUBMISSION } from '../stickers'
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
	const [identity, setIdentity] = useState<StoredIdentity | null>(() => getStoredIdentity())
	const [bannedMessage, setBannedMessage] = useState<string | null>(null)
	const [editor, setEditor] = useState<Editor | null>(null)
	const [exportStatus, setExportStatus] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)

	const displayName = identity?.displayName ?? (isAdmin ? 'admin' : null)
	const canCompose = isAdmin || !!identity

	const identityRef = useRef({ ownerId, isAdmin, identity, displayName })
	identityRef.current = { ownerId, isAdmin, identity, displayName }

	useEffect(() => {
		setScrapbookOwnerKey(ownerId)
		return () => setScrapbookOwnerKey(null)
	}, [ownerId])

	// Ban check + contributor register once identity is known
	useEffect(() => {
		if (!roomId || !identity || isAdmin) return
		let cancelled = false

		;(async () => {
			try {
				const { banned } = await apiCheckBan(roomId, {
					ownerKey: ownerId,
					handle: identity.handle,
					displayName: identity.displayName,
				})
				if (cancelled) return
				if (banned) {
					setBannedMessage('You are banned from this scrapbook')
					clearStoredIdentity()
					setIdentity(null)
					return
				}
				await apiRegisterContributor(roomId, {
					ownerKey: ownerId,
					name: identity.name,
					handle: identity.handle,
					displayName: identity.displayName,
				})
			} catch (error) {
				if (cancelled) return
				const message = error instanceof Error ? error.message : 'Could not join'
				if (/banned/i.test(message)) {
					setBannedMessage(message)
					clearStoredIdentity()
					setIdentity(null)
				} else {
					setStatus(message)
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [identity, isAdmin, ownerId, roomId])

	const store = useSync({
		uri: `${window.location.origin}/api/connect/${roomId}?ownerKey=${encodeURIComponent(ownerId)}`,
		assets: multiplayerAssetStore,
	})

	const handleJoined = useCallback((next: StoredIdentity) => {
		setBannedMessage(null)
		setIdentity(next)
	}, [])

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
		editor.updateInstanceState({ isReadonly: !canCompose })
		if (displayName) {
			editor.user.updateUserPreferences({
				name: displayName,
				colorScheme: 'dark',
			})
		}
	}, [canCompose, displayName, editor])

	const components = isAdmin ? adminComponents : communalComponents
	const overrides = isAdmin ? adminOverrides : communalOverrides

	return (
		<RoomShell
			isAdmin={isAdmin}
			displayName={displayName}
			canCompose={canCompose}
			exportStatus={exportStatus}
			status={status}
			roomId={roomId}
			editor={editor}
			onStatus={setStatus}
			onExportPng={handleExportPng}
			onExportPdf={handleExportPdf}
			onClearBoard={handleClearBoard}
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
						isReadonly: !(identityRef.current.isAdmin || !!identityRef.current.identity),
					})

					const name = identityRef.current.displayName
					if (name) {
						mountedEditor.user.updateUserPreferences({
							name,
							colorScheme: 'dark',
						})
					}

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
							const {
								ownerId: currentOwnerId,
								identity: currentIdentity,
								displayName: currentDisplay,
								isAdmin: admin,
							} = identityRef.current
							if (!currentIdentity && !admin) {
								throw new Error('Enter your name or Instagram handle to draw')
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
							if (currentDisplay) {
								meta.displayName = currentDisplay
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

							if (!canUserMutateShape(prev, { ownerKey: currentOwnerId, isAdmin: admin })) {
								return prev
							}

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
							if (!canUserMutateShape(shape, { ownerKey: currentOwnerId, isAdmin: admin })) {
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
			{!canCompose && <EntryGate onJoined={handleJoined} bannedMessage={bannedMessage} />}
		</RoomShell>
	)
}

function RoomShell({
	children,
	isAdmin,
	displayName,
	canCompose,
	exportStatus,
	status,
	roomId,
	editor,
	onStatus,
	onExportPng,
	onExportPdf,
	onClearBoard,
}: {
	children: ReactNode
	isAdmin: boolean
	displayName: string | null
	canCompose: boolean
	exportStatus: string | null
	status: string | null
	roomId: string | undefined
	editor: Editor | null
	onStatus: (msg: string) => void
	onExportPng: () => void
	onExportPdf: () => void
	onClearBoard: () => void
}) {
	return (
		<div className="RoomWrapper">
			{canCompose && (
				<div className={`RoomWrapper-checkBar${isAdmin ? ' RoomWrapper-checkBar--admin' : ''}`}>
					{isAdmin ? (
						<>
							<span className="RoomWrapper-adminBadge">Admin</span>
							{displayName && <span className="RoomWrapper-handle">{displayName}</span>}
							{roomId && (
								<AdminSubmissionsPanel roomId={roomId} editor={editor} onStatus={onStatus} />
							)}
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
					) : (
						displayName && <span className="RoomWrapper-handle">{displayName}</span>
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
