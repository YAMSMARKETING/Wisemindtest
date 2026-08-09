import {
	DurableObjectSqliteSyncWrapper,
	type SessionStateSnapshot,
	SQLiteSyncStorage,
	TLSocketRoom,
} from '@tldraw/sync-core'
import {
	createTLSchema,
	defaultShapeSchemas,
	TLRecord,
} from '@tldraw/tlschema'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, error, IRequest, json } from 'itty-router'
import {
	applyPlace,
	applySubmit,
	clearLayout,
	loadLayout,
	placeBlock,
	purgeExpired,
	releaseBlock,
	removeBlock,
	saveLayout,
	submitBlock,
} from './layout'

const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas },
})

interface SocketAttachment {
	sessionId: string
	snapshot: SessionStateSnapshot | null
}

export class TldrawDurableObject extends DurableObject {
	private room: TLSocketRoom<TLRecord, void> | null = null
	private readonly sessionIdToWs = new Map<string, WebSocket>()

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		this.ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}')
		)
	}

	private getOrCreateRoom(): TLSocketRoom<TLRecord, void> {
		if (!this.room) {
			const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)
			const storage = new SQLiteSyncStorage<TLRecord>({ sql })

			this.room = new TLSocketRoom<TLRecord, void>({
				schema,
				storage,
				clientTimeout: Infinity,
				onSessionSnapshot: (sessionId, snapshot) => {
					const ws = this.sessionIdToWs.get(sessionId)
					if (ws) ws.serializeAttachment({ sessionId, snapshot })
				},
			})

			for (const ws of this.ctx.getWebSockets()) {
				const attachment = ws.deserializeAttachment() as SocketAttachment | null
				if (!attachment?.sessionId) continue

				if (attachment.snapshot) {
					this.room.handleSocketResume({
						sessionId: attachment.sessionId,
						socket: ws,
						snapshot: attachment.snapshot,
					})
				}
			}
		}
		return this.room
	}

	private readonly router = AutoRouter({ catch: (e) => error(e) })
		.get('/api/connect/:roomId', (request) => this.handleConnect(request))
		.get('/api/layout/:roomId', () => this.handleGetLayout())
		.post('/api/layout/:roomId/place', (request) => this.handlePlace(request))
		.post('/api/layout/:roomId/submit', (request) => this.handleSubmit(request))
		.post('/api/layout/:roomId/release', (request) => this.handleRelease(request))
		.post('/api/layout/:roomId/clear', () => this.handleClearLayout())
		.post('/api/layout/:roomId/remove', (request) => this.handleRemove(request))

	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	async handleConnect(request: IRequest) {
		const sessionId = request.query.sessionId as string
		if (!sessionId) return error(400, 'Missing sessionId')

		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		this.ctx.acceptWebSocket(serverWebSocket)

		const attachment: SocketAttachment = { sessionId, snapshot: null }
		serverWebSocket.serializeAttachment(attachment)

		this.getOrCreateRoom().handleSocketConnect({ sessionId, socket: serverWebSocket })

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	private async handleGetLayout() {
		const state = purgeExpired(await loadLayout(this.ctx.storage))
		await saveLayout(this.ctx.storage, state)
		return json(state)
	}

	private async handlePlace(request: IRequest) {
		const body = (await request.json()) as {
			ownerKey?: string
			displayName?: string
			shapeId?: string
			x?: number
			y?: number
			w?: number
			h?: number
		}

		const state = await loadLayout(this.ctx.storage)
		const result = placeBlock(state, {
			ownerKey: body.ownerKey ?? '',
			displayName: body.displayName ?? '',
			shapeId: body.shapeId ?? '',
			x: Number(body.x) || 0,
			y: Number(body.y) || 0,
			w: body.w,
			h: body.h,
		})

		if (!result.ok) return error(result.code, result.error)

		const next = applyPlace(state, result.block)
		await saveLayout(this.ctx.storage, next)
		return json({ ok: true, nudged: result.nudged, block: result.block })
	}

	private async handleSubmit(request: IRequest) {
		const body = (await request.json()) as {
			ownerKey?: string
			shapeId?: string
			w?: number
			h?: number
		}

		const state = await loadLayout(this.ctx.storage)
		const result = submitBlock(state, {
			ownerKey: body.ownerKey ?? '',
			shapeId: body.shapeId ?? '',
			w: Number(body.w) || 0,
			h: Number(body.h) || 0,
		})

		if (!result.ok) return error(result.code, result.error)

		const next = applySubmit(state, result.block)
		await saveLayout(this.ctx.storage, next)
		return json({ ok: true, block: result.block })
	}

	private async handleRelease(request: IRequest) {
		const body = (await request.json()) as { ownerKey?: string; shapeId?: string }
		const state = await loadLayout(this.ctx.storage)
		const result = releaseBlock(state, body.ownerKey ?? '', body.shapeId ?? '')
		if (!result.ok) return error(result.code, result.error)
		await saveLayout(this.ctx.storage, result.state)
		return json({ ok: true })
	}

	private async handleClearLayout() {
		await saveLayout(this.ctx.storage, clearLayout())
		return json({ ok: true })
	}

	private async handleRemove(request: IRequest) {
		const body = (await request.json()) as { shapeId?: string }
		if (!body.shapeId) return error(400, 'Missing shapeId')
		const state = await loadLayout(this.ctx.storage)
		await saveLayout(this.ctx.storage, removeBlock(state, body.shapeId))
		return json({ ok: true })
	}

	private getSessionId(ws: WebSocket): string | null {
		const attachment = ws.deserializeAttachment() as SocketAttachment | null
		return attachment?.sessionId ?? null
	}

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		const sessionId = this.getSessionId(ws)
		if (!sessionId) return

		this.sessionIdToWs.set(sessionId, ws)
		this.getOrCreateRoom().handleSocketMessage(sessionId, message)
	}

	override async webSocketClose(ws: WebSocket) {
		this.handleWebSocketEnd(ws, 'handleSocketClose')
	}

	override async webSocketError(ws: WebSocket) {
		this.handleWebSocketEnd(ws, 'handleSocketError')
	}

	private handleWebSocketEnd(ws: WebSocket, method: 'handleSocketClose' | 'handleSocketError') {
		const attachment = ws.deserializeAttachment() as SocketAttachment | null
		if (!attachment?.sessionId) return

		this.sessionIdToWs.delete(attachment.sessionId)

		const room = this.getOrCreateRoom()

		if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
			room.handleSocketResume({
				sessionId: attachment.sessionId,
				socket: ws,
				snapshot: attachment.snapshot,
			})
		}

		room[method](attachment.sessionId)
	}
}
