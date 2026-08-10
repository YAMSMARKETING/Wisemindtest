import { handleUnfurlRequest } from 'cloudflare-workers-unfurl'
import { AutoRouter, error, IRequest } from 'itty-router'
import { handleAssetDownload, handleAssetUpload } from './assetUploads'

export { TldrawDurableObject } from './TldrawDurableObject'

function getRoomStub(env: Env, roomId: string) {
	const id = env.TLDRAW_DURABLE_OBJECT.idFromName(roomId)
	return env.TLDRAW_DURABLE_OBJECT.get(id)
}

/** Forward an HTTP request to the room Durable Object (preserves method/body/path). */
function forwardToRoom(request: IRequest, env: Env) {
	const roomId = request.params.roomId
	if (!roomId) return error(400, 'Missing roomId')
	const stub = getRoomStub(env, roomId)
	return stub.fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body,
	})
}

const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	.get('/api/connect/:roomId', (request, env) => {
		return forwardToRoom(request, env)
	})

	.get('/api/layout/:roomId', (request, env) => forwardToRoom(request, env))
	.post('/api/layout/:roomId/place', (request, env) => forwardToRoom(request, env))
	.post('/api/layout/:roomId/submit', (request, env) => forwardToRoom(request, env))
	.post('/api/layout/:roomId/release', (request, env) => forwardToRoom(request, env))
	.post('/api/layout/:roomId/clear', (request, env) => forwardToRoom(request, env))
	.post('/api/layout/:roomId/remove', (request, env) => forwardToRoom(request, env))

	.get('/api/moderation/:roomId', (request, env) => forwardToRoom(request, env))
	.get('/api/moderation/:roomId/check', (request, env) => forwardToRoom(request, env))
	.post('/api/moderation/:roomId/register', (request, env) => forwardToRoom(request, env))
	.post('/api/moderation/:roomId/ban', (request, env) => forwardToRoom(request, env))
	.post('/api/moderation/:roomId/unban', (request, env) => forwardToRoom(request, env))

	.post('/api/uploads/:uploadId', handleAssetUpload)
	.get('/api/uploads/:uploadId', handleAssetDownload)
	.get('/api/unfurl', handleUnfurlRequest)

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)
		if (url.pathname.startsWith('/api/')) {
			return router.fetch(request, env, ctx)
		}
		return env.ASSETS.fetch(request)
	},
}
