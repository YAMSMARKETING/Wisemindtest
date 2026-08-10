import { useCallback, useEffect, useState } from 'react'
import { Editor } from 'tldraw'
import type { LayoutBlock } from './layoutApi'
import {
	apiBanContributor,
	apiGetModeration,
	type BanRecord,
	type ContributorRecord,
} from './moderationApi'
import { apiRemoveBlock } from './layoutApi'

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
	const [blocks, setBlocks] = useState<LayoutBlock[]>([])
	const [contributors, setContributors] = useState<Record<string, ContributorRecord>>({})
	const [bans, setBans] = useState<BanRecord[]>([])
	const [loading, setLoading] = useState(false)

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			const data = await apiGetModeration(roomId)
			setBlocks(data.blocks)
			setContributors(data.contributors)
			setBans(data.bans)
		} catch (error) {
			onStatus(error instanceof Error ? error.message : 'Failed to load submissions')
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

	function jumpTo(block: LayoutBlock) {
		if (!editor) return
		editor.select(block.shapeId as never)
		editor.zoomToBounds(
			{ x: block.x, y: block.y, w: block.w, h: block.h },
			{ inset: 64, animation: { duration: 280 } }
		)
	}

	async function deleteAndBan(block: LayoutBlock) {
		if (!editor) return
		const label = block.displayName || block.ownerKey
		if (!window.confirm(`Delete and ban ${label}?`)) return
		try {
			await apiBanContributor(roomId, {
				ownerKey: block.ownerKey,
				displayName: block.displayName,
				handle: contributors[block.ownerKey]?.handle ?? undefined,
				reason: 'admin delete-and-ban',
				shapeId: block.shapeId,
			})
			await apiRemoveBlock(roomId, block.shapeId)
			const shape = editor.getShape(block.shapeId as never)
			if (shape) {
				// Delete block + children
				const childIds = editor.getSortedChildIdsForParent(block.shapeId as never)
				editor.deleteShapes([...childIds, block.shapeId as never])
			}
			onStatus(`Removed and banned ${label}`)
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
				{open ? 'Hide submissions' : 'Submissions'}
			</button>
			{open && (
				<div className="AdminSubmissions-panel">
					<div className="AdminSubmissions-header">
						<span>
							{blocks.length} block{blocks.length === 1 ? '' : 's'} · {bans.length} ban
							{bans.length === 1 ? '' : 's'}
						</span>
						<button type="button" className="RoomWrapper-button" onClick={() => void refresh()}>
							{loading ? '…' : 'Refresh'}
						</button>
					</div>
					<ul className="AdminSubmissions-list">
						{blocks.length === 0 && (
							<li className="AdminSubmissions-empty">No placed blocks yet</li>
						)}
						{blocks.map((block) => {
							const contributor = contributors[block.ownerKey]
							return (
								<li key={block.shapeId} className="AdminSubmissions-row">
									<div className="AdminSubmissions-meta">
										<strong>{block.displayName}</strong>
										<span className="AdminSubmissions-sub">
											{block.status} · {block.ownerKey.slice(0, 8)}…
											{contributor?.handle ? ` · @${contributor.handle}` : ''}
											{contributor?.name ? ` · ${contributor.name}` : ''}
										</span>
									</div>
									<div className="AdminSubmissions-actions">
										<button
											type="button"
											className="RoomWrapper-button"
											onClick={() => jumpTo(block)}
										>
											Jump
										</button>
										<button
											type="button"
											className="RoomWrapper-button RoomWrapper-button--danger"
											onClick={() => void deleteAndBan(block)}
										>
											Delete + ban
										</button>
									</div>
								</li>
							)
						})}
					</ul>
				</div>
			)}
		</div>
	)
}
