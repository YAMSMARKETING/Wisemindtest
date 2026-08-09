import { TLAssetStore, uniqueId } from 'tldraw'
import { MAX_UPLOAD_BYTES } from './constants'

function guessContentType(file: File) {
	if (file.type && file.type !== 'application/octet-stream') return file.type

	const name = file.name.toLowerCase()
	if (name.endsWith('.png')) return 'image/png'
	if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
	if (name.endsWith('.gif')) return 'image/gif'
	if (name.endsWith('.webp')) return 'image/webp'
	if (name.endsWith('.svg')) return 'image/svg+xml'
	if (name.endsWith('.heic')) return 'image/heic'
	if (name.endsWith('.heif')) return 'image/heif'
	if (name.endsWith('.mp4')) return 'video/mp4'
	if (name.endsWith('.webm')) return 'video/webm'
	if (name.endsWith('.mov')) return 'video/quicktime'
	return file.type || 'application/octet-stream'
}

// How does our server handle assets like images and videos?
export const multiplayerAssetStore: TLAssetStore = {
	// to upload an asset, we...
	async upload(_asset, file) {
		if (file.size > MAX_UPLOAD_BYTES) {
			throw new Error(`File too large. Max upload size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`)
		}

		// ...create a unique name & URL...
		const id = uniqueId()
		const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-')
		const url = `/api/uploads/${objectName}`
		const contentType = guessContentType(file)

		// ...POST it to our worker to upload it...
		// Always set Content-Type: iOS often gives File.type as empty / octet-stream.
		const response = await fetch(url, {
			method: 'POST',
			body: file,
			headers: {
				'Content-Type': contentType,
			},
		})

		if (!response.ok) {
			let detail = response.statusText
			try {
				const data = (await response.json()) as { error?: string }
				if (data?.error) detail = data.error
			} catch {
				// ignore parse errors
			}
			throw new Error(`Failed to upload asset: ${detail}`)
		}

		// ...and return the URL to be stored with the asset record.
		return { src: url }
	},

	// to retrieve an asset, we can just use the same URL. you could customize this to add extra
	// auth, or to serve optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}
