import { useCallback, useEffect, useMemo, useState } from 'react'
import { Editor } from 'tldraw'
import {
	deleteOwnedShapes,
	getOwnedShapes,
	getOwnedShapesBounds,
	getShapeOwnerKey,
} from './block'
import {
	apiBanContributor,
	apiGetModeration,
	type BanRecord,
	type ContributorRecord,
} from './moderationApi'

type ContributorRow = {
	ownerKey: string
	displayName: string
	name: string | null
	handle: string | null
	shapeCount: number
	fromServer: boolean
}

function buildRows(
	editor: Editor | null,
	contributors: Record<string, ContributorRecord>
): ContributorRow[] {
	const byOwner = new Map<string, ContributorRow>()

	for (const contributor of Object.values(contributors)) {
		byOwner.set(contributor.ownerKey, {
			ownerKey: contributor.ownerKey,
			displayName: contributor.displayName,
			name: contributor.name,
			handle: contributor.handle,
			shapeCount: 0,
			fromServer: true,
		})
	}

	if (editor) {
		for (const shape of editor.getCurrentPageShapes()) {
			const ownerKey = getShapeOwnerKey(shape)
			if (!ownerKey) continue
			const existing = byOwner.get(ownerKey)
			const displayName =
				(typeof shape.meta.displayName === 'string' && shape.meta.displayName) ||
				existing?.displayName ||
				ownerKey.slice(0, 8)
			if (existing) {
				existing.shapeCount += 1
				if (!existing.displayName || existing.displayName === ownerKey.slice(0, 8)) {
					existing.displayName = displayName
				}
			} else {
				byOwner.set(ownerKey, {
					ownerKey,
					displayName,
					name: null,
					handle: null,
					shapeCount: 1,
					fromServer: false,
				})
			}
		}
	}

	return [...byOwner.values()].sort((a, b) => {
		if (b.shapeCount !== a.shapeCount) return b.shapeCount - a.shapeCount
		return a.displayName.localeCompare(b.displayName)
	})
}

export function AdminSubmissionsPanel({
	roomId,
	editor,
	onStatus,
}: {
	roomId: string
	editor: Editor | null
	onStatus: (msg: string) => void
}) {
	const [open, setOpen] = useState(false)
	const [contributors, setContributors] = useState<Record<string, ContributorRecord>>({})
	const [bans, setBans] = useState<BanRecord[]>([])
	const [loading, setLoading] = useState(false)
	const [tick, setTick] = useState(0)

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			const data = await apiGetModeration(roomId)
			setContributors(data.contributors)
			setBans(data.bans)
			setTick((n) => n + 1)
		} catch (error) {
			onStatus(error instanceof Error ? error.message : 'Failed to load contributors')
		} finally {
			setLoading(false)
		}
	}, [onStatus, roomId])

	useEffect(() => {
		if (!open) return
		void refresh()
		const id = window.setInterval(() => void refresh(), 8000)
		return () => window.clearInterval(id)
	}, [open, refresh])

	// Recompute shape counts when the editor store changes while panel is open
	useEffect(() => {
		if (!open || !editor) return
		const unsub = editor.store.listen(() => setTick((n) => n + 1), {
			source: 'all',
			scope: 'document',
		})
		return unsub
	}, [editor, open])

	const rows = useMemo(
		() => buildRows(editor, contributors),
		// tick forces recount when shapes change
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[contributors, editor, tick]
	)

	function jumpTo(row: ContributorRow) {
		if (!editor) return
		const bounds = getOwnedShapesBounds(editor, row.ownerKey)
		const shapes = getOwnedShapes(editor, row.ownerKey)
		if (shapes.length === 0 || !bounds) {
			onStatus(`${row.displayName} has nothing on the board`)
			return
		}
		editor.select(...shapes.map((s) => s.id))
		editor.zoomToBounds(bounds, { inset: 64, animation: { duration: 280 } })
	}

	async function deleteContent(row: ContributorRow) {
		if (!editor) return
		const count = getOwnedShapes(editor, row.ownerKey).length
		if (count === 0) {
			onStatus(`${row.displayName} has nothing on the board`)
			return
		}
		if (!window.confirm(`Delete all ${count} shape(s) from ${row.displayName}?`)) return
		const removed = deleteOwnedShapes(editor, row.ownerKey)
		onStatus(`Removed ${removed} shape(s) from ${row.displayName}`)
		setTick((n) => n + 1)
	}

	async function deleteAndBan(row: ContributorRow) {
		if (!editor) return
		const label = row.displayName || row.ownerKey
		if (!window.confirm(`Delete all of ${label}'s content and ban them?`)) return
		try {
			await apiBanContributor(roomId, {
				ownerKey: row.ownerKey,
				displayName: row.displayName,
				handle: row.handle ?? undefined,
				reason: 'admin delete-and-ban',
			})
			const removed = deleteOwnedShapes(editor, row.ownerKey)
			onStatus(`Removed ${removed} shape(s) and banned ${label}`)
			await refresh()
		} catch (error) {
			onStatus(error instanceof Error ? error.message : 'Delete-and-ban failed')
		}
	}

	return (
		<div className="AdminSubmissions">
			<button
				type="button"
				className="RoomWrapper-button"
				onClick={() => setOpen((v) => !v)}
			>
				{open ? 'Hide contributors' : 'Contributors'}
			</button>
			{open && (
				<div className="AdminSubmissions-panel">
					<div className="AdminSubmissions-header">
						<span>
							{rows.length} contributor{rows.length === 1 ? '' : 's'} · {bans.length} ban
							{bans.length === 1 ? '' : 's'}
						</span>
						<button type="button" className="RoomWrapper-button" onClick={() => void refresh()}>
							{loading ? '…' : 'Refresh'}
						</button>
					</div>
					<ul className="AdminSubmissions-list">
						{rows.length === 0 && (
							<li className="AdminSubmissions-empty">No contributors yet</li>
						)}
						{rows.map((row) => (
							<li key={row.ownerKey} className="AdminSubmissions-row">
								<div className="AdminSubmissions-meta">
									<strong>{row.displayName}</strong>
									<span className="AdminSubmissions-sub">
										{row.shapeCount} shape{row.shapeCount === 1 ? '' : 's'} ·{' '}
										{row.ownerKey.slice(0, 8)}…
										{row.handle ? ` · @${row.handle}` : ''}
										{row.name ? ` · ${row.name}` : ''}
									</span>
								</div>
								<div className="AdminSubmissions-actions">
									<button
										type="button"
										className="RoomWrapper-button"
										onClick={() => jumpTo(row)}
										disabled={row.shapeCount === 0}
									>
										Jump
									</button>
									<button
										type="button"
										className="RoomWrapper-button"
										onClick={() => void deleteContent(row)}
										disabled={row.shapeCount === 0}
									>
										Delete content
									</button>
									<button
										type="button"
										className="RoomWrapper-button RoomWrapper-button--danger"
										onClick={() => void deleteAndBan(row)}
									>
										Delete + ban
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
